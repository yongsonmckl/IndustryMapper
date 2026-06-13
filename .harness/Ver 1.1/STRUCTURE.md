# IndustryMapper Version 1.1 Structure

Last updated: 2026-06-14

## 1. Purpose

This file describes the likely repo structure additions required for Version 1.1.

## 2. Planned New System Areas

### `supabase/`

Likely new schema groups:

- dependency graph tables
- scenario run tables
- fallback option tables
- optional materialized views for exposure summaries

Expected new table families:

- `infrastructure_nodes`
- `dependency_edges`
- `dependency_inputs`
- `fallback_suppliers`
- `scenario_runs`
- `scenario_run_impacts`

### `data/`

Likely new reference datasets:

- seeded dependency maps
- supplier-region mappings
- route and chokepoint reference data
- substitution and lead-time assumptions

Suggested new directories:

```text
data/dependencies/
data/routes/
data/scenarios/
```

### `ingestion/`

Potential new responsibilities:

- optional dependency refresh jobs
- scenario seed builders
- graph validation utilities

Suggested future files:

```text
ingestion/build_dependency_graph.py
ingestion/seed_scenarios.py
ingestion/validate_dependency_graph.py
```

### `web/`

Likely new product surfaces:

- `/simulation`
- `/dependencies`
- optional `/exposure`

Suggested new component families:

```text
web/src/components/simulation/
web/src/components/dependencies/
web/src/components/exposure/
```

Likely UI modules:

- scenario builder
- cascade timeline
- fallback supplier panel
- dependency graph legend
- confidence and assumptions drawer

## 3. Reuse From Version 1.0

Version 1.1 should reuse instead of replacing:

- current industry taxonomy
- existing event layer
- geospatial rendering baseline
- weekly summary infrastructure where it helps with narrative output

## 4. First Slice Recommendation

The first repo additions should support:

- one narrow semiconductor dependency graph
- one scenario-run path
- one map-based result surface
- one fallback supplier explanation panel
