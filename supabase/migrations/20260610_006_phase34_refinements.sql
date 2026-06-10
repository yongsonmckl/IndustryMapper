alter table public.articles
add column if not exists enrichment_error_kind text,
add column if not exists enrichment_attempts integer not null default 0,
add column if not exists enrichment_version text;

create index if not exists articles_enrichment_retry_idx
on public.articles (enrichment_status, enrichment_error_kind, enrichment_attempts, published_at desc);

create or replace function public.list_public_events(
  filter_industry_slug text default null,
  filter_event_type_slug text default null,
  min_severity smallint default null,
  limit_count integer default 50,
  viewport_min_lng double precision default null,
  viewport_min_lat double precision default null,
  viewport_max_lng double precision default null,
  viewport_max_lat double precision default null,
  filter_extraction_methods text[] default array['heuristic_v2', 'heuristic_v3']
)
returns table (
  event_id uuid,
  title text,
  summary text,
  industry_slug text,
  subsector_slug text,
  event_type_slug text,
  severity_level smallint,
  confidence_score numeric,
  event_status public.event_status,
  event_date date,
  detected_at timestamptz,
  location_name text,
  location_role public.location_role,
  admin1 text,
  city text,
  country_name text,
  latitude double precision,
  longitude double precision,
  article_count bigint,
  source_url text,
  source_slug text,
  source_name text,
  evidence_snippet text,
  extraction_method text,
  dedupe_key text
)
language sql
stable
security definer
set search_path = public
as $$
  with event_article_counts as (
    select
      event_id,
      count(*) as article_count
    from public.event_articles
    group by event_id
  )
  select
    e.id,
    e.title,
    e.summary,
    i.slug,
    s.slug,
    et.slug,
    e.severity_level,
    e.confidence_score,
    e.event_status,
    e.event_date,
    e.detected_at,
    el.location_name,
    el.location_role,
    el.admin1,
    el.city,
    c.name,
    el.latitude,
    el.longitude,
    coalesce(eac.article_count, 0),
    primary_article.url,
    primary_source.slug,
    primary_source.name,
    primary_link.evidence_snippet,
    e.metadata ->> 'extraction_method',
    e.metadata ->> 'dedupe_key'
  from public.events e
  join public.industries i on i.id = e.industry_id
  left join public.subsectors s on s.id = e.subsector_id
  left join public.event_types et on et.id = e.event_type_id
  left join public.event_locations el on el.event_id = e.id and el.is_canonical = true
  left join public.countries c on c.id = el.country_id
  left join event_article_counts eac on eac.event_id = e.id
  join lateral (
    select
      ea.article_id,
      ea.evidence_snippet
    from public.event_articles ea
    where ea.event_id = e.id
    order by case when ea.role = 'primary' then 0 else 1 end, ea.extracted_at desc
    limit 1
  ) as primary_link on true
  join public.articles primary_article on primary_article.id = primary_link.article_id
  join public.sources primary_source on primary_source.id = primary_article.source_id
  where coalesce(e.metadata ->> 'extraction_method', 'heuristic_v2') = any(filter_extraction_methods)
    and (filter_industry_slug is null or i.slug = filter_industry_slug)
    and (filter_event_type_slug is null or et.slug = filter_event_type_slug)
    and (min_severity is null or e.severity_level >= min_severity)
    and (
      viewport_min_lng is null or viewport_min_lat is null or viewport_max_lng is null or viewport_max_lat is null
      or (
        el.geom is not null
        and st_intersects(
          el.geom,
          st_makeenvelope(viewport_min_lng, viewport_min_lat, viewport_max_lng, viewport_max_lat, 4326)::geography
        )
      )
    )
  order by coalesce(e.event_date, date(e.detected_at)) desc, e.detected_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.list_public_events(
  text,
  text,
  smallint,
  integer,
  double precision,
  double precision,
  double precision,
  double precision,
  text[]
) to anon, authenticated;
