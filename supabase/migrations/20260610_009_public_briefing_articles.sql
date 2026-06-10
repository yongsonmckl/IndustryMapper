create or replace function public.list_public_briefings(
  filter_industry_slug text default null,
  limit_count integer default 24
)
returns table (
  article_id uuid,
  title text,
  summary text,
  published_at timestamptz,
  source_url text,
  source_slug text,
  source_name text,
  industry_slug text,
  enrichment_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    coalesce(nullif(a.summary, ''), left(coalesce(a.content_text, a.title), 600)),
    a.published_at,
    coalesce(a.canonical_url, a.url),
    src.slug,
    src.name,
    i.slug,
    a.enrichment_status::text
  from public.articles a
  join public.sources src on src.id = a.source_id
  left join public.source_industries si on si.source_id = src.id
  left join public.industries i on i.id = si.industry_id
  where a.enrichment_status = 'no_event'
    and coalesce(a.enrichment_version, 'heuristic_v3') = 'heuristic_v3'
    and (filter_industry_slug is null or i.slug = filter_industry_slug)
  order by a.published_at desc nulls last, a.created_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.list_public_briefings(text, integer) to anon, authenticated;
