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
- a Next.js frontend event console exists
- a narrow public event RPC exists

Current runtime state as of `2026-06-10`:

- `133` articles ingested
- `26` articles classified as event-bearing
- `107` articles classified as no-event
- `14` `heuristic_v2` events exposed to the app

Important current state:

- runtime data was reset intentionally on `2026-06-08`
- a first exploratory `heuristic_v1` event batch still exists in the database
- the current app surface intentionally filters to `heuristic_v2`

## 4. Current Architecture

### Frontend

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`
- app lives in `web/`
- live route reads through a narrow public RPC, not raw table reads

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
- early location assignment currently relies on country centroid matches
- `heuristic_v2` is the current public extraction version

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

The app hides `heuristic_v1`, but those rows still exist in the database until explicit destructive cleanup is approved.

### 8.3 Risk: location coverage is still shallow

Country centroid mapping is enough for the first surface, but not enough for true map quality.

### 8.4 Risk: no actual map renderer yet

The event console and detail flow are live, but the map layer itself is not yet implemented.

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

Status: first live implementation exists.

Delivered:

- enrichment migration path
- article enrichment status tracking
- event extraction script
- country centroid seed file
- event/article linking
- enrichment artifact

Still needed:

- stronger event filtering
- better subsector coverage
- stronger geospatial assignment
- long-term event dedupe

### Phase 4: Event Frontend

Status: first live implementation exists.

Delivered:

- live event RPC
- event API route
- server-rendered event console
- industry and severity filters
- event detail surface

Still needed:

- actual map renderer
- viewport-driven geo queries
- richer event filtering

### Phase 5: Weekly Intelligence Layer

Status: not started beyond schema support.

## 10. Immediate Next Steps

The best next sequence from the current state is:

1. improve enrichment quality and remove obvious false positives
2. decide whether to wipe legacy `heuristic_v1` derived rows
3. improve geospatial assignment beyond country centroids
4. build the first real map surface on top of the existing event RPC
5. add weekly summary generation
6. harden observability around enrichment drift

## 11. Foundation Rules That Should Not Change

- Keep one Supabase project for this product for now
- Add more industries within the same schema, not separate projects
- Stay on free plans unless explicitly approved otherwise
- Keep curated sources ahead of broad scraping
- Treat events, not articles, as the core product object
- Prefer narrow RPC exposure over broad anonymous table reads

## 12. Definition of the Next Meaningful Milestone

The next milestone is now:

`A stable map surface renders only high-confidence live events from the current pipeline, with acceptable location quality and traceable links back to source articles.`
