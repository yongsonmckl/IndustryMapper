# Multi-Industry News Mapper Plan

## 1. Project Summary

Build a geospatial news intelligence platform that maps supply chain events, tariffs, bans, sanctions, logistics disruptions, and other industry-relevant developments onto an interactive world map.

The long-term goal is a "one-for-all" global industry map that can support multiple sectors such as:

- Rare earths and critical minerals
- Oil and gas
- Semiconductors
- Manufacturing
- Energy and utilities
- Shipping and logistics
- Agriculture and food supply

The short-term goal is to produce a working POC/prototype by next week that proves the end-to-end flow:

1. Ingest selected articles from trusted sources
2. Extract structured events with AI
3. Classify each event by industry, type, location, and severity
4. Store events in Supabase
5. Display them on a map-driven frontend deployed on Vercel

## 2. Core Product Vision

The product should answer questions like:

- What major disruptions are happening right now in a given industry?
- Where are the hotspots geographically?
- Which countries, ports, companies, or supply chain nodes are affected?
- How severe is each event?
- What happened this week in semiconductors, oil and gas, or other tracked sectors?

This should feel like a fusion of:

- Geospatial intelligence map
- Multi-industry news monitor
- Supply chain risk tracker
- AI-assisted sector briefings

## 3. Planning Principles

To keep this project scalable, the foundation should be designed around structured entities rather than around raw articles alone.

Guiding principles:

- Industry-first data model so new sectors can be added without redesign
- Event-first UX so users see actionable incidents, not just article feeds
- Human-readable AI outputs with traceability back to source articles
- Gradual automation, starting from curated sources before broad scraping
- Clear confidence scoring so AI classifications are not treated as perfect
- POC scope must stay small enough to ship quickly

## 4. Recommended POC Scope

To avoid overbuilding, the first prototype should focus on a narrow but convincing slice.

Recommended POC constraints:

- Track 2 industries only in the first slice
- Use 10 to 20 reputable sources total
- Focus on one event ingestion cadence, such as daily or twice daily
- Extract only the most important event fields
- Show events on a world map plus a simple list/detail panel
- Generate one weekly summary per tracked industry

Locked initial industries:

1. Semiconductors
2. Oil and gas

Critical minerals or rare earths remain a later expansion phase after the first POC proves the data model and ingestion path.

## 5. Foundation First: Industry Model

Before building scrapers or agents, define how industries will exist in the system. This is the most important planning step because everything else depends on it.

### 5.1 Why this matters

If industries are treated as a loose article tag, the project will become messy as more sectors are added. Instead, industries should be first-class entities with their own taxonomy, keywords, sources, and summary logic.

### 5.2 Proposed industry structure

Each industry should have:

- `slug`
- `name`
- `description`
- `parent_industry` if applicable
- `status` such as active, planned, experimental
- `default_keywords`
- `priority_regions`
- `tracked_companies`
- `tracked_countries`
- `tracked_topics`
- `source_whitelist`

### 5.3 Proposed hierarchy

Use a two-layer model first:

1. Industry
2. Subsector

Example:

- Industry: Energy
- Subsector: Oil and Gas

- Industry: Advanced Manufacturing
- Subsector: Semiconductors

- Industry: Critical Materials
- Subsector: Rare Earths

This is flexible enough for the POC and can later expand into a richer taxonomy without breaking the schema.

### 5.4 Industry onboarding checklist

Every new industry added later should require:

1. Definition of scope
2. Approved source list
3. Topic keyword list
4. Event types relevant to that industry
5. Priority companies, countries, and infrastructure nodes
6. AI extraction prompt adjustments if needed
7. Summary template for weekly analysis

This checklist should become the standard operating model for scale.

## 6. Data Model Direction

The system should separate raw news from derived intelligence.

Recommended core entities:

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

### 6.1 Article vs Event

This distinction is critical:

- An article is the source document
- An event is the structured outcome extracted from the article

One article can produce multiple events, and multiple articles can refer to the same real-world event later on.

### 6.2 Minimum event fields for POC

Each event should ideally include:

- `title`
- `summary`
- `industry_id`
- `subsector_id`
- `event_type`
- `severity_score`
- `confidence_score`
- `event_status`
- `event_date`
- `detected_at`

Store geography in `event_locations`, and store article traceability in an `event_articles` join table instead of a single `source_article_id`.

### 6.3 Event type candidates

Start with a fixed controlled list:

- Tariff
- Import ban
- Export control
- Sanction
- Factory shutdown
- Port disruption
- Labor strike
- Policy change
- Supply shortage
- Investment announcement
- Accident or disaster
- Conflict-related disruption

## 7. AI Role in the System

AI should enrich and structure the data, not act as an unsupervised truth engine.

Recommended AI responsibilities:

- Determine whether an article contains a real trackable event
- Extract event summary
- Classify industry and subsector
- Assign event type
- Estimate severity
- Extract places, countries, and affected entities
- Generate weekly sector summaries

AI should not be trusted blindly for:

- Exact facts without source traceability
- Geolocation without validation
- Deduplication without rules

## 8. Ingestion Strategy

For the POC, prefer a reliable, narrow ingestion pipeline over a massive scraper network.

### 8.1 Recommended first approach

Use a source registry with either:

- RSS feeds where available
- Simple site-specific scrapers for a small number of trusted outlets
- Manual seed URLs for early testing

### 8.2 Example source categories

- Reuters
- Bloomberg if licensed/accessible
- Financial Times if licensed/accessible
- Industry trade publications
- Government trade and customs announcements
- Sanctions or export-control notices
- Maritime and logistics news sources

### 8.3 GitHub Actions role

GitHub Actions can handle:

- Scheduled scraping
- Parsing jobs
- AI enrichment jobs
- Summary generation jobs
- Health checks and alerts

But for the POC, keep the pipeline simple and observable before going fully autonomous.

## 9. Frontend Direction

The first version should communicate signal quickly.

### 9.1 Primary website language

The website should be built in `TypeScript`.

This is the best fit for the project because it offers:

- Strong alignment with Next.js and Vercel
- Safer shared types across filters, map layers, events, and API payloads
- Faster frontend iteration for a map-heavy product
- Better long-term maintainability than a loosely typed frontend

### 9.2 Recommended frontend stack

Recommended stack:

- `Next.js` App Router
- `React`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`

Recommended UI components:

- World map with event pins or clusters
- Left sidebar for filters
- Feed/list of recent events
- Detail panel for selected event
- Industry filter
- Event type filter
- Severity filter
- Date range filter

POC design rule:

- Prioritize clarity and usefulness over visual complexity

## 10. Mapping Strategy

The map is a core part of the product, so the stack should be selected intentionally rather than treated as a generic embed.

### 10.1 Recommended map stack

Recommended stack:

- `MapLibre GL JS` for the core map engine
- `react-map-gl/maplibre` as the React integration layer
- `deck.gl` for advanced overlays when needed

This is the preferred direction because it supports:

- Fast vector rendering
- Custom map styling
- Smooth clustering and filtering
- Rich overlay layers for future supply chain visualization
- An open-source-first approach

### 10.2 Recommended basemap approach

Recommended progression:

1. `OpenFreeMap` for the first prototype
2. `Protomaps PMTiles` if more control is needed later
3. Self-hosted `OpenFreeMap` or `OpenMapTiles` stack if scale demands it

### 10.3 Map rule

Do not plan around `tile.openstreetmap.org` as the production basemap source.

## 11. Supabase and Vercel Responsibilities

### 11.1 Supabase

Use Supabase for:

- Relational data storage
- `PostGIS` geospatial querying
- Authentication if needed later
- Row-level access if multi-user access is introduced
- Edge Functions only if they simplify some ingestion or processing flow

### 11.2 Vercel

Use Vercel for:

- Frontend hosting
- Scheduled or server-side routes if needed
- Preview deployments during rapid iteration

## 12. Implementation Language Split

This project should use a practical split instead of forcing everything into one language.

### 12.1 TypeScript responsibilities

Use `TypeScript` for:

- Frontend pages and components
- Route handlers
- Shared types
- Event filtering logic
- Map layer configuration
- Data-fetching code in the web app

### 12.2 Python responsibilities

Use `Python` for:

- RSS polling
- Web scraping
- Article parsing and cleaning
- Scheduled ETL jobs
- AI enrichment orchestration
- Pre-ingestion normalization and dedupe helpers

## 13. POC Architecture Outline

Recommended high-level flow:

1. Scheduled scraper job runs
2. Articles are stored in `articles`
3. AI extraction processes each article
4. Structured events are written to `events`
5. Locations are geocoded and stored
6. Frontend fetches and maps filtered event data
7. Weekly summary job generates per-industry intelligence briefs

## 14. Locked Tech Stack

Recommended technology choices for the POC:

- Frontend framework: `Next.js`
- Frontend language: `TypeScript`
- UI layer: `React`
- Styling: `Tailwind CSS`
- Component primitives: `shadcn/ui`
- Hosting: `Vercel`
- Database: `Supabase Postgres`
- Geospatial database layer: `PostGIS`
- Map engine: `MapLibre GL JS`
- React map integration: `react-map-gl/maplibre`
- Advanced visualization overlays: `deck.gl`
- Scraping and ETL runtime: `Python 3`
- Scheduling: `GitHub Actions`
- Unit tests: `Vitest`
- End-to-end tests: `Playwright`

## 15. Key Risks and Mitigations

### 15.1 Risk: Over-scoping too early

Mitigation:

- Limit industries
- Limit sources
- Limit event types
- Ship a usable thin slice first

### 15.2 Risk: AI hallucination or bad classification

Mitigation:

- Store confidence scores
- Preserve source article links
- Use controlled vocabularies
- Add manual review capability later

### 15.3 Risk: Messy industry expansion

Mitigation:

- Finalize industry taxonomy early
- Treat industries as structured entities
- Define onboarding rules for each new sector

### 15.4 Risk: Duplicate events

Mitigation:

- Add event fingerprinting rules
- Compare title, location, date, entities, and event type
- Accept imperfect dedupe in the POC, but design for improvement

## 16. Proposed Delivery Phases

### Phase 0: Planning and Foundation

Deliverables:

- Project scope
- Industry taxonomy draft
- Core data model draft
- Source strategy draft
- `PLAN.md`
- `AGENTS.md`

### Phase 1: Data Foundation

Deliverables:

- Supabase schema
- Seed data for industries and subsectors
- Source registry
- Event type registry

### Phase 2: Ingestion Pipeline

Deliverables:

- Article ingestion script
- Scheduler setup
- Initial parsers for trusted sources
- Article storage pipeline

### Phase 3: AI Enrichment

Deliverables:

- Event extraction prompt
- Classification logic
- Severity framework
- Confidence scoring

### Phase 4: Map Frontend

Deliverables:

- Interactive map
- Filters
- Event list and detail view
- Basic dashboard layout

### Phase 5: Weekly Intelligence Layer

Deliverables:

- Industry summary generation
- Summary storage
- Summary display

## 17. Proposed Severity Framework

A simple severity model is enough for the POC.

Locked 0 to 5 scale:

0. Neutral: material industry news without a clear disruption or risk signal
1. Low Significance: minor local relevance or early signal
2. Guarded: contained operational or policy impact
3. Elevated: regional disruption or major company-level impact
4. Severe: major cross-border or multi-company disruption
5. Critical: global supply chain or geopolitical impact

This should be paired with a confidence score so severity is never shown without context.

Locked color mapping:

- `0` Green
- `1` Yellow
- `2` Orange
- `3` Red
- `4` Dark Purple
- `5` Black

## 18. Suggested Next-Week POC Milestone

If the goal is a prototype by next week, the most realistic target is:

"A map showing AI-extracted events for semiconductors and oil and gas from a curated source list, with filtering by industry, event type, and severity."

That is ambitious but still achievable if scope is held tightly.

## 19. Immediate Next Steps

`AGENTS.md` has been created. The next build step is to turn this plan into implementation work, starting with the foundation choices below.

### Foundation decisions to lock in first

1. Initial industries for the POC
2. Industry and subsector taxonomy format
3. Initial event type list
4. Minimum event schema
5. Source shortlist
6. Severity scoring rubric

Current status:

- initial industries locked
- taxonomy drafted
- source shortlist drafted
- severity scoring rubric locked
- schema drafted

## 20. Recommended Decisions

If no major objections come up, I recommend the project starts with:

1. Industries: Semiconductors and Oil and Gas
2. Taxonomy: `industry -> subsector`
3. Core units: `article -> event -> mapped location`, with `event_articles` handling article-to-event traceability
4. POC sources: curated, reputable, low-volume
5. Website language: `TypeScript`
6. Ingestion language: `Python`
7. Map stack: `MapLibre GL JS` + `react-map-gl/maplibre` + `OpenFreeMap`
8. Automation: scheduled ingestion first, autonomous expansion later

## 21. Definition of a Good Foundation

The foundation is good if:

- Adding a new industry does not require database redesign
- Articles and events are clearly separated
- AI outputs are structured and traceable
- The map can scale from one sector to many
- The POC can be built quickly without boxing the product into a bad architecture
- The website and ingestion responsibilities are clearly split between TypeScript and Python

---

This document is meant to guide the build order and prevent premature over-engineering. `AGENTS.md` now complements this plan by translating it into operational roles, workflows, and automation responsibilities.
