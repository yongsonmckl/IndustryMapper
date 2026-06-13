# IndustryMapper Version 1.0 Plan

Last updated: 2026-06-14

## 1. Summary

Version 1.0 is no longer a planning-only effort. The ingestion, event layer, live map, and weekly review surface all exist. The remaining work is hardening, trust, and operator workflow quality rather than building the whole product from scratch.

## 2. Locked Scope

Version 1.0 remains locked to:

1. `Semiconductors`
2. `Oil & Gas`

Version 1.0 should not absorb the new scenario-simulation feature. That belongs in `Ver 1.1`.

## 3. What Exists Today

Implemented and present in the repo:

- scheduled RSS-first ingest pipeline
- enrichment pipeline with `heuristic_v4` as the main public version
- retention cleanup workflow
- public event RPC
- public neutral-intelligence briefing RPC
- public weekly-summary RPC
- `Home`, `Map`, `Weekly`, and `About` routes
- map/globe toggle in the map surface
- industry, event-type, and severity filtering
- persistent event popup flow with detail jump
- collapsible weekly industry summaries

Latest frontend interaction fix completed on `2026-06-14`:

- `/map` navigation state no longer uses `router.replace`
- `/map` marker projection updates are animation-frame synced

## 4. Current Phase Status

### Phase 0: Planning and Foundation

Status: complete.

### Phase 1: Data Foundation

Status: complete enough for current product work.

### Phase 2: Ingestion Pipeline

Status: live and functioning.

### Phase 3: Event Enrichment

Status: implemented and live.

Delivered:

- article enrichment state tracking
- event extraction pipeline
- event/article linking
- stronger non-event filtering
- event-level dedupe
- canonical-location improvements
- `heuristic_v4` public extraction baseline

Still needed:

- human review of the new `false_negative_review_queue` output from enrichment artifacts
- stronger drift measurement over repeated runs
- live validation of the new stale-event cleanup path after reprocessing

### Phase 4: Event Frontend

Status: baseline implementation complete, still under hardening.

Delivered:

- live map renderer
- map and globe projections
- severity-colored markers
- URL-addressable filters
- event detail surface
- neutral-intelligence surface on the map page
- homepage and about page product messaging
- weekly page route separation
- map-page interaction fixes through `2026-06-14`

Still needed:

- broader live regression testing on `/map`
- denser marker overlap strategy if live event density grows
- more geospatial QA against new incoming events

### Phase 5: Weekly Intelligence Layer

Status: first-pass implementation complete, editorial workflow still open.

Delivered:

- `weekly_summaries` schema path
- weekly generation script
- public weekly-summary read path
- `/weekly` review route
- collapsible per-industry review cards
- operator status controls for `draft`, `reviewed`, and `published`

Still needed:

- editorial quality tuning of the summary lead and watchlist selection
- tighter connection between false-negative review and weekly inclusion quality

## 5. Are All Version 1.0 Tasks Done?

No.

The core build is largely done, including Phase 5 baseline delivery, but Version 1.0 still has unresolved hardening work:

- enrichment recall validation
- geospatial precision expansion
- live stale-event reconciliation validation
- map interaction regression verification after the latest fixes

## 6. Recommended Version 1.0 Finish Order

1. verify the `/map` interaction fixes across navigation, panning, and popups
2. review the new `false_negative_review_queue` output against recent `neutral_intelligence` rows
3. expand location alias coverage where live misses appear
4. validate stale-event reconciliation after article downgrades in live data
5. tune weekly editorial quality now that the review-state workflow exists

## 7. Definition Of Done For Version 1.0

Version 1.0 should be treated as properly closed only when:

- the map page is interaction-stable
- event recall is measured rather than assumed
- event locations are trustworthy enough for operator use
- stale event rows are not silently left behind after reprocessing
- weekly drafts have a usable review and publication path
