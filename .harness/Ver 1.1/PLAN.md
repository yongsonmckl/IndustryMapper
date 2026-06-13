# IndustryMapper Version 1.1 Plan

Last updated: 2026-06-14

## 1. Version 1.1 Goal

Version 1.1 should extend IndustryMapper from a passive intelligence surface into a world-modeling product layer.

Primary target:

- `Live disruption simulation`

Meaning:

- if a facility, exporter, corridor, port, or country becomes unavailable, the system should estimate what downstream infrastructure becomes stressed, inefficient, degraded, or unavailable next
- the output should include timeline estimates, dependency paths, and fallback options

## 2. Core Feature For Version 1.1

### Live Disruption Simulation

Example target question:

`If China stops exporting a critical semiconductor input, what breaks next, how long until the downstream effect is felt, and what substitute supply paths exist?`

The simulation should answer in four layers:

1. `Direct dependency`
2. `Second-order downstream effect`
3. `Time-to-impact`
4. `Fallback and substitution options`

## 3. What The Simulation Must Not Pretend To Be

Do not position the first Version 1.1 simulation pass as:

- perfect forecasting
- real-time industrial truth
- comprehensive global ERP data
- guaranteed operational prediction

The correct framing is:

- explainable dependency modeling
- scenario analysis
- structured estimate with visible assumptions

## 4. Recommended First Simulation Slice

The first implementation slice should stay narrow:

- start with `Semiconductors`
- start with a limited set of critical dependency categories
- start with country and major supplier dependence before trying plant-perfect realism

Recommended first dependency domains:

- wafers
- specialty gases
- lithography and equipment bottlenecks
- advanced packaging concentration
- rare input concentration where public sourcing data is strong enough

## 5. Required Model Shape

Version 1.1 needs a dependency graph, not just articles on a map.

Minimum graph entities:

- `infrastructure_nodes`
- `node_types`
- `dependency_edges`
- `commodities_or_inputs`
- `supplier_regions`
- `fallback_paths`
- `scenario_runs`
- `scenario_impacts`

Minimum edge concepts:

- dependency strength
- lead time
- substitutability
- geographic scope
- confidence

## 6. Version 1.1 Product Surfaces

The primary simulation feature should be paired with operator-facing interfaces:

- scenario builder
- map-based disruption view
- cascade timeline
- fallback supplier panel
- confidence and assumptions panel

## 7. Five Additional Feature Ideas

These are separate from the live simulation feature. The user can later choose two to implement.

### 1. Global Dependency Atlas

An interactive world view that shows which countries, facilities, and routes a chosen industry depends on most heavily.

### 2. Chokepoint Stress Monitor

A map product for tracking strategic corridors, ports, canals, pipelines, and export hubs, with exposure scores by industry.

### 3. Alternate Supplier Explorer

A tool that answers where else an industry can source a disrupted input, including tradeoffs in capacity, distance, and likely delay.

### 4. Recovery Timeline Explorer

A world-based timeline surface showing how long different regions or subsectors may take to recover after a disruption scenario.

### 5. Cross-Border Exposure Scorecards

A country-to-country dependency view that scores exposure to sanctions, export controls, outages, conflict, or logistics interruption.

## 8. Recommended Two To Pair With Simulation

The strongest two companions to the live simulation are:

1. `Alternate Supplier Explorer`
2. `Global Dependency Atlas`

Reason:

- they directly support the simulation output
- they reuse the same dependency graph
- they give operators both a static dependency view and an action-oriented fallback view

## 9. Version 1.1 Delivery Order

1. define the dependency graph schema
2. choose the first narrow semiconductor scenario set
3. build a static dependency atlas from seeded data
4. add scenario-run execution and cascade estimation
5. add fallback supplier and substitution logic
6. add map and timeline UI
7. expand into oil and gas only after semiconductor logic is credible

## 10. Definition Of Done For The First Version 1.1 Slice

The first Version 1.1 slice is good enough when:

- a user can select a disruption scenario
- the app returns a dependency cascade
- the app shows estimated time-to-impact
- the app shows alternative sourcing options
- the app surfaces confidence and assumptions clearly
