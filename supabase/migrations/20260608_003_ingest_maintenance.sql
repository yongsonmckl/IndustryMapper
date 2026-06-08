create or replace function public.run_ingest_maintenance(retention_days integer default 14)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_articles integer := 0;
begin
  if not public.ingest_token_is_valid() then
    raise exception 'invalid ingest token';
  end if;

  with deleted as (
    delete from public.articles a
    where a.discovered_at < timezone('utc', now()) - make_interval(days => retention_days)
      and not exists (
        select 1
        from public.event_articles ea
        where ea.article_id = a.id
      )
    returning 1
  )
  select count(*) into deleted_articles from deleted;

  return jsonb_build_object(
    'deleted_articles', deleted_articles,
    'retention_days', retention_days,
    'ran_at', timezone('utc', now())
  );
end;
$$;

grant execute on function public.run_ingest_maintenance(integer) to anon, authenticated;
