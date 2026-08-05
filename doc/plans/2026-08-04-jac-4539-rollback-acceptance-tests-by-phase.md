# JAC-4539 — Rollback Acceptance Tests by Phase (Plan)

**Date:** 2026-08-04
**Work mode:** Planning only — design acceptance tests, do not implement
**Author:** Quill (agent d839443a, Technical Writer) — revised by Karax (devops verification pass)
**Issue:** JAC-4539 [JAC-3929] P3: Rollback acceptance tests by phase
**Branch:** JAC-3679-build-reusable-report-kit-template (confirmed via `git branch --show-current`)
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory — reconciled initiative and approval gate
**Priority:** P3 (medium)
**Depends on:** JAC-3935 (phased plan, `in_review`), JAC-4265 (schema validation spike, `done` — completed 2026-08-04; deliverable attached to issue and committed to Agentic OS repo at commit `a5458784`)
**Gate:** Gate 6 — Publication Gate (rollback acceptance tests)
**Status:** Planning v2 — design phase (corrected against working tree)

---

## 0. Purpose and Scope

**Judge report:** SHA-256 `a24277b3`, Gate 6 (Publication Gate) finding:
"Rollback remains a principle rather than an acceptance test."

This document defines the **rollback acceptance test design** for each phase of
the Fleet-wide AI Token & Run Observatory rollout. The Ringer judge finding
(Gate 6) requires that rollback is not merely documented as a principle — it
must be **tested and accepted** as a gate condition before each phase is
considered shippable.

**Five rollback acceptance criteria** (from JAC-3929 Gate 6 checklist):
1. Read-only adapters can be disabled without data loss
2. Normalized events include schema and pricing versions
3. Dashboard publication can revert to the previous versioned artifact
4. Alerting and pause controls have independent kill switches
5. Cost recomputation from immutable source pointers is tested

**Non-goals (explicit):**
- No code implementation in this issue — design the acceptance tests only.
- No provider-account changes, telemetry configuration, or alert service changes.
- No dashboard publication or external rollout.

**Phased plan context:** JAC-3935 (in_review) defines the phased rollout of the
observatory across phases 0–4: (0) observability instrumentation, (1) Paperclip
shadow adapter, (2) Ringer composite adapter, (3) cross-vendor adapters, (4)
dashboard publication. Each phase must carry its own rollback acceptance tests.

---

## 1. Relationship to Sibling Plans

This plan is the **test design specification** that complements the other JAC-3929
child plans:

| Plan | Gate | Role | Current status |
|---|---|---|---|
| JAC-4530 (token/cost semantics) | Gate 1 | Schema fields | `done` (implementation committed f5b25c036) |
| JAC-4531 (Ringer composite adapter) | Gate 3 Phase 1B | Adapter design | `blocked` |
| JAC-4532 (event identity/idempotency) | Gate 4 | Replay/identity | `in_progress` |
| JAC-4533 (privacy/retention) | Gate 2 | Schema fields | `in_review` |
| JAC-4534 (action-safety) | Gate 5 | Unknown states | `done` |
| JAC-4535 (freshness split) | Gate 6 | Publication timing | `done` |
| JAC-4536 (Telegram delivery) | Gate 5 | Redacted delivery | `done` |
| JAC-4538 (publication contract) | Gate 6 | Pointer vs ownership | `blocked` |
| **JAC-4539 (rollback tests)** | **Gate 6** | **Rollback acceptance** | **`todo`** |

JAC-4535 (freshness split) defines the TTL model and phased rollout schedule.
This plan (JAC-4539) defines the rollback acceptance tests that gate each phase
transition. JAC-4265 (schema validation spike) will provide the test harness
that validates normalized event shapes — its spike must be completed before
rollback tests can validate schema/pricing version fields (criterion 2).

---

## 2. Problem Statement

The observatory architecture is being rolled out incrementally across five
phases (JAC-3935). Each phase introduces new adapters, schemas, and dashboard
surfaces. Without formal rollback acceptance tests, a partial rollout cannot be
safely reversed — adapters may leave dangling references, schema versions may be
incompatible, and cost recomputation from source pointers may produce
different results after rollback.

The judge finding (Gate 6) requires that rollback is treated as an acceptance
test, not a documentation principle. This plan designs those acceptance tests.

---

## 3. Codebase-Verified Context

This section corrects the initial plan against the actual working tree (verified
2026-08-04). All file paths are relative to the repository root.

### 3.1 Normalized event schema (actual state)

**`packages/db/src/schema/run_events.ts`** — the `run_events` table has these
versioning/identity fields (not a column named `schema_version`):

- `sourceEventVersion: text("source_event_version")` — nullable text, version of
  the source event schema format. Part of JAC-4532 identity fields.
- `pricingVersionRef: text("pricing_version_ref")` — nullable text, present on
  `run_events` (added by JAC-4530 f5b25c036). Points to a pricing-version record.
- `sourceEventId: text("source_event_id")` — nullable, deterministic external
  event ID for idempotency.
- `payloadHash: text("payload_hash")` — nullable, SHA-256 of the payload for
  change detection.
- `ingestId: uuid("ingest_id")` — UUID, defaults to random, tracks ingestion
  batch.

**`packages/db/src/schema/cost_events.ts`** — the `cost_events` table has:

- `pricingVersionRef: text("pricing_version_ref")` — nullable, present (JAC-4530).
- `sourceEventVersion: text("source_event_version")` — nullable.
- `sourceEventId: text("source_event_id")` — nullable.
- No column named `schema_version`. The version concept is carried by
  `sourceEventVersion` + `pricingVersionRef`.

### 3.2 Cost fields (actual state)

- `costCents: integer("cost_cents")` — on both `run_events` (nullable) and
  `cost_events` (NOT NULL, defaults to 0 in existing rows).
- `priceBasis: text("price_basis")` — NOT NULL, defaults to `"not_reported"`
  (JAC-4530 f5b25c036). Present on both tables.
- `costConfidence: text("cost_confidence")` — NOT NULL, defaults to `"low"`
  (JAC-4530 f5b25c036). Present on both tables.
- No `cost_usd_est` column — the actual column is `cost_cents` (integer cents).

### 3.3 Coverage and source status (actual state)

**`packages/shared/src/constants.ts`** (lines 778–814):

- `COVERAGE_STATES` = ["covered", "partial", "uncovered", "unknown"]
- `SOURCE_STATUSES` = ["available", "unavailable"]
- `SAFE_STATUSES` = ["available", "unavailable"]
- `CONFIDENCE_LEVELS` = ["high", "medium", "low"]
- `USAGE_REPORTED_STATES` = ["not_reported", "reported", "estimated", "redacted"]
- `PAUSE_REASONS` = ["manual", "budget", "system", "company_archived"]
- `PAUSE_ELIGIBLE_SCOPES` = ["self", "company", "tenant", "none"]

**`packages/shared/src/types/run-event.ts`**: `RunEvent` and
`CreateRunEventInput` interfaces include `sourceStatus`, `coverageState`,
`safeStatus`, `confidence`, `priceBasis`, `costConfidence`,
`pricingVersionRef`, `nativeTotalTokens`, `recomputedTotalTokens`,
`isSubscriptionIncluded`.

**`packages/shared/src/types/cost.ts`**: `CostEvent` interface includes
`priceBasis`, `costConfidence`, `pricingVersionRef`, `sourceStatus`,
`coverageState`, `safeStatus`, `confidence`.

### 3.4 Adapters — disable/pause mechanisms (actual state)

**`server/src/adapters/registry.ts`** (lines 430–734) provides two layers of
adapter control:

1. **Adapter disable** (`setAdapterDisabled` via
   `server/src/services/adapter-plugin-store.ts`): Hides adapters from selection
   menus; existing agents still function. Applies to both built-in and external
   adapters.

2. **Override pause/resume** (`setOverridePaused`, lines 698–712): Applies only
   to external adapter overrides of built-in types. When paused,
   `findActiveServerAdapter()` returns the builtin fallback instead of the
   external adapter. Already-running sessions are unaffected.

**`server/src/routes/adapters.ts`** (lines 379–435) exposes:
- `PATCH /api/adapters/:type` — `{ "disabled": boolean }` — enable/disable
  (instance-admin only)
- `PATCH /api/adapters/:type/override` — `{ "paused": boolean }` — pause/resume
  external override (instance-admin only, builtin types only)

**No `enabled` flag in adapter config**: The Paperclip adapter configuration
does NOT have an `enabled: false` boolean field. Adapters are disabled via the
Paperclip API (PATCH /api/adapters/:type) which writes to the
adapter-plugin-store. Read-only shadow adapters for the observatory (JAC-3935)
do not yet exist as a separate code concept — the observatory adapters are
being designed in JAC-4531/JAC-4535 and are not yet implemented.

### 3.5 Budget-based auto-pause (actual state)

**`server/src/services/budgets.ts`** implements budget hard-stop auto-pause:

- Line 72: `if (observedAmount >= amount) return "hard_stop";`
- Lines 752–862: When a company/agent/project budget hard-stop is reached,
  the entity is paused with `pauseReason = "budget"` (from `PAUSE_REASONS`).
- Paused agents/projects are excluded from dispatch.

**`server/src/services/attention.ts`** (lines 1156–1177): Budget hard-stop
incidents surface as attention items with "Raise budget" / "Keep paused"
actions.

### 3.6 Alert/detection mechanisms (actual state)

**`packages/shared/src/constants.ts`**: `ROUTING_STATUSES`,
`QUOTA_STATUSES`, `PUBLICATION_STATUSES` are used on `run_events` for
action-safety semantics (JAC-4534). These are computed fields, not independently
toggleable kill switches.

There are NO alert-specific toggles named `cost_threshold_alerts`,
`runaway_detector`, or `stale_coverage_alert` in the codebase. The actual
mechanisms for halting observability are:
- Adapter disable (criterion 4: adapter-level kill switch)
- Budget hard-stop pause (criterion 4: global/budget-level kill switch)
- Override pause/resume for external adapters
- `publication_status` field on `run_events` (fail-closed: "unknown" = blocked)

### 3.7 Dashboard publication (actual state)

No dashboard publication or artifact versioning mechanism exists yet. JAC-4538
(publication contract) is `blocked`. JAC-3934 (dashboard design) is `done` but
is design only. The observatory dashboard has not been implemented.

### 3.8 Source pointers for cost recomputation (actual state)

Paperclip's `run_events` table carries these identity/source-pointer fields
(JAC-4532):
- `sourceEventId` — deterministic external event ID
- `sourceEventVersion` — version of the source event format
- `payloadHash` — SHA-256 hash of the payload
- `ingestId` — UUID tracking the ingestion batch
- `observedAt` — timestamp the event was observed
- `runId` — foreign key to `heartbeat_runs.id`

The plan's reference to `prompt_sha256`, `manifest_digest`, and `receipt_id`
are Ringer-specific fields from the Fleet Wave manifest (external to this
repository, as defined in JAC-4531/JAC-4535). Paperclip's equivalent source
pointers are `runId` + `observedAt` + `payloadHash` + `sourceEventId`.

---

## 4. Rollback Acceptance Test Design

### 4.1 Criterion 1: Read-only adapters can be disabled without data loss

**Test name:** `rollback-adapter-disable-no-data-loss`

**What is tested:** When a read-only shadow adapter is disabled, no normalized
event data is lost or left in an inconsistent state.

**Test design:**
1. Start adapter in shadow mode (writes to `run_events` / `cost_events`).
2. Verify events are written with `source_system = '<adapter>'` and
   `source_status = 'available'`.
3. Disable the adapter via `PATCH /api/adapters/:type` `{ "disabled": true }`
   (the actual Paperclip API mechanism, not a config `enabled` flag).
4. Assert: no `DELETE` operations on `run_events` or `cost_events` tables.
   Existing rows remain; new writes from the disabled adapter cease.
5. Verify coverage state transitions: `resolveLedgerCoverageForRun()` /
   `resolveRunCoverageForError()` (in `packages/shared/src/validators/cost.ts`)
   already handle fail-closed coverage resolution — disabled adapters stop
   producing new `run_events` rows, but existing rows are untouched.
6. Re-enable the adapter via `PATCH /api/adapters/:type` `{ "disabled": false }`.
7. Assert: adapter resumes producing events with new `source_event_id` space;
   idempotency (JAC-4532) ensures no duplicates via the
   `run_events_source_event_uq` index (line 136 of run_events.ts schema).

**Phase applicability:** Phases 1, 2, 3 (all shadow/execution adapters).

**Pass condition:** Zero `DELETE` operations on `run_events` or `cost_events`
during adapter disable. Coverage state for disabled adapter events transitions
to `uncovered` / `unavailable` on subsequent runs; no rows are purged.

**Dependency on JAC-4532:** Idempotency keys (`source_event_id`,
`payload_hash`, `attempt_index`) must be in place so re-enablement does not
create duplicate events.

### 4.2 Criterion 2: Normalized events include schema and pricing versions

**Test name:** `rollback-event-schema-pricing-versions`

**What is tested:** Every normalized event carries versioning fields
(`source_event_version` + `pricing_version_ref`) so that after rollback, the
consumer can reject or re-interpret events from an incompatible version.

**Test design:**
1. Ingest events from each adapter (Paperclip, Ringer, cross-vendor).
2. Assert: every `run_events` row has `pricing_version_ref` set (nullable —
   may be null for runs where pricing was not applicable, but must be present
   as a column) and `source_event_version` populated with the current expected
   value (e.g., `"v1.0.0"`).
3. Assert: every `cost_events` row has `pricing_version_ref` non-null (the
   pricing-version record that was used for cost computation).
4. Simulate a schema version bump (write a test event with
   `source_event_version = "v0.9.0"`).
5. Assert: consumer (dashboard or downstream projection) rejects or quarantines
   events with unrecognized `source_event_version`.
6. Simulate rollback to the prior `source_event_version`.
7. Assert: prior-version events are still readable and recomputed correctly
   using their pinned `pricing_version_ref`.

**Phase applicability:** All phases (Phase 0 introduces the columns in
JAC-4530 f5b25c036).

**Pass condition:** `source_event_version` and `pricing_version_ref` present
as columns on every event; consumer correctly rejects unknown versions;
rollback restores readability of prior-version events.

**Dependency on JAC-4265:** The schema validation spike (`done` as of 2026-08-04, deliverable attached to JAC-4265 and committed to Agentic OS repo at commit `a5458784`) provides
the JSON Schema validator that enforces these version fields. This test is
unblocked — JAC-4265 is complete.

### 4.3 Criterion 3: Dashboard publication can revert to the previous versioned artifact

**Test name:** `rollback-dashboard-version-revert`

**What is tested:** When the dashboard is reverted to a previous published
version, it renders correctly from the existing event data without requiring
re-ingestion or schema migration.

**Test design:**
1. Publish dashboard v1 (renders from `run_events` with
   `source_event_version = "v1.0.0"` and `pricing_version_ref` pinning the
   pricing catalog used).
2. Record the dashboard artifact version (e.g.,
   `dashboard-v1.0.0-<sha>.html`).
3. Publish dashboard v2 (may add new views, fields, or aggregations).
4. Simulate rollback: revert to dashboard v1 artifact.
5. Assert: dashboard v1 renders without errors from the same event data.
6. Assert: no data migration is required for the rollback — the events are
   version-tagged (criterion 2) so v1 knows which fields to read.

**Phase applicability:** Phase 4 (dashboard publication).

**Pass condition:** Dashboard revert succeeds without data migration; v1
artifact renders identically to before v2 was published.

**Dependency on JAC-4538:** The publication contract (JAC-4538, `blocked`)
defines the version-tagging and pointer-projection mechanism that makes this
rollback possible. This test cannot be designed precisely until JAC-4538 is
resolved. The test design here covers the rollback semantics; the exact
artifact format depends on JAC-4538's pointer-vs-ownership contract.

### 4.4 Criterion 4: Alerting and pause controls have independent kill switches

**Test name:** `rollback-kill-switch-independence`

**What is tested:** Each alerting mechanism and pause control can be
independently toggled without affecting other components. Disabling one
adapter does not silence another adapter's coverage alerts; engaging the
budget hard-stop does not disable the adapter override pause.

**Test design:**
1. Identify all kill switches available in the codebase:
   - **Adapter-level:** `PATCH /api/adapters/:type` `{ "disabled": true }`
     (via `setAdapterDisabled` in `adapter-plugin-store.ts`,
     `server/src/services/adapter-plugin-store.ts`)
   - **Override-level:** `PATCH /api/adapters/:type/override`
     `{ "paused": true }` (via `setOverridePaused` in
     `server/src/adapters/registry.ts:698`)
   - **Budget-level:** Budget hard-stop auto-pause (via
     `server/src/services/budgets.ts:72`, pauses agent/company/project with
     `pauseReason = "budget"`)
   - **Publication-level:** `publication_status` field on `run_events`
     (fail-closed: "unknown" = blocked downstream)
2. Test each kill switch independently:
   - Disable adapter A → assert adapter B still ingests, alerts still fire.
   - Pause override for adapter B → assert adapter A still ingests,
     Paperclip shadow adapter events unaffected.
   - Engage budget hard-stop on company → assert adapters still execute but
     events are marked `safe_status = "unavailable"` (fail-closed via
     `resolveSafeStatus()` in `cost.ts:74`).
   - Assert: each kill switch operates through a distinct code path with no
     shared mutable state.
3. Test re-enablement: each switch can be independently re-engaged.

**Phase applicability:** Phases 1+ (adapter-level via disabled flag), Phase 2
(override pause), Phase 3 (per-vendor isolation), Phase 4 (budget-level +
publication-level).

**Pass condition:** All kill switches are independent; toggling one does not
affect another's state or behavior.

**Dependency on JAC-4534:** Action-safety semantics for unknown states
(JAC-4534, `done`) define the fail-closed pause behavior model. This test
validates the kill switch implementation against that spec.

### 4.5 Criterion 5: Cost recomputation from immutable source pointers is tested

**Test name:** `rollback-cost-recomputation-from-source-pointers`

**What is tested:** After rolling back the adapter or pricing catalog, the
system can recompute cost estimates from the immutable source pointers
(`source_event_id`, `source_event_version`, `payload_hash`, `pricing_version_ref`,
`observed_at`) stored in the event records — not from ephemeral or mutable
fields.

**Test design:**
1. Ingest a set of run events with `source_system = 'paperclip'`, each
   carrying `source_event_id`, `source_event_version`, `payload_hash`
   (JAC-4532 identity fields from `run_events` schema).
2. Capture the current cost computation result (sum of `cost_cents` across
   events with `pricing_version_ref` set).
3. Simulate a rollback: restore the adapter to a prior version that uses a
   different pricing catalog (different `pricing_version_ref`).
4. Recompute cost from the same source pointers using the reverted pricing
   catalog version (pinned by `pricing_version_ref`).
5. Assert: the recomputed cost matches the value computed at ingestion time
   when using the same pricing catalog version — i.e., the
   `pricing_version_ref` field pins the catalog used, and recomputation
   is deterministic.
6. Assert: events with `cost_cents = null` (unknown spend per JAC-4530) remain
   `unknown` after recomputation — never promoted to 0 or back-filled from
   aggregates (per JAC-4530 design and JAC-4531 §2.3).

**Phase applicability:** Phases 1+ (Paperclip source pointers: `run_id` +
`observed_at` + `payload_hash`). Phase 2+ adds Ringer-specific pointers
(`prompt_sha256` from launch receipts, `manifest_digest` from the Fleet Wave
manifest) as defined in JAC-4531.

**Pass condition:** Cost recomputation from source pointers is deterministic
and idempotent; `unknown` spend stays `unknown`; no aggregate back-fill.

**Dependency on JAC-4532:** Requires `source_event_id`, `payload_hash`,
`source_event_version`, and `ingest_id` to be populated (the identity fields).
This test is blocked until JAC-4532 implementation is complete.
**Dependency on JAC-4530:** Requires `price_basis` and `cost_confidence`
to be present (already committed in f5b25c036). These fields carry the
cost-determination semantics needed for recomputation validation.

---

## 5. Per-Phase Test Matrix

| Phase | Criterion 1 (adapter disable) | Criterion 2 (version fields) | Criterion 3 (dashboard revert) | Criterion 4 (kill switch independence) | Criterion 5 (cost recomputation) |
|---|---|---|---|---|---|
| 0 | N/A (no adapters yet) | Full (schema columns introduced) | N/A | N/A | N/A |
| 1 | Full (Paperclip shadow) | Full | N/A | Partial (adapter disable only) | Partial (Paperclip run_id + observed_at + payload_hash pointers) |
| 2 | Full (Ringer composite) | Full | N/A | Partial (adapter disable + override pause) | Full (Ringer manifest_digest + prompt_sha256 + receipt_id pointers) |
| 3 | Full (per-vendor adapters) | Full | N/A | Full (adapter + override + budget + publication) | Full (vendor-specific source pointers) |
| 4 | Full (all adapters) | Full | Full | Full | Full |

### 5.1 Phase 0 — Observability instrumentation

**Rollback trigger:** Schema migration fails or produces incorrect column values.

**Tests:**
- `rollback-migration-revert`: Migrate `run_events`/`cost_events` to the new
  schema, write test events, then revert the migration. Assert: `git checkout`
  to the prior migration + `pnpm db:generate` restores the schema; no data in
  pre-existing columns is lost.
- `rollback-cost-confidence-defaults`: Verify that `cost_confidence` and
  `price_basis` (added by JAC-4530 commit f5b25c036) default to
  `"not_reported"` and `"low"` respectively when not provided — not to a
  fabricated value or SQL NULL. Verify the `createRunEventSchema` and
  `createCostEventSchema` Zod transforms in
  `packages/shared/src/validators/cost.ts` enforce these defaults.

**Pass gate:** All Phase 0 tests pass before Phase 1 begins.

### 5.2 Phase 1 — Paperclip shadow adapter

**Rollback trigger:** Adapter reads wrong columns, coverage state mismatch, or
`usage` parsing produces incorrect token counts.

**Tests:**
- `rollback-adapter-disable-no-data-loss` (criterion 1) — run the test.
- `rollback-paperclip-coverage-state`: Verify that disabling the Paperclip
  adapter (via `PATCH /api/adapters/paperclip_local { "disabled": true }`)
  flips subsequent coverage state to `coverage_state = 'uncovered'` /
  `source_status = 'unavailable'` / `safe_status = 'unavailable'` (via
  `resolveCoverageState()` and `resolveSafeStatus()` in
  `packages/shared/src/validators/cost.ts:59-76`) with zero DELETEs on
  `run_events` or `cost_events`.
- `rollback-cost-recomputation-from-source-pointers` (criterion 5, partial) —
  Paperclip's source pointers are `run_id` + `observed_at` + `payload_hash`
  + `source_event_id` (from `run_events` schema in
  `packages/db/src/schema/run_events.ts`).

**Pass gate:** All Phase 1 tests pass before Phase 2 begins.

### 5.3 Phase 2 — Ringer composite adapter

**Rollback trigger:** Ringer adapter produces malformed composite events,
corrupts the run-graph, or emits events with wrong `payload_hash` binding.

**Tests:**
- `rollback-adapter-disable-no-data-loss` (criterion 1) — run the test.
- `rollback-composite-event-integrity`: After disabling the Ringer adapter,
  verify that all Ringer-sourced events retain their `manifest_digest`,
  `prompt_sha256`, and `receipt_id` fields for traceability — no orphaned events.
  (These fields are defined in JAC-4531; the Ringer adapter is external to the
  core repo.)
- `rollback-cost-recomputation-from-source-pointers` (criterion 5) — full test
  using Ringer's immutable source pointers (`prompt_sha256` from launch
  receipts, `manifest_digest` from the Fleet Wave manifest).
- `rollback-kill-switch-independence` (criterion 4, partial) — verify the Ringer
  adapter override pause is independent from the Paperclip adapter disable and
  the budget hard-stop pause.

**Pass gate:** All Phase 2 tests pass before Phase 3 begins.

### 5.4 Phase 3 — Cross-vendor adapters

**Rollback trigger:** A vendor adapter emits events with wrong `vendor` ID,
breaks lineage, or produces events that fail schema validation.

**Tests:**
- Per-vendor `rollback-adapter-disable-no-data-loss` (criterion 1).
- `rollback-vendor-quarantine`: A single vendor adapter can be disabled without
  affecting other vendors' event streams (via per-adapter
  `PATCH /api/adapters/:type { "disabled": true }`).
- `rollback-kill-switch-independence` (criterion 4, full) — verify all kill
  switches (adapter disable, override pause, budget hard-stop,
  publication_status) are independently operable.
- `rollback-cost-recomputation-from-source-pointers` (criterion 5) —
  vendor-specific source pointers.

**Pass gate:** All Phase 3 tests pass before Phase 4 begins.

### 5.5 Phase 4 — Dashboard publication

**Rollback trigger:** Dashboard v2 renders incorrect data, pointer projection
breaks, or a kill switch fails to engage.

**Tests:**
- `rollback-dashboard-version-revert` (criterion 3) — full test.
- `rollback-pointer-projection`: After dashboard revert, verify that
  Paperclip/Ringer receive only pointer summaries (no raw event data) per
  the publication contract (JAC-4538).
- `rollback-all-kill-switches` (criterion 4) — full independence test across
  all adapters, alerts, and dashboard.
- `rollback-full-stack`: End-to-end test — disable all adapters, revert
  dashboard, re-enable adapters, verify clean re-ingestion via idempotency
  (JAC-4532).

**Pass gate:** All Phase 4 tests pass before the initiative is declared
shippable.

---

## 6. Test Implementation Approach

### 6.1 Test harness

The schema validation spike (JAC-4265) will provide the JSON Schema validator
for normalized event shapes. Rollback tests build on this harness:

- **Fixture tests** for version field enforcement (criterion 2) — modeled on the
  `packages/adapters/*/src/server/execute.compatibility.test.ts` patterns
  already in the repo, and
  `packages/shared/src/validators/cost.test.ts` (11 tests covering
  `createRunEventSchema` / `createCostEventSchema` fail-closed transforms).
- **Integration tests** for adapter disable/re-enable (criterion 1) — modeled
  on the budget-service test patterns in
  `server/src/__tests__/budgets-service.test.ts` (which tests hard-stop
  pauses) and the adapter routes in
  `server/src/__tests__/*adapter*.test.ts`.
- **End-to-end tests** for dashboard revert (criterion 3) — modeled on the
  `packages/adapter-utils/src/server-utils.test.ts` patterns once JAC-4538
  defines the artifact format.

### 6.2 Rollback simulation mechanism

Rollback is simulated by:
1. Toggling adapter state via the Paperclip API:
   `PATCH /api/adapters/:type { "disabled": true/false }`
   (actual mechanism in `server/src/routes/adapters.ts:379`, backed by
   `setAdapterDisabled` in `server/src/services/adapter-plugin-store.ts`)
2. Toggling override pause:
   `PATCH /api/adapters/:type/override { "paused": true/false }`
   (actual mechanism in `server/src/adapters/registry.ts:698`)
3. Restoring prior schema migrations via `git checkout` +
   `pnpm db:generate` from a pinned migration set.
4. Restoring prior pricing catalog versions (pinned by `pricing_version_ref`).

No destructive operations (DELETE, DROP) are performed — rollback is
accomplished by **reversion to prior versions**, not by mutation of live data.
This aligns with the fail-closed principle from JAC-4529 and JAC-4530.

### 6.3 Test data isolation

All rollback tests write to a **dedicated test database** (PGLite ephemeral,
matching the dev setup in AGENTS.md §4) with a `test_rollback_` prefix on all
tables. No test data touches production `run_events` or `cost_events`. This
matches the isolation model already used in
`server/src/__tests__/costs-service.test.ts` and
`packages/shared/src/validators/cost.test.ts`.

---

## 7. Acceptance Criteria

This plan is accepted when:
1. All five rollback acceptance criteria are mapped to specific test names.
2. A per-phase test matrix identifies which tests apply to which phase.
3. The implementation approach specifies the test harness and data isolation
   strategy.
4. Dependencies on JAC-4265 (schema validation), JAC-4532 (identity), and
   JAC-4538 (publication contract) are documented as blockers.
5. The plan is reviewed and accepted by the board (Gate 6 confirmation
   interaction on JAC-3929).

**No code is written in this issue.** This plan defines the test design only.
Implementation issues will be created after JAC-3929 Gate 6 board approval.

---

## 8. Corrections Applied in v2 (2026-08-04)

The following corrections were made against the actual working tree to fix
inaccuracies in the initial plan:

1. **`schema_version` column**: Removed references to a `schema_version` column
   on `run_events` / `cost_events`. The actual versioning mechanism uses
   `source_event_version` (identity, JAC-4532) and `pricing_version_ref`
   (pricing catalog, JAC-4530). Both columns exist on `cost_events`; both
   exist on `run_events` (added by JAC-4530 f5b25c036).

2. **`cost_usd_est` column**: Replaced with the actual column name `cost_cents`
   (integer cents, not decimal USD). Present on both `run_events` (nullable)
   and `cost_events` (NOT NULL).

3. **`usage_updated_at` field**: Removed — Paperclip's actual source pointers
   are `run_id` + `observed_at` + `payload_hash` + `source_event_id`, all
   present in the `run_events` schema.

4. **Kill switch inventory**: Corrected the kill switch list. The plan
   initially referenced fictional toggles (`cost_threshold_alerts`,
   `runaway_detector`, `stale_coverage_alert`, `observatory_paused`). The
   actual mechanisms are: adapter disable (`setAdapterDisabled`), override
   pause/resume (`setOverridePaused` in registry.ts), budget hard-stop auto-pause
   (budgets.ts), and `publication_status` fail-closed field on `run_events`.

5. **`enabled: false` config flag**: Corrected — Paperclip adapters do NOT have
   an `enabled` boolean in their config. Adapter disabling is done via the
   `PATCH /api/adapters/:type` API endpoint.

6. **`cost_confidence` / `price_basis` defaults**: Corrected from "default to
   null" to the actual fail-closed defaults: `price_basis` defaults to
   `"not_reported"`, `cost_confidence` defaults to `"low"` (per
   `packages/shared/src/validators/cost.ts` lines 109-114, 490-491).

7. **`source_event_version = "v1.0.0"`**: The version string is a design-time
   value to be defined by JAC-3930 (telemetry contract, in_review). The test
   uses the actual `source_event_version` column, not a `schema_version` column.

8. **Stale sibling-status references**: Corrected against live Paperclip API
   (2026-08-04T16:30Z): JAC-4265 (schema-validation spike) is `done` (not
   `backlog` — the spike deliverable is complete and attached to the issue;
   committed to Agentic OS repo at commit `a5458784`); JAC-4535 (freshness
   split) is `done` (not `in_review`); JAC-4531 (Ringer composite adapter)
   is `blocked` (not `in_progress`). JAC-4265 is therefore no longer a
   blocking dependency for criterion 2 — the schema validation harness is
   available.
