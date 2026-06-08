# Multi-Industry News Mapper Plan

## 1. Project Summary

Build a geospatial news intelligence platform that maps supply chain events, trade restrictions, outages, logistics disruptions, and other industry-relevant developments onto an interactive world map.

The long-term goal remains a multi-industry platform. The current POC is deliberately narrower so the full ingest-to-map path can be proven.

## 2. Locked POC Scope

The current first-slice scope is locked to:

1. `Semiconductors`
2. `Oil & Gas`

Current strategy constraints:

- curated public sources only
- RSS first
- free infrastructure only
- GitHub Actions scheduling
- Supabase as the single database

Critical minerals remains a later-phase expansion.

## 3. What Already Exists

The project is now past pure planning.

Implemented foundation:

- GitHub repo is active and being used as the system of record
- Supabase project exists and is live
- initial schema is applied
- reference seed data is applied
- source registry is seeded
- GitHub Actions workflow exists and runs
- retention cleanup exists and runs
- a Next.js frontend shell exists
- enrichment contracts and prompt scaffolding exist

Important current state:

- runtime data was reset intentionally on `2026-06-08`
- the next ingest cycle should refill `articles` from a clean base

## 4. Current Architecture

### Frontend

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`
- app lives in `web/`

### Ingestion

- `Python`
- scripts live in `ingestion/`
- scheduler is GitHub Actions
- workflow file: `.github/workflows/ingest-sources.yml`

### Database

- `Supabase Postgres`
- `PostGIS`
- schema and policies live under `supabase/migrations/`

## 5. Current Data Model Direction

The system separates source documents from product intelligence.

Core entities:

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

Important lock:

- article-to-event traceability uses `event_articles`
- do not revert to a single `source_article_id` field on `events`

## 6. Current Ingestion Behavior

Current ingest pipeline behavior:

1. fetch enabled feeds from the curated source registry
2. normalize article records
3. normalize URLs and strip tracking parameters
4. collapse syndicated duplicates before database write
5. skip hashes already present in Supabase
6. write new `articles`
7. run retention cleanup
8. upload ingestion snapshot artifact

Current cleanup rule:

- delete `articles` older than `14` days
- preserve any article already linked through `event_articles`

Current schedule:

- every 6 hours

## 7. Severity Model

Locked `0-5` scale:

0. Neutral
1. Low Significance
2. Guarded
3. Elevated
4. Severe
5. Critical

Locked colors:

- `0` Green
- `1` Yellow
- `2` Orange
- `3` Red
- `4` Dark Purple
- `5` Black

## 8. Current Risks

### 8.1 Risk: no event layer yet

Current ingestion stores `articles`, but the POC is not complete until those become structured `events`.

### 8.2 Risk: partial RLS coverage

The ingest path has policy support, but broader read-path security still needs tightening before public app exposure.

### 8.3 Risk: frontend not yet wired to live event data

The web app scaffold exists, but it is not yet the finished map-driven product.

### 8.4 Risk: feed quality drift

Curated sources still need ongoing validation as feeds change or go stale.

## 9. Revised Delivery Phases

### Phase 0: Planning and Foundation

Status: complete enough for implementation.

Delivered:

- scope lock
- taxonomy lock
- source registry
- schema direction
- severity model
- planning docs

### Phase 1: Data Foundation

Status: substantially complete.

Delivered:

- Supabase project
- schema migrations
- seed data
- source registry seed
- ingest security and maintenance migrations

### Phase 2: Ingestion Pipeline

Status: working foundation.

Delivered:

- feed ingestion script
- scheduled GitHub Actions workflow
- retention cleanup
- ingest snapshot artifact
- pre-insert dedupe

Still needed:

- more source validation
- better feed health visibility

### Phase 3: AI Enrichment

Status: scaffold only.

Delivered:

- prompt scaffold
- Python model contracts

Still needed:

- article-to-event extraction job
- event dedupe strategy
- geocoding strategy
- confidence and severity assignment logic

### Phase 4: Map Frontend

Status: scaffold only.

Delivered:

- Next.js app shell
- bootstrap and health routes

Still needed:

- live event queries
- viewport-driven map loading
- filters
- event details

### Phase 5: Weekly Intelligence Layer

Status: not started beyond schema support.

## 10. Immediate Next Steps

The best next sequence from the current state is:

1. Let the improved ingest workflow repopulate `articles`
2. Build the first article-to-event enrichment job
3. Decide the first event type extraction rubric for the POC
4. Add geocoding or canonical coordinate assignment for extracted events
5. Enable event read-path RLS and public-safe query access
6. Wire the frontend shell to real event queries
7. Build map filters, list, and detail panel

## 11. Foundation Rules That Should Not Change

- Keep one Supabase project for this product for now
- Add more industries within the same schema, not separate projects
- Stay on free plans unless explicitly approved otherwise
- Keep curated sources ahead of broad scraping
- Treat events, not articles, as the core product object

## 12. Definition of the Next Meaningful Milestone

The next milestone is no longer "schema exists."

The next meaningful milestone is:

`A clean ingest cycle repopulates articles, an enrichment job converts them into structured events, and the frontend can render those events on a map with severity and source traceability.`
