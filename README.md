# IndustryMapper

IndustryMapper is a geospatial industry intelligence platform for tracking live developments across `Semiconductors` and `Oil & Gas`.

Version `1.0` combines a scheduled ingestion pipeline, structured event extraction, a live interactive map, and a weekly intelligence review surface in one product.

## Version 1.0 Features

### Live Map Surface

- Interactive `Map` and `Globe` views powered by `MapLibre GL JS`
- Live event markers with severity-based styling
- Industry, event type, and severity filtering
- Viewport-aware event loading
- Persistent event popups with jump-to-detail flow
- Event detail cards with linked source context
- Neutral-intelligence sidebar for non-map-promoted but still relevant coverage

### Weekly Intelligence

- Dedicated `/weekly` route for review-oriented summaries
- Per-industry collapsible weekly summary cards
- Stored event highlights, neutral watchlists, source mix, and pattern summaries
- Operator review states for `draft`, `reviewed`, and `published`

### Ingestion and Enrichment

- Scheduled RSS-first source ingestion through `GitHub Actions`
- Curated public-source registry
- Article normalization and pre-insert deduplication
- Structured event extraction with `heuristic_v4` as the main public baseline
- Event/article traceability through `event_articles`
- Canonical location assignment for map display
- Retention cleanup for older articles

### Product Routes

- `/` Home
- `/map` Live event map
- `/weekly` Weekly intelligence review
- `/about` Product overview

## Scope

Version `1.0` is intentionally scoped to:

1. `Semiconductors`
2. `Oil & Gas`

The next feature wave is planned under `.harness/Ver 1.1/`.

## Severity Model

IndustryMapper uses a locked `0-5` severity scale:

- `0` Neutral
- `1` Low Significance
- `2` Guarded
- `3` Elevated
- `4` Severe
- `5` Critical

These values drive marker styling and event emphasis throughout the app.

## Stack

### Frontend

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`

### Data and Backend

- `Supabase Postgres`
- `PostGIS`

### Mapping

- `MapLibre GL JS`

### Ingestion and Automation

- `Python 3`
- `GitHub Actions`

### Hosting

- `Vercel`

## Repository Structure

```text
.github/      GitHub Actions workflows
.harness/     Versioned planning and handoff docs
data/         Source registry and geospatial seed data
ingestion/    Python ingestion, enrichment, cleanup, weekly generation
supabase/     SQL migrations and seed data
tmp/          Local artifacts and snapshots
web/          Next.js application
```

## Key Application Areas

### `web/`

- `src/app/page.tsx` homepage
- `src/app/map/page.tsx` map page shell
- `src/app/weekly/page.tsx` weekly review surface
- `src/app/about/page.tsx` product overview
- `src/components/map-explorer.tsx` main interactive map client

### `ingestion/`

- `ingest_sources.py` feed ingestion
- `enrich_events.py` article-to-event enrichment
- `generate_weekly_summaries.py` weekly summary generation
- `cleanup_supabase.py` retention cleanup

### `supabase/`

- `migrations/` schema, policies, and RPCs
- `seeds/` reference industries, subsectors, severity levels, event types, and sources

## Local Development

### App

From the repo root:

```bash
npm run dev
```

Or directly from the app directory:

```bash
cd web
npm run dev
```

### Build

From the repo root:

```bash
npm run build
```

### Lint

From the repo root:

```bash
npm run lint
```

## Environment

The web app expects Supabase environment variables for server-side reads.

The ingestion pipeline expects:

- `SUPABASE_URL`
- `SUPABASE_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_INGEST_TOKEN`

The frontend expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deployment

The web app is deployed on `Vercel`.

This repo also includes root-level Vercel build configuration so Git-triggered deployments build the actual app under `web/`.

## Planning Docs

Versioned planning and handoff docs live under:

- `.harness/Ver 1.0/`
- `.harness/Ver 1.1/`

## Source

GitHub repository:

[https://github.com/yongsonmckl/IndustryMapper](https://github.com/yongsonmckl/IndustryMapper)
