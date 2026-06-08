# Event Extraction Contract

Use this contract when converting normalized articles into structured event candidates for IndustryMapper.

## Goal

Turn a single article into zero, one, or many structured event candidates.

The output must favor traceability and restraint over over-classification.

## Hard Rules

1. Do not invent facts not present in the article.
2. If the article is informational but not eventful, return no event candidates.
3. Use only the locked industries:
   - `semiconductors`
   - `oil-gas`
4. Use the locked severity scale from `0` to `5`.
5. Every event must preserve a short evidence snippet from the source article.
6. Locations must be marked with confidence and role.
7. If a field is uncertain, lower confidence instead of fabricating precision.

## Required Output Fields Per Event

- `title`
- `summary`
- `industry_slug`
- `subsector_slug`
- `event_type_slug`
- `severity_level`
- `confidence_score`
- `event_status`
- `event_date`
- `companies`
- `countries`
- `tags`
- `locations`
- `evidence_snippet`

## Severity Guidance

- `0 Neutral`
  - Material industry news without a disruption, restriction, or risk signal.
- `1 Low Significance`
  - Small local development or weak early signal.
- `2 Guarded`
  - Contained operational or policy impact.
- `3 Elevated`
  - Regional disruption, meaningful restriction, or major company-level issue.
- `4 Severe`
  - Cross-border or multi-company disruption with major supply chain implications.
- `5 Critical`
  - Systemic or globally material disruption with acute geopolitical or supply chain impact.

## Semiconductor Subsectors

- `eda-ip`
- `fabless-design`
- `foundry-fabrication`
- `idm`
- `equipment`
- `materials-wafers`
- `packaging-test`
- `memory`

## Oil & Gas Subsectors

- `upstream-ep`
- `oilfield-services`
- `midstream`
- `lng-gas-processing`
- `refining`
- `petrochemicals-ngls`
- `fuel-distribution`

## Event Type Set

- `tariff`
- `import-ban`
- `export-control`
- `sanction`
- `factory-shutdown`
- `port-disruption`
- `pipeline-disruption`
- `labor-strike`
- `policy-change`
- `supply-shortage`
- `investment-announcement`
- `accident-disaster`
- `conflict-disruption`

## Decision Standard

Prefer returning fewer, cleaner events over broad speculative extraction.
