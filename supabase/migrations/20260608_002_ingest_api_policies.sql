create schema if not exists private;

revoke all on schema private from public;

create table if not exists private.ingest_runtime_secrets (
  secret_name text primary key,
  secret_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.ingest_token_is_valid()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from private.ingest_runtime_secrets
    where secret_name = 'github_actions_ingest'
      and secret_hash = encode(
        digest(
          coalesce(
            current_setting('request.headers', true)::json ->> 'x-ingest-token',
            ''
          ),
          'sha256'
        ),
        'hex'
      )
  );
$$;

grant execute on function public.ingest_token_is_valid() to anon, authenticated;

alter table public.industries enable row level security;
alter table public.subsectors enable row level security;
alter table public.event_types enable row level security;
alter table public.severity_levels enable row level security;
alter table public.sources enable row level security;
alter table public.source_industries enable row level security;
alter table public.articles enable row level security;

drop policy if exists "public_read_industries" on public.industries;
create policy "public_read_industries"
on public.industries
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_subsectors" on public.subsectors;
create policy "public_read_subsectors"
on public.subsectors
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_event_types" on public.event_types;
create policy "public_read_event_types"
on public.event_types
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_severity_levels" on public.severity_levels;
create policy "public_read_severity_levels"
on public.severity_levels
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_sources" on public.sources;
create policy "public_read_sources"
on public.sources
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_source_industries" on public.source_industries;
create policy "public_read_source_industries"
on public.source_industries
for select
to anon, authenticated
using (true);

drop policy if exists "ingest_read_articles" on public.articles;
create policy "ingest_read_articles"
on public.articles
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_articles" on public.articles;
create policy "ingest_insert_articles"
on public.articles
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_articles" on public.articles;
create policy "ingest_update_articles"
on public.articles
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());

-- Live environments must insert the real token hash separately.
