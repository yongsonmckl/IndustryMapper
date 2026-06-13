# IndustryMapper Version 1.1 Todo List

Last updated: 2026-06-14

## Primary Feature

- design and implement the first live disruption simulation slice

## Planning Tasks

- choose the first semiconductor scenario family
- define the minimum dependency graph schema
- define what counts as a node, edge, impact, and fallback
- define confidence and assumption fields

## Data Tasks

- seed a narrow dependency dataset for semiconductors
- map major supplier regions and chokepoints
- define public-data-backed fallback supplier options
- define rough lead-time and substitution heuristics

## Backend Tasks

- add dependency graph migrations
- add scenario run storage
- add read paths for simulation results
- add validation utilities for graph consistency

## Frontend Tasks

- build a scenario builder route
- build a map-based cascade view
- build a time-to-impact timeline
- build a fallback supplier panel
- build an assumptions and confidence panel

## Recommended Companion Features

User should choose two later from:

- `Global Dependency Atlas`
- `Chokepoint Stress Monitor`
- `Alternate Supplier Explorer`
- `Recovery Timeline Explorer`
- `Cross-Border Exposure Scorecards`

## Guardrails

- keep the first slice narrow
- keep it explainable
- do not imply certainty where there is only heuristic modeling
