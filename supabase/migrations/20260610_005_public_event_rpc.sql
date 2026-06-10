create or replace function public.list_public_events(
  filter_industry_slug text default null,
  filter_event_type_slug text default null,
  min_severity smallint default null,
  limit_count integer default 50
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
  latitude double precision,
  longitude double precision,
  source_url text,
  source_slug text,
  source_name text,
  evidence_snippet text,
  extraction_method text
)
language sql
stable
security definer
set search_path = public
as $$
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
    el.latitude,
    el.longitude,
    a.url,
    src.slug,
    src.name,
    ea.evidence_snippet,
    e.metadata ->> 'extraction_method'
  from public.events e
  join public.industries i on i.id = e.industry_id
  left join public.subsectors s on s.id = e.subsector_id
  left join public.event_types et on et.id = e.event_type_id
  left join public.event_locations el on el.event_id = e.id and el.is_canonical = true
  join public.event_articles ea on ea.event_id = e.id and ea.role = 'primary'
  join public.articles a on a.id = ea.article_id
  join public.sources src on src.id = a.source_id
  where e.metadata ->> 'extraction_method' = 'heuristic_v2'
    and (filter_industry_slug is null or i.slug = filter_industry_slug)
    and (filter_event_type_slug is null or et.slug = filter_event_type_slug)
    and (min_severity is null or e.severity_level >= min_severity)
  order by coalesce(e.event_date, date(e.detected_at)) desc, e.detected_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.list_public_events(text, text, smallint, integer) to anon, authenticated;
