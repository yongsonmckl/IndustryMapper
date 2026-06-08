# IndustryMapper Structure Handover

Last updated: 2026-06-08

This file is for handover to another model. It describes the current repo structure, what each area owns, and what the next model should treat as the live foundation.

## 1. Top-Level Layout

```text
.github/      GitHub Actions workflows
.harness/     planning, research, handover, and operating rules
data/         curated source registry and future static data
ingestion/    Python ingestion, cleanup, enrichment contracts, prompts
supabase/     SQL migrations and seed data
tmp/          local runtime artifacts such as ingestion snapshots
web/          Next.js frontend application
README.md     repo overview
```

## 2. `.harness/`

Purpose:

- human and model handover
- planning decisions
- scope locks
- architecture rules

Files:

- `AGENTS.md`
  - operating rules and role boundaries
- `PLAN.md`
  - current implementation plan and phase status
- `RESEARCH.md`
  - subsector, severity, source, and infrastructure research
- `STRUCTURE.md`
  - this handover file

## 3. `data/`

### `data/sources/initial_sources.json`

Purpose:

- curated source registry for the POC
- source metadata used by ingestion

Current expectations:

- contains source identity, type, feed URL, and reliability information
- includes enabled and disabled sources
- drives which feeds are polled

## 4. `ingestion/`

Purpose:

- feed polling
- normalization
- dedupe
- retention cleanup
- enrichment contract scaffolding

Key files:

- `ingest_sources.py`
  - primary ingest script used by GitHub Actions
  - fetches feeds
  - normalizes article records
  - strips tracking parameters from URLs
  - deduplicates syndicated stories before insert
  - skips hashes already present in Supabase
  - writes ingestion snapshot artifact

- `cleanup_supabase.py`
  - calls the Supabase retention RPC after ingest

- `models.py`
  - Python-side structured models for enrichment work

- `prompts/event_extraction.md`
  - first enrichment prompt scaffold

- `requirements.txt`
  - Python dependencies for Actions

Current gap:

- there is still no production article-to-event enrichment job

## 5. `supabase/`

Purpose:

- database schema
- policies
- maintenance logic
- seed data

### `supabase/migrations/`

Key files:

- `20260608_001_initial_schema.sql`
  - core schema
  - includes industries, subsectors, sources, articles, events, locations, joins, and summaries

- `20260608_002_ingest_api_policies.sql`
  - ingest-related RLS and token-gated write path

- `20260608_003_ingest_maintenance.sql`
  - retention cleanup RPC for old articles

### `supabase/seeds/`

Key files:

- `001_reference_data.sql`
  - industries
  - subsectors
  - severity levels
  - event types
  - initial sources and source-to-industry mappings

Live project state:

- project name: `industrymapper`
- project ref: `uwfpjwlkypryqhfmbybj`
- runtime tables intentionally reset on `2026-06-08`
- seeded reference tables preserved

## 6. `.github/workflows/`

### `ingest-sources.yml`

Purpose:

- scheduled and manual ingest workflow

Current behavior:

1. checkout repo
2. set up Python
3. validate required secret presence
4. install dependencies
5. run `ingestion/ingest_sources.py`
6. run `ingestion/cleanup_supabase.py`
7. upload ingestion artifact

Current schedule:

- every 6 hours

Important secret:

- `SUPABASE_INGEST_TOKEN`

## 7. `web/`

Purpose:

- Next.js frontend application

Key files:

- `src/app/page.tsx`
  - current landing/product shell

- `src/app/layout.tsx`
  - root layout

- `src/app/globals.css`
  - global styles

- `src/app/api/health/route.ts`
  - health endpoint

- `src/app/api/bootstrap/route.ts`
  - bootstrap route scaffold

- `src/lib/supabase/server.ts`
  - server-side Supabase client setup

- `src/lib/supabase/types.ts`
  - Supabase-related TypeScript typing scaffold

Current gap:

- frontend is scaffolded, not yet connected to live `events`

## 8. Current Product State

What is already real:

- repo and workflow are live
- Supabase project is live
- schema is applied
- seeds are applied
- ingest pipeline runs
- retention cleanup runs
- pre-insert article dedupe exists
- frontend shell exists

What is not done yet:

- article-to-event extraction
- geocoded event creation
- public event query path
- real event map rendering
- weekly summary generation

## 9. Next Model Priorities

If another model takes over, the correct next order is:

1. confirm the improved ingest workflow is repopulating `articles`
2. build the first enrichment job from `articles` to `events`
3. define the first canonical event extraction payload
4. add geocoding or location assignment logic
5. expose safe read-path event queries
6. wire the frontend to live event data

## 10. Things The Next Model Should Not Redesign

- do not split industries into separate Supabase projects
- do not replace Python ingestion with TypeScript
- do not replace the locked `0-5` severity model
- do not remove `event_articles`
- do not add paid infrastructure without explicit user approval
