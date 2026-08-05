# JAC-4529 Design: Coverage-Aware Fail-Closed Event Fields for Paperclip Adapter

**Issue:** JAC-4529 — [JAC-3929] P0: Paperclip adapter coverage-aware fail-closed event fields
**Parent:** JAC-3929 (Fleet-wide AI Token & Run Observatory)
**Phase:** Phase 0 (Ratify the contract) — Adapter gate
**Date:** 2026-08-04
**Author:** Task Rabbit (overflow handler)
**Status:** Design only — no telemetry config changes, no provider-account changes

---

## 1. Summary

This design specifies how the Paperclip shadow adapter emits normalized run events with
coverage-aware fail-closed fields. The key principle: **token/cost fields default to
`unknown` (not zero) when the source adapter did not report them; coverage warnings are
surfaced separately from spend totals.**

### Current state of the codebase

Research across the Paperclip repository reveals that the coverage-awareness
infrastructure is **already partially implemented** for cost events:

- **Schema** (`packages/db/src/schema/cost_events.ts`): `cost_events` table already has
  `coverage_state`, `source_status`, `safe_status`, and `confidence` columns with
  fail-closed defaults (`unknown`/`unavailable`/`unavailable`/`low`).
- **Migration** (`packages/db/migrations/0187_cost_events_coverage_fields.sql`): adds the
  four columns + compound index `cost_events_company_coverage_idx`.
- **Constants** (`packages/shared/src/constants.ts:777-803`): `COVERAGE_STATES`,
  `SOURCE_STATUSES`, `SAFE_STATUSES`, `CONFIDENCE_LEVELS` enums.
- **Validators** (`packages/shared/src/validators/cost.ts`): `resolveCoverageState` and
  `resolveSafeStatus` implement fail-closed resolution.
- **Heartbeat** (`server/src/services/heartbeat.ts:2670-2746`): `resolveLedgerCoverage()`
  computes coverage from `AdapterExecutionResult.usage` and persists it in cost events via
  `updateRuntimeState`.

**What is missing** (the actual scope of JAC-4529):

1. **Run events without cost events are not represented.** Runs that produce zero spend
   (e.g., `process`/`http` adapters, error exits, adapter startup failures) create no
   cost_events row, so there is no coverage record for them. The issue says "Emit a
   normalized run event for every run."
2. **Token/cost fields collapse `not_reported` into `0`/null.** `resolveLedgerCoverage`
   treats zero tokens as `partial` coverage when a usage object exists. There is no
   explicit `not_reported` state for when the adapter simply did not expose tokens — it
   defaults to `inputTokens: 0`.
3. **Coverage warnings are not surfaced separately from spend totals.** No API endpoint
   exposes a "coverage warnings" or "uncovered runs" view. Spend aggregates (`byAgent`,
   `byProvider`, `windowSpend`, etc.) silently include zero-cost rows.
3. **No deterministic event identity for coverage records.** The fleet-wide contract
   (JAC-4532) requires `source_event_id`, `observed_at`, deterministic adapter keys.
   Coverage events need their own identity scheme. (Note: `usage_updated_at` does not
   currently exist in the codebase — it must be introduced as part of the run event
   schema.)

---

## 2. Design

### 2.1 Normalized Run Event (New Concept)

A **run event** is a normalized record emitted by the Paperclip adapter for every
`heartbeat_run`, regardless of whether it produced cost. This is distinct from
`cost_events` (which represent spend line-items). A run event carries coverage metadata
that enables fail-closed reasoning without conflating it with spend totals.

#### 2.1.1 Fields

| Field | Type | Default | Fail-closed rationale |
|---|---|---|---|
| `run_id` | uuid (FK → heartbeat_runs) | — | Identifies the run |
| `agent_id` | uuid (FK → agents) | — | Who executed |
| `issue_id` | uuid (FK → issues, nullable) | null | Scope |
| `company_id` | uuid (FK → companies) | — | Company boundary |
| `adapter_type` | text | — | Which adapter produced the run |
| `model` | text | `"unknown"` | `"unknown"` when adapter did not report |
| `provider` | text | `"unknown"` | `"unknown"` when not identifiable |
| `status` | text | — | Run status: `success` / `error` / `timeout` / `canceled` |
| `input_tokens` | integer | **null** | null = not_reported; 0 = explicitly zero |
| `output_tokens` | integer | **null** | null = not_reported; 0 = explicitly zero |
| `cached_input_tokens` | integer | **null** | null = not_reported |
| `reasoning_tokens` | integer | **null** | null = not_reported |
| `tool_call_tokens` | integer | **null** | null = not_reported |
| `cost_cents` | integer | **null** | null = not_reported; 0 = no charge |
| `currency` | text | `"USD"` | ISO 4217 |
| `usage_reported_state` | enum | `"not_reported"` | `"not_reported"` / `"reported"` / `"estimated"` / `"redacted"` |
| `usage_source_field` | text | null | e.g. `"result.usage"` — provenance |
| `coverage_state` | enum | `"unknown"` | `"covered"` / `"partial"` / `"uncovered"` / `"unknown"` |
| `source_status` | enum | `"unavailable"` | `"available"` / `"unavailable"` |
| `safe_status` | enum | `"unavailable"` | derived from coverage_state |
| `confidence` | enum | `"low"` | `"high"` / `"medium"` / `"low"` |
| `observed_at` | timestamptz | — | When usage was observed |
| `ingest_id` | uuid | random | Unique ingestion record |
| `payload_hash` | text | sha256 | Content hash for idempotency |
| `created_at` | timestamptz | now() | |

**Key semantic:** `input_tokens = null` means "the adapter did not report token usage"
(`usage_reported_state = "not_reported"`). `input_tokens = 0` means "the adapter reported
usage and the token count was zero." This distinction is critical: a zero-cost run that
did not expose usage data is **not** the same as a run that explicitly reported zero
tokens.

### 2.2 Fail-Closed Resolution Rules

The same `resolveCoverageState` / `resolveSafeStatus` validators from
`packages/shared/src/validators/cost.ts` apply:

- `source_status = "unavailable"` → `coverage_state = "uncovered"` (regardless of caller input)
- `coverage_state != "covered"` → `safe_status = "unavailable"`
- `coverage_state = "unknown"` → `safe_status = "unavailable"` (fail closed)
- Default `coverage_state = "unknown"`, default `source_status = "unavailable"`,
  default `confidence = "low"`

These are already implemented as pure functions. The run-event path reuses them directly.

### 2.3 Token/Cost Value Semantics

Following the JAC-4530 requirement (`{value|null, unit, reported_state, source_field,
observed_at, confidence}`), the run event stores:

- `input_tokens`, `output_tokens`, `cached_input_tokens`, `reasoning_tokens`,
  `tool_call_tokens` as **nullable integers** — `null` = not_reported, `0` = explicitly zero.
- `cost_cents` as **nullable integer** — `null` = not_reported, `0` = explicitly no charge.
- `currency` as text (default `"USD"`) so zero-cost is distinguishable from "cost not
  measured."
- `usage_reported_state` as an enum: `"not_reported"` / `"reported"` / `"estimated"` /
  `"redacted"` — the explicit replacement for the collapsed `0`/`null` problem.

The adapter computes `usage_reported_state` from the `AdapterExecutionResult.usage`
object:
- `result.usage == null` → `"not_reported"`, all token fields `null`
- `result.usage` present with actual counts → `"reported"`
- Provider returned estimates → `"estimated"` (adapter signals this by populating
  `result.resultJson.usage_reported_state = "estimated"` or by setting
  `result.resultJson.usage_is_estimated = true` in its extra metadata)
- Redacted by privacy policy → `"redacted"`, token fields `null`

### 2.4 Coverage State Computation for Run Events

| Case | usage_reported_state | coverage_state | source_status | safe_status | confidence |
|---|---|---|---|---|---|
| No usage object | not_reported | uncovered | unavailable | unavailable | low |
| Usage present, tokens > 0 | reported | covered | available | available | high (if cost also present) / medium (tokens only) |
| Usage present, tokens all 0 | reported | partial | available | unavailable | low |
| Usage present, tokens null/zero, cost > 0 | reported | covered | available | available | medium |
| Usage redacted | redacted | uncovered | available | unavailable | low |
| Unknown (adapter error, no result) | not_reported | unknown | unavailable | unavailable | low |

This reuses the existing `resolveLedgerCoverage` logic (in `heartbeat.ts:2702`) with an
expanded input shape that accepts `usage_reported_state` alongside `usage`.

### 2.5 Coverage Warnings (Separate from Spend Totals)

The issue explicitly requires "surface coverage warnings separately from spend totals."
Two new API responses are proposed:

#### 2.5.1 `GET /companies/:companyId/coverage/warnings`

Returns aggregated coverage warnings, NOT spend data:

```json
{
  "companyId": "uuid",
  "generatedAt": "2026-08-04T01:00:00Z",
  "totals": {
    "totalRuns": 1000,
    "coveredRuns": 600,    // model, provider, and tokens all reported
    "uncoveredRuns": 250,  // adapter did not expose usage reporting
    "partialCoverageRuns": 150, // usage reported but tokens were zero/null
    "unknownRuns": 0       // adapter error or indeterminate
  },
  "byAdapter": [
    {
      "adapterType": "process",
      "sourceStatus": "unavailable",
      "coverageState": "uncovered",
      "safeStatus": "unavailable",
      "runCount": 200,
      "spendCents": 0
    },
    {
      "adapterType": "codex_local",
      "sourceStatus": "available",
      "coverageState": "partial",
      "safeStatus": "unavailable",  // fail closed
      "runCount": 150,
      "spendCents": null
    }
  ],
  "warnings": [
    {
      "severity": "warning",
      "adapterType": "process",
      "reason": "usage reporting not exposed",
      "runCount": 200,
      "safeStatus": "unavailable"
    },
    {
      "severity": "warning",
      "adapterType": "codex_local",
      "reason": "usage reported but token counts all zero",
      "runCount": 150,
      "safeStatus": "unavailable"
    }
  ]
}
```

**Critical property:** spend totals (`cost_cents`, `input_tokens`) are **not** included in
this response. If a caller needs spend data, they call the existing `/costs/summary` or
`/costs/by-agent` endpoints. This separation prevents the coverage warning surface from
collapsing into spend totals — a run with zero spend but uncovered tokens is still a
warning, and a run with spend but uncovered usage is still a warning.

#### 2.5.2 `GET /companies/:companyId/costs/by-agent` — augmented

Add optional coverage fields to the existing `byAgent` response, behind a query param:

```
GET /companies/:companyId/costs/by-agent?include_coverage=true
```

Response adds:
```json
{
  "agentId": "uuid",
  "agentName": "Aegis",
  "agentStatus": "active",
  "costCents": 1500,
  "inputTokens": 50000,
  "outputTokens": 20000,
  "coverage": {
    "coveredRuns": 10,
    "uncoveredRuns": 2,
    "partialRuns": 1,
    "safeStatus": "available"  // fail-closed aggregate
  }
}
```

When `include_coverage` is omitted, the response is unchanged (backward compatible).

### 2.6 Run Event Emission Points

The Paperclip adapter emits a run event at the end of every `heartbeat_run`:

1. **In `updateRuntimeState`** (`heartbeat.ts:11689`): after the adapter execution result
   is available, before or alongside the cost event creation (line 11731), emit a run
   event with the coverage resolution. This function already has access to `result`
   (the `AdapterExecutionResult`) and computes `coverage` via `resolveLedgerCoverage`.

2. **For runs that fail before adapter execution** (e.g., workspace validation failure,
   sandbox startup error): emit a run event with `status = "error"`,
   `usage_reported_state = "not_reported"`, `coverage_state = "unknown"`,
   `safe_status = "unavailable"`, confidence = "low". This is the key gap — currently
   these runs produce zero cost events and are invisible to coverage tracking.

3. **For non-API adapters** (`process`, `http`): these adapters' `AdapterExecutionResult`
   typically has `usage = null` and `costUsd = null`. The run event should record
   `usage_reported_state = "not_reported"` and `coverage_state = "uncovered"`. This is
   correct and expected — coverage warnings will accurately surface that process/http
   adapter runs don't expose usage data.

### 2.7 Idempotency and Event Identity

Following JAC-4532, run events get deterministic identity:

```
run_event_id = uuid5(namespace=company_id, name="paperclip:{run_id}:{usage_observed_at}:{payload_hash}")
```

Where:
- `run_id` is the heartbeat run UUID
- `usage_observed_at` is the timestamp when usage was observed (from `result.resultJson?.usage_observed_at` if present, otherwise the run's `finishedAt`)
- `payload_hash` = `sha256(stable_stringify({input_tokens, output_tokens, cached_input_tokens,
  reasoning_tokens, tool_call_tokens, cost_cents, currency, coverage_state, source_status,
  safe_status, confidence, usage_reported_state}))`

Re-ingest is a no-op unless `source_event_version` or `payload_hash` changes. The
`ingest_id` column supports multiple ingestion attempts; `payload_hash` enforces
content-stable deduplication.

### 2.8 Schema Changes

New table: `run_events` (separate from `cost_events`) — a new migration file
`0188_run_events_coverage.sql`:

```sql
CREATE TABLE "run_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "agent_id" uuid NOT NULL REFERENCES "agents"("id"),
  "issue_id" uuid REFERENCES "issues"("id"),
  "run_id" uuid NOT NULL REFERENCES "heartbeat_runs"("id"),
  "adapter_type" text NOT NULL,
  "model" text NOT NULL DEFAULT 'unknown',
  "provider" text NOT NULL DEFAULT 'unknown',
  "status" text NOT NULL DEFAULT 'success',
  "input_tokens" integer,
  "output_tokens" integer,
  "cached_input_tokens" integer,
  "reasoning_tokens" integer,
  "tool_call_tokens" integer,
  "cost_cents" integer,
  "currency" text NOT NULL DEFAULT 'USD',
  "usage_reported_state" text NOT NULL DEFAULT 'not_reported',
  "usage_source_field" text,
  "coverage_state" text NOT NULL DEFAULT 'unknown',
  "source_status" text NOT NULL DEFAULT 'unavailable',
  "safe_status" text NOT NULL DEFAULT 'unavailable',
  "confidence" text NOT NULL DEFAULT 'low',
  "observed_at" timestamptz NOT NULL DEFAULT now(),
  "ingest_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "payload_hash" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "run_events_company_run_idx" ON "run_events" ("company_id", "run_id");
CREATE INDEX "run_events_company_coverage_idx" ON "run_events" ("company_id", "coverage_state", "observed_at");
CREATE INDEX "run_events_company_safe_status_idx" ON "run_events" ("company_id", "safe_status", "observed_at");
CREATE INDEX "run_events_payload_hash_idx" ON "run_events" ("company_id", "payload_hash");
```

**No changes to `cost_events`** — the existing coverage columns there remain as-is.
Cost events already carry coverage fields and are emitted via `updateRuntimeState`. The
`run_events` table is complementary: it captures EVERY run (including zero-cost runs).

### 2.9 Constants to Add

In `packages/shared/src/constants.ts`:

```typescript
export const USAGE_REPORTED_STATES = ["not_reported", "reported", "estimated", "redacted"] as const;
export type UsageReportedState = (typeof USAGE_REPORTED_STATES)[number];

export const RUN_EVENT_STATUSES = ["success", "error", "timeout", "canceled"] as const;
export type RunEventStatus = (typeof RUN_EVENT_STATUSES)[number];
```

### 2.10 Implementation Order (Post-Approval)

1. Add constants + run-event schema + migration (`0188_run_events_coverage.sql`)
2. Add `resolveLedgerCoverageForRun` — a variant of `resolveLedgerCoverage` that accepts
   `usage_reported_state` and produces all nullable token fields
3. Emit run events in `updateRuntimeState` (heartbeat.ts) for every run completion
4. Emit run events for pre-execution failures (workspace validation, sandbox startup)
5. Add coverage warning API endpoints (`GET /coverage/warnings`, augment
   `GET /costs/by-agent?include_coverage=true`)
6. Add Paperclip telemetry event `run.coverage_warning` (in
   `packages/shared/src/telemetry/events.ts`) for fail-closed coverage drops

### 2.11 Backward Compatibility

- `cost_events` schema unchanged — existing coverage columns remain
- `GET /costs/by-agent` response unchanged when `include_coverage` is omitted
- `run_events` is a new table — no breaking changes to existing queries
- The existing `resolveCoverageState` / `resolveSafeStatus` validators are reused as-is

---

## 3. Evidence

### 3.1 Codebase References

| File | Lines | Significance |
|---|---|---|
| `packages/db/src/schema/cost_events.ts` | 33-40 | Coverage columns already exist on cost_events |
| `packages/db/src/migrations/0187_cost_events_coverage_fields.sql` | 1-19 | Migration adds coverage columns + index |
| `packages/shared/src/constants.ts` | 777-803 | COVERAGE_STATES, SOURCE_STATUSES, SAFE_STATUSES, CONFIDENCE_LEVELS |
| `packages/shared/src/validators/cost.ts` | 19-36 | resolveCoverageState, resolveSafeStatus (fail-closed) |
| `server/src/services/heartbeat.ts` | 2670-2746 | resolveLedgerCoverage() — coverage computation logic |
| `server/src/services/heartbeat.ts` | 11710, 11731-11751 | updateRuntimeState — cost event emission with coverage |
| `server/src/services/costs.ts` | 55-103 | createEvent — persists coverage fields, updates spend |
| `server/src/routes/costs.ts` | 173-271 | API endpoints — no coverage warning surface |
| `server/src/adapters/registry.ts` | 666-679 | detectAdapterModel — model resolution path |
| `packages/adapter-utils/src/types.ts` | 76-116 | AdapterExecutionResult — source of usage/provider/model |
| `packages/adapter-utils/src/types.ts` | 31-35 | UsageSummary — {inputTokens, outputTokens, cachedInputTokens} |

### 3.2 Gap Analysis

| Requirement (JAC-4529) | Status | Evidence |
|---|---|---|
| coverage_state, source_status, safe_status, confidence fields | **Already exists** | cost_events schema, migration 0187, constants, validators |
| Emit normalized run event for every run | **Missing** | No run_events table; cost_events only created when tokens/cost > 0 |
| Set token/cost to not_reported/unknown when absent | **Partially exists** | resolveLedgerCoverage handles null usage → uncovered, but uses `0` for absent tokens in DB |
| Surface coverage warnings separately from spend totals | **Missing** | No API endpoint; spend aggregates silently include zero-cost runs |
| Paperclip coverage fails closed | **Already exists** | resolveSafeStatus: non-"covered" → "unavailable" |
| Design only — no telemetry config changes | **Compliant** | This design touches schema + services, not telemetry config |

### 3.3 Key Design Decisions

1. **Separate `run_events` table from `cost_events`** — cost events represent spend line
   items; run events represent execution coverage. Conflating them would either (a)
   require nullable cost fields on every run (schema bloat) or (b) lose coverage data
   for zero-cost runs (the current bug).

2. **Nullable token fields** — `input_tokens = null` means "adapter did not report";
   `0` means "adapter reported zero." This directly satisfies the JAC-4529 requirement
   to "set token/cost fields to not_reported/unknown when absent" without collapsing
   semantics.

3. **`usage_reported_state` enum** — provides the explicit `not_reported`/`reported`/
   `estimated`/`redacted` distinction the JAC-4530 schema gate calls for (`reported_state`
   in `{value|null, unit, reported_state, ...}`).

4. **Coverage warnings API separate from spend API** — prevents the exact failure mode
   described in JAC-4529: "surface coverage warnings separately from spend totals."
   The `/coverage/warnings` endpoint returns no financial figures.

5. **Reuse existing fail-closed validators** — `resolveCoverageState` and
   `resolveSafeStatus` are already correct. The run-event path calls them directly,
   ensuring consistency with cost events.

---

## 4. Out of Scope

- No changes to telemetry config files or endpoints
- No provider-account changes
- No dashboard publication (covered by JAC-4538 / JAC-3934)
- No raw prompt/transcript storage in run_events (pointers only, per JAC-4533)
- No execution or code changes — this is a design specification only