# IndustryMapper Version 1.0 Structure

Last updated: 2026-06-14

## 1. Top-Level Layout

```text
.github/      GitHub Actions workflows
.harness/     versioned planning and handoff docs
data/         source registry and geospatial seed data
ingestion/    Python ingestion, enrichment, weekly generation, cleanup
supabase/     SQL migrations and seeds
tmp/          local ingest and weekly artifacts
web/          Next.js frontend application
README.md     repo overview
```

## 2. `.harness/`

The doc structure is now versioned.

- `.harness/Ver 1.0/`
  - current closeout and handoff docs for the existing product baseline
- `.harness/Ver 1.1/`
  - planning docs for the next feature wave

The old top-level `.harness/*.md` files have been superseded by versioned folders.

## 3. `data/`

### `data/sources/initial_sources.json`

Owns the curated source registry for the current industries.

### `data/geo/country_centroids.json`

Owns fallback country-level geometry support.

### `data/geo/location_aliases.json`

Owns higher-quality canonical location resolution and aliases used by the enrichment path.

## 4. `ingestion/`

### `ingest_sources.py`

- RSS-first ingest entrypoint
- normalizes URLs
- strips tracking parameters
- deduplicates before insert

### `enrich_events.py`

- article-to-event pipeline
- writes `events`, `event_locations`, and `event_articles`
- manages enrichment outcome states
- current public extraction baseline is `heuristic_v4`

### `generate_weekly_summaries.py`

- builds draft weekly summary payloads
- writes rows into `weekly_summaries`
- outputs weekly artifacts under `tmp/weekly/`

### `cleanup_supabase.py`

- retention cleanup call after ingest and enrichment

## 5. `supabase/`

### `supabase/migrations/`

Important existing migration groups:

- core schema and ingest policies
- enrichment path and public event RPC
- canonical location and viewport hardening
- public neutral-intelligence briefing read path
- weekly summary schema and policies

### `supabase/seeds/`

- industries
- subsectors
- severity levels
- event types
- initial sources and mappings

## 6. `.github/workflows/ingest-sources.yml`

Current workflow path:

1. checkout
2. set up Python
3. validate required secrets
4. install dependencies
5. run ingestion
6. run enrichment
7. run cleanup
8. upload artifacts

## 7. `web/`

### `src/app/layout.tsx`

- shared header and footer navigation
- global shell

### `src/app/page.tsx`

- homepage
- live event preview
- neutral-intelligence preview
- feature overview

### `src/app/map/page.tsx`

- server-rendered map page shell
- initial event and briefing load

### `src/components/map-explorer.tsx`

This is the main interactive map client component.

Current responsibilities:

- projection toggle between `Map` and `Globe`
- filter controls
- viewport-aware fetch refresh
- projected marker overlay rendering
- persistent popups
- event detail card
- neutral-headline modal
- animation-frame marker reprojection during map movement
- no map-page history mutation during live interaction

This file remains the implementation baseline for Version 1.0, not a throwaway prototype.

### `src/app/weekly/page.tsx`

- weekly draft review surface
- collapsible industry cards
- event highlights, watchlist, source mix, and markdown display
- operator review-status controls

### `src/app/about/page.tsx`

- product explanation

### `src/lib/events.ts`

- helper for public event RPC access

### `src/lib/briefings.ts`

- helper for public neutral-intelligence briefing RPC access

### `src/lib/weekly-summaries.ts`

- helper for public weekly-summary RPC access

## 8. Version 1.0 State Summary

Already real:

- ingestion is live
- enrichment is live
- weekly draft generation is live
- live map surface is real
- weekly review route is real
- route-separated homepage, map, weekly, and about pages are real

Not fully finished:

- enrichment recall validation
- wider geospatial alias coverage
- live validation of stale-event cleanup after article reclassification
- weekly editorial quality tuning after review-status controls
- broader map regression verification after the latest interaction fix
