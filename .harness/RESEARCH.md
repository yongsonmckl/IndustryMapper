# IndustryMapper Research

Last updated: 2026-06-08

This file captures the current planning and implementation-phase research that locks the first POC scope, subsector taxonomy, severity scale, source shortlist, and current infrastructure decisions.

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

Why this structure:

- it maps directly to where disruptions actually happen
- it aligns with company archetypes users already recognize
- it is better for event extraction than product-only categories
- it scales later into product overlays without redesigning the core taxonomy

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

Why this structure:

- it matches the value chain used in public reporting
- it creates obvious event geography
- it separates physical disruptions from policy and market effects cleanly

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

UI note:

- the map icon and surrounding ring should derive directly from this severity value
- `0` should still render on the map, but read as informative rather than urgent

## Source Research

Selection rules used:

- publicly viewable without paid subscription requirement
- reputable trade, association, or government source
- useful for RSS-first or simple structured ingestion
- strong enough editorial or institutional credibility to support a curated POC

### Current registry status

Not every researched source is active in the current ingestion workflow.

Current actively enabled feeds are:

- `EE Times`
- `Electronics Weekly`
- `Semiconductor Today`
- `U.S. Energy Information Administration`
- `Rigzone`

Other researched sources remain part of the registry but may be disabled pending better feed or parser support.

### Researched semiconductor sources

1. `Semiconductor Industry Association (SIA)`
2. `SEMI Newsroom`
3. `Semiconductor Engineering`
4. `EE Times`
5. `Electronics Weekly`
6. `Semiconductor Today`
7. `Bureau of Industry and Security (BIS)`

### Researched oil & gas sources

8. `U.S. Energy Information Administration (EIA)`
9. `U.S. Department of Energy - Oil & Natural Gas News`
10. `Bureau of Ocean Energy Management (BOEM)`
11. `Rigzone`
12. `World Oil`
13. `Offshore Technology`
14. `Energy Voice`

## Ingestion Research Updates

The current implementation established several practical conclusions:

### 1. RSS-first remains correct

The sources that worked most reliably for fast implementation were the ones with stable feeds.

### 2. Pre-insert dedupe is necessary

Syndicated or near-identical stories can waste database space quickly on a small free-tier project.

Current dedupe strategy now implemented in ingestion:

- normalize URLs
- strip common tracking parameters
- build uniqueness around canonical URL
- fall back to normalized title plus publish day when needed
- pick a single winner based on source reliability, summary richness, and timestamp presence
- skip hashes already stored in Supabase

### 3. Retention is necessary on the free plan

Database storage is limited enough that retention should not be treated as optional.

Current implemented rule:

- keep recent articles only
- current retention period: `14` days
- preserve articles already linked to `event_articles`

### 4. A clean reset was the right short-term move

Because only early ingest data existed and no event layer depended on it yet, resetting runtime data was simpler than trying to repair historical duplicates in place.

## Infrastructure Research Updates

### Supabase project decision

The project is correctly using a single Supabase project for multiple industries.

Why this is still the right decision:

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

## Current Decision Summary

Locked for the first POC:

1. Industries: `Semiconductors`, `Oil & Gas`
2. Taxonomy model: `industry -> subsector`
3. Semiconductor taxonomy: supply-chain and business-model oriented
4. Oil & gas taxonomy: value-chain oriented
5. Severity scale: `0-5`
6. Severity colors: `Green`, `Yellow`, `Orange`, `Red`, `Dark Purple`, `Black`
7. Source strategy: curated public sources with RSS-first ingestion
8. Database strategy: one Supabase project for many industries
9. Retention strategy: automated `14` day article retention
10. Dedupe strategy: pre-insert canonical article selection
