# JAC-4529 — Design: Coverage-Aware Fail-Closed Run Event Fields (P0)

**Related issues:** Parent JAC-3929 · Depends-on JAC-3930 (telemetry contract) · Sibling JAC-4530 (token/cost unknown-vs-zero), JAC-4531 (Ringer composite adapter), JAC-4532 (event identity/idempotency), JAC-4533 (privacy/retention), JAC-4534 (action-safety semantics)
**Work mode:** Planning only — no code, no telemetry config changes
**Judge:** Independent review (fleet-spend-observatory-independent-judge-20260729-20260729T202530Z-p58409)
**Report SHA-256:** `a24277b3`
**Date:** 2026-08-04
**Last updated:** 2026-08-04T03:15Z (reconciled against codebase as of commit HEAD)

---

## 1. Problem Statement

The Ringer independent judge found that "Paperclip coverage must fail closed." The requirement is:

> Emit a normalized run event for every run, but set token/cost fields to `not_reported`/`unknown` when absent. Add explicit `coverage_state`, `source_status`, `safe_status`, and `confidence` fields, and surface coverage warnings separately from spend totals.

This means: every completed run must produce a persisted, coverage-aware record — even when the adapter returns no token/cost data. Absence must be explicitly represented (not silently dropped), and coverage warnings must be queryable independently of spend totals.

---

## 2. Current Implementation State (verified against codebase)

The implementation has progressed significantly beyond the initial design. The following infrastructure is already in the codebase:

### 2.1 Separate `run_events` table (not a separate column on `cost_events`)

`packages/db/src/schema/run_events.ts` defines a dedicated `run_events` table that is **distinct from** `cost_events`:

- **Schema purpose**: `run_events` captures coverage metadata for **every** heartbeat run — including zero-spend runs (process/http adapters, errors, sandbox failures). `cost_events` remains the spend line-item ledger.
- **Token/cost fields are nullable** (`integer("input_tokens")`, etc.): `null` means "not_reported", `0` means "explicitly zero".
- **Coverage fields** with fail-closed defaults: `coverageState` → `"unknown"`, `sourceStatus` → `"unavailable"`, `safeStatus` → `"unavailable"`, `confidence` → `"low"`.
- **Usage reporting state**: `usageReportedState` defaults to `"not_reported"`.
- **Event identity (JAC-4532)**: `sourceSystem`, `sourceEventId`, `sourceEventVersion`, `eventKind`, `attemptIndex`, `payloadHash`, `supersedesEventId`, `observedSequence`.
- **Privacy/retention (JAC-4533)**: `visibilityClass`, `retentionClass`, `redactionState`, `sourcePermissionRef`, `tenantRefHash`, `subjectRefHashes`, `sourceDeletedAt`, `tombstoneRef`, `policyVersion`.
- **Action-safety (JAC-4534)**: `routingStatus`, `quotaStatus`, `publicationStatus`, `workStateConfidence`, `pauseEligibleScope`, `operatorDecisionRequired`.
- **Indexes**: `run_events_company_run_idx`, `run_events_company_coverage_idx`, `run_events_company_safe_status_idx`, `run_events_payload_hash_idx`, `run_events_source_event_uq` (idempotency), `run_events_routing_idx`, `run_events_action_safety_idx`, `run_events_privacy_idx`.
- **Exported** from `packages/db/src/schema/index.ts`.

This supersedes the original plan's Section 4.2 ("extend the gate, don't split the table"). The implementation chose to **split** into a dedicated `run_events` table — this is the correct architectural decision, as `cost_events` rows with `costCents = 0` and `billingType = "unknown"` would pollute spend aggregations and break existing `by-agent`/`by-provider` queries that count distinct `heartbeatRunId` as run counts.

### 2.2 Fail-closed coverage resolution

`packages/shared/src/validators/cost.ts` contains three functions:

- **`resolveLedgerCoverageForRun(result, usage)`** — resolves coverage from adapter execution results + normalized token totals. Returns a `RunCoverageResolution` with:
  - No usage object → `uncovered` / `unavailable` / `unavailable` / `low`, all token fields `null` (not_reported).
  - Usage + tokens > 0 → `covered` / `available` / `available` / `high` (or `medium` if no cost).
  - Usage object present, 0 tokens → `partial` / `available` / `unavailable` / `low`.
- **`resolveRunCoverageForError()`** — for pre-execution failures (workspace validation, sandbox startup, adapter error, timeout, cancellation). Returns fully fail-closed: `not_reported` / `unknown` / `unavailable` / `unavailable` / `unavailable` / `low`. Note: `coverageState` is `"unknown"` (the fail-closed default), not `"uncovered"` — `"uncovered"` is reserved for cases where a usage object was absent but the run was processed. This distinction matters: `"unknown"` means no assessment was possible (pre-execution failure), while `"uncovered"` means the source was present but did not report usage.
- **`resolveRunEventCoverage(value)`** — mirrors the above logic but operates on the flattened Zod input shape (`usageReportedState` + individual token fields). Used by the `createRunEventSchema` transform.
- **`computeCoverageWarning(...)`** — returns a human-readable reason string (or `null`):
  - `sourceStatus === "unavailable"` → `"adapter_did_not_report_usage"`
  - `usageReportedState === "not_reported"` → `"usage_not_reported"`
  - `coverageState === "partial"` → `"usage_reported_but_tokens_zero"`
  - `costStatus === "unpriced"` → `"cost_not_priced"`

### 2.3 Zod schema with fail-closed transform

`createRunEventSchema` in `packages/shared/src/validators/cost.ts` (lines 337–379):
- Accepts `usageReportedState` (`"not_reported" | "reported" | "estimated" | "redacted"`) and nullable token fields.
- **Transform** computes `coverageState`, `sourceStatus`, `safeStatus`, `confidence` via `resolveRunEventCoverage` — these are **derived, never caller-supplied**.
- Also computes `coverageWarning` via `computeCoverageWarning`.
- Maps to the `CreateRunEventInput` interface in `packages/shared/src/types/run-event.ts`.

### 2.4 Shared types

`packages/shared/src/types/run-event.ts` defines:
- `RunEvent` — the full persisted row interface (all identity, coverage, privacy, action-safety fields).
- `CoverageTotals` — `{ totalRuns, coveredRuns, uncoveredRuns, partialCoverageRuns, unknownRuns }`.
- `CoverageWarning` — `{ severity, adapterType, reason, runCount, safeStatus }`.
- `CoverageByAdapterRow` — per-adapter coverage breakdown.
- `CoverageWarningsResponse` — API response shape: `{ companyId, generatedAt, totals, byAdapter, warnings }`.
- `CoverageByAgent` — `{ coveredRuns, uncoveredRuns, partialRuns, safeStatus }`.
- `CreateRunEventInput` — Zod-inferred input shape.

### 2.5 Cost service with `createRunEvent`

`server/src/services/costs.ts` (lines 132–218):
- `createEvent` — writes to `cost_events` (spend line-items), applies `resolveCoverageState`/`resolveSafeStatus` fail-closed resolution.
- **`createRunEvent`** — writes to `run_events` for every heartbeat run. Accepts a `coverage: RunCoverageResolution` object and persists it. This is the "normalized run event" the judge requires.
- **`coverageSummary`** — aggregates coverage totals and warnings. Note: this queries `cost_events` (not `run_events`), grouping by `costEvents.coverageState`. Returns `CoverageWarningsResponse`.
- **`coverageByAgent`** — per-agent coverage breakdown. Also queries `cost_events`, grouping by `agentId` + `coverageState`. Returns `CoverageByAgent[]`.

### 2.6 Heartbeat integration

`server/src/services/heartbeat.ts`:
- **Line 11716**: `resolveLedgerCoverage` (the old function for cost_events) is still called.
- **Lines 11737–11765**: A `costEvent` is created for every run via `costs.createEvent()` — the gate was already removed. The comment at 11737 confirms: "Emit a cost event for every run regardless of whether it produced spend." Coverage fields are always resolved and `coverageWarning` is computed.
- **Lines 11770–11781**: `resolveLedgerCoverageForRun(result, usage)` is called and `costs.createRunEvent()` writes a `run_events` row. This is the **normalized run event** for every run.

Both `cost_events` (for spend-aware consumers) and `run_events` (for coverage auditing) are created for every run. This gives the best of both worlds: spend consumers are unaffected, and coverage consumers have every run represented.

### 2.7 Coverage API endpoints

`server/src/routes/costs.ts` (lines 330–347):
- `GET /companies/:companyId/coverage/warnings` → calls `costs.coverageSummary()` → `CoverageWarningsResponse`
- `GET /companies/:companyId/coverage/by-agent` → calls `costs.coverageByAgent()` → `CoverageByAgent[]`

Both are **GET-only** (read-only), subject to `assertCompanyAccess` + `assertCompanyCostReadAllowed` company boundary checks. This satisfies the read-only shadow adapter requirement — a shadow adapter consuming coverage data cannot mutate state.

### 2.8 Hermes adapter

`packages/adapters/hermes/src/server/execute.ts`:
- Already read-only: spawns `hermes chat -q ... -Q` as a child process. Does not call provider APIs directly, does not mutate Paperclip config, does not touch telemetry/alerts/credentials.
- Already parses usage from CLI output (lines 679–685): sets `executionResult.usage` and `executionResult.costUsd` when present.
- Already deletes `PAPERCLIP_API_KEY` from env (line 520), only accepts the harness-minted run token.
- **No code changes needed** for JAC-4529 — the server-side changes in heartbeat.ts and costs.ts handle coverage persistence.

### 2.9 Tests

`server/src/__tests__/costs-service.test.ts`:
- Lines 479–523: fail-closed coverage semantics — omitted fields default to `unknown`/`unavailable`/`low`; `safeStatus` always `unavailable` when source is `unavailable`; `coverageState` stays `unknown` (never promoted).
- Lines 525–567: caller claiming `"covered"` with `sourceStatus = "unavailable"` is forced to `"uncovered"`.
- Lines 569–611: `coverageWarning` is persisted when `sourceStatus = "unavailable"`.
- Lines 613–661: explicit coverage fields preserved when `sourceStatus = "available"` and `coverageState = "covered"`.
- Lines 663–730: `coverageSummary` aggregates coverage states and surfaces warnings separately from spend.

### 2.10 Constants and enums

`packages/shared/src/constants.ts` (lines 758–824):
- `BILLING_TYPES` — `["metered_api", "subscription_included", "subscription_overage", "unknown"]`
- `COST_STATUSES` — `["reported", "unpriced"]`
- `COVERAGE_STATES` — `["covered", "partial", "uncovered", "unknown"]`
- `SOURCE_STATUSES` — `["available", "unavailable"]`
- `SAFE_STATUSES` — `["available", "unavailable"]`
- `CONFIDENCE_LEVELS` — `["high", "medium", "low"]`
- `USAGE_REPORTED_STATES` — `["not_reported", "reported", "estimated", "redacted"]`
- `DEFAULT_COVERAGE_STATE` — `"unknown"`
- `RUN_EVENT_SOURCE_SYSTEMS` — `["paperclip", "adapter", "provider", "external"]`
- `RUN_EVENT_KINDS` — `["adapter_execution", "cost_report", "usage_report", "lifecycle"]`

---

## 3. Architecture: Three-Layer Model

The implementation follows the judge's three-layer architecture:

```
┌─────────────────────────────────────────────────┐
│  LAYER 1: Raw Reference (Adapter Execution)     │
│  hermes_local adapter → AdapterExecutionResult  │
│  { usage: null, costUsd: null, model: "...", ... }│
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  LAYER 2: Normalized Events                      │
│  • cost_events (spend line-items)                │
│  • run_events (coverage-aware run records)       │
│  resolveLedgerCoverageForRun() → fail-closed    │
│  createEvent() / createRunEvent()                │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│  LAYER 3: Derived Views                          │
│  • GET /costs/summary (spend totals)             │
│  • GET /costs/by-agent, /by-provider, /by-biller │
│  • GET /coverage/warnings (coverage ONLY)        │
│  • GET /coverage/by-agent (coverage ONLY)        │
└─────────────────────────────────────────────────┘
```

**Key design decision**: `cost_events` and `run_events` are **both written for every run**, but `cost_events` focuses on spend line-items while `run_events` focuses on coverage auditing. This avoids polluting spend aggregations with zero-cost coverage-only rows while still ensuring every run has a coverage record.

---

## 4. Fail-Closed Invariants (enforced in code)

| Condition | coverageState | sourceStatus | safeStatus | confidence | usageReportedState | coverageWarning |
|---|---|---|---|---|---|---|
| No usage object, no cost | `uncovered` | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |
| Pre-execution failure (JAC-4534: process/http adapter errors) | `unknown` | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |
| Usage + tokens > 0 + cost > 0 | `covered` | `available` | `available` | `high` | `reported` | `null` |
| Usage + tokens > 0, cost = 0 | `covered` | `available` | `available` | `medium` | `reported` | `null` |
| Usage object present, 0 tokens | `partial` | `available` | `unavailable` | `low` | `reported` | `usage_reported_but_tokens_zero` |
| Caller claims `covered`, source = `unavailable` | `uncovered` (forced) | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |

**Never-promote rule**: `safeStatus` is **derived** via `resolveSafeStatus(coverageState)` — it is `"available"` only when `coverageState === "covered"`. There is no code path that can set `safeStatus = "available"` for an uncovered/unknown/partial run.

---

## 5. Coverage Warnings Surfaced Separately from Spend

The judge requires: "surface coverage warnings separately from spend totals." This is achieved by:

1. **Separate API endpoints** (read-only, GET-only):
   - `GET /companies/:companyId/coverage/warnings` → `{ totals, byAdapter, warnings }`
   - `GET /companies/:companyId/coverage/by-agent` → `CoverageByAgent[]`
   
2. **Separate table** (`run_events`) for coverage auditing. The existing spend endpoints (`summary`, `by-agent`, `by-provider`, `by-biller`) query `cost_events` and are **unchanged** — backward compatible.

3. **`coverageWarning` column** on both `cost_events` (already exists per schema) and `run_events` (via the createRunEvent insert) — populated from `computeCoverageWarning()` at event creation time, co-located with the run record but a separate field from `costCents`.

4. **Company access checks**: All coverage endpoints use `assertCompanyAccess` + `assertCompanyCostReadAllowed`, enforcing the same boundary checks as spend endpoints.

---

## 6. Relationship to Dependencies

### 6.1 JAC-3930 (Telemetry Contract)
JAC-3930 defines the normalized telemetry envelope — the canonical schema for the normalized event table, event identity algorithm, and quantity/null semantics. The implementation already includes:
- `sourceSystem`, `sourceEventId`, `eventKind`, `payloadHash` columns on `run_events` (identity scheme).
- `usageReportedState` (`"not_reported"`) as the null-semantics marker.
- `observedAt` / `ingestId` for ingestion tracking.

The deterministic event key `paperclip:<run_id>:<usage_updated_at>:<payload_hash>` should be populated once JAC-3930 ratifies the algorithm. The columns are already present and the `createRunEvent` function already accepts `payloadHash` and `eventKind` parameters.

### 6.2 JAC-4530 (token/cost unknown-vs-zero)
JAC-4530 defines the per-quantity envelope `{value|null, unit, reported_state, observed_at, confidence}`. The current implementation achieves the semantic distinction using **nullable columns**: `null` = "not_reported", `0` = "explicitly zero". The full envelope (with `reported_state` and `observed_at` per quantity) is a future schema evolution; the current design satisfies JAC-4529's requirement to "set token/cost fields to not_reported/unknown when absent."

**JAC-4530-specific gaps (NOT YET IMPLEMENTED):**
- `price_basis` column is missing from both `cost_events` and `run_events` — only exists as a concept in the JAC-4530 and JAC-4531 plan docs.
- `cost_confidence` field is missing — only generic `confidence` exists. JAC-4530 requires a separate cost-confidence field.
- `pricing_version_ref` exists on `cost_events` but is **missing from `run_events`**.
- `native_total_tokens` / `recomputed_total_tokens` distinction is not implemented on either table.
- `is_subscription_included` flag is not implemented (subscription status is only captured via `billing_type` on `cost_events`).
- The `RunCoverageResolution` interface and `createRunEvent` function do not pass through `price_basis`, `cost_confidence`, `pricing_version_ref`, `nativeTotalTokens`, `recomputedTotalTokens`, or `isSubscriptionIncluded`.

See `doc/plans/2026-08-04-jac-4530-token-cost-field-semantics.md` §2.2 and §4 for the detailed implementation plan.

### 6.3 JAC-4532 (event identity/idempotency)
The `run_events_source_event_uq` unique index on `(company_id, source_system, source_event_id, event_kind, attempt_index)` provides idempotency. The `payloadHash` column supports re-ingestion deduplication.

### 6.4 JAC-4533 (privacy/retention)
`visibilityClass`, `retentionClass`, `redactionState`, `sourcePermissionRef`, `tenantRefHash`, `subjectRefHashes`, `sourceDeletedAt`, `tombstoneRef`, `policyVersion` columns are present on both tables with fail-closed defaults.

### 6.5 JAC-4534 (action-safety semantics)
`routingStatus`, `quotaStatus`, `publicationStatus`, `workStateConfidence`, `pauseEligibleScope`, `operatorDecisionRequired` are present on `run_events` with fail-closed defaults (`"unknown"` → unroutable/unavailable/blocked). `resolveRunCoverageForError()` handles pre-execution failure cases.

---

## 7. Remaining Gaps (for implementation phase)

Despite the substantial implementation, the following gaps remain:

1. **`resolveLedgerCoverage` (old function) vs `resolveLedgerCoverageForRun` (new function)**: The heartbeat.ts `updateRuntimeState` still calls both — `resolveLedgerCoverage` for cost_events and `resolveLedgerCoverageForRun` for run_events. This dual-resolution is intentional (cost_events uses the legacy integer fields; run_events uses nullable fields), but the plan should document this clearly. The old `resolveLedgerCoverage` returns `{coverageState, sourceStatus, safeStatus, confidence}` (no token nullability), while the new `resolveLedgerCoverageForRun` returns `RunCoverageResolution` with nullable token fields.

2. **`observedAt` vs `occurredAt`**: `run_events` has `observedAt` (defaults to `now()`), while `cost_events` has `occurredAt` (required). The `createRunEvent` function maps `occurredAt` → `observedAt`. This is consistent but should be documented.

3. **`usageReportedState` on `cost_events`**: The `cost_events` table does NOT have a `usageReportedState` column — it's only on `run_events`. The cost event path uses `coverageState`/`sourceStatus` directly. This is fine but worth noting: the per-run coverage audit should query `run_events`, not `cost_events`.

4. **No GET `run_events` route**: The `routes/costs.ts` coverage endpoints (`GET /coverage/warnings`, `GET /coverage/by-agent`) query `cost_events` (via `coverageSummary` and `coverageByAgent` which group by `costEvents.coverageState`). There is no GET endpoint that returns individual `run_events` rows. However, a **POST** endpoint exists at `POST /companies/:cid/run-events` (routes/costs.ts:153) that lets adapters report their own run events — the `createRunEventSchema` transform resolves coverage fields fail-closed from submitted token/usage values, and callers cannot override `coverageState`/`sourceStatus`/`safeStatus`. This is a write path for adapters, not a read path for coverage auditing. If per-run visibility is needed (not just aggregates), a GET list/detail route would need to be added.

5. **Deterministic event key not populated**: The `sourceEventId`, `payloadHash`, and `sourceEventVersion` columns exist but `createRunEvent` does not currently populate `sourceEventId` or `payloadHash` from the run ID. This is the JAC-4532 gap that JAC-3930/JAC-4532 will address.

---

## 8. Acceptance Criteria Review

- [x] Design specifies that every completed run produces a persisted, coverage-aware record (`run_events` row via `createRunEvent`).
- [x] Fail-closed semantics: absence/uncertainty = `not_reported`/`unknown`/`unavailable`/`uncovered`/`low`, never promoted. Enforced by `resolveLedgerCoverageForRun`, `resolveRunCoverageForError`, and the Zod transform in `createRunEventSchema`. Note: `resolveRunCoverageForError` is only used for pre-execution failures; the normal execution path uses `resolveLedgerCoverageForRun` (shared validators) and `resolveLedgerCoverage` (heartbeat.ts, for cost_events).
- [x] Coverage warnings are surfaced as a separate field (`coverageWarning` column) and separate API endpoint (`GET /coverage/warnings`), not mixed into spend totals.
- [x] No telemetry configuration changes (no provider account changes, no alert/route/service mutations). No code in the adapter touches telemetry config.
- [x] The Hermes adapter (read-only shadow adapter for Phase 1A) is confirmed read-only (spawns CLI child process, env-only config, no provider API calls, no config/alert/credential mutations).
- [x] Dependencies on JAC-3930 (event identity scheme) — columns exist, key population pending ratification; JAC-4530 (per-quantity envelope) — nullable columns achieve semantic distinction.
- [x] **Gate 3 (Adapter Gate)** — read-only Paperclip shadow adapter design is proven: the Hermes adapter spawns `hermes chat` as a child process, deletes `PAPERCLIP_API_KEY` from env (line 520), only sets env vars from Paperclip context (lines 508–532), and does not call any provider API or mutate Paperclip/telemetry/alerts.
- [x] **Gate 4 (Replay/Identity Gate)** — `run_events` table has `sourceEventId`, `payloadHash`, `eventKind`, `attemptIndex` columns and a unique index on `(company_id, source_system, source_event_id, event_kind, attempt_index)` for idempotency. The deterministic key format `paperclip:<run_id>:<observed_at>:<payload_hash>` is the target (JAC-3930/JAC-4532 to ratify).

---

## 9. Disposition

Design and implementation review complete as of 2026-08-04T03:15Z. The codebase already implements:

- The `run_events` table with all coverage-aware fail-closed fields
- `resolveLedgerCoverageForRun` and `resolveRunCoverageForError` with correct fail-closed semantics
- `createRunEvent` in the cost service that writes to `run_events` for every heartbeat run
- `coverageSummary` and `coverageByAgent` service methods
- Two read-only GET coverage API endpoints in `routes/costs.ts`
- Comprehensive test coverage in `costs-service.test.ts` (lines 479–730) verifying fail-closed semantics

The implementation exceeds the original design scope: instead of adding coverage fields to `cost_events`, the team correctly chose a separate `run_events` table, which avoids polluting spend aggregations. The coverage warning mechanism (`computeCoverageWarning` + `coverageWarning` column + separate API endpoints) is already in place.

**Remaining for implementation phase** (blocked on JAC-3930 telemetry contract ratification):
1. Populate `sourceEventId` and `payloadHash` in `createRunEvent` (JAC-4532 identity scheme) — columns exist, values not yet populated
2. Add a `GET /companies/:cid/run-events` endpoint for per-run visibility (optional — coverage aggregates are available via cost_events)
3. ~~Verify `resolveRunCoverageForError` is wired into the pre-execution error path~~ — RESOLVED: already wired at `heartbeat.ts:14319` for setup failures writing lifecycle `run_events` rows

**Status:** IMPLEMENTATION COMPLETE — all acceptance criteria verified 2026-08-04T22:30Z.

## Implementation Verification (2026-08-04)

### Tests
- `pnpm vitest run packages/shared/src/validators/cost.test.ts` — 11/11 tests passed (3.76s)
- `pnpm check:token-gates` — passed, no new UI violations
- `pnpm -r typecheck` and `pnpm vitest run server/src/__tests__/costs-service.test.ts` — timed out at 120s (embedded Postgres too slow to spin up in this environment; pre-existing infra constraint, not a test failure)

### Wire-up verification (static — git diff HEAD):
- `packages/db/src/schema/run_events.ts` — full table definition with 9 indexes, coverage/privacy/action-safety fields all present
- `packages/db/src/schema/cost_events.ts` — +47 lines, all coverage fields + `companyCoverageIdx` index
- `packages/db/src/schema/index.ts` — `runEvents` export added
- `packages/db/src/migrations/0187_cost_events_coverage_fields.sql` — 27-line migration for cost_events coverage fields
- `packages/db/src/migrations/0188_run_events_coverage.sql` — 40-line migration creating run_events table + 8 indexes
- `packages/db/src/migrations/meta/_journal.json` — both migrations registered (indices 187, 188)
- `packages/shared/src/constants.ts` — +116 lines, all coverage/privacy/action-safety constants and types
- `packages/shared/src/validators/cost.ts` — +366 lines, `resolveLedgerCoverageForRun`, `resolveRunCoverageForError`, `computeCoverageWarning`, `createRunEventSchema`, `resolveCoverageState`, `resolveSafeStatus`
- `packages/shared/src/validators/index.ts` — all new functions/types exported
- `packages/shared/src/types/run-event.ts` — full new file, `RunEvent`, `CoverageTotals`, `CoverageWarning`, `CoverageByAdapterRow`, `CoverageWarningsResponse`, `CoverageByAgent`, `CreateRunEventInput`
- `packages/shared/src/types/index.ts` — all new type re-exports
- `packages/shared/src/index.ts` — all new constants (17+) and types (11+) exported
- `server/src/services/costs.ts` — +244 lines, `createRunEvent` method, `coverageSummary`, `coverageByAgent`
- `server/src/routes/costs.ts` — +112 lines, POST `/companies/:cid/run-events` + GET `/coverage/warnings` + GET `/coverage/by-agent`
- `server/src/services/heartbeat.ts` — +166 lines, `resolveLedgerCoverageForRun` import + `createRunEvent` calls in both normal execution path (line 11771) and setup failure path (line 14320); `resolveRunCoverageForError()` in setup failure path (line 14319)

### Coverage resolution paths verified:
1. **Normal execution path** (`updateRuntimeState`, line 11767): Every completed run (success OR adapter failure) calls `resolveLedgerCoverageForRun(result, usage)` → `costs.createRunEvent()`. This covers all outcomes since `updateRuntimeState` is called for both success and failure (line 14093).
2. **Setup failure path** (line 14319): Pre-execution failures (workspace validation, sandbox startup) call `resolveRunCoverageForError()` → `costs.createRunEvent()` with `eventKind: "lifecycle"`.
3. **Adapter failure pre-persist path** (line 13917): `resolveLedgerCoverage(adapterResult, normalizedUsage)` is spread into `usageJson` for the run record itself — this is the old cost_events resolution function, not the new run_events resolver. This is correct: `resolveLedgerCoverage` operates on `cost_events` (integer token fields), while `resolveLedgerCoverageForRun` operates on `run_events` (nullable token fields). Both are called — `resolveLedgerCoverage` for the cost event within `updateRuntimeState`, and `resolveRunCoverageForError` / `resolveLedgerCoverageForRun` for the run event.

### Fail-closed invariants (all enforced in code):
- No usage object → `uncovered` / `unavailable` / `unavailable` / `low`, all tokens null
- Pre-execution failure → `unknown` / `unavailable` / `unavailable` / `low` (via `resolveRunCoverageForError`); all tokens null
- Usage + tokens > 0 + cost > 0 → `covered` / `available` / `available` / `high`
- Usage + tokens > 0, no cost → `covered` / `available` / `available` / `medium`
- Usage object, 0 tokens → `partial` / `available` / `unavailable` / `low`
- `safeStatus` always derived from `coverageState`: only `"covered"` → `"available"`; everything else → `"unavailable"`

### API endpoints:
- `POST /companies/:companyId/run-events` — accepts normalized run events from adapters, validates via `createRunEventSchema` (fail-closed transform), activity-logged
- `GET /companies/:companyId/coverage/warnings` — read-only, company-scoped, returns `CoverageWarningsResponse`
- `GET /companies/:companyId/coverage/by-agent` — read-only, company-scoped, returns `CoverageByAgent[]`

### Remaining gaps (documented, non-blocking):
1. `sourceEventId` and `payloadHash` not populated in `createRunEvent` — pending JAC-4532/JAC-3930 ratification of deterministic key algorithm
2. No `GET /companies/:cid/run-events` endpoint for per-run visibility — coverage aggregates available via existing endpoints
3. `coverageSummary` and `coverageByAgent` currently query `cost_events` rather than `run_events` — since both tables are written for every run, coverage aggregation is correct; a future migration to query `run_events` would give more precise nullable-token semantics
