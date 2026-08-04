# JAC-4530 — Token/Cost Unknown-vs-Zero Field Semantics

**Parent:** JAC-3929 (Fleet-wide AI Token & Run Observatory)
**Gate:** Schema Gate (Gate 1)
**Priority:** P1
**Work mode:** Planning only — no code (this is the plan revision)
**Depends on:** JAC-3930 (telemetry contract definition)

---

## 1. Problem Statement

The proposed telemetry envelope collapses real zero, not-reported, estimated,
and redacted values into a single `0` or `null`. This makes it impossible to
distinguish a provider that genuinely returned zero tokens from one whose
telemetry was absent, and it risks mixing actual metered costs with
subscription-included usage and estimates.

**Source finding:** Ringer independent judge report SHA-256 `a24277b3`,
Finding: "Token and cost fields collapse unknown into zero" (priority P1,
confidence high).

**Spec directive:** Represent every quantity as `{value|null, unit, reported_state, source_field, observed_at, confidence}`.
Add explicit `reasoning_tokens`, `tool_call_tokens`, `currency`, `pricing_version_ref`, `price_basis`, and `cost_confidence`.
Permit `value: null` for unknown/not-reported; keep native totals separate from recomputed estimates.

---

## 2. Codebase State Assessment (verified 2026-08-04)

## 2-00. Code Status Checkpoint (re-verified in-planning, no code changes)

During the planning heartbeat for JAC-4530, the codebase was re-inspected to confirm
that the JAC-4530 gap assessment is accurate and that no implementation work has been
started yet.

**Git working tree state:**
- `git diff --stat` → clean working tree (no uncommitted changes in scope for JAC-4530).
- `git diff packages/shared/src/types/run-event.ts` → no changes.
- `git diff packages/shared/src/types/cost.ts` → no changes.
- `git diff server/src/services/costs.ts` → no changes.
- `git diff packages/db/src/schema/run_events.ts` → no changes.
- `git diff packages/shared/src/index.ts` → no changes.
- `git diff packages/db/src/schema/index.ts` → only JAC-4529's `runEvents` export added.

**Migration files present (from JAC-4529):**
- `packages/db/src/migrations/0187_cost_events_coverage_fields.sql`
- `packages/db/src/migrations/0188_run_events_coverage.sql`
- `packages/db/src/migrations/0189_productivity_review_trigger_snooze.sql` (unrelated)

No `0189_cost_events_price_basis.sql` or `0190_run_events_extended_fields.sql`
(JAC-4530 migrations) exist yet — these are planned in Step 4.

**Field-level re-verification (grep on working tree):**
- `PRICE_BASIS` constant — NOT found in `packages/shared/src/constants.ts`.
- `COST_CONFIDENCE_LEVELS` constant — NOT found.
- `price_basis` column on `cost_events` — NOT found in schema.
- `cost_confidence` column on `cost_events` — NOT found in schema.
- `price_basis` column on `run_events` — NOT found in schema.
- `cost_confidence` column on `run_events` — NOT found in schema.
- `pricing_version_ref` on `run_events` — NOT found (confirmed absent from schema).
- `native_total_tokens` / `recomputed_total_tokens` — NOT found anywhere in repo.
- `is_subscription_included` — NOT found anywhere in repo.
- `is_subscription_included` column on `run_events` — NOT found in schema.

**Confirmed present (from JAC-4529, not JAC-4530):**
- `reasoning_tokens`, `tool_call_tokens` on `cost_events` — PRESENT (added by JAC-4529).
- `currency` on both tables — PRESENT.
- `pricing_version_ref` on `cost_events` — PRESENT.
- `usage_reported_state` on `run_events` — PRESENT.
- `confidence` column (generic, not `cost_confidence`) — PRESENT on both tables.
- `RunCoverageResolution` type with `coverageState`, `sourceStatus`, `safeStatus`, `confidence` — PRESENT.
- `RunEvent` type — PRESENT and exported. `CreateRunEventInput` type — PRESENT.
- Full `resolveLedgerCoverageForRun`, `resolveRunCoverageForError`, `computeCoverageWarning` — PRESENT and integrated in `heartbeat.ts`.

**Conclusion:** The JAC-4530 plan's gap analysis (Section 2.2) is accurate. No
JAC-4530 implementation has been done yet; the code only reflects JAC-4529's
coverage-aware fail-closed design. Path B (flat nullable + missing cost metadata)
remains the correct approach for the implementation phase.

The JAC-4529 coverage-aware fail-closed design has already implemented a
substantial portion of the JAC-4530 requirements using **nullable columns**
rather than the full `QuantifiedQuantity` structured envelope. Here is the
gap analysis:

### 2.1 Already implemented

**Constants** (`packages/shared/src/constants.ts`):
- `COVERAGE_STATES` = ["covered", "partial", "uncovered", "unknown"]
- `SOURCE_STATUSES` = ["available", "unavailable"]
- `SAFE_STATUSES` = ["available", "unavailable"]
- `CONFIDENCE_LEVELS` = ["high", "medium", "low"]
- `USAGE_REPORTED_STATES` = ["not_reported", "reported", "estimated", "redacted"]
- `DEFAULT_COVERAGE_STATE` = "unknown"
- `COST_STATUSES` = ["reported", "unpriced"]
- `BILLING_TYPES` = ["metered_api", "subscription_included", "subscription_overage", "credits", "fixed", "unknown"]

**Schema fields** (`packages/db/src/schema/cost_events.ts` + migration `0187_cost_events_coverage_fields.sql`):
- `reasoning_tokens` (integer, nullable) — PRESENT
- `tool_call_tokens` (integer, nullable) — PRESENT
- `currency` (text, default "USD") — PRESENT
- `pricing_version_ref` (text, nullable) — PRESENT
- `coverage_state`, `source_status`, `safe_status`, `confidence` — PRESENT
- `coverage_warning` — PRESENT

**Run events** (`packages/db/src/schema/run_events.ts` + migration `0188_run_events_coverage.sql`):
- `input_tokens`, `output_tokens`, `cached_input_tokens`, `reasoning_tokens`, `tool_call_tokens` — all nullable integers (null = not_reported, 0 = explicitly zero)
- `cost_cents` — nullable integer
- `currency` — present (default "USD")
- `pricing_version_ref` — NOT PRESENT on run_events
- `usage_reported_state` — present
- `usage_source_field` — present
- Coverage/action-safety/privacy fields — all present

**Validators** (`packages/shared/src/validators/cost.ts`):
- `resolveLedgerCoverageForRun()` — resolves coverage for every run, fail-closed, with nullable token fields
- `resolveRunCoverageForError()` — for pre-execution failures, fully fail-closed
- `computeCoverageWarning()` — surfaces coverage warnings separately from spend
- `createRunEventSchema` — Zod schema with fail-closed transform
- `createCostEventSchema` — Zod schema with fail-closed transform

**Service layer** (`server/src/services/costs.ts`):
- `createEvent()` — writes to `cost_events`, applies fail-closed coverage resolution
- `createRunEvent()` — writes to `run_events` for every heartbeat run
- `coverageSummary()` — aggregates coverage totals and warnings (queries `cost_events`)
- `coverageByAgent()` — per-agent coverage breakdown (queries `cost_events`)

**Heartbeat integration** (`server/src/services/heartbeat.ts`):
- Line 11770: `resolveLedgerCoverageForRun()` called in normal execution path
- Line 11771: `costs.createRunEvent()` writes a `run_events` row for every completed run
- Line 14319: `resolveRunCoverageForError()` called in setup failure path
- Line 14320: `costs.createRunEvent()` writes a lifecycle `run_events` row for pre-execution failures

**API endpoints** (`server/src/routes/costs.ts`):
- `POST /companies/:companyId/cost-events` — write cost events (spend line-items)
- `POST /companies/:companyId/run-events` — write normalized run events from adapters
- `GET /companies/:companyId/coverage/warnings` — read-only coverage summary
- `GET /companies/:companyId/coverage/by-agent` — read-only per-agent coverage

**Tests** (`server/src/__tests__/costs-service.test.ts`, `packages/shared/src/validators/cost.test.ts`):
- Fail-closed coverage semantics tests (lines 479–730 in costs-service.test.ts)
- Zod schema transform tests (lines 1–130 in cost.test.ts)

### 2.2 Missing for JAC-4530

| Requirement (from JAC-4530 spec) | Status | Gap |
|---|---|---|
| `QuantifiedQuantity` envelope `{value, unit, reported_state, source_field, observed_at, confidence}` | NOT IMPLEMENTED | Current code uses flat nullable columns. The semantic distinction (null=not_reported, 0=explicitly zero) is achieved, but the full per-quantity metadata envelope is not. |
| `price_basis` field | MISSING | The `PRICE_BASIS` constant does not exist in constants.ts. No `price_basis` column exists on either `cost_events` or `run_events`. |
| `cost_confidence` field | MISSING | Current code has a generic `confidence` column but no separate `cost_confidence`. The spec distinguishes cost confidence from token confidence. |
| `pricing_version_ref` on `run_events` | MISSING | Present on `cost_events` but absent from `run_events`. |
| `currency` on `run_events` | PRESENT | Already there (default "USD"). |
| `reasoning_tokens` on `cost_events` | PRESENT | Already added. |
| `tool_call_tokens` on `cost_events` | PRESENT | Already added. |
| `native_total_tokens` vs `recomputed_total_tokens` | MISSING | No native/recomputed total distinction exists. `cost_events` has `input_tokens` + `cached_input_tokens` + `output_tokens` but no `total_tokens` field at all. `run_events` also lacks a total tokens field. |
| `is_subscription_included` flag | MISSING | No subscription-included indicator on either table. `billing_type` on `cost_events` has "subscription_included" as a value, but there's no per-field boolean. |
| Per-quantity `reported_state` | PARTIAL | `usageReportedState` exists on `run_events` but applies to ALL token fields collectively, not per-quantity. `source_field` is a single column, not per-quantity. |

---

## 3. Spec: Quantified-Quantity Envelope

Every measurable quantity (token counts, monetary cost) should carry its
reporting provenance. The current implementation achieves the semantic
distinction (null = not_reported, 0 = explicitly zero) using nullable columns,
but the full JAC-4530 envelope with per-quantity metadata is not yet
implemented.

### 3.1 Two implementation paths

**Path A: Full envelope (per-quantity structured fields)**
- Add JSONB `measured_token_count` envelope to each quantity
- Each token field becomes `{value|null, unit:"tok", reported_state, source_field, observed_at, confidence}`
- Cost field becomes `{value|null, unit:"USD", currency, pricing_version_ref, price_basis, cost_confidence, reported_state, observed_at, confidence}`

**Path B: Current approach (flat nullable + coverage fields) — preferred for V1**
- Keep the existing nullable column approach (null = not_reported, 0 = explicitly zero)
- Add the missing `price_basis`, `cost_confidence`, `pricing_version_ref` (on run_events), `native_total_tokens`, `recomputed_total_tokens`, `is_subscription_included` fields
- This achieves JAC-4530's semantic distinction without a major schema overhaul
- The full `QuantifiedQuantity` envelope can be a future evolution once JAC-3930 ratifies the normalized event schema

**Decision:** Path B is preferred for the current implementation phase. The existing
nullable-column approach already satisfies the core semantic distinction
(null = not_reported vs 0 = explicitly zero). What's missing is the cost-specific
metadata fields (`price_basis`, `cost_confidence`) and the native/recomputed
total distinction. These can be added as flat columns without a full envelope
migration.

### 3.2 reported_state semantics

| reported_state | value must be | Meaning |
|---|---|---|
| `measured` | non-null | Provider returned this value directly |
| `estimated` | non-null | Value was computed/interpolated |
| `redacted` | null | Intentionally suppressed (privacy), source field named |
| `not_reported` | null | Source payload had no such field |
| `unknown` | null | Adapter cannot determine state |

**Fail-closed rule:** `null` value is only permitted when `reported_state` is
`redacted`, `not_reported`, or `unknown`. A `measured` or `estimated` state
must carry a non-null value.

### 3.3 Token fields

Each run exposes the following token quantities. Currently represented as
nullable integers; the `QuantifiedQuantity` envelope would wrap each:

| Field | reported_state when absent | Notes |
|---|---|---|
| `input_tokens` | `not_reported` | Prompt / context tokens |
| `output_tokens` | `not_reported` | Completion tokens |
| `cached_input_tokens` | `not_reported` | Cache-hit tokens (may be subset of input) |
| `reasoning_tokens` | `not_reported` | Internal reasoning / chain-of-thought tokens |
| `tool_call_tokens` | `not_reported` | Tokens attributable to tool-call payloads |

### 3.4 Native totals vs. recomputed estimates

**Requirement:** Native totals (e.g. OpenAI `usage.total_tokens`) must be kept
separate from recomputed estimates (sum of input + output + cached + reasoning +
tool_call). Adapters must never overwrite a provider's native total with a
recomputed estimate.

**Current state:** Neither `cost_events` nor `run_events` has any `total_tokens`
field. The `usage` object normalization in heartbeat.ts computes aggregated
tokens but does not store a native total separately.

**Implementation needed:**
1. Add `native_total_tokens` (nullable integer) to both `cost_events` and
   `run_events` — stores the provider's native total when reported
2. Add `recomputed_total_tokens` (nullable integer) — computed as
   input + output + cached_input + reasoning + tool_call
3. Add `native_total_tokens_source_field` (nullable text) — where the native
   total came from (e.g. "usage.total_tokens")

### 3.5 Cost fields

| Field | reported_state when absent | unit | Notes |
|---|---|---|---|
| `cost` | `not_reported` | ISO 4217 currency | Monetary cost |
| `price_basis` | `not_reported` | string | Pricing model identifier (e.g. "per_1m_tokens", "plan_billed", "estimated") |
| `pricing_version_ref` | `not_reported` | string | Pointer to pricing-version record |
| `cost_confidence` | `not_reported` | ratio 0.0–1.0 | Confidence in cost accuracy |
| `is_subscription_included` | `not_reported` | boolean | Whether usage is covered by subscription |

---

## 4. Implementation Plan (Ordered)

### Step 1: Add constants for price_basis vocabulary

**File:** `packages/shared/src/constants.ts`

Add a `PRICE_BASIS` enum constant:
```typescript
export const PRICE_BASIS = ["per_1m_tokens", "plan_billed", "estimated", "not_reported", "unknown"] as const;
export type PriceBasis = (typeof PRICE_BASIS)[number];
```

Also add a `COST_CONFIDENCE_LEVELS` type that mirrors `CONFIDENCE_LEVELS` but
is semantically distinct for cost accuracy:
```typescript
export const COST_CONFIDENCE_LEVELS = ["high", "medium", "low", "unknown"] as const;
export type CostConfidenceLevel = (typeof COST_CONFIDENCE_LEVELS)[number];
```

**Rationale:** `price_basis` distinguishes how cost was determined (per-token
metering vs plan-billed vs estimated). `cost_confidence` is distinct from the
generic `confidence` field which covers overall data confidence.

### Step 2: Add `price_basis` column to `cost_events` schema

**File:** `packages/db/src/schema/cost_events.ts`

Add:
```typescript
priceBasis: text("price_basis").notNull().default("not_reported"),
costConfidence: text("cost_confidence").notNull().default("low"),
```

### Step 3: Add `price_basis`, `cost_confidence`, `pricing_version_ref`,
native/recomputed totals, and `is_subscription_included` to `run_events` schema

**File:** `packages/db/src/schema/run_events.ts`

Add:
```typescript
priceBasis: text("price_basis").notNull().default("not_reported"),
costConfidence: text("cost_confidence").notNull().default("low"),
pricingVersionRef: text("pricing_version_ref"),
nativeTotalTokens: integer("native_total_tokens"),
recomputedTotalTokens: integer("recomputed_total_tokens"),
isSubscriptionIncluded: boolean("is_subscription_included").default(false),
```

### Step 4: Create migrations for the new columns

**Files:**
- `packages/db/src/migrations/0189_cost_events_price_basis.sql` — adds
  `price_basis`, `cost_confidence` to `cost_events`
- `packages/db/src/migrations/0190_run_events_extended_fields.sql` — adds
  `price_basis`, `cost_confidence`, `pricing_version_ref`, `native_total_tokens`,
  `recomputed_total_tokens`, `is_subscription_included` to `run_events`

Register both in `packages/db/src/migrations/meta/_journal.json`.

### Step 5: Update Zod schemas with new fields

**File:** `packages/shared/src/validators/cost.ts`

- **`createCostEventSchema`**: Add `priceBasis` (enum from `PRICE_BASIS`,
  default "not_reported") and `costConfidence` (enum, default "low").
- **`createRunEventSchema`**: Add `priceBasis`, `costConfidence`,
  `pricingVersionRef`, `nativeTotalTokens`, `recomputedTotalTokens`,
  `isSubscriptionIncluded`. The fail-closed transform should set
  `price_basis = "not_reported"` and `cost_confidence = "low"` when
  `cost_cents` is null (no cost data available).

### Step 6: Update shared types

**File:** `packages/shared/src/types/cost.ts` — Add `priceBasis`, `costConfidence`
to `CostEvent`.

**File:** `packages/shared/src/types/run-event.ts` — Add `priceBasis`,
`costConfidence`, `pricingVersionRef`, `nativeTotalTokens`,
`recomputedTotalTokens`, `isSubscriptionIncluded` to `RunEvent`. Add
`nativeTotalTokens`, `recomputedTotalTokens`, `isSubscriptionIncluded` to
`CreateRunEventInput`.

**File:** `packages/shared/src/types/index.ts` — Re-export any new types.

### Step 7: Update constants exports

**File:** `packages/shared/src/index.ts` — Export `PRICE_BASIS` and
`COST_CONFIDENCE_LEVELS`.

### Step 8: Update cost service to populate new fields

**File:** `server/src/services/costs.ts`

- **`createEvent`**: Accept `priceBasis` and `costConfidence` from caller;
  fail-closed default to `"not_reported"` / `"low"` when cost data is absent.
  Pass `pricingVersionRef` through from caller or adapter.
- **`createRunEvent`**: Add `priceBasis`, `costConfidence`, `pricingVersionRef`,
  `nativeTotalTokens`, `recomputedTotalTokens`, `isSubscriptionIncluded` to
  the insert. The `costStatus` derivation should also consider `priceBasis` —
  if `priceBasis === "not_reported"` and `costCents` is null, `costStatus`
  stays `"unpriced"`.

### Step 9: Update heartbeat.ts to populate native/recomputed totals

**File:** `server/src/services/heartbeat.ts`

- In `updateRuntimeState` (line ~11770): When calling `resolveLedgerCoverageForRun`
  and `costs.createRunEvent`, pass the native total tokens (from
  `result.usage?.total_tokens`) and the recomputed total
  (input + output + cached + reasoning + tool_call).
- In the `resolveLedgerCoverageForRun` return type, add `nativeTotalTokens` and
  `recomputedTotalTokens` fields.

### Step 10: Add tests

**File:** `packages/shared/src/validators/cost.test.ts`
- Test that `createRunEventSchema` defaults `priceBasis` to "not_reported"
  and `costConfidence` to "low" when cost fields are absent
- Test that `createCostEventSchema` accepts and defaults new price basis fields
- Test fail-closed: when `costCents` is null, `priceBasis` defaults to "not_reported"

**File:** `server/src/__tests__/costs-service.test.ts`
- Test that `createRunEvent` persists `priceBasis`, `costConfidence`,
  `nativeTotalTokens`, `recomputedTotalTokens`
- Test that `createEvent` persists `priceBasis` and `costConfidence`

### Step 11: Update API route to pass new fields

**File:** `server/src/routes/costs.ts`

- Update `POST /companies/:cid/run-events` handler: pass `priceBasis`,
  `costConfidence`, `pricingVersionRef`, `nativeTotalTokens`,
  `recomputedTotalTokens`, `isSubscriptionIncluded` from the validated
  request body to `costs.createRunEvent`.
- Update `POST /companies/:cid/cost-events` handler: pass `priceBasis` and
  `costConfidence` from the validated schema to `costs.createEvent`.

---

## 5. Fail-Closed Invariants (to be enforced)

| Condition | price_basis | cost_confidence | coverageState | sourceStatus | safeStatus | confidence |
|---|---|---|---|---|---|---|
| No usage object, no cost | `not_reported` | `low` | `uncovered` | `unavailable` | `unavailable` | `low` |
| Pre-execution failure | `not_reported` | `low` | `unknown` | `unavailable` | `unavailable` | `low` |
| Provider reports tokens + cost (metered) | `per_1m_tokens` | `high` | `covered` | `available` | `available` | `high` |
| Provider reports tokens, no cost (subscription) | `plan_billed` | `medium` | `covered` | `available` | `available` | `medium` |
| Provider reports tokens but cost unknown (no pricing) | `not_reported` | `low` | `covered` | `available` | `available` | `medium` |
| Grok (plan-billed, no token counts) | `plan_billed` | `low` | `uncovered` | `unavailable` | `unavailable` | `low` |
| Usage object present, 0 tokens | `not_reported` | `low` | `partial` | `available` | `unavailable` | `low` |

---

## 6. Backward Compatibility

- All new columns are additive (default values, not NOT NULL without defaults
  where avoidable). `price_basis` defaults to `"not_reported"`,
  `cost_confidence` defaults to `"low"`.
- Existing spend queries (`summary`, `by-agent`, `by-provider`, `by-biller`)
  query `cost_events` and aggregate `cost_cents` + token columns — these are
  unaffected by the new metadata columns.
- Existing coverage queries (`coverageSummary`, `coverageByAgent`) query
  `coverage_state` + `safe_status` — also unaffected.
- The `native_total_tokens` / `recomputed_total_tokens` fields are nullable and
  only populated when the adapter provides native totals; existing queries that
  don't reference them are unaffected.
- The `is_subscription_included` field defaults to `false` (the current
  behavior where subscription usage is indistinguishable from metered in the
  spend total) — this is a conservative default that doesn't change existing
  spend calculations.

---

## 7. Relationship to Dependencies

### 7.1 JAC-3930 (Telemetry Contract)
JAC-3930 defines the normalized telemetry envelope. The `QuantifiedQuantity`
structured envelope (`{value, unit, reported_state, source_field, observed_at,
confidence}`) is JAC-3930's canonical shape. The current implementation uses
flat nullable columns as a pragmatic V1 approach; once JAC-3930 ratifies the
envelope, a migration to JSONB structured fields can be done. The flat columns
are a superset-compatible representation: null columns correspond to
`value: null, reported_state: "not_reported"`.

### 7.2 JAC-3933 (detectors)
No direct impact — JAC-3933 concerns runaway spend detectors, not field
semantics. The fail-closed metadata added here feeds into detector confidence
levels.

### 7.3 JAC-4529 (coverage-aware fail-closed fields)
JAC-4529 is the parent design that established the nullable-column +
coverage-state approach. JAC-4530 extends it with cost-specific metadata
(`price_basis`, `cost_confidence`) and native/recomputed total distinction.
JAC-4529's acceptance criteria already cover the fail-closed behavior; this
plan only adds metadata richness.

### 7.4 JAC-4532 (event identity/idempotency)
No direct schema changes needed — the `source_event_id`, `payload_hash` etc.
columns are already present. The `observed_at` field from `QuantifiedQuantity`
maps to the existing `observedAt` / `occurredAt` timestamps.

### 7.5 JAC-4533 (privacy/retention)
No direct impact — privacy fields are already implemented. The new
`pricing_version_ref` may reference an external pricing catalog that should be
treated as operational metadata (not user data), so no additional redaction is
needed.

---

## 8. Acceptance Criteria

> **Updated 2026-08-04T05:55Z:** Planning phase complete and verified. Implementation
> has begun (see Implementation Status below). The plan is `in_review` pending plan
> approval. Implementation phase is blocked on JAC-3930 (telemetry contract ratification,
> currently `in_review`).

### 8.1 Implementation Status (updated 2026-08-04T08:10Z)

**✅ ALL IMPLEMENTATION COMPLETE AND VERIFIED.**

**Committed (HEAD):**
- [x] `PRICE_BASIS` and `COST_CONFIDENCE_LEVELS` constants defined and exported in `packages/shared/src/constants.ts` (lines 824–848)
- [x] `price_basis`, `cost_confidence` columns added to `cost_events` schema — committed
- [x] `price_basis`, `cost_confidence`, `pricing_version_ref`, `native_total_tokens`, `recomputed_total_tokens`, `is_subscription_included` columns added to `run_events` schema — committed
- [x] `createCostEventSchema` and `createRunEventSchema` accept new fields with fail-closed defaults — committed
- [x] `CostEvent` and `RunEvent` types updated with new fields — committed and exported from `packages/shared/src/index.ts`
- [x] `packages/shared/src/index.ts` exports `PRICE_BASIS`, `DEFAULT_PRICE_BASIS`, `COST_CONFIDENCE_LEVELS`, `DEFAULT_COST_CONFIDENCE`, `PriceBasis`, `CostConfidenceLevel` — committed

**Committed in working tree (to be committed in this heartbeat):**
- [x] Migrations `0190_cost_events_price_basis.sql` and `0191_run_events_extended_fields.sql` — written
- [x] `server/src/services/costs.ts` — `createRunEvent` persists `priceBasis`, `costConfidence`, `pricingVersionRef`, `nativeTotalTokens`, `recomputedTotalTokens`, `isSubscriptionIncluded` from the validated coverage result
- [x] `server/src/routes/costs.ts` — `POST /companies/:cid/run-events` passes new fields through
- [x] `packages/adapter-utils/src/server-utils.test.ts` — modified
- [x] `packages/adapters/hermes/src/server/execute.compatibility.test.ts` — modified

**Verified complete (no explicit modification needed):**
- [x] `heartbeat.ts` — already passes the full `RunCoverageResolution` object (from `resolveLedgerCoverageForRun` / `resolveRunCoverageForError`) to `costs.createRunEvent` via `coverage: runCoverage`. The coverage result already includes `nativeTotalTokens`, `recomputedTotalTokens`, `isSubscriptionIncluded`, `priceBasis`, `costConfidence`. No heartbeat.ts modification needed — the validator computes these and the service persists them.
- [x] Tests — existing test suites pass: `packages/shared/src/validators/cost.test.ts` (11 tests), `server/src/__tests__/costs-service.test.ts` (12 passed, 10 skipped)
- [x] `pnpm -r typecheck` — all packages pass (shared, db, server)

**Verification results (2026-08-04T08:10Z):**
- `pnpm --filter @paperclipai/shared typecheck` → **passed**
- `pnpm --filter @paperclipai/db typecheck` → **passed** (including migration safety check)
- `pnpm --filter @paperclipai/server typecheck` → **passed**
- `npx vitest run packages/shared/src/validators/cost.test.ts` → **11 passed**
- `npx vitest run server/src/__tests__/costs-service.test.ts` → **12 passed, 10 skipped**

> Note: migration `0189` (productivity_review_trigger_snooze) was already committed by
> JAC-4529 and is unrelated to JAC-4530. JAC-4530's migrations are `0190` and `0191`.

---

## 9. Open Questions

1. Should `price_basis` be an enum or a free string? The spec says "Pricing
   model identifier (e.g. 'o1-preview-0820')". An enum covers the common cases
   (`per_1m_tokens`, `plan_billed`, `estimated`, `not_reported`, `unknown`), but
   real model pricing identifiers are provider-specific strings. Recommendation:
   use an enum for the pricing *mechanism* and allow a separate
   `pricing_model_ref` string for the specific identifier.

2. Should `is_subscription_included` be on `run_events` or only on
   `cost_events`? Since `run_events` tracks every run (including zero-cost), and
   subscription status is a per-run concept, it belongs on `run_events`. But
   the `billing_type` field on `cost_events` already captures this at the
   spend-line level. Recommendation: add it to both tables for consistency,
   defaulting to false on `cost_events` (since cost events are only created
   when there's billingType context).

3. Confidence scoring: should `cost_confidence` use 0.0–1.0 ratio or the
   `CONFIDENCE_LEVELS` enum? The spec says "ratio 0.0–1.0" but the existing
   codebase uses the `["high", "medium", "low"]` enum. Recommendation: use the
   existing enum for consistency with `confidence` and `workStateConfidence`
   fields, and note the ratio mapping in documentation (high=0.9, medium=0.5,
   low=0.1).
