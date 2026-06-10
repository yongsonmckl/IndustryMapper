# IndustryMapper Agents Guide

## Mission

IndustryMapper is a multi-industry geospatial news intelligence platform that ingests trusted public sources, extracts structured real-world events, and exposes them through a map-first intelligence surface.

## Current POC Lock

The active POC scope is locked to:

1. `Semiconductors`
2. `Oil & Gas`

Critical minerals remains a later-phase expansion, not part of the first implementation slice.

## Current Live State

The project is in active implementation, not planning-only.

Current live foundation:

- GitHub repo: `yongsonmckl/IndustryMapper`
- Supabase project: `industrymapper`
- Supabase ref: `uwfpjwlkypryqhfmbybj`
- Supabase URL: `https://uwfpjwlkypryqhfmbybj.supabase.co`
- Frontend app exists in `web/`
- Ingestion and enrichment runtime exists in `ingestion/`
- Scheduled workflow exists in `.github/workflows/ingest-sources.yml`

Current runtime state as of `2026-06-10`:

- `133` articles have been ingested
- enrichment has processed the current article backlog
- `26` articles are marked `evented`
- `107` articles are marked `no_event`
- `14` `heuristic_v2` events are currently exposed through the safe public read path

Important operational note:

- Runtime data was intentionally reset on `2026-06-08`
- A first exploratory `heuristic_v1` event batch still exists in the database
- The app and public RPC are deliberately filtered to `heuristic_v2` only
- Removing the old `heuristic_v1` derived rows is a separate destructive cleanup decision

## Current Source of Truth

The authoritative implementation state is split as follows:

- Planning and handoff: `.harness/`
- Database schema and policies: `supabase/migrations/`
- Seeded reference data: `supabase/seeds/`
- Source registry: `data/sources/initial_sources.json`
- Geography seed data: `data/geo/country_centroids.json`
- Ingestion runtime: `ingestion/`
- Frontend application: `web/`

## Primary Build Decision

Use a polyglot stack with a strict split of responsibilities:

- `TypeScript` for the website, route handlers, and shared application types
- `Python` for feed ingestion, article normalization, dedupe, and scheduled ETL

Do not collapse the stack into one language for convenience.

## Locked Tech Stack

### Application

- Framework: `Next.js` App Router
- Language: `TypeScript`
- UI runtime: `React`
- Hosting target: `Vercel` free plan only
- Styling: `Tailwind CSS`

### Data and backend

- Database: `Supabase Postgres`
- Geospatial extension: `PostGIS`
- Auth: `Supabase Auth` only if login becomes necessary later

### Mapping

- Base map renderer target: `MapLibre GL JS`
- React wrapper target: `react-map-gl/maplibre`
- Advanced overlays later: `deck.gl`

### Ingestion and automation

- Scraper runtime: `Python 3`
- Scheduler: `GitHub Actions`
- Schedule: every 6 hours
- Retention cleanup: automated after each ingest run
- Enrichment: automated after each ingest run

## Stack Rules

### Rule 1: Website code lives in TypeScript

All user-facing product code should default to TypeScript:

- pages
- components
- route handlers
- filter logic
- map layer configuration
- frontend data loading
- shared schema types

### Rule 2: Ingestion and enrichment live in Python

All scheduled source collection and article processing code should default to Python:

- RSS polling
- scraper jobs
- article extraction
- normalization
- dedupe prechecks
- event extraction
- enrichment orchestration

### Rule 3: Database remains the source of truth

The truth lives in Supabase tables and SQL functions, not in the frontend.

### Rule 4: Events are more important than articles

Articles are evidence.
Events are product objects.

### Rule 5: Keep the POC thin

Avoid adding:

- microservices
- Kafka
- Redis
- custom auth
- vector search
- paid infrastructure

until the POC proves the need.

## Current Data Model Expectations

Agents should align to the existing schema direction:

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

### Current taxonomy lock

Semiconductors:

- `EDA and Semiconductor IP`
- `Fabless Chip Design`
- `Foundry and Wafer Fabrication`
- `Integrated Device Manufacturers`
- `Semiconductor Equipment`
- `Materials and Wafers`
- `Assembly, Packaging, and Test`
- `Memory Devices`

Oil & Gas:

- `Upstream Exploration and Production`
- `Oilfield Services and Drilling`
- `Midstream Transportation and Storage`
- `Gas Processing and LNG`
- `Refining`
- `Petrochemicals and NGLs`
- `Fuel Marketing and Distribution`

### Severity model lock

Use a `0-5` severity scale:

- `0 Neutral` = Green
- `1 Low Significance` = Yellow
- `2 Guarded` = Orange
- `3 Elevated` = Red
- `4 Severe` = Dark Purple
- `5 Critical` = Black

Frontend map markers should derive color state directly from this severity scale.

## Current Ingestion and Enrichment Rules

The current automation path is intentionally narrow:

- RSS-first
- curated public sources only
- dedupe before database write
- event extraction after ingest
- retention cleanup after enrichment

Current implementation notes:

- `ingest_sources.py` normalizes URLs
- tracking parameters are stripped from URLs for uniqueness
- syndicated duplicate stories are collapsed before insert
- one winner is chosen across duplicate candidates based on source reliability, summary richness, and timestamp presence
- existing article hashes already in Supabase are skipped before insert
- `enrich_events.py` processes pending articles into events
- conservative non-event filtering is active
- only `heuristic_v2` events are used by the app read path
- `cleanup_supabase.py` runs retention cleanup after enrichment

Retention rule:

- delete `articles` older than `14` days
- do not delete articles already linked via `event_articles`

## Current Security and Ops Rules

- Keep the project on the free plan unless the user explicitly authorizes a paid change
- Do not add a credit card or paid service path
- Keep GitHub Actions secrets minimal
- Prefer publishable-key plus scoped ingest token flows over broader service-role usage in scheduled jobs
- Prefer narrow RPC exposure over broad anonymous table reads

Current known secret:

- `SUPABASE_INGEST_TOKEN`

Current public read pattern:

- do not expose raw event tables broadly
- expose live product data through a narrow public RPC

## Frontend Architecture Rules

- Use Server Components for page shells and initial data loading
- Use Client Components only where interaction is required
- Keep filters URL-addressable where practical
- Keep map interaction state close to the map UI
- Build around real Supabase-backed data contracts, not long-lived mocks

## Agent Roster

## 1. Product Architect Agent

Owns:

- scope control
- architecture consistency
- implementation sequence
- tradeoff decisions

## 2. Data Model Agent

Owns:

- Supabase schema
- migrations
- event taxonomy
- severity model
- safe read/query surfaces

## 3. Source Registry Agent

Owns:

- curated source shortlist
- source metadata
- feed viability
- future source onboarding rules

## 4. Scraper Agent

Owns:

- RSS polling
- normalization
- dedupe
- retention-compatible ingest behavior

## 5. AI Enrichment Agent

Owns:

- event extraction prompts
- heuristic and model-based classification
- industry and subsector classification
- event type tagging
- severity scoring
- confidence scoring

## 6. Geospatial Agent

Owns:

- event coordinate strategy
- country and location assignment
- bounding-box query design
- map payload shape

## 7. Frontend Map Agent

Owns:

- live event console
- map UI
- filters
- event list and detail views
- cluster and severity rendering

## 8. QA and Observability Agent

Owns:

- workflow sanity
- ingestion and enrichment snapshots
- duplicate monitoring
- end-to-end checks from ingest to event console

## Build Order From Here

The foundation is now far enough along to move in this order:

1. improve event extraction quality and false-positive controls
2. decide whether to wipe legacy `heuristic_v1` derived rows
3. add canonical coordinate coverage beyond country centroids
4. build the actual map layer on top of the existing event RPC
5. add weekly summary generation
6. harden QA and observability

## Non-Negotiables

- Do not change the locked industry scope casually
- Do not treat raw articles as the final product object
- Do not add paid infrastructure without explicit approval
- Do not split industries into separate Supabase projects unless isolation becomes necessary
- Do not remove the curated-source-first approach before enrichment quality is proven

## Final Guidance

When in doubt:

- choose the simpler architecture
- keep the website in TypeScript
- keep the ingestion in Python
- keep the infrastructure free
- expose only narrow public read surfaces
- optimize for event clarity over feature count
