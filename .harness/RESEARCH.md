# IndustryMapper Research

Last updated: 2026-06-10

This file captures the current planning and implementation-phase research that locks the first POC scope, subsector taxonomy, severity scale, source shortlist, infrastructure decisions, and the current enrichment strategy.

## Phase Scope Lock

The first POC industry scope is locked to:

1. `Semiconductors`
2. `Oil & Gas`

Critical minerals is deferred to a later phase so the first data model, source registry, and prompts can stay narrow.

## Subsector Research

### Semiconductors

The most useful POC taxonomy is a supply-chain and business-model oriented one, not a pure end-market taxonomy. The Semiconductor Industry Association ecosystem map explicitly breaks the ecosystem into R&D, IP and chip design software, chip design, fabrication, equipment, and materials. Samsung's ecosystem explainer also highlights `IDM`, `foundry`, `fabless`, `IP`, and `OSAT` as distinct operating roles.

Primary references:

- SIA ecosystem map: <https://www.semiconductors.org/ecosystem/>
- Samsung ecosystem explainer: <https://semiconductor.samsung.com/news-events/tech-blog/from-foundry-to-fabless-an-overview-of-the-semiconductor-ecosystem/>

Recommended semiconductor subsectors for the POC:

1. `EDA and Semiconductor IP`
2. `Fabless Chip Design`
3. `Foundry and Wafer Fabrication`
4. `Integrated Device Manufacturers`
5. `Semiconductor Equipment`
6. `Materials and Wafers`
7. `Assembly, Packaging, and Test`
8. `Memory Devices`

### Oil & Gas

The oil and gas value chain is consistently described in public official and trade sources as `upstream`, `midstream`, and `downstream`. EPA uses those three sectors directly. GPA Midstream expands the operational detail and places gathering, processing, transportation, and storage in midstream, while refining and petrochemical transformation sit downstream.

Primary references:

- EPA oil and gas sector overview: <https://www.epa.gov/smartsectors/oil-and-gas-sector-information>
- GPA Midstream explainer: <http://www.gpamidstream.org/about/what-is-midstream/>
- BOEM program site: <https://www.boem.gov/>

Recommended oil and gas subsectors for the POC:

1. `Upstream Exploration and Production`
2. `Oilfield Services and Drilling`
3. `Midstream Transportation and Storage`
4. `Gas Processing and LNG`
5. `Refining`
6. `Petrochemicals and NGLs`
7. `Fuel Marketing and Distribution`

## Severity Framework Research

Your requested `0-5` severity model remains the correct choice for the POC because it preserves relevant neutral news without forcing artificial risk inflation.

Locked severity model:

| Level | Label | Meaning | Color |
| --- | --- | --- | --- |
| `0` | `Neutral` | Material industry news with no clear disruption, restriction, or risk signal yet. | `Green` |
| `1` | `Low Significance` | Small local development, limited operational effect, or early signal worth monitoring. | `Yellow` |
| `2` | `Guarded` | Clear operational or policy development with contained impact. | `Orange` |
| `3` | `Elevated` | Regional disruption, notable trade restriction, plant outage, or meaningful logistics constraint. | `Red` |
| `4` | `Severe` | Cross-border or multi-company disruption with major supply chain implications. | `Dark Purple` |
| `5` | `Critical` | Systemic or globally material event with major geopolitical or supply chain consequences. | `Black` |

## Source Research

Selection rules used:

- publicly viewable without paid subscription requirement
- reputable trade, association, or government source
- useful for RSS-first or simple structured ingestion
- strong enough editorial or institutional credibility to support a curated POC

### Current actively enabled feeds

- `EE Times`
- `Electronics Weekly`
- `Semiconductor Today`
- `U.S. Energy Information Administration`
- `Rigzone`

Other researched sources remain part of the registry but may be disabled pending better feed or parser support.

## Ingestion Research Updates

The current implementation established several practical conclusions:

### 1. RSS-first remains correct

The sources that worked most reliably for fast implementation were the ones with stable feeds.

### 2. Pre-insert dedupe is necessary

Syndicated or near-identical stories can waste database space quickly on a small free-tier project.

Current dedupe strategy implemented in ingestion:

- normalize URLs
- strip common tracking parameters
- build uniqueness around canonical URL
- fall back to normalized title plus publish day when needed
- pick a single winner based on source reliability, summary richness, and timestamp presence
- skip hashes already stored in Supabase

### 3. Retention is necessary on the free plan

Current implemented rule:

- keep recent articles only
- current retention period: `14` days
- preserve articles already linked to `event_articles`

### 4. A clean reset was the right short-term move

Because only early ingest data existed and no event layer depended on it yet, resetting runtime data was simpler than trying to repair historical duplicates in place.

## Event Enrichment Research Updates

### 1. Conservative filtering is necessary

A large share of industry articles are informative but not map-worthy operational events.

The current live pipeline therefore filters aggressively:

- many articles are classified as `no_event`
- only a smaller subset are converted into event objects

### 2. Substring keyword matching is too loose

An early live pass produced false positives because naive substring matching can misread terms such as `war` inside `hardware`.

Current live fix:

- single-token keyword matching now uses word boundaries
- generic product-introduction wording was removed from event creation
- `heuristic_v2` is the current public extraction version

### 3. Early geospatial assignment is acceptable through country centroids

For the first live event surface, country centroid matching is good enough to move forward.

It is not sufficient for final map quality, but it is enough to:

- show the first geography-aware events
- support a first event console
- prove the article-to-event-to-location flow

## Public Read Path Research Updates

The safer design for the current POC is:

- keep raw tables protected
- expose a narrow public RPC for event consumption

Why this is better right now:

- smaller blast radius than broad anonymous table reads
- enough for the app to fetch product-safe event data
- cleaner upgrade path for future auth or policy refinement

## Infrastructure Research Updates

### Supabase project decision

The project is correctly using a single Supabase project for multiple industries.

Why this remains correct:

- easier cross-industry querying
- one schema and one ingest pipeline
- less duplicated operational overhead
- free-plan project count is limited

### GitHub Actions decision

GitHub Actions remains suitable for the POC because:

- jobs are visible
- jobs are rerunnable
- schedule is good enough for current source volume
- it avoids introducing extra paid infrastructure

## Schema Direction Changes From Earlier Planning

These design changes are now locked:

1. `events` should not point to a single `source_article_id`
   - use `event_articles` instead
2. dedupe must happen before insert, not only after storage growth becomes visible
3. article retention must be automated as part of the ingest workflow
4. article enrichment state must be tracked explicitly
5. public event consumption should go through a narrow RPC rather than broad raw table exposure

## Current Decision Summary

Locked for the first POC:

1. Industries: `Semiconductors`, `Oil & Gas`
2. Taxonomy model: `industry -> subsector`
3. Severity scale: `0-5`
4. Severity colors: `Green`, `Yellow`, `Orange`, `Red`, `Dark Purple`, `Black`
5. Source strategy: curated public sources with RSS-first ingestion
6. Database strategy: one Supabase project for many industries
7. Retention strategy: automated `14` day article retention
8. Dedupe strategy: pre-insert canonical article selection
9. Current public event version: `heuristic_v2`
