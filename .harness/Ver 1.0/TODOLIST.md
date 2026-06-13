# IndustryMapper Version 1.0 Todo List

Last updated: 2026-06-14

## Version 1.0 Status

- Phase 0: complete
- Phase 1: complete enough
- Phase 2: live
- Phase 3: live, still needs quality review
- Phase 4: live, still needs hardening
- Phase 5: baseline live, still needs editorial workflow

## Remaining High-Value Work

- verify the `/map` navigation and motion fixes across real usage
- review the new `false_negative_review_queue` output for false negatives
- expand canonical location aliases where live misses are found
- validate stale-event reconciliation for article downgrades after reprocessing
- tune editorial behavior now that `weekly_summaries.review_status` controls exist

## Enrichment Quality

- sample and review a meaningful slice of `neutral_intelligence`
- keep only recall-improving enrichment tweaks
- add clearer drift reporting after each ingest/enrichment cycle

## Geospatial Quality

- validate live event coordinates against a wider sample
- keep improving facilities, ports, cities, and state-level aliases
- revisit overlap strategy only if density grows enough to justify clustering

## Weekly Intelligence

- improve summary lead quality where it reads unfinished or overly headline-like
- tune watchlist ranking using real operator review feedback
- keep newsletter or outbound distribution deferred until draft quality is trusted

## Not Version 1.0 Work

- live infrastructure simulation
- broader world-model scenario engine
- additional geo-analytics feature families planned for `Ver 1.1`
