# Karax verification: plan v2 against working tree

## Plan file verified on disk
`doc/plans/2026-08-04-jac-4539-rollback-acceptance-tests-by-phase.md` (630 lines), on branch `JAC-3679-build-reusable-report-kit-template`.

## Verification results

### Schema / column claims — ALL VERIFIED CORRECT
- `packages/db/src/schema/run_events.ts` (read): sourceEventVersion (line 44), pricingVersionRef (line 80), sourceEventId (line 42), payloadHash (line 114), ingestId (line 113), runId (line 36), observedAt (line 112), costCents (line 64, nullable), priceBasis (line 78, default "not_reported"), costConfidence (line 79, default "low"), publicationStatus (line 103, default "unknown"), sourceSystem (line 40). No schema_version column. (check)
- `packages/db/src/schema/cost_events.ts` (read): pricingVersionRef (line 32), sourceEventVersion (line 70), sourceEventId (line 68), costCents (line 30, NOT NULL), priceBasis (line 44, default "not_reported"), costConfidence (line 46, default "low"). No cost_usd_est, no schema_version. (check)
- `packages/shared/src/constants.ts` (read, lines 778-895): COVERAGE_STATES, SOURCE_STATUSES, SAFE_STATUSES, CONFIDENCE_LEVELS, USAGE_REPORTED_STATES, PAUSE_REASONS, PAUSE_ELIGIBLE_SCOPES, PRICE_BASIS, ROUTING_STATUSES (892), QUOTA_STATUSES (895), PUBLICATION_STATUSES (898). (check)
- `packages/shared/src/validators/cost.ts` (read): resolveCoverageState (line 59), resolveSafeStatus (line 74), resolveRunCoverageForError (line 316), resolveLedgerCoverageForRun (line 180), createCostEventSchema transform with fail-closed defaults at lines 105-123 + 488-491. (check)

### Adapter disable / kill-switch claims — ALL VERIFIED CORRECT
- `server/src/routes/adapters.ts` (read, lines 379-435): PATCH /api/adapters/:type { "disabled": boolean } and PATCH /api/adapters/:type/override { "paused": boolean }. (check)
- `server/src/adapters/registry.ts` (read, lines 698-712): setOverridePaused, isOverridePaused, getPausedOverrides, findServerAdapter. (check)
- `server/src/services/adapter-plugin-store.ts` (read, lines 177-192): setAdapterDisabled with in-memory cache. NOTE: plan cites adapter-plugin-store.js (section 3.4 and 6.2); actual source file is adapter-plugin-store.ts. Compiled output is .js. Minor citation inaccuracy - does not affect test design. (check)
- No fictional toggles (cost_threshold_alerts, runaway_detector, stale_coverage_alert, observatory_paused, enabled: false config flag) - confirmed absent. (check)

### Budget auto-pause claims — VERIFIED CORRECT
- `server/src/services/budgets.ts` (read): line 72 hard_stop, lines 221/233/245 pauseReason="budget", lines 751-863 company/agent/project hard-stop exclusion logic. (check)
- `server/src/services/attention.ts` (read, lines 1176-1177): "Raise budget" / "Keep paused" attention actions. (check)

### Dependency status — VERIFIED LIVE (Paperclip API v2026.722.0)
| Dependency | Plan claims | Live (UUID-scoped) |
|---|---|---|
| JAC-4265 | done | done (55fefa67) (check) |
| JAC-4532 | in_progress | in_progress (0aac49a4) (check) |
| JAC-4538 | blocked | blocked (a17cfe55) (check) |
| JAC-3935 | in_review | in_review (dd1123e3) (check) |

### One discrepancy noted
JAC-4538 (publication contract) is blocked, which blocks Criterion 3 (dashboard revert). This is correctly reflected as a plan-level risk in section 4.3. The plan's dependency table (section 3.6) is internally consistent with the live state.

## Verdict
Plan v2 is accurate against the working tree. The corrections in section 8 (v2) are substantiated. No code was written - planning-only directive satisfied. Only one minor citation error: adapter-plugin-store.js should be adapter-plugin-store.ts (does not affect test design). Plan is ready for Gate 6 board review.

## Disposition
in_progress - awaiting Gate 6 board review. Ready for request_confirmation targeting the plan revision.
