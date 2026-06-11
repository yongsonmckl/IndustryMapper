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

The project is now well past pure planning.

Implemented foundation:

- GitHub repo is active and being used as the system of record
- Supabase project exists and is live
- initial schema is applied
- reference seed data is applied
- source registry is seeded
- country centroid data file exists for early geospatial assignment
- GitHub Actions workflow exists and runs
- retention cleanup exists and runs
- event enrichment exists and runs
- a Next.js homepage, map page, and about page exist
- a narrow public event RPC exists
- a public neutral-intelligence briefing RPC exists

Current runtime state as of `2026-06-10`:

- `151` articles ingested
- `15` articles classified as event-bearing
- `124` articles classified as neutral intelligence
- `12` articles classified as discarded noise
- `0` articles pending enrichment
- `15` `heuristic_v4` events exposed to the app

Important current state:

- runtime data was reset intentionally on `2026-06-08`
- the old exploratory `heuristic_v1` event batch has already been deleted
- low-quality `heuristic_v2` event rows were later removed during the `2026-06-10` quality rebuild
- the current app surface prefers `heuristic_v4` with `heuristic_v3` fallback

## 4. Current Architecture

### Frontend

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`
- app lives in `web/`
- live route reads through a narrow public RPC, not raw table reads
- current UI is dark-mode and route-separated into `Home`, `Map`, and `About`

### Ingestion and enrichment

- `Python`
- scripts live in `ingestion/`
- scheduler is GitHub Actions
- workflow file: `.github/workflows/ingest-sources.yml`

Current pipeline order:

1. ingest sources
2. enrich pending articles into events
3. run retention cleanup
4. upload artifacts

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

## 6. Current Ingestion and Enrichment Behavior

Current automation behavior:

1. fetch enabled feeds from the curated source registry
2. normalize article records
3. normalize URLs and strip tracking parameters
4. collapse syndicated duplicates before database write
5. skip hashes already present in Supabase
6. write new `articles`
7. enrich `pending` articles into `events`
8. run retention cleanup
9. upload artifacts

Current cleanup rule:

- delete `articles` older than `14` days
- preserve any article already linked through `event_articles`

Current schedule:

- every 6 hours

Current enrichment notes:

- heuristic event extraction is live
- non-event filtering is active
- location assignment now prefers canonical resolved locations and falls back to country-level geometry only when necessary
- event-level dedupe is active
- `heuristic_v4` is the current public extraction version

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

### 8.1 Risk: event quality is still heuristic

The event path is live, but the current extraction logic is still conservative heuristic classification rather than a reviewed AI-plus-rules pipeline.

### 8.2 Risk: legacy exploratory derived rows still exist

This risk is now cleared. `heuristic_v1` rows have been deleted.

### 8.3 Risk: location coverage is still shallow

Canonical location handling is better than the first centroid-only pass, but facility, port, and city resolution still needs broader coverage and validation.

### 8.4 Risk: no actual map renderer yet

This risk is cleared. A live map renderer and event console are now implemented on top of the public RPC.

### 8.5 Risk: event recall may still be too strict

The `heuristic_v4` rebuild materially improved live coverage, but the neutral-intelligence pool is still large enough that false-negative review remains necessary.

## 9. Revised Delivery Phases

### Phase 0: Planning and Foundation

Status: complete.

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

Status: live and functioning.

Delivered:

- feed ingestion script
- scheduled GitHub Actions workflow
- retention cleanup
- ingest snapshot artifact
- pre-insert dedupe

### Phase 3: Event Enrichment

Status: implemented and rebuilt live.

Delivered:

- enrichment migration path
- article enrichment status tracking
- event extraction script
- country centroid seed file
- event/article linking
- enrichment artifact
- stronger non-event filtering
- event-level dedupe
- richer structured extraction fields
- confidence thresholds and retry-aware status handling
- backlog fully reprocessed into `heuristic_v4`

Still needed:

- false-negative review on recent `neutral_intelligence` articles
- broader subsector and location coverage as live volume grows
- stronger QA reporting around drift over time

### Phase 4: Event Frontend

Status: baseline implementation complete.

Delivered:

- live event RPC
- live neutral-headline RPC
- event API route
- neutral-headline API route
- server-rendered event console
- live map renderer
- real MapLibre globe renderer
- severity-colored markers
- industry and severity filters
- event detail surface
- viewport-driven loading
- URL-addressable filter state
- persistent header/footer navigation
- separated `Home`, `Map`, and `About` routes
- clickable neutral-headline card with detail modal

Still needed:

- denser-area overlap and clustering polish
- broader mobile and desktop interaction QA
- richer filter polish once live event volume increases

### Phase 5: Weekly Intelligence Layer

Status: first bridge work has started through public neutral-headline surfacing, but summary generation is not implemented.

## 10. Immediate Next Steps

The best next sequence from the current state is:

1. review recent `neutral_intelligence` articles to measure `heuristic_v4` false negatives
2. improve location resolution coverage for plant, port, city, and state mentions
3. harden map interaction for dense marker overlap and clustering
4. add a lightweight evaluation and drift-reporting path after each enrichment run
5. add weekly summary generation
6. address broader Supabase security advisor warnings when product work allows

## 11. Refinement Policy

Do not broadly refine earlier phases right now.

The correct strategy is selective refinement:

- refine `Phase 3` where event extraction quality is weak
- refine `Phase 4` where geospatial or event-surface quality is weak

Leave these for later unless they become blockers:

- broad cleanup across `Phase 0`, `Phase 1`, or `Phase 2`
- major ingestion refactors that do not materially improve event quality
- polish passes that do not improve event trustworthiness
- deeper weekly-summary work before the event layer is stronger

## 12. Foundation Rules That Should Not Change

- Keep one Supabase project for this product for now
- Add more industries within the same schema, not separate projects
- Stay on free plans unless explicitly approved otherwise
- Keep curated sources ahead of broad scraping
- Treat events, not articles, as the core product object
- Prefer narrow RPC exposure over broad anonymous table reads

## 13. Definition of the Next Meaningful Milestone

The next milestone is now:

`The live map surface remains trustworthy after repeated production runs, with measured event quality, stronger location precision, and clear operator visibility into drift or regressions.`
