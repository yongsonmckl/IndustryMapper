create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.record_status as enum ('active', 'planned', 'experimental', 'inactive');
create type public.source_type as enum ('government', 'association', 'trade_media', 'company', 'multilateral');
create type public.access_model as enum ('free', 'metered_free', 'mixed');
create type public.article_ingestion_status as enum ('discovered', 'normalized', 'stored', 'rejected', 'error');
create type public.event_status as enum ('active', 'monitoring', 'resolved', 'neutral');
create type public.location_role as enum ('primary', 'origin', 'destination', 'facility', 'market', 'affected_area');
create type public.event_article_role as enum ('primary', 'supporting', 'followup', 'duplicate_signal');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  status public.record_status not null default 'active',
  default_keywords jsonb not null default '[]'::jsonb,
  priority_regions jsonb not null default '[]'::jsonb,
  tracked_companies jsonb not null default '[]'::jsonb,
  tracked_countries jsonb not null default '[]'::jsonb,
  tracked_topics jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.subsectors (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid not null references public.industries(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (industry_id, slug),
  unique (industry_id, name)
);

create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.severity_levels (
  level smallint primary key check (level between 0 and 5),
  label text not null unique,
  color_name text not null,
  color_hex text not null,
  significance_rank smallint not null unique check (significance_rank between 0 and 5),
  description text not null
);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso2 char(2) unique,
  iso3 char(3) unique,
  name text not null unique,
  region text,
  subregion text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  country_id uuid references public.countries(id) on delete set null,
  website_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  source_type public.source_type not null,
  access_model public.access_model not null default 'free',
  homepage_url text not null,
  feed_url text,
  base_domain text not null,
  reliability_tier smallint not null check (reliability_tier between 1 and 5),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.source_industries (
  source_id uuid not null references public.sources(id) on delete cascade,
  industry_id uuid not null references public.industries(id) on delete cascade,
  primary key (source_id, industry_id)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  external_id text,
  url text not null unique,
  canonical_url text,
  title text not null,
  summary text,
  content_text text,
  author text,
  language_code text not null default 'en',
  published_at timestamptz,
  discovered_at timestamptz not null default timezone('utc', now()),
  article_hash text not null unique,
  raw_payload jsonb not null default '{}'::jsonb,
  ingestion_status public.article_ingestion_status not null default 'discovered',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_fingerprint text unique,
  title text not null,
  summary text not null,
  industry_id uuid not null references public.industries(id) on delete restrict,
  subsector_id uuid references public.subsectors(id) on delete set null,
  event_type_id uuid references public.event_types(id) on delete set null,
  severity_level smallint not null references public.severity_levels(level),
  confidence_score numeric(4,3) not null check (confidence_score between 0 and 1),
  event_status public.event_status not null default 'active',
  event_date date,
  detected_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.event_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  location_name text not null,
  admin1 text,
  city text,
  location_role public.location_role not null default 'primary',
  latitude double precision not null,
  longitude double precision not null,
  geom geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  is_canonical boolean not null default true,
  confidence_score numeric(4,3) not null default 0.5 check (confidence_score between 0 and 1),
  created_at timestamptz not null default timezone('utc', now())
);

create index event_locations_geom_idx on public.event_locations using gist (geom);

create table public.event_articles (
  event_id uuid not null references public.events(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  role public.event_article_role not null default 'primary',
  evidence_snippet text,
  extracted_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, article_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (event_id, tag_id)
);

create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid not null references public.industries(id) on delete cascade,
  week_start_date date not null,
  week_end_date date not null,
  title text not null,
  summary_markdown text not null,
  source_event_count integer not null default 0,
  model_name text,
  confidence_score numeric(4,3) check (confidence_score between 0 and 1),
  generated_at timestamptz not null default timezone('utc', now()),
  unique (industry_id, week_start_date, week_end_date)
);

create or replace function public.events_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  filter_industry_slug text default null,
  filter_event_type_slug text default null,
  min_severity smallint default null
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
  location_name text,
  latitude double precision,
  longitude double precision
)
language sql
stable
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
    el.location_name,
    el.latitude,
    el.longitude
  from public.events e
  join public.industries i on i.id = e.industry_id
  left join public.subsectors s on s.id = e.subsector_id
  left join public.event_types et on et.id = e.event_type_id
  join public.event_locations el on el.event_id = e.id and el.is_canonical = true
  where st_intersects(
    el.geom,
    st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  )
  and (filter_industry_slug is null or i.slug = filter_industry_slug)
  and (filter_event_type_slug is null or et.slug = filter_event_type_slug)
  and (min_severity is null or e.severity_level >= min_severity);
$$;

create trigger industries_set_updated_at
before update on public.industries
for each row execute procedure public.set_updated_at();

create trigger subsectors_set_updated_at
before update on public.subsectors
for each row execute procedure public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute procedure public.set_updated_at();

create trigger articles_set_updated_at
before update on public.articles
for each row execute procedure public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();
