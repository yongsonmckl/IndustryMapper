# IndustryMapper Research

Last updated: 2026-06-08

This file captures the current planning-phase research that locks the first POC scope, subsector taxonomy, severity scale, and initial source shortlist.

## Phase Scope Lock

The first POC industry scope is now locked to:

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
   - Design software, verification, reusable IP blocks, design enablement.
2. `Fabless Chip Design`
   - Companies designing chips without owning significant wafer fabrication capacity.
3. `Foundry and Wafer Fabrication`
   - Contract manufacturing fabs and wafer-processing operations.
4. `Integrated Device Manufacturers`
   - Vertically integrated chip companies that design and manufacture.
5. `Semiconductor Equipment`
   - Lithography, deposition, etch, metrology, packaging, test, and fab tools.
6. `Materials and Wafers`
   - Silicon wafers, specialty gases, chemicals, substrates, photoresists, rare process materials.
7. `Assembly, Packaging, and Test`
   - OSAT and ATP providers, advanced packaging, backend test.
8. `Memory Devices`
   - DRAM, NAND, HBM, and memory-specific supply chain developments.

Why this structure:

- It maps directly to where disruptions actually happen.
- It aligns with company archetypes users already recognize.
- It is better for event extraction than product-only categories.
- It scales later into product-market overlays like `AI accelerators`, `automotive semis`, or `power semis` without redesigning the core taxonomy.

### Oil & Gas

The oil and gas value chain is consistently described in public official and trade sources as `upstream`, `midstream`, and `downstream`. EPA uses those three sectors directly. GPA Midstream expands the operational detail and places gathering, processing, transportation, and storage in midstream, while refining and petrochemical transformation sit downstream.

Primary references:

- EPA oil and gas sector overview: <https://www.epa.gov/smartsectors/oil-and-gas-sector-information>
- GPA Midstream explainer: <http://www.gpamidstream.org/about/what-is-midstream/>
- BOEM oil and gas program page: <https://www.boem.gov/>

Recommended oil and gas subsectors for the POC:

1. `Upstream Exploration and Production`
   - Exploration, licensing, drilling, field development, production, offshore and onshore output.
2. `Oilfield Services and Drilling`
   - Rigs, well services, completion, subsea service providers, field services.
3. `Midstream Transportation and Storage`
   - Pipelines, gathering, terminals, storage, tankers, rail movement.
4. `Gas Processing and LNG`
   - Gas treatment, liquefaction, LNG export/import terminals, regasification.
5. `Refining`
   - Crude processing into fuels and refined products.
6. `Petrochemicals and NGLs`
   - NGL fractionation, petrochemical feedstocks, chemicals exposure tied to hydrocarbons.
7. `Fuel Marketing and Distribution`
   - Wholesale and retail distribution of refined products and gas to end markets.

Why this structure:

- It matches the industry value chain used in public reporting.
- It creates obvious event geography: wells, ports, pipelines, refineries, LNG terminals.
- It separates physical disruptions from policy and market effects cleanly.

## Severity Framework Research

The original `1-5` severity idea is workable, but your requested `0-5` scale is better because it preserves neutral but relevant news without forcing artificial risk inflation.

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

- The map icon and surrounding ring should derive directly from this severity value.
- `0` should still render on the map, but visually read as informative rather than urgent.

## Source Research

Selection rules used:

- Publicly viewable without paid subscription requirement.
- Reputable trade, association, or government source.
- Useful for RSS-first or simple structured ingestion.
- Strong enough editorial or institutional credibility to support a curated POC.

### Semiconductor sources

1. `Semiconductor Industry Association (SIA)`
   - Type: association
   - URL: <https://www.semiconductors.org/>
   - Why: policy, ecosystem, industry-wide announcements and public reports.
2. `SEMI Newsroom`
   - Type: association / industry body
   - URL: <https://www.semi.org/en/news-media-press/newsroom>
   - Why: semiconductor manufacturing, supply chain, equipment, standards, and industry program news.
3. `Semiconductor Engineering`
   - Type: trade media
   - URL: <https://semiengineering.com/>
   - Why: deep coverage of design, manufacturing, packaging, materials, and supply chain issues.
4. `EE Times`
   - Type: trade media
   - URL: <https://www.eetimes.com/feed-reader/>
   - Why: established electronics and chip industry reporting with feed access.
5. `Electronics Weekly`
   - Type: trade media
   - URL: <https://www.electronicsweekly.com/rss-feeds/>
   - Why: long-running electronics trade publication with free RSS access and regular semiconductor coverage.
6. `Semiconductor Today`
   - Type: trade media
   - URL: <https://www.semiconductor-today.com/rss.shtml>
   - Why: explicitly free RSS feeds and broad semiconductor manufacturing news.
7. `Bureau of Industry and Security (BIS)`
   - Type: government / official notices
   - URL: <https://media.bis.gov/news-updates>
   - Why: export controls, semiconductor equipment restrictions, entity actions, compliance-critical policy moves.

### Oil & gas sources

8. `U.S. Energy Information Administration (EIA)`
   - Type: government / data and analysis
   - URL: <https://www.eia.gov/tools/rssfeeds/>
   - Why: free RSS, timely energy updates, official statistical context.
9. `U.S. Department of Energy - Oil & Natural Gas News`
   - Type: government
   - URL: <https://www.energy.gov/hgeo/fossil-energy-rss-feeds>
   - Why: official energy policy and program updates with free RSS feeds.
10. `Bureau of Ocean Energy Management (BOEM)`
    - Type: government / official notices
    - URL: <https://www.boem.gov/>
    - Why: offshore leasing, rulemaking, environmental review, and federal offshore oil and gas program updates.
11. `Rigzone`
    - Type: trade media
    - URL: <https://www.rigzone.com/news/rss.asp>
    - Why: structured RSS across exploration, production, and operations.
12. `World Oil`
    - Type: trade media
    - URL: <https://www.worldoil.com/news>
    - Why: trusted upstream-focused reporting across exploration, drilling, production, LNG, and regulation.
13. `Offshore Technology`
    - Type: trade media
    - URL: <https://www.offshore-technology.com/>
    - Why: offshore projects, operators, subsea, and technology developments.
14. `Energy Voice`
    - Type: trade media
    - URL: <https://www.energyvoice.com/category/oilandgas/>
    - Why: ongoing coverage of company moves, North Sea, LNG, and broader oil and gas developments.

## Ingestion Implications

The source list supports a practical Phase 2 ingestion shape:

1. Prefer RSS or feed-like pages first.
2. Normalize every fetched article into a common article record before any AI extraction.
3. Store source metadata and raw payloads for traceability.
4. Keep the first run read-only capable so GitHub Actions can validate ingestion even before DB credentials are added.

## Schema Direction Changes From Earlier Planning

One design change is worth locking immediately:

- `events` should not point to a single `source_article_id`.
- Use an `event_articles` join table instead.

Reason:

- One article can produce multiple events.
- Multiple articles can later support the same event.
- The join table preserves source traceability without forcing a redesign in Phase 3 or Phase 4.

## Current Decision Summary

Locked for the first POC:

1. Industries: `Semiconductors`, `Oil & Gas`
2. Taxonomy model: `industry -> subsector`
3. Semiconductor taxonomy: supply-chain and business-model oriented
4. Oil & gas taxonomy: value-chain oriented
5. Severity scale: `0-5`
6. Severity colors: `Green`, `Yellow`, `Orange`, `Red`, `Dark Purple`, `Black`
7. Source strategy: curated public sources with RSS-first ingestion
