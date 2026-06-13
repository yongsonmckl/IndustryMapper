# IndustryMapper Agents Guide

Last updated: 2026-06-14

## Mission

IndustryMapper is a multi-industry geospatial intelligence platform that ingests trusted public reporting, converts map-worthy developments into structured events, and keeps broader supporting coverage available for weekly review.

## Version 1.0 Scope Lock

The active Version 1.0 product scope remains locked to:

1. `Semiconductors`
2. `Oil & Gas`

Critical minerals and broader scenario simulation are Version 1.1+ work, not Version 1.0 work.

## Current Product State

Current implemented product baseline:

- repo: `yongsonmckl/IndustryMapper`
- frontend app: `web/`
- ingestion runtime: `ingestion/`
- Supabase backend: `industrymapper`
- scheduled workflow: `.github/workflows/ingest-sources.yml`
- routes live in the app: `Home`, `Map`, `Weekly`, `About`
- live event surface exists
- weekly intelligence review surface exists
- Vercel deployment path exists for the web app

Current frontend baseline as of `2026-06-14`:

- map page supports both `Map` and `Globe` projections
- map markers use client-side projected overlays
- map popups persist until moved or manually closed
- weekly summaries are presented as collapsible industry cards
- home and about pages now describe the product rather than project status
- `/map` URL sync now uses `window.history.replaceState`, not Next router replacement
- marker projection updates are animation-frame synced to reduce visible lag while panning

Current runtime counts were last explicitly verified on `2026-06-10`:

- `151` recent articles ingested
- `15` articles marked `evented`
- `124` articles marked `neutral_intelligence`
- `12` articles marked `discarded`
- `0` articles marked `pending`
- `0` articles marked `error`
- `15` `heuristic_v4` events visible through the safe public read path

These counts should be treated as the last known validated snapshot, not a guarantee of the live value on `2026-06-14`.

## Current Source of Truth

The repo is now the implementation source of truth.

- versioned planning docs: `.harness/Ver 1.0/` and `.harness/Ver 1.1/`
- schema and policies: `supabase/migrations/`
- seed data: `supabase/seeds/`
- source registry: `data/sources/initial_sources.json`
- geographic seed data: `data/geo/`
- ingestion and enrichment: `ingestion/`
- frontend app: `web/`

## Locked Stack

### Application

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`
- hosting target: `Vercel`

### Data and backend

- `Supabase Postgres`
- `PostGIS`

### Mapping

- `MapLibre GL JS`

### Ingestion and automation

- `Python 3`
- `GitHub Actions`
- schedule: every `6` hours

## Current Data Model Expectations

The current model direction remains:

- `industries`
- `subsectors`
- `sources`
- `source_industries`
- `articles`
- `events`
- `event_locations`
- `event_articles`
- `companies`
- `countries`
- `tags`
- `event_tags`
- `weekly_summaries`

## Locked Taxonomy

### Semiconductors

- `EDA and Semiconductor IP`
- `Fabless Chip Design`
- `Foundry and Wafer Fabrication`
- `Integrated Device Manufacturers`
- `Semiconductor Equipment`
- `Materials and Wafers`
- `Assembly, Packaging, and Test`
- `Memory Devices`

### Oil & Gas

- `Upstream Exploration and Production`
- `Oilfield Services and Drilling`
- `Midstream Transportation and Storage`
- `Gas Processing and LNG`
- `Refining`
- `Petrochemicals and NGLs`
- `Fuel Marketing and Distribution`

## Locked Severity Model

Use the existing `0-5` scale:

- `0 Neutral`
- `1 Low Significance`
- `2 Guarded`
- `3 Elevated`
- `4 Severe`
- `5 Critical`

Frontend map styling should continue to derive marker state from this model.

## Agent Roster

## 1. Product Architect Agent

Owns:

- scope control
- implementation order
- handoff quality
- version boundary decisions

## 2. Data Model Agent

Owns:

- Supabase schema
- migrations
- RPC shape
- review-state modeling

## 3. Source Registry Agent

Owns:

- curated source list
- source metadata
- onboarding rules

## 4. Scraper Agent

Owns:

- RSS polling
- normalization
- canonical URL handling
- pre-insert dedupe

## 5. AI Enrichment Agent

Owns:

- event extraction logic
- severity scoring
- subsector and event-type classification
- false-negative review workflow

## 6. Geospatial Agent

Owns:

- canonical location assignment
- alias coverage
- event-to-location precision
- viewport query quality

## 7. Frontend Map Agent

Owns:

- map interaction
- filters
- marker rendering
- event detail experience
- projection behavior

## 8. Weekly Intelligence Agent

Owns:

- weekly summary generation
- summary payload quality
- draft, reviewed, and published workflow
- editorial watchlist quality

## 9. QA and Observability Agent

Owns:

- ingest and enrichment snapshots
- drift detection
- event count sanity checks
- end-to-end product verification

## Version 1.0 Closeout Position

Version 1.0 is functionally far along, but it is not fully closed.

### Completed enough for Version 1.0 baseline

- Phase 0 planning foundation
- Phase 1 data foundation
- Phase 2 scheduled ingestion pipeline
- Phase 3 first reliable enrichment path
- Phase 4 live frontend map experience
- Phase 5 first-pass weekly intelligence surface

### Still open before Version 1.0 should be considered fully hardened

- broader false-negative review inside `neutral_intelligence`
- wider canonical location coverage
- stale-event reconciliation when article status is downgraded after reprocessing
- weekly editorial workflow decision for `draft -> reviewed -> published`
- broader interaction QA after the latest `/map` navigation and marker-sync fix

## Non-Negotiables

- do not split industries into separate Supabase projects
- do not replace Python ingestion with TypeScript
- do not remove `event_articles`
- do not broaden anonymous raw-table reads
- do not add paid infrastructure without approval
- do not treat Version 1.1 scenario simulation as part of Version 1.0 closeout

## Final Guidance

When in doubt:

- keep Version 1.0 narrow
- prioritize event quality over feature count
- prefer explainable workflows over speculative AI complexity
- treat the current map page as a live surface that should be refined, not replaced
