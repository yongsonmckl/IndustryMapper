# IndustryMapper Agents Guide

## Mission

IndustryMapper is a multi-industry geospatial news intelligence platform.

## Current POC Lock

The active POC scope is currently locked to:

1. `Semiconductors`
2. `Oil & Gas`

Critical minerals remains a later-phase expansion, not part of the first implementation slice.

Its job is to:

1. Ingest reputable articles and official notices
2. Extract structured real-world events from those sources
3. Classify events by industry, subsector, type, severity, and geography
4. Store those events in a queryable geospatial database
5. Display them on a fast interactive map with filters and weekly AI summaries

This document defines the operating rules, technology choices, and agent responsibilities for building the product.

## Primary Build Decision

Use a polyglot stack with a strict split of responsibilities:

- `TypeScript` is the primary language for the website, frontend, backend routes, and shared application types
- `Python` is the language for scraping, feed ingestion, article parsing, and scheduled ETL jobs

Do not build the whole system in one language just for purity. The best stack for this project is:

- TypeScript where interactivity, shared types, and Vercel integration matter
- Python where scraping, parsing, and automation matter

## Why This Is the Optimum Choice

### Website language: TypeScript

Use `TypeScript` for the website because it gives the best balance of:

- Fast iteration for a POC
- Strong compatibility with Next.js and Vercel
- Safer refactors through shared types
- Better maintainability for event schemas, filters, API contracts, and map layer configs
- Strong ecosystem support for modern React and geospatial UI libraries

Avoid choosing Python for the main website. It is excellent for data work, but it is not the best fit for a highly interactive map-first product deployed on Vercel.

### Scraper and ETL language: Python

Use `Python` for ingestion because it is better suited for:

- RSS and HTML parsing
- Scraping workflows
- Text cleaning and article preprocessing
- Scheduled background jobs
- Lightweight AI enrichment pipelines

Avoid writing scrapers inside the frontend app unless there is a very small utility case.

## Locked Tech Stack

### Application

- Framework: `Next.js` App Router
- Language: `TypeScript`
- UI runtime: `React`
- Hosting: `Vercel`
- Styling: `Tailwind CSS`
- UI primitives: `shadcn/ui`

### Data and backend

- Database: `Supabase Postgres`
- Geospatial extension: `PostGIS`
- Auth: `Supabase Auth` only if login becomes necessary
- Storage: `Supabase Storage` for saved exports, snapshots, or source artifacts if needed later

### Mapping

- Base map renderer: `MapLibre GL JS`
- React wrapper: `react-map-gl/maplibre`
- Advanced overlays: `deck.gl`

### Ingestion and automation

- Scraper runtime: `Python 3`
- Scheduling: `GitHub Actions` for the POC
- Parsing sources: RSS first, targeted scrapers second, manual seed URLs for testing

### Testing and quality

- Unit tests: `Vitest`
- End-to-end tests: `Playwright`
- Linting and formatting: `ESLint` and project formatter of choice

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

### Rule 2: Ingestion code lives in Python

All scheduled source collection and article processing code should default to Python:

- RSS polling
- scraper jobs
- article extraction
- normalization
- enrichment orchestration
- dedupe prechecks

### Rule 3: Database remains the source of truth

Never let the frontend become the source of truth for event logic.

The truth lives in Supabase tables and database functions.

### Rule 4: Events are more important than articles

Articles are evidence.
Events are product objects.

Agents should always convert raw content into structured event data wherever possible.

### Rule 5: Keep the POC thin

Do not introduce extra systems unless they solve a real bottleneck.

Avoid adding:

- microservices
- Kafka
- Redis
- custom auth
- vector search
- real-time subscriptions

until the POC proves the need.

## Recommended Open-Source Map Direction

### Default choice

Use this mapping stack:

1. `MapLibre GL JS`
2. `react-map-gl/maplibre`
3. `deck.gl`
4. `OpenFreeMap` tiles for the first prototype

This is the best fit for a REEtracker-like experience because it supports:

- fast vector rendering
- custom basemap styling
- smooth zoom and pan
- clustered points
- 3D or pitched views later if wanted
- overlay layers for flows, regions, and severity visuals

### Why this choice wins

`MapLibre GL JS` gives the product an open-source, GPU-accelerated vector map engine.

`react-map-gl` is the best React-friendly wrapper when map state needs to stay synchronized with filters, detail panes, and overlay components.

`deck.gl` is the right addition when the product grows into:

- dense event clusters
- lines between origin and destination
- severity heat layers
- geospatial analysis overlays

### Basemap options

#### Option A: OpenFreeMap

Best for:

- fastest prototype path
- zero-key startup
- low-cost early development
- attractive default styles

Use this first unless traffic or uptime requirements force a move.

#### Option B: Protomaps PMTiles

Best for:

- a more self-contained, server-light setup
- single-file basemap delivery
- more infrastructure control later

This is an excellent future upgrade path if we want our own hosted open map assets.

#### Option C: Self-hosted OpenFreeMap or OpenMapTiles stack

Best for:

- higher scale
- more predictable availability
- deeper control over styles and tile hosting

Do not start here for the POC unless the prototype immediately needs enterprise-grade volume.

### Hard rule for maps

Do not use `tile.openstreetmap.org` directly for production basemaps.

It is fine as a reference ecosystem, but not as the product's scaling plan.

## Data Model Expectations

Agents should align to the existing plan:

- `industries`
- `subsectors`
- `sources`
- `articles`
- `events`
- `event_locations`
- `companies`
- `countries`
- `tags`
- `weekly_summaries`

### Current taxonomy lock

Use the following subsectors for the first implementation phase.

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

### Geospatial rules

- Use `PostGIS` for stored event geometry
- Store a canonical location point for each mapped event
- Design for bounding-box queries early
- Support one article creating many events
- Support many articles referring to one real-world event later
- Implement article-to-event traceability through a join table, not a single `source_article_id` column on `events`

### Severity model lock

Use a `0-5` severity scale:

- `0 Neutral` = Green
- `1 Low Significance` = Yellow
- `2 Guarded` = Orange
- `3 Elevated` = Red
- `4 Severe` = Dark Purple
- `5 Critical` = Black

Frontend map markers should derive color state directly from this severity scale.

## Frontend Architecture Rules

### Default architecture

- Use Server Components for page shells and initial data loading
- Use Client Components only where interaction is required
- Keep filters URL-addressable where practical
- Keep map interaction state close to the map UI

### UI goals

The product should feel:

- analytical
- operational
- map-first
- fast to scan
- more intelligence dashboard than blog feed

### REEtracker-style interpretation

Use the reference as inspiration, not as something to clone.

Desired direction:

- crisp vector basemap
- dark or muted operational palette
- strong event contrast
- side panel for filters and details
- highly readable markers and clusters
- a clean "intel map" feel

## Backend and Database Rules

### Supabase usage

Use Supabase for:

- relational event storage
- geospatial querying with PostGIS
- admin and analyst workflows later
- optional auth if the product becomes private

### Do not overbuild the backend

For the POC:

- prefer route handlers over separate backend services
- prefer SQL functions for reusable geo queries
- prefer migrations and seed data over ad hoc scripts

## Automation Rules

### GitHub Actions responsibilities

GitHub Actions may run:

- scheduled source ingestion
- scraper jobs
- article normalization
- AI enrichment
- weekly summary generation
- smoke checks

### POC scheduling principle

Start with predictable, visible, rerunnable jobs.

Do not aim for "fully autonomous" behavior before:

- ingestion quality is stable
- source failures are observable
- duplicate handling is acceptable
- event extraction quality is measurable

## Agent Roster

## 1. Product Architect Agent

Owns:

- scope control
- architecture consistency
- sequence of implementation
- tradeoff decisions

Rules:

- protect the thin-slice POC
- reject unnecessary infrastructure
- keep industry onboarding scalable

## 2. Data Model Agent

Owns:

- Supabase schema
- migrations
- event taxonomy
- industry and subsector structure
- severity model

Rules:

- industries are first-class entities
- articles and events must stay distinct
- geospatial queries must be designed in early

## 3. Source Registry Agent

Owns:

- source shortlist
- source metadata
- reputation rules
- feed and scraper configuration

Rules:

- favor reputable and stable sources
- document source-specific assumptions
- start curated before broadening coverage

## 4. Scraper Agent

Owns:

- RSS polling
- scraper implementation
- source parsing
- article normalization

Rules:

- use Python
- keep extraction deterministic before AI enrichment
- store raw source metadata for traceability

## 5. AI Enrichment Agent

Owns:

- event extraction prompts
- industry classification
- event type tagging
- severity scoring
- weekly summary generation

Rules:

- AI is an enrichment layer, not the source of truth
- keep confidence scoring on every important derived field
- preserve links back to the original article

## 6. Geospatial Agent

Owns:

- event coordinate strategy
- bounding-box query design
- map layer payload shape
- geographic validation rules

Rules:

- store canonical coordinates in the database
- optimize for viewport queries
- keep geometry simple in the POC

## 7. Frontend Map Agent

Owns:

- map UI
- filters
- event list/detail views
- clustering and overlay behavior

Rules:

- use TypeScript
- use MapLibre-based components
- keep UX centered on event discovery, not decorative visuals

## 8. QA and Observability Agent

Owns:

- smoke tests
- event quality checks
- deployment sanity checks
- scheduled job visibility

Rules:

- test the ingestion-to-map path, not just isolated components
- catch duplicate explosions early
- validate that new events actually render on the map

## Build Order

Agents should work in this order unless there is a strong reason not to:

1. Data model and seed taxonomy
2. Source registry
3. Scraper pipeline
4. AI enrichment pipeline
5. Map frontend shell
6. Geo query integration
7. Weekly summary layer
8. QA hardening

## Non-Negotiables

- Do not change the core taxonomy casually once seeded
- Do not treat raw articles as the final product object
- Do not build the frontend around mock-only assumptions for too long
- Do not add expensive infrastructure before the POC proves value
- Do not rely on a proprietary map stack when an open-source stack already fits the goal

## POC Success Definition

The POC is successful when:

- the two locked industries are seeded
- curated sources ingest on schedule
- articles become structured events
- events are visible on a world map
- filters work by industry, type, and severity
- users can click into event details with source traceability
- a weekly summary can be generated per industry

## Final Guidance

When in doubt:

- choose the simpler architecture
- keep the website in TypeScript
- keep the ingestion in Python
- keep the map stack open-source
- optimize for event clarity over feature count
