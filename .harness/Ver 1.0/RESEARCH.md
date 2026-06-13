# IndustryMapper Version 1.0 Research

Last updated: 2026-06-14

## POC Lock

The Version 1.0 product still targets:

1. `Semiconductors`
2. `Oil & Gas`

That lock remains strategically correct because it keeps the source registry, taxonomy, and enrichment logic narrow enough to validate end to end.

## Taxonomy Research

### Semiconductors

Recommended Version 1.0 subsectors remain:

1. `EDA and Semiconductor IP`
2. `Fabless Chip Design`
3. `Foundry and Wafer Fabrication`
4. `Integrated Device Manufacturers`
5. `Semiconductor Equipment`
6. `Materials and Wafers`
7. `Assembly, Packaging, and Test`
8. `Memory Devices`

### Oil & Gas

Recommended Version 1.0 subsectors remain:

1. `Upstream Exploration and Production`
2. `Oilfield Services and Drilling`
3. `Midstream Transportation and Storage`
4. `Gas Processing and LNG`
5. `Refining`
6. `Petrochemicals and NGLs`
7. `Fuel Marketing and Distribution`

## Severity Model Research

The locked `0-5` scale still fits the product:

- `0` Neutral
- `1` Low Significance
- `2` Guarded
- `3` Elevated
- `4` Severe
- `5` Critical

Reason this still holds:

- it preserves neutral context without forcing risk inflation
- it gives the map a stable visual model
- it remains readable for both event and weekly-summary surfaces

## Ingestion Research Conclusions

The existing practical conclusions still stand:

- RSS-first remains the right Version 1.0 ingestion strategy
- pre-insert dedupe is necessary on a free-tier footprint
- article retention is necessary
- curated public sources remain better than broad scraping for this stage

## Enrichment Research Conclusions

Current confirmed behavior:

- conservative filtering is necessary
- many useful articles belong in `neutral_intelligence`, not `events`
- naive substring matching was too loose and had to be hardened
- current recall risk is now more important than false-positive risk alone

Immediate research direction that still matters:

- measure false negatives in the neutral pool
- identify which patterns deserve promotion into structured event logic
- keep event extraction explainable rather than opaque

## Geospatial Research Conclusions

The project has moved beyond pure country centroids, but the geospatial layer is still incomplete.

Current best conclusion:

- canonical resolved locations are good enough for the current product baseline
- plant, port, city, and state alias coverage is still one of the highest-value remaining improvements
- dense-area overlap is still manageable without full clustering at current live volume

## Frontend Research Conclusions

The live map surface is now the correct interaction center for Version 1.0.

Current frontend conclusions:

- keeping filters URL-addressable is still useful
- map navigation state should not depend on heavy router replacement
- marker projection needs animation-frame-synced updates for smoother panning
- weekly review should remain a separate route rather than being folded into the map page

## Version Boundary Conclusion

The next major research jump is no longer about core Version 1.0 feasibility.

The next major question is Version 1.1:

- how to model world dependencies
- how to simulate cascading disruption
- how to explain alternate sourcing and recovery timelines without pretending to know more than the data supports
