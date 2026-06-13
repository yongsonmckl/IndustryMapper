# IndustryMapper Version 1.1 Agents Guide

Last updated: 2026-06-14

## Mission

Version 1.1 extends IndustryMapper beyond event mapping into explainable scenario modeling and world dependency analysis.

## Primary Version 1.1 Feature

- `Live disruption simulation`

This feature should model how a failure or export loss propagates through dependent infrastructure and supply chains.

## Version 1.1 Working Principles

- stay explainable
- prefer narrow, high-confidence world models over broad speculative ones
- show assumptions and confidence at every stage
- treat simulation output as scenario analysis, not guaranteed prediction

## New Agent Roles

## 1. Product Architect Agent

Owns:

- Version 1.1 scope control
- slice selection
- sequencing across graph, UI, and simulation work

## 2. Dependency Graph Agent

Owns:

- node and edge schema
- dependency semantics
- substitution modeling
- graph constraints

## 3. Scenario Engine Agent

Owns:

- scenario input model
- cascade logic
- impact propagation rules
- time-to-impact estimation

## 4. Industry Research Agent

Owns:

- semiconductor dependency research
- oil and gas dependency research
- public-data-backed sourcing assumptions

## 5. Alternate Supply Agent

Owns:

- fallback path modeling
- supplier substitution heuristics
- capacity and lead-time tradeoff logic

## 6. Geospatial Systems Agent

Owns:

- mapping graph nodes to places
- route and corridor representation
- map projection of dependency paths and impacts

## 7. Frontend Simulation Agent

Owns:

- scenario builder UI
- simulation result views
- timeline and dependency visualization
- explainability surface

## 8. QA and Explainability Agent

Owns:

- assumption visibility
- confidence display
- scenario sanity testing
- hallucination risk control

## Version 1.1 Guardrails

- do not claim plant-perfect real-time truth
- do not hide weak assumptions
- do not expand to many industries before one narrow slice is credible
- do not bypass the existing event layer; reuse it where it adds grounding
