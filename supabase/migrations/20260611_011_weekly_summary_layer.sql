alter table public.weekly_summaries
add column if not exists summary_payload jsonb not null default '{}'::jsonb,
add column if not exists neutral_article_count integer not null default 0,
add column if not exists review_status text not null default 'draft',
add column if not exists generation_version text not null default 'weekly_v1',
add column if not exists reviewed_at timestamptz,
add column if not exists published_at timestamptz,
add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'weekly_summaries_review_status_check'
  ) then
    alter table public.weekly_summaries
    add constraint weekly_summaries_review_status_check
    check (review_status in ('draft', 'reviewed', 'published'));
  end if;
end
$$;

create index if not exists weekly_summaries_industry_week_idx
on public.weekly_summaries (industry_id, week_end_date desc, week_start_date desc);

create index if not exists weekly_summaries_review_status_idx
on public.weekly_summaries (review_status, week_end_date desc);

drop trigger if exists weekly_summaries_set_updated_at on public.weekly_summaries;
create trigger weekly_summaries_set_updated_at
before update on public.weekly_summaries
for each row execute procedure public.set_updated_at();

drop function if exists public.list_public_weekly_summaries(text, integer);

create or replace function public.list_public_weekly_summaries(
  filter_industry_slug text default null,
  limit_count integer default 6
)
returns table (
  summary_id uuid,
  industry_slug text,
  industry_name text,
  week_start_date date,
  week_end_date date,
  title text,
  summary_markdown text,
  summary_payload jsonb,
  source_event_count integer,
  neutral_article_count integer,
  review_status text,
  generation_version text,
  confidence_score numeric,
  generated_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ws.id,
    i.slug,
    i.name,
    ws.week_start_date,
    ws.week_end_date,
    ws.title,
    ws.summary_markdown,
    ws.summary_payload,
    ws.source_event_count,
    ws.neutral_article_count,
    ws.review_status,
    ws.generation_version,
    ws.confidence_score,
    ws.generated_at,
    ws.reviewed_at,
    ws.published_at
  from public.weekly_summaries ws
  join public.industries i on i.id = ws.industry_id
  where filter_industry_slug is null or i.slug = filter_industry_slug
  order by ws.week_end_date desc, ws.generated_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.list_public_weekly_summaries(text, integer) to anon, authenticated;
