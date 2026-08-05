## JAC-4529 Plan: Coverage-Aware Fail-Closed Run Event Fields

Design plan complete. Full design written to `doc/plans/2026-08-04-jac-4529-coverage-aware-run-events.md`.

### Summary

The Ringer independent judge (report SHA a24277b3) requires: emit a normalized run event for every run, set token/cost fields to `not_reported`/`unknown` when absent, add explicit `coverage_state`, `source_status`, `safe_status`, and `confidence` fields, and surface coverage warnings separately from spend totals.

### What already exists (verified against codebase)

The coverage-aware fail-closed infrastructure is **already implemented** in the codebase:

- **`run_events` table** (`packages/db/src/schema/run_events.ts`): dedicated table emitted for every heartbeat run, with nullable token/cost fields (null = not_reported, 0 = explicitly zero), all coverage fields with fail-closed defaults (unknown/unavailable/unavailable/low), usageReportedState, and JAC-4532/JAC-4533/JAC-4534 identity/privacy/action-safety columns.
- `resolveLedgerCoverageForRun` + `resolveRunCoverageForError` (`packages/shared/src/validators/cost.ts`): fail-closed coverage resolution for both normal runs and pre-execution failures. (Note: the function is `resolveLedgerCoverageForRun`, not `resolveRunCoverageForRun` — it resolves from adapter execution results + normalized token totals.)
- **`createRunEventSchema`** (validators/cost.ts:337): Zod transform that derives coverage fields from usageReportedState + token values — never caller-supplied.
- **`createRunEvent`** (`server/src/services/costs.ts:132`): writes a `run_events` row for every heartbeat run via `resolveLedgerCoverageForRun`.
- `coverageSummary` + `coverageByAgent` (`server/src/services/costs.ts:628,719`): aggregate coverage totals and warnings. **Note:** these query `cost_events` (grouped by `costEvents.coverageState`), not `run_events`. Returns `CoverageWarningsResponse` / `CoverageByAgent[]`.
- **Coverage API endpoints** (`server/src/routes/costs.ts:330`): `GET /companies/:cid/coverage/warnings` and `GET /companies/:cid/coverage/by-agent` — both GET-only, subject to company access checks.
- **Tests** (`server/src/__tests__/costs-service.test.ts:479-730`): verify fail-closed semantics, warning persistence, coverage summary aggregation.
- **Hermes adapter** (`packages/adapters/hermes/src/server/execute.ts`): already read-only — spawns `hermes` CLI as child process, sets env vars only, does not call provider APIs or mutate config/telemetry/alerts/credentials.

### The two structural gaps (already closed)

1. **No record for every run** — RESOLVED: `heartbeat.ts:11767-11781` now calls `costs.createRunEvent()` for every run, writing to the dedicated `run_events` table. Zero-spend runs (process/http adapters, errors) are included.

2. **Coverage not surfaced via API** — RESOLVED: `routes/costs.ts:330-347` exposes two GET-only coverage endpoints. The existing spend endpoints (`summary`, `by-agent`, `by-provider`, `by-biller`) remain unchanged and backward-compatible.

### Design: separate `run_events` table (not coverage columns on `cost_events`)

The implementation correctly chose a **separate `run_events` table** rather than adding coverage-only rows to `cost_events`. This avoids polluting spend aggregations (which group by `biller`/`billingType` and count distinct `heartbeatRunId`) with zero-cost coverage rows. Both tables are written for every run: `cost_events` for spend consumers, `run_events` for coverage auditing.

### Fail-closed invariants

| Condition | coverageState | sourceStatus | safeStatus | confidence | usageReportedState | coverageWarning |
|---|---|---|---|---|---|---|
| No usage object (run executed, adapter silent) | `uncovered` | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |
| Pre-execution failure (no run result) | `unknown` | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |
| Usage + tokens > 0 + cost > 0 | `covered` | `available` | `available` | `high` | `reported` | `null` |
| Usage + tokens > 0, cost = 0 | `covered` | `available` | `available` | `medium` | `reported` | `null` |
| Usage object present, 0 tokens | `partial` | `available` | `unavailable` | `low` | `reported` | `usage_reported_but_tokens_zero` |
| Caller claims covered, source = unavailable | `uncovered` (forced) | `unavailable` | `unavailable` | `low` | `not_reported` | `adapter_did_not_report_usage` |

**Never-promote rule**: `safeStatus` is derived via `resolveSafeStatus(coverageState)` — `"available"` only when `coverageState === "covered"`. No code path can set it otherwise.

### Remaining gaps (blocked on JAC-3930)

1. **`sourceEventId`/`payloadHash` not populated in `createRunEvent`** — columns exist; population awaits JAC-3930/JAC-4532 ratification of the deterministic key format `paperclip:<run_id>:<observed_at>:<payload_hash>`.
2. **No per-run `run_events` GET endpoint** — coverage aggregates are available (`coverageSummary`), but individual `run_events` rows have no list/detail GET route. A POST endpoint exists at `POST /companies/:cid/run-events` (routes/costs.ts:153) for adapter-reported events, but no GET for per-run visibility. Optional gap.
3. **`resolveRunCoverageForError` wiring** — RESOLVED. The pre-execution error path in `heartbeat.ts:14319` already calls `resolveRunCoverageForError()` and writes a `run_events` row via `costs.createRunEvent()` with `eventKind: "lifecycle"`. This covers setup failures (workspace validation, sandbox startup, adapter error, timeout, cancellation).

### Risks

- **Cost event volume** — `cost_events` now has a row for every run (not just metered). Indexes exist on `(company_id, occurred_at)` and `(company_id, coverage_state)`. New rows with `costCents = 0` and `billingType = "unknown"` allow downstream filtering.
- **Backward compatibility** — new coverage fields and endpoints are additive. Existing spend-only consumers are unaffected.
- **Shadow adapter read-only** — the new coverage endpoints are GET-only and subject to existing company access checks (`assertCompanyAccess` + `assertCompanyCostReadAllowed`).

### Disposition

Planning complete. No code written in this heartbeat. No telemetry config changes made. No provider/alert/service/credential/runtime mutations. The implementation is already in place; remaining work is gated on JAC-3930 (telemetry contract) ratification for deterministic event identity.
