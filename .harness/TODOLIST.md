# IndustryMapper Todo List

Last updated: 2026-06-10

This file lists the meaningful remaining work from the implemented phases through the current project state.

## Current Phase Status

- Phase 0: complete
- Phase 1: complete enough for current product work
- Phase 2: live and functioning
- Phase 3: baseline complete, but not fully hardened
- Phase 4: baseline complete, but not fully hardened
- Phase 5: not implemented yet, but the bridge into it has started

## Phase 0-2 Follow-Up

These phases are not the current bottleneck, but a few items still exist.

- Review and resolve broader Supabase security advisor warnings when product priorities allow.
- Keep scheduled ingest, enrichment, and cleanup runs monitored for regressions.
- Add clearer operational run reporting so ingest and enrichment drift is easy to spot over time.

## Phase 3 Remaining Work

The main open issue is no longer false positives. It is recall quality.

- Review recent `no_event` articles and identify false negatives under `heuristic_v3`.
- Selectively loosen extraction rules where valid events are being missed.
- Expand event-type matching for known misses:
  - labor phrasing such as `striking`
  - startup phrasing such as `starts production`
  - funding and investment phrasing that is currently too heavily filtered
- Revisit confidence gating where one strong signal is currently insufficient to create an event.
- Improve subsector coverage where current matching is too sparse.
- Add better run artifacts so enrichment quality can be compared across runs.
- Split the current `no_event` bucket into something more useful, likely:
  - `neutral_intelligence`
  - `discarded` or equivalent noise bucket
  - keep `evented`
  - keep `error`

## Phase 4 Remaining Work

The live map now exists, but polish and precision work remain.

- Improve dense-marker overlap handling.
- Add or refine clustering behavior for crowded regions.
- Expand geolocation coverage for:
  - plants
  - ports
  - cities
  - states / admin regions
- Validate marker placement quality against more live events over time.
- Continue mobile and desktop interaction QA for the real globe map.
- Keep severity 5 presentation highly legible in dark mode as the design evolves.

## Phase 5 Preparation Work

This is the next real product phase.

- Define the weekly-summary data model.
- Decide how neutral-intelligence articles should be summarized and grouped.
- Build a summary-generation path using:
  - `evented` items
  - neutral-intelligence items
- Define newsletter-oriented output structure, but do not treat newsletter work as current priority.
- Add operator-visible review surfaces for generated summaries before broader automation.

## Recommended Implementation Order

1. Fix Phase 3 recall and clarify the `no_event` taxonomy.
2. Improve geolocation precision and map overlap behavior.
3. Add enrichment QA and drift reporting.
4. Start Phase 5 weekly-summary generation on top of the cleaner taxonomy.
5. Treat newsletter work as a later extension after summary quality is trustworthy.
