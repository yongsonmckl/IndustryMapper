alter table public.articles
add column if not exists enrichment_status text not null default 'pending',
add column if not exists enriched_at timestamptz,
add column if not exists last_enrichment_error text;

create index if not exists articles_enrichment_status_idx
on public.articles (enrichment_status, published_at desc);

alter table public.countries enable row level security;
alter table public.events enable row level security;
alter table public.event_locations enable row level security;
alter table public.event_articles enable row level security;
alter table public.tags enable row level security;
alter table public.event_tags enable row level security;
alter table public.weekly_summaries enable row level security;

drop policy if exists "ingest_read_countries" on public.countries;
create policy "ingest_read_countries"
on public.countries
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_events" on public.events;
create policy "ingest_read_events"
on public.events
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_event_locations" on public.event_locations;
create policy "ingest_read_event_locations"
on public.event_locations
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_event_articles" on public.event_articles;
create policy "ingest_read_event_articles"
on public.event_articles
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_tags" on public.tags;
create policy "ingest_read_tags"
on public.tags
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_event_tags" on public.event_tags;
create policy "ingest_read_event_tags"
on public.event_tags
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_read_weekly_summaries" on public.weekly_summaries;
create policy "ingest_read_weekly_summaries"
on public.weekly_summaries
for select
to anon, authenticated
using (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_countries" on public.countries;
create policy "ingest_insert_countries"
on public.countries
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_countries" on public.countries;
create policy "ingest_update_countries"
on public.countries
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_events" on public.events;
create policy "ingest_insert_events"
on public.events
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_events" on public.events;
create policy "ingest_update_events"
on public.events
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_event_locations" on public.event_locations;
create policy "ingest_insert_event_locations"
on public.event_locations
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_event_locations" on public.event_locations;
create policy "ingest_update_event_locations"
on public.event_locations
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_event_articles" on public.event_articles;
create policy "ingest_insert_event_articles"
on public.event_articles
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_tags" on public.tags;
create policy "ingest_insert_tags"
on public.tags
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_tags" on public.tags;
create policy "ingest_update_tags"
on public.tags
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_insert_event_tags" on public.event_tags;
create policy "ingest_insert_event_tags"
on public.event_tags
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());
