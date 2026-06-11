# IndustryMapper Structure Handover

Last updated: 2026-06-10

This file is for handover to another model. It describes the current repo structure, what each area owns, what is live today, and what the next model should treat as the implementation baseline.

## 1. Top-Level Layout

```text
.github/      GitHub Actions workflows
.harness/     planning, research, handover, and operating rules
data/         curated source registry and geospatial seed data
ingestion/    Python ingestion, enrichment, cleanup, prompts, models
supabase/     SQL migrations and seed data
tmp/          local runtime artifacts such as ingestion and enrichment snapshots
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

### `data/geo/country_centroids.json`

Purpose:

- early country-level geospatial assignment for enriched events

Current limitation:

- this is country-centroid quality, not true facility or city-quality geocoding

### `data/geo/location_aliases.json`

Purpose:

- alias and canonical-location lookup support for higher-quality event geospatial assignment

Current limitation:

- coverage is still selective, not a full global resolver, but live aliases now include targeted state, region, city, and facility upgrades used by `heuristic_v4`

## 4. `ingestion/`

Purpose:

- feed polling
- normalization
- dedupe
- event enrichment
- retention cleanup

Key files:

- `ingest_sources.py`
  - primary ingest script used by GitHub Actions
  - fetches feeds
  - normalizes article records
  - strips tracking parameters from URLs
  - deduplicates syndicated stories before insert
  - skips hashes already present in Supabase
  - writes ingestion snapshot artifact

- `enrich_events.py`
  - live article-to-event enrichment job
  - processes `pending` articles and can reprocess existing article states through env flags
  - creates `events`, `event_locations`, and `event_articles`
  - marks articles as `evented`, `neutral_intelligence`, `discarded`, or retryable `error`
  - writes enrichment snapshot artifact
  - current public extraction version is `heuristic_v4`
  - includes event-level dedupe, stronger confidence gates, richer outcome logging, and canonical location refresh logic
  - important rebuild caveat: article reclassification does not implicitly garbage-collect stale `events` rows, so event/article consistency should be checked after broad reprocess runs

- `generate_weekly_summaries.py`
  - Phase 5 draft summary generator
  - reads both `evented` items and neutral-intelligence articles
  - writes weekly draft rows into `weekly_summaries`
  - writes a weekly generation artifact under `tmp/weekly/`

- `cleanup_supabase.py`
  - calls the Supabase retention RPC after ingest and enrichment

- `models.py`
  - Python-side structured models for enrichment work

- `prompts/event_extraction.md`
  - first enrichment prompt scaffold

- `requirements.txt`
  - Python dependencies for Actions

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

- `20260608_002_ingest_api_policies.sql`
  - ingest-related RLS and token-gated write path

- `20260608_003_ingest_maintenance.sql`
  - retention cleanup RPC for old articles

- `20260610_004_event_enrichment_path.sql`
  - enrichment state columns
  - token-gated write path for enrichment-related tables

- `20260610_005_public_event_rpc.sql`
  - narrow public event read function
  - current safe read path for the frontend

- `20260610_006_phase34_refinements.sql`
  - phase 3 and 4 event-quality and geo-path upgrades

- `20260610_007_canonical_location_fix.sql`
  - canonical location handling and related event-location fixes

- `20260610_008_viewport_and_perf_hardening.sql`
  - viewport filtering fix for canonical geometries
  - RPC default extraction version update
  - performance indexes

- `20260610_009_public_briefing_articles.sql`
  - original safe public briefing RPC for live neutral headline surfacing

- `20260610_010_enrichment_taxonomy_and_briefings.sql`
  - adds `articles.enrichment_outcome_reason`
  - updates public briefings to read `neutral_intelligence` plus legacy `no_event`

- `20260611_011_weekly_summary_layer.sql`
  - expands `weekly_summaries` into a review-oriented Phase 5 table
  - adds stored payload, review status, generation version, and public weekly-summary RPC

- `20260611_012_weekly_summary_policies.sql`
  - adds ingest-token insert and update policies for `weekly_summaries`

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
- `articles` are populated
- current article enrichment state: `15 evented`, `124 neutral_intelligence`, `12 discarded`, `0 pending`, `0 error`
- `heuristic_v4` events are populated and visible through the RPC
- low-quality earlier event rows were removed during the quality rebuild

Live rebuild caveats that matter for handoff:

- one stale event row had to be deleted manually after its article was demoted from `evented` to `neutral_intelligence`
- canonical location refresh initially failed on the one-canonical-location constraint until the old canonical row was unset first
- public briefings intentionally still accept legacy `no_event` rows for compatibility, even though the current taxonomy uses `neutral_intelligence`

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
6. run `ingestion/enrich_events.py`
7. run `ingestion/cleanup_supabase.py`
8. upload ingestion and enrichment artifacts

Current schedule:

- every 6 hours

Important secret:

- `SUPABASE_INGEST_TOKEN`

## 7. `web/`

Purpose:

- Next.js frontend application

Key files:

- `src/app/page.tsx`
  - current homepage
  - live event and neutral-headline preview surface

- `src/app/map/page.tsx`
  - server-rendered map page shell
  - initial live data load for the globe experience

- `src/app/about/page.tsx`
  - product and architecture explainer page

- `src/app/weekly/page.tsx`
  - operator-facing review surface for weekly summary drafts

- `src/components/map-explorer.tsx`
  - live client-side globe map surface
  - severity-colored markers
  - URL-addressable filters
  - viewport-aware event loading
  - event selection and detail flow
  - neutral-headline card and modal for neutral-intelligence articles

- `src/app/api/events/route.ts`
  - API wrapper for live public event listing

- `src/app/api/briefings/route.ts`
  - API wrapper for safe public neutral-intelligence headline listing

- `src/app/api/bootstrap/route.ts`
  - bootstrap route for reference tables and sources

- `src/app/api/health/route.ts`
  - health endpoint

- `src/lib/events.ts`
  - helper for calling the public event RPC

- `src/lib/weekly-summaries.ts`
  - helper for calling the public weekly-summary RPC

- `src/lib/supabase/server.ts`
  - server-side Supabase client setup

- `src/lib/site.ts`
  - scope and severity constants used by the app shell

Current limitation:

- the app is now a true map UI, but dense-area overlap and clustering still need polish
- the app fetch path is backward-compatible across `heuristic_v4` and `heuristic_v3`, so a future cleanup should be careful not to break old data reads prematurely

## 8. Current Product State

What is already real:

- repo and workflow are live
- Supabase project is live
- schema is applied
- seeds are applied
- ingest pipeline runs
- enrichment pipeline runs
- retention cleanup runs
- pre-insert article dedupe exists
- narrow public event RPC exists
- frontend event console exists
- live map surface exists
- separated homepage and about pages exist
- viewport-driven event loading exists
- canonical-location viewport filtering is fixed
- live neutral-intelligence headline surface exists

What is not done yet:

- false-negative review of the stricter extractor
- broader plant, port, city, and state location coverage
- clustering and dense-marker overlap polish
- weekly summary generation
- first-pass weekly summary generation and review surface now exist
- a fully automated stale-event cleanup path when previously evented articles are later demoted

## 9. Next Model Priorities

If another model takes over, the correct next order is:

1. improve event extraction quality and reduce false negatives
2. measure false negatives across recent `neutral_intelligence` articles
3. improve geospatial assignment coverage
4. polish clustering and dense-area map interaction
5. tune live weekly summary draft quality and operator workflow

## 10. Refinement Guidance

The next model should not broadly revisit earlier phases.

Refine now:

- `Phase 3` event extraction quality
- `Phase 4` geospatial and event-surface quality

Leave for later:

- broad cleanup of `Phase 0-2`
- non-essential ingestion refactors
- general polish unrelated to event quality

## 11. Things The Next Model Should Not Redesign

- do not split industries into separate Supabase projects
- do not replace Python ingestion with TypeScript
- do not replace the locked `0-5` severity model
- do not remove `event_articles`
- do not broaden public data exposure casually
- do not add paid infrastructure without explicit user approval
