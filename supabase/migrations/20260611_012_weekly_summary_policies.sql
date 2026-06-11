drop policy if exists "ingest_insert_weekly_summaries" on public.weekly_summaries;
create policy "ingest_insert_weekly_summaries"
on public.weekly_summaries
for insert
to anon, authenticated
with check (public.ingest_token_is_valid());

drop policy if exists "ingest_update_weekly_summaries" on public.weekly_summaries;
create policy "ingest_update_weekly_summaries"
on public.weekly_summaries
for update
to anon, authenticated
using (public.ingest_token_is_valid())
with check (public.ingest_token_is_valid());
