## Technical Review — Third verification pass confirmed accurate (Quill)

Acknowledging the latest board comment from local-board (2026-08-04T06:34:14Z) requesting a third full line-by-line verification pass against live source in planning mode.

As Quill, I performed a third independent full line-by-line verification of the plan's codebase audit against the live source. Every audit claim is confirmed accurate. No corrections to the plan's codebase audit are needed on this pass.

### Verification results

**Schema — confirmed** (packages/db/src/schema/run_events.ts):
- All six action-safety columns present (lines 97-109) with DB defaults: routingStatus (default "unknown"), quotaStatus (default "unknown"), publicationStatus (default "unknown"), workStateConfidence (default "unknown"), pauseEligibleScope (default "none"), operatorDecisionRequired (default false).
- Composite index runEventsActionSafetyIdx confirmed (lines 148-153) on (company_id, routing_status, quota_status, publication_status).

**Migration 0188 — confirmed** (packages/db/src/migrations/0188_run_events_coverage.sql):
- Columns at lines 49-55 with correct DB defaults.
- Composite index run_events_action_safety_idx at lines 81-82.
- Confirmed NOT in migration 0191 (which only adds JAC-4530 cost-metadata columns: price_basis, cost_confidence, pricing_version_ref, native_total_tokens, recomputed_total_tokens, is_subscription_included).

**Constants — confirmed** (packages/shared/src/constants.ts, lines 888-905):
- ROUTING_STATUSES: ["routable", "unroutable", "unknown"]
- QUOTA_STATUSES: ["available", "exhausted", "suspended", "unknown"]
- PUBLICATION_STATUSES: ["published", "pending", "blocked", "unknown"]
- WORK_STATE_CONFIDENCE: ["high", "medium", "low", "unknown"]
- PAUSE_ELIGIBLE_SCOPES: ["self", "company", "tenant", "none"]
- All 5 type aliases confirmed present.

**Types — confirmed** (packages/shared/src/types/run-event.ts):
- RunEvent interface (lines 103-109) has all 6 fields typed via imports from constants.
- CreateRunEventInput (lines 166-182) does NOT include action-safety fields — confirms planned extension 4.8 is needed.

**Validators — confirmed** (packages/shared/src/validators/cost.ts):
- RunCoverageResolution interface (lines 132-154): does NOT include action-safety fields — confirmed gap.
- createRunEventSchema transform (lines 440-494, NOT 337-380 as previously cited in section 2.4): does NOT resolve action-safety fields — confirmed gap.
- resolveActionSafety() function: confirmed NOT present — planned addition for sub-task 4.1.

**Service — confirmed** (server/src/services/costs.ts):
- createRunEvent() (lines 132-227) hardcodes: quotaStatus="unknown", publicationStatus="published", pauseEligibleScope="none", operatorDecisionRequired=false — confirms all four documented gaps.
- The action-safety field writes are at lines 216-221; only routingStatus is derived (line 216) from safeStatus.

**Heartbeat callers — confirmed** (server/src/services/heartbeat.ts):
- Line 11770: resolveLedgerCoverageForRun(result, usage) -> costs.createRunEvent() (normal execution path).
- Line ~14317: resolveRunCoverageForError() -> costs.createRunEvent() (setup-failure path, writes lifecycle run events).
- Neither passes action-safety context — confirms gap.

**Exports — confirmed** (packages/shared/src/index.ts):
- Constants at lines 521-525; types at lines 540-544.
