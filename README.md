# IndustryMapper

IndustryMapper is a multi-industry geospatial news intelligence platform that ingests trusted news and official notices, extracts real-world events, and maps them for fast, intuitive understanding.

## What It Does

IndustryMapper is designed to help users quickly understand where important industry developments are happening, what they affect, and how significant they are.

The platform is built to:

1. Ingest reputable articles and official notices
2. Extract structured real-world events from those sources
3. Classify events by industry, subsector, event type, severity, and geography
4. Store those events in a geospatial database
5. Display them on an interactive world map with filters and summaries

## Current POC Scope

The first implementation phase is intentionally narrow:

- Industries: `Semiconductors`, `Oil & Gas`
- Source strategy: curated public sources, RSS first
- Output: structured events with map locations and severity signals

Later industries can be added once the initial ingestion, schema, and frontend flow are proven.

## Product Direction

IndustryMapper is intended to feel closer to an operational intelligence dashboard than a traditional news feed.

Core user questions:

- What disruptions or developments are happening right now in a given industry?
- Where are the geographic hotspots?
- Which companies, countries, ports, plants, or infrastructure nodes are affected?
- How severe is the event?
- What changed this week in a tracked sector?

## Severity Model

The current event severity scale is:

- `0` Neutral
- `1` Low Significance
- `2` Guarded
- `3` Elevated
- `4` Severe
- `5` Critical

These levels map directly to frontend map styling so users can distinguish informative updates from high-risk events at a glance.

## Planned Stack

### Application

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS`
- `shadcn/ui`

### Data and infrastructure

- `Supabase Postgres`
- `PostGIS`
- `Vercel`

### Mapping

- `MapLibre GL JS`
- `react-map-gl/maplibre`
- `deck.gl`

### Ingestion and automation

- `Python 3`
- `GitHub Actions`

## Repository Structure

```text
.github/workflows/     GitHub Actions workflows
.harness/              Planning, agent guidance, and research notes
data/sources/          Initial curated source registry
ingestion/             Python ingestion pipeline scaffold
supabase/migrations/   Database schema migrations
supabase/seeds/        Reference seed data
```

## Current Status

The repository currently includes:

- locked POC planning documents
- subsector research for semiconductors and oil & gas
- an initial public source shortlist
- a first-pass Supabase schema
- reference seed data for industries, subsectors, severity levels, and event types
- a GitHub Actions-ready Python ingestion scaffold

## Next Steps

1. Create the Supabase project and apply the schema
2. Add project secrets for GitHub Actions
3. Expand the ingestion pipeline from feed capture into article normalization
4. Implement AI enrichment for event extraction and classification
5. Build the map-first frontend shell
6. Connect frontend filters to geospatial event queries

## Notes

The planning and research materials for the current phase are stored in:

- [.harness/PLAN.md](C:\Users\Wong\CodexProjects\IndustryMapper\.harness\PLAN.md)
- [.harness/AGENTS.md](C:\Users\Wong\CodexProjects\IndustryMapper\.harness\AGENTS.md)
- [.harness/RESEARCH.md](C:\Users\Wong\CodexProjects\IndustryMapper\.harness\RESEARCH.md)
