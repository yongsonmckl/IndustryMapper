# IndustryMapper Todo List

Last updated: 2026-06-10

This file lists the meaningful remaining work from the implemented phases through the current project state.

## Current Phase Status

- Phase 0: complete
- Phase 1: complete enough for current product work
- Phase 2: live and functioning
- Phase 3: largely complete and live on `heuristic_v4`
- Phase 4: largely complete and live, but still needs polish
- Phase 5: not implemented yet, but the bridge into it has started

## Phase 0-2 Follow-Up

These phases are not the current bottleneck, but a few items still exist.

- Review and resolve broader Supabase security advisor warnings when product priorities allow.
- Keep scheduled ingest, enrichment, and cleanup runs monitored for regressions.
- Add clearer operational run reporting so ingest and enrichment drift is easy to spot over time.

## Phase 3 Remaining Work

The taxonomy split and live backlog rebuild are done. The remaining work is selective quality hardening.

- Review a larger `neutral_intelligence` sample for false negatives under `heuristic_v4`.
- Decide whether `AI-Driven Memory Shortage Upends IT Budgets` and similar titles should stay neutral or gain a targeted shortage pattern.
- Keep expanding subsector and event-type coverage only where it improves real recall without reopening false positives.
- Preserve and compare enrichment artifacts over time so drift is visible after each ingest run.
- Add an automated cleanup or reconciliation path for stale `events` rows when article status is downgraded after reprocessing.

## Phase 4 Remaining Work

The live globe, viewport filtering, and event-detail flow are implemented. Remaining work is precision and polish.

- Replace the current zoom-aware offsetting with stronger clustering for dense regions if event density grows.
- Expand location alias coverage for more facilities, ports, and project-specific sites.
- Validate canonical marker placement against a wider live sample as new events arrive.
- Continue mobile and desktop interaction QA for the real globe map.
- Keep checking multi-country and conflict headlines for wrong-country canonical selection when a facility alias is missing.

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

1. Fix Phase 3 recall inside the `neutral_intelligence` pool.
2. Improve geolocation precision and map overlap behavior.
3. Add enrichment QA and drift reporting.
4. Start Phase 5 weekly-summary generation on top of the cleaner taxonomy.
5. Treat newsletter work as a later extension after summary quality is trustworthy.
