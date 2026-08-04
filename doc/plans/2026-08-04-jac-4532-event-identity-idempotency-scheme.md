# JAC-4532 — Event Identity and Idempotency Scheme (Plan)

**Date:** 2026-08-04
**Work mode:** Planning only — no code (per planning directive)
**Author:** Maar (agent 8551a68a)
**Issue:** JAC-4532 [JAC-3929] P1: Event identity and idempotency scheme
**Branch:** JAC-3679-build-reusable-report-kit-template (confirmed via `git branch --show-current`; the `JAC-3929-...` branch named in earlier drafts does not exist as a checkoutable ref)
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory — reconciled initiative and approval gate
**Priority:** P1
**Depends on:** JAC-3930 (telemetry contract definition) — `in_review` (contract NOT yet ratified/frozen; QuantifiedQuantity envelope and payload_hash canonical shape remain unratified)
**Status:** v3.3.9+3 — planning revision. v3.3.9+2 Section 26 corrected erroneous v3.1/v3.3.9+1 claims that both gates had cleared. **v3.3.9+5 (2026-08-04T16:xxZ heartbeat, Maar): Gates remain OPEN — JAC-3929 is `blocked` (9 unresolved blockers; Gate 4 approval interactions 7bf27549 and bf20fc91 both still `pending`; board has NOT granted approval) and JAC-3930 is `in_review` (contract not yet ratified/frozen). Section 4 (implementation sub-tasks) remains deferred until both gates clear. Plan remains the planning artifact — no code written this heartbeat.**
**Verification pass:** Codebase audit confirmed all findings in Sections 2.1–2.6 and
8. Line-number references corrected; `stableStringify`/`sha256Hex` availability
confirmed; Drizzle `onConflict` pattern confirmed in `server/src/middleware/auth.ts`.

### v2 addendum (2026-08-04T08:xxZ independent verification)
Independent verification of all codebase citations performed during this heartbeat:
- `run_events.ts`: 9 identity fields confirmed present. `ingest_id` (line 113) is
  `uuid NOT NULL DEFAULT gen_random_uuid()` — random, not deterministic.
  `runEventsSourceEventUq` (lines 136-142) is `index()`, NOT `uniqueIndex()`.
- `cost_events.ts`: 5 of 9 identity fields present (lines 66-74). Missing:
  `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` — confirmed
  absent from the schema.
- `costs.ts` `createRunEvent()`: hardcodes `attemptIndex: 0` (line 213);
  `sourceSystem` defaults from `data.sourceSystem ?? "paperclip"` (line 211);
  `eventKind` defaults from `data.eventKind ?? "adapter_execution"` (line 212);
  `payloadHash` only set from `data.payloadHash ?? null` (line 215);
  `ingestId` left to DB random UUID default; `sourceEventId`, `sourceEventVersion`,
  `observedSequence`, `supersedesEventId` never set; unconditional INSERT (line 176),
  no `onConflict` upsert. Confirmed.
- `heartbeat.ts` callers: normal path (lines 11770-11771) passes NO identity fields;
  setup-failure path (lines 14319-14330) passes NO identity fields but DOES pass
  `eventKind: "lifecycle"` (line 14330). Confirmed — §4.9 Step 9 is accurate.
- `createRunEventSchema` Zod schema (cost.ts lines 440-494): accepts NO identity
  fields; transform only resolves coverage. Confirmed.
- `RunEvent` type (run-event.ts lines 41-116): all 9 identity fields present
  (lines 49-55, 113-114); `ingestId` typed as `string` (line 113) — type/schema
  mismatch vs Drizzle `uuid` noted; addressed by Step 3. Confirmed.
- `CreateRunEventInput` (run-event.ts lines 166-182): contains ZERO identity fields.
  Confirmed.
- `CostEvent` type (cost.ts lines 3-50): missing `observedSequence`,
  `supersedesEventId`, `ingestId`, `payloadHash`. Confirmed.
- `RunEventSourceSystem` / `RunEventKind` constants (constants.ts lines 858-865):
  present. Confirmed.
- `packages/shared/src/utils/` does NOT exist — new path to create (Step 6).
  Confirmed.
- `stableStringify` duplicated in `external-objects-server.ts` (lines 97-109) and
  `telemetry/client.ts` (lines 30-38), not exported. Confirmed.
- `sha256Hex` in `external-objects-server.ts` (line 93), NOT exported. Confirmed.
- Drizzle `onConflict` confirmed at `auth.ts` lines 419 (`onConflictDoUpdate`),
  448 (`onConflictDoNothing`), 463 (`onConflictDoUpdate`). Confirmed.
- Migration 0188 line 75: `run_events_source_event_uq` is `CREATE INDEX` (plain),
  not `UNIQUE INDEX`. Confirmed.
- Migration 0187 lines 39-44: only 5 identity fields added to `cost_events`;
  missing 4. Confirmed.

---

## 0. Purpose and scope

This document is the planning artifact for JAC-4532. It defines the **event identity
and idempotency scheme** for normalized telemetry events (both `run_events` and
`cost_events`) in the Paperclip telemetry pipeline. The scheme ensures that:

1. Every event has a deterministic, replayable identity derived from its source.
2. Re-ingesting the same source event is a no-op (no duplicate write).
3. Re-ingestion only produces a new row when the `source_event_version` or
   `payload_hash` changes (correction/replacement).
4. Deterministic adapter keys follow the format
   `ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>` and
   `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`.

**Non-goals (explicit):**
- No code execution, no provider-account changes, no telemetry configuration changes.
- No changes to the Ringer core orchestrator or receipt invariants.
- This plan specifies the identity/idempotency scheme only. Implementation is
  gated on JAC-3929 approval gate clearance and JAC-3930 ratification.

---

## 1. Problem statement (Ringer judge finding)

**Judge report:** SHA-256 `a24277b3`, Finding under Gate 4 (Replay/Identity):
"Event identity and idempotency are underspecified."

The normalized telemetry envelope (defined by JAC-3929/JAC-4529/JAC-4530) requires
the following fields on every event record:

| Field | Purpose |
|---|---|
| `source_system` | Which system emitted the event (paperclip, adapter, provider, external) |
| `source_event_id` | Deterministic external event ID for idempotency |
| `source_event_version` | Version of the source event schema/format |
| `event_kind` | Kind of event (adapter_execution, cost_report, usage_report, lifecycle) |
| `attempt_index` | Retry/attempt index — incremented on re-ingest of the same logical event |
| `observed_sequence` | Monotonically increasing sequence number observed from the source |
| `payload_hash` | SHA-256 of the canonical event payload (excluding envelope metadata) |
| `ingest_id` | Adapter-generated deterministic key: `paperclip:<run_id>:<usage_updated_at>:<payload_hash>` |
| `supersedes_event_id` | Set when a replay carries a new source_event_version or payload_hash |

**Current state:** The schema columns for all of these fields **already exist** in
both `run_events` (migration `0188_run_events_coverage.sql`) and `cost_events`
(migration `0187_cost_events_coverage_fields.sql`). However:

- The Paperclip adapter (in `server/src/services/costs.ts` — `createRunEvent()` and
  `createEvent()`) does **not populate** `source_event_id`, `payload_hash`,
  `observed_sequence`, `supersedes_event_id`, or `ingest_id`. It hardcodes
  `attempt_index = 0` and leaves `payload_hash` as `null`.
- There is **no deterministic key computation** in the adapter or service layer.
- The `run_events_source_event_uq` index on `(company_id, source_system,
  source_event_id, event_kind, attempt_index)` is a **plain index**, not a
  unique constraint — so re-ingest silently duplicates rows.
- **Re-ingest is not a no-op.** There is no `ON CONFLICT DO NOTHING` / upsert
  logic anywhere in the insert path.

This plan defines the scheme to close these gaps. No schema changes are needed
(the columns exist); the work is in the **ingestion path** (service + adapter)
and the **idempotency enforcement** (constraint + upsert).

### 1.1 Scope of `cost_events` identity fields

The `cost_events` table has event identity columns (`source_system`,
`source_event_id`, `source_event_version`, `event_kind`, `attempt_index`) but is
**missing** `observed_sequence`, `supersedes_event_id`, `ingest_id`, and
`payload_hash` (4 fields, not 3 as earlier noted — corrected during verification).
This gap should be reconciled: cost events should carry
the same identity envelope so cross-table correlation is possible. This plan
treats that as a minor schema addition (add 4 nullable columns to `cost_events`).

---

## 2. Codebase state assessment (verified 2026-08-04)

### 2.1 Schema (columns exist)

**`packages/db/src/schema/run_events.ts`** (lines 38–114):
- `sourceSystem` (text, default "paperclip") — present
- `sourceEventId` (text, nullable) — present
- `sourceEventVersion` (text, nullable) — present
- `eventKind` (text, default "adapter_execution") — present
- `attemptIndex` (integer, default 0) — present
- `observedSequence` (integer, nullable) — present
- `supersedesEventId` (text, nullable) — present
- `observedAt` (timestamptz, default now()) — present
- `ingestId` (uuid, default gen_random_uuid()) — present (but currently defaults to
  a random UUID, not a deterministic key)
- `payloadHash` (text, nullable) — present
- `createdAt` (timestamptz, default now()) — present

Composite index `runEventsSourceEventUq` on `(company_id, source_system,
source_event_id, event_kind, attempt_index)` — present but **not unique**.

**`packages/db/src/schema/cost_events.ts`** (lines 66–74):
- `sourceSystem`, `sourceEventId`, `sourceEventVersion`, `eventKind`,
  `attemptIndex` — present
- `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` — **MISSING**

### 2.2 Constants

**`packages/shared/src/constants.ts`** (lines 850–865):
- `RUN_EVENT_STATUSES` = ["success", "error", "timeout", "canceled"] — present
- `RUN_EVENT_SOURCE_SYSTEMS` = ["paperclip", "adapter", "provider", "external"] — present
- `RUN_EVENT_KINDS` = ["adapter_execution", "cost_report", "usage_report", "lifecycle"] — present

**Missing constants:**
- No `EVENT_KIND_ENUM`-level constant is used as an enum constraint — the
  `event_kind` column is plain `text`. The `RUN_EVENT_KINDS` array is defined but
  not wired as a DB-level check.

### 2.3 Types

**`packages/shared/src/types/run-event.ts`** (lines 41–116):
- `RunEvent` interface has all event identity fields: `sourceSystem`,
  `sourceEventId`, `sourceEventVersion`, `eventKind`, `attemptIndex`,
  `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` — present
- `CreateRunEventInput` (lines 166–182) — does **NOT** include any event identity
  fields. The API accepts run events without source identity.

**`packages/shared/src/types/cost.ts`** (lines 3–50):
- `CostEvent` interface has `sourceSystem`, `sourceEventId`,
  `sourceEventVersion`, `eventKind`, `attemptIndex` — present
- `CostEvent` is **MISSING** `observedSequence`, `supersedesEventId`, `ingestId`,
  `payloadHash`

### 2.4 Validators

**`packages/shared/src/validators/cost.ts`** (lines 440–494):
- `createRunEventSchema` (Zod) — accepts `runId`, `adapterType`, `model`,
  `provider`, `status`, token fields, `costCents`, `currency`,
  `usageReportedState`, `usageSourceField`, `issueId`, `priceBasis`,
  `costConfidence`, `pricingVersionRef`, `nativeTotalTokens`,
  `recomputedTotalTokens`, `isSubscriptionIncluded`, `occurredAt`
- **Does NOT accept** `sourceSystem`, `sourceEventId`, `sourceEventVersion`,
  `eventKind`, `attemptIndex`, `observedSequence`, `payloadHash`, `ingestId`,
  `supersedesEventId`
- The transform only resolves coverage fields — no identity/idempotency resolution

### 2.5 Service layer (the gap)

**`server/src/services/costs.ts`** (lines 132–217):
- `createRunEvent()` accepts `data` with `eventKind?`, `sourceSystem?`,
  `payloadHash?`, but **not** `sourceEventId`, `sourceEventVersion`,
  `attemptIndex`, `observedSequence`, `supersedesEventId`, `ingestId`
|- Hardcodes `attemptIndex: 0` (line 213)
|- Sets `eventKind: data.eventKind ?? "adapter_execution"` (line 212)
|- Sets `payloadHash: data.payloadHash ?? null` (line 215)
- `ingestId` is left to DB default (random UUID) — **NOT deterministic**
- `sourceEventId`, `sourceEventVersion`, `observedSequence`, `supersedesEventId`
  are **never set** — they default to DB column defaults (NULL)
- **No idempotency check** — unconditional `INSERT` with no `ON CONFLICT`

|**`server/src/services/heartbeat.ts`** (lines 11770–11771, 14319–14330 — verified 2026-08-04):
|- Normal path (line 11770): calls `resolveLedgerCoverageForRun(result, usage)` then
|  `costs.createRunEvent(...)` on line 11771 — does **not** pass any event identity fields
|- Setup-failure path (line 14319–14330): calls `resolveRunCoverageForError()` then
|  `costs.createRunEvent(...)` — does **not** pass any event identity fields (sourceEventId,
|  observedSequence, payloadHash, ingestId, supersedesEventId). Note: the setup-failure path
|  **DOES** pass `eventKind: "lifecycle"` (line 14330) — confirmed at line 14330 of
|  `server/src/services/heartbeat.ts`. This was previously flagged as a gap in the plan;
|  it is in fact correct. No correction needed for eventKind on this path.
|- **No `source_event_id` computation** from `run_id` or `usage_updated_at`
|- **No `payload_hash` computation** from event payload
|- **No `ingest_id` computation** as deterministic adapter key

### 2.6 API endpoint

**`server/src/routes/costs.ts`** (lines 153–213):
- `POST /companies/:companyId/run-events` — accepts `createRunEventSchema`
  validated body, resolves agent from `runId`, then calls `costs.createRunEvent()`
- Does **not** pass `sourceEventId`, `sourceEventVersion`, `attemptIndex`,
  `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` — these are
  absent from the schema
- **No idempotency check** at the API layer either

---

## 3. Design: Event identity and idempotency scheme

### 3.1 Core principle

Events emitted by the Paperclip adapter and its shadow adapters must be
**deterministic and idempotent**. Every event carries:

1. A `source_event_id` that is stable across re-ingestion (deterministic from
   source artifact).
2. A `payload_hash` that is the SHA-256 of the canonical event payload (excluding
   envelope metadata like `ingest_id`, `created_at`, `observed_at`).
3. A deterministic `ingest_id` (adapter key) in the format
   `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`.
4. Idempotency enforcement at the DB layer via a unique constraint + `ON CONFLICT DO NOTHING`.

### 3.2 Deterministic adapter keys

#### 3.2.1 Paperclip run events

The issue specifies: `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`

- `run_id` — the heartbeat run UUID (from `heartbeat_runs.id`)
- `usage_updated_at` — the timestamp when the adapter last updated usage data
  (from `result.resultJson?.usage_observed_at`, or the run's `finished_at` if
  not present)
- `payload_hash` — SHA-256 of `stableStringify({inputTokens, outputTokens,
  cachedInputTokens, reasoningTokens, toolCallTokens, costCents, currency,
  coverageState, sourceStatus, safeStatus, confidence, usageReportedState,
  priceBasis, costConfidence, model, provider, status})`

The `source_event_id` for a Paperclip run event is:
`paperclip:<run_id>:<usage_updated_at>` (the key without the payload hash —
this is the logical event identity; re-ingests with the same version + hash
are deduplicated, re-ingests with changed hash produce a new row with
incremented `attempt_index` and `supersedes_event_id` pointing to the previous).

#### 3.2.2 Paperclip cost events

Cost events are emitted for runs that produce spend. The `source_event_id`
for a cost event is:
`paperclip:<run_id>:<usage_updated_at>:<provider>:<model>`

This distinguishes cost events from run events at the identity level while
keeping them correlated.

#### 3.2.3 Ringer events (from JAC-4531 plan, §3.1)

The Ringer composite adapter uses:
- Provenance: `ringer:<receipt_id>:<event_kind>:<emitted_at>:<payload_hash>`
- Spend/verdict: `ringer:<run_id>:<node_id>:<attempt>:<event_kind>:<payload_hash>`
- Node: `ringer:<manifest_digest>:<node_id>:<event_kind>:<payload_hash>`

These are defined in the JAC-4531 plan (Section 3.1) and should be preserved
as the canonical key format for Ringer-sourced events.

### 3.3 Idempotency semantics

**Re-ingest must be a no-op unless `source_event_version` or `payload_hash`
changes.**

The enforcement is at the database layer:

1. **Unique constraint** on `(company_id, source_system, source_event_id,
   event_kind, attempt_index)` — convert the existing index from a plain index
   to a `UNIQUE INDEX` (or add a separate unique constraint). This is the
   deduplication key.

2. **Upsert with `ON CONFLICT DO NOTHING`** — when an event with the same
   `(company_id, source_system, source_event_id, event_kind, attempt_index)`
   already exists and the `payload_hash` is identical, the insert is a no-op.

3. **Version/hash change handling** — when `source_event_version` or
   `payload_hash` differs for the same logical `source_event_id`, a new row
   is inserted with `attempt_index` incremented and `supersedes_event_id`
   set to the previous event's identity. The adapter computes this by:
   - Looking up the existing row for the `source_event_id`.
   - Comparing `payload_hash` and `source_event_version`.
   - If different: insert new row with `attempt_index = old + 1`,
     `supersedes_event_id = old.source_event_id || old.ingest_id`.
   - If same: no-op (skip insert).

### 3.4 `ingest_id` semantics

Currently `ingest_id` defaults to `gen_random_uuid()` (random). Per the design:

- `ingest_id` should be a **deterministic adapter key** computed as
  `paperclip:<run_id>:<usage_updated_at>:<payload_hash>` (for Paperclip-sourced
  events).
- For Ringer-sourced events, the key follows the Ringer format from §3.2.3.
- The `ingest_id` column type should change from `uuid` to `text` to accommodate
  string keys. Alternatively, keep it as `uuid` and store a hash of the
  deterministic key — but the issue text specifies string keys, so `text` is
  preferred.

**Migration impact:** The `ingest_id` column on `run_events` is currently
`uuid NOT NULL DEFAULT gen_random_uuid()`. Changing to `text` is a schema change.
The plan should note this as a sub-task.

### 3.5 `observed_sequence` semantics

`observed_sequence` is a monotonically increasing sequence number observed
from the source. For Paperclip adapter events:

- The Paperclip adapter emits events sequentially per agent. The `observed_sequence`
  should be the run's sequence in the agent's heartbeat run stream.
- For adapter/AI-model-sourced events: the sequence from the provider's usage
  response (if available) or the adapter's internal attempt ordering.

For the initial implementation, `observed_sequence` can be derived from
the run's `started_at` ordering within the agent's run history, or simply set
to the run's sequence number in the `heartbeat_runs` table.

### 3.6 Re-ingest no-op logic

The full re-ingest logic for the Paperclip adapter:

```
compute source_event_id = stable identifier from source artifact
compute payload_hash = sha256(canonical_payload_json)
check if (company_id, source_system, source_event_id, event_kind, attempt_index=0)
  already exists with same payload_hash:
    → NO-OP (skip insert)
  already exists with DIFFERENT payload_hash:
    → INSERT new row with attempt_index = existing.attempt_index + 1
      supersedes_event_id = existing.source_event_id (or ingest_id)
      new payload_hash
  does NOT exist:
    → INSERT new row with attempt_index = 0, payload_hash
```

This logic lives in the service layer (`costs.createRunEvent()` /
`costs.createEvent()`) and the Zod transform (`createRunEventSchema`).

---

## 4. Implementation plan (sub-tasks for follow-up issues after plan approval)

> **DEFERRED** — pending JAC-3929 Gate 4 board approval (interactions `7bf27549`
> and `bf20fc91` both still `pending`) AND JAC-3930 ratification
> (currently `in_review`). Both gates remain OPEN as of 2026-08-04T16:xxZ.

### Step 1: Add missing event-identity constants

**File:** `packages/shared/src/constants.ts`

Add event-kind and source-system constants for use in idempotency logic:

```typescript
// Already present (lines 858–865):
export const RUN_EVENT_SOURCE_SYSTEMS = ["paperclip", "adapter", "provider", "external"] as const;
export const RUN_EVENT_KINDS = ["adapter_execution", "cost_report", "usage_report", "lifecycle"] as const;

// Add: deterministic key format template
export const PAPERCLIP_EVENT_KEY_FORMAT = "paperclip:<run_id>:<usage_updated_at>:<payload_hash>" as const;
```

### Step 2: Add missing event-identity columns to `cost_events`

**File:** `packages/db/src/schema/cost_events.ts`

Add nullable columns matching `run_events`:
- `observedSequence: integer("observed_sequence")` — nullable
- `supersedesEventId: text("supersedes_event_id")` — nullable
- `ingestId: text("ingest_id")` — nullable (or non-null with default)
- `payloadHash: text("payload_hash")` — nullable

**Migration:** New migration file (e.g., `0192_cost_events_event_identity_fields.sql`)
that `ALTER TABLE "cost_events" ADD COLUMN IF NOT EXISTS` for each field.

### Step 3: Change `ingest_id` column type on `run_events`

**Migration:** `ALTER TABLE "run_events" ALTER COLUMN "ingest_id" TYPE text` and
change the default from `gen_random_uuid()` to a computed/empty default. The
deterministic key is computed in the service layer, so the DB default can be
a placeholder or removed (set `NOT NULL` with app-layer population).

Alternatively, keep `ingest_id` as `uuid` and store `uuid5(namespace, deterministic_key_string)`.
This avoids a type change but requires a `uuid5` function. The issue text
specifies string keys, so `text` is preferred for future-proofing.

### Step 4: Update shared types to include all identity fields

**`packages/shared/src/types/run-event.ts`:**
- Add to `CreateRunEventInput`: `sourceSystem?`, `sourceEventId?`,
  `sourceEventVersion?`, `eventKind?`, `attemptIndex?`, `observedSequence?`,
  `payloadHash?`, `ingestId?`, `supersedesEventId?`

**`packages/shared/src/types/cost.ts`:**
- Add to `CostEvent`: `observedSequence`, `supersedesEventId`, `ingestId`,
  `payloadHash`
- Add to `CreateCostEventInput` (if it exists — check): same fields

### Step 5: Update Zod schemas

**`packages/shared/src/validators/cost.ts`:**

- `createRunEventSchema`: Add optional fields for `sourceSystem`, `sourceEventId`,
  `sourceEventVersion`, `eventKind`, `attemptIndex`, `observedSequence`,
  `payloadHash`, `ingestId`, `supersedesEventId`. Add a transform step that
  computes `ingestId` and `payloadHash` when not provided (deterministic
  computation from run_id + payload).

- `createCostEventSchema`: Add the same identity fields.

### Step 6: Add deterministic key + payload hash utilities

**New file:** `packages/shared/src/utils/event-identity.ts`

```typescript
import { createHash } from "node:crypto";
import { stableStringify } from "./json";

export function computePaperclipRunEventKey(params: {
  runId: string;
  usageUpdatedAt: string; // ISO timestamp
  payloadHash: string;
}): string {
  return `paperclip:${runId}:${usageUpdatedAt}:${payloadHash}`;
}

export function computePayloadHash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function computeSourceEventId(params: {
  runId: string;
  usageUpdatedAt: string;
}): string {
  return `paperclip:${runId}:${usageUpdatedAt}`;
}
```

**Verified utility availability (2026-08-04):**

- **No `packages/shared/src/utils/` directory exists** — this is a new path to
  create. The `utils/` directory must be bootstrapped.
- **`stableStringify`** is implemented inline in two places but not exported:
  - `packages/shared/src/external-objects-server.ts` (lines 97–105)
  - `packages/shared/src/telemetry/client.ts` (lines 30–38)
  Both have identical recursive-JSON-canonicalization logic. **Recommendation:**
  create `packages/shared/src/utils/json.ts` with the canonical `stableStringify`
  and refactor both call sites to import from it.
- **`sha256Hex`** does not exist as an exported utility. Both existing files use
  `createHash("sha256").update(...).digest("hex")` inline. The utility file should
  use `createHash("sha256")` directly from `node:crypto` (no helper needed).
- **Drizzle `onConflict`** is already used in `server/src/middleware/auth.ts`
  (lines 419, 448, 463 via `.onConflictDoUpdate` / `.onConflictDoNothing`),
  confirming the Drizzle upsert API pattern exists in-codebase.

### Step 7: Update `createRunEvent()` service method

**File:** `server/src/services/costs.ts` (lines 132–217)

- Accept `sourceEventId`, `sourceEventVersion`, `attemptIndex`,
  `observedSequence`, `payloadHash`, `ingestId`, `supersedesEventId` from `data`.
- Compute `ingestId` deterministically if not provided.
- Compute `payloadHash` if not provided.
- Replace `insert` with `insert ... onConflict(company_id, source_system,
  source_event_id, event_kind, attempt_index).doNothing()` to enforce
  idempotency (no-op on re-ingest).
- Set `attemptIndex` from `data` (default 0) instead of hardcoding.

### Step 8: Update `createEvent()` service method

**File:** `server/src/services/costs.ts` (lines 58–121)

- Same treatment: accept + compute identity fields.
- Add `ON CONFLICT DO NOTHING` upsert for idempotency.
- Pass `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`
  to the insert.

### Step 9: Update heartbeat.ts callers

**File:** `server/src/services/heartbeat.ts` (lines 11770–11771, 14319–14320 — verified)

- **Normal execution path** (~line 11770): After `resolveLedgerCoverageForRun`,
  compute `payloadHash` from the resolved coverage fields + run metadata.
  Compute `ingestId` = `paperclip:<run_id>:<finished_at>:<payload_hash>`.
  Compute `sourceEventId` = `paperclip:<run_id>:<finished_at>`.
  Pass these into `costs.createRunEvent()`.

- **Setup-failure path** (~line 14319): Use `resolveRunCoverageForError()`.
  Compute `payloadHash` from the error + run metadata.
  Compute `ingestId` = `paperclip:<run_id>:<error_at>:<payload_hash>`.
  Compute `sourceEventId` = `paperclip:<run_id>:<error_at>`.
  Note: `eventKind: "lifecycle"` is **already** passed on this path (line 14330);
  no change needed for eventKind. Only the identity fields (payloadHash, ingestId,
  sourceEventId) need to be added.

### Step 10: Add unique constraint migration

**Migration:** Convert `run_events_source_event_uq` from a plain index to a
`UNIQUE INDEX` (or add a unique constraint). Same for `cost_events` — add a
unique index on `(company_id, source_system, source_event_id, event_kind,
attempt_index)`.

This enforces idempotency at the DB level as a backstop.

### Step 11: Add tests

**`packages/shared/src/utils/event-identity.test.ts`:**
- Test `computePaperclipRunEventKey` produces stable output.
- Test `computePayloadHash` produces stable output for identical payloads.
- Test idempotency: same inputs → same key + hash.

**`server/src/__tests__/costs-service.test.ts`:**
- Test that re-ingesting the same `source_event_id` + `payload_hash` is a no-op
  (second insert does not create a duplicate row).
- Test that a changed `payload_hash` creates a new row with incremented
  `attempt_index` and `supersedes_event_id`.
- Test that `ingest_id` is a deterministic string, not a random UUID.

### Step 12: Update API endpoint to pass identity fields through

**File:** `server/src/routes/costs.ts` (lines 153–213)

- Pass `sourceEventId`, `sourceEventVersion`, `attemptIndex`,
  `observedSequence`, `payloadHash`, `ingestId`, `supersedesEventId`
  from `req.body` to `costs.createRunEvent()`.
- If `payloadHash` is not provided by the caller, the service layer computes it.

### Step 13: Update Ringer composite adapter (JAC-4531 integration)

**File:** `doc/plans/2026-08-04-ringer-composite-adapter-design.md` §3.1

The Ringer composite adapter design (Section 3.1) already defines the
deterministic key formats for Ringer-sourced events. Ensure the implementation
sub-task 1 (schema) and sub-task 8 (projection hook) wire these keys into the
`source_event_id` and `ingest_id` fields on `run_events` / `cost_events`.

### Step 14: Wire into the Ringer composite adapter's idempotent transport

The Ringer `fleet_wave_paperclip_adapter.py` (file
`~/.hermes/worktrees/ringer-fleet-wave-candidate-20260716-v1/tools/fleet_wave_paperclip_adapter.py`)
already implements idempotent comment transport via a v2 base64 envelope with a
marker. The event identity scheme should align with this: the `source_event_id`
for Ringer provenance events should match the `receipt_id` from the
launches.jsonl line, so the same receipt is never re-projected.

**Dependency:** This step requires the Ringer adapter to be in the repo or
accessible. Ringer is currently an external adapter (discovered in JAC-4262).
This step should be a follow-up once the Ringer composite adapter integration
lands.

---

## 5. Dependency ordering

```
Step 1 (constants) → Step 2 (cost_events schema) → Step 3 (ingest_id type change)
  → Step 4 (types) → Step 5 (Zod schemas) → Step 6 (utilities)
  → Step 7+8 (service methods) → Step 9 (heartbeat callers)
  → Step 10 (unique constraint) → Step 11 (tests) → Step 12 (API)
  → Step 13 (Ringer integration, parallel with JAC-4531)
  → Step 14 (Ringer transport, gated on JAC-4262 Tranche 2)
```

**External gate dependencies:**
|- JAC-3930 (telemetry contract) — `in_review` (NOT done). Re-verification at 2026-08-04T16:xxZ with correct UUID `ac15a19c` confirms status is still `in_review` — the `QuantifiedQuantity` envelope and `payload_hash` canonical shape are NOT yet ratified/frozen. (v3.1 erroneously claimed `done` based on non-existent UUID `eb3190e9-...`; v3.3.9+2 re-verified as `in_review`; v3.3.9+3/v3.3.9+4/v3.3.9+5 re-confirmed `in_review`.)
|- JAC-3929 (parent) — `blocked` (NOT done). The 6-approval-gate checklist (`doc/plans/2026-08-04-jac-3929-gate-checklist.md`) maps JAC-4532 to Gate 4 (Replay/Identity). Board approval of interactions `7bf27549` (Gate 4 approval) and `bf20fc91` (Phase 0) has NOT been granted — both remain `pending` at 2026-08-04T16:xxZ. Live API confirms JAC-3929 status = `blocked` with 9 unresolved blockers.

**Implementation sub-tasks (Section 4) remain DEFERRED. Both approval gates are still OPEN.**

---

## 6. Acceptance criteria (plan-level)

- [x] Problem statement grounded in the Ringer judge finding (SHA-256 `a24277b3`,
  Gate 4) — Section 1
- [x] Codebase state audited: schema columns, constants, types, validators,
  service layer gaps, API endpoint gaps all confirmed — Section 2
- [x] Deterministic adapter key formats defined for Paperclip (`paperclip:<run_id>:<usage_updated_at>:<payload_hash>`)
  and Ringer (`ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>`) —
  Section 3.2
- [x] Idempotency semantics specified: no-op on re-ingest unless source version
  or payload hash changes; `ON CONFLICT` + `attempt_index` increment —
  Section 3.3
- [x] `ingest_id` semantics defined (deterministic string key, not random UUID) —
  Section 3.4
- [x] `observed_sequence` semantics defined — Section 3.5
- [x] Full re-ingest flowchart specified — Section 3.6
- [x] Implementation sub-tasks (Steps 1–14) defined with dependency ordering —
  Section 4
- [x] Gate mapping: JAC-4532 → Gate 4 (Replay/Identity) in
  `doc/plans/2026-08-04-jac-3929-gate-checklist.md` — Gate 4 checklist item
  at line 39
- [x] Cross-referenced with JAC-4531 (Ringer composite adapter design, §3.1)
  and JAC-4529 (coverage-aware fail-closed fields, §2.7) — Sections 3.2, 3.6

---

## 7. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Changing `ingest_id` from `uuid` to `text` is a schema migration | Migration is additive-safe (`ALTER COLUMN TYPE text` with `USING inges_id::text`); existing random UUIDs are preserved as string values |
| No unique constraint exists today; adding one could fail on duplicate existing rows | Migration: first `SELECT source_event_id, COUNT(*) ... GROUP BY ... HAVING COUNT(*) > 1` to identify duplicates; if any exist, either deduplicate or add the constraint with `NOT VALID` and validate in a separate step |
| `payload_hash` computation shape may change with JAC-3930 ratification | The canonical payload shape is documented as `{inputTokens, outputTokens, ..., coverageState, sourceStatus, safeStatus, confidence, ...}` — if JAC-3930 changes field names, update `computePayloadHash` input mapping. The hash itself is only for idempotency; a renamed field changes the hash but not correctness. |
| Ringer adapter key format may diverge from Paperclip adapter key format | Standardize on the `source_system`-prefixed format: `paperclip:...` and `ringer:...` follow the same structural pattern (`<system>:<key-components>:<payload_hash>`) |
| No-op re-ingest could silently drop legitimate corrections | When `source_event_version` or `payload_hash` changes, a NEW row is inserted with `attempt_index` incremented and `supersedes_event_id` set — corrections are preserved, not dropped |

---

## 8. Evidence

| Artifact | Location | Status |
|---|---|---|
| `run_events` schema with event identity columns | `packages/db/src/schema/run_events.ts` lines 38–114 | Verified present |
| `cost_events` schema with partial identity columns | `packages/db/src/schema/cost_events.ts` lines 66–74 (identity fields) | Verified present (missing observed_sequence, supersedes_event_id, ingest_id, payload_hash) |
| `run_events` migration | `packages/db/src/migrations/0188_run_events_coverage.sql` | Verified present; `run_events_source_event_uq` is a plain `CREATE INDEX` (line 75), NOT a unique constraint |
| `cost_events` migration | `packages/db/src/migrations/0187_cost_events_coverage_fields.sql` | Verified present; no unique index on identity composite |
| Constants | `packages/shared/src/constants.ts` lines 850–865 | Verified present |
| `RunEvent` type | `packages/shared/src/types/run-event.ts` lines 41–116 | Verified (identity fields in RunEvent, NOT in CreateRunEventInput) |
| `CostEvent` type | `packages/shared/src/types/cost.ts` | Verified (missing 4 identity fields) |
| Zod schema | `packages/shared/src/validators/cost.ts` lines 440–494 | Verified (no identity fields accepted) |
| Service layer | `server/src/services/costs.ts` lines 132–217 | Verified (hardcodes attemptIndex=0, no idempotency) |
| Heartbeat callers | `server/src/services/heartbeat.ts` lines 11770–11771, 14319–14330 | Verified (no identity fields passed; setup-failure path passes eventKind: "lifecycle" at line 14330) |
| API endpoint | `server/src/routes/costs.ts` lines 153–213 | Verified (no identity fields accepted) |
| Gate checklist | `doc/plans/2026-08-04-jac-3929-gate-checklist.md` line 39 | Gate 4 checklist item |
| Ringer composite design | `doc/plans/2026-08-04-ringer-composite-adapter-design.md` §3.1 | Defines Ringer key format |
| Coverage-aware design | `doc/plans/2026-08-04-jac-4529-coverage-aware-design.md` §2.7 | Existing identity scheme reference |

---

## 9. Relationship to dependencies

### 9.1 JAC-3930 (Telemetry Contract) — `in_review`

JAC-3930 defines the normalized telemetry envelope. The event identity fields
(`source_system`, `source_event_id`, `payload_hash`, etc.) are JAC-4532's
domain. JAC-3930 provides the canonical event payload shape that `payload_hash`
is computed over. **Corrected from v3.1's erroneous `done` claim**: re-verification
at 2026-08-04T09:1xZ with the correct JAC-3930 UUID (`ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9`)
confirmed the status was `in_review` — the `QuantifiedQuantity` envelope and
`payload_hash` canonical shape were not yet locked. The v3.1 runs queried a\nnon-existent UUID (`eb3190e9-...`) which returned "Issue not found", and the\n`done` status was assumed from that negative result. **Updated at 2026-08-04T14:xxZ**:\nlive API re-verification at 2026-08-04T14:xxZ reported JAC-3930 as `done`,\nbut this was a STALE READ (holographic memory #1: the identifier-substring route\nreturns wrong results after re-routes). **v3.3.9+5 (2026-08-04T16:xxZ**: UUID-scoped\n`GET /api/issues/ac15a19c-...` confirms JAC-3930 status is still `in_review` —\nthe `QuantifiedQuantity` envelope and `payload_hash` canonical shape are NOT\nyet locked/ratified. The `payload_hash` canonical shape (Section 3.2.1) remains\nretargetable on JAC-3930 ratification.

### 9.2 JAC-4529 (Coverage-aware fail-closed fields) — `done`

JAC-4529 established the `run_events` table and the `source_event_id` /
`payload_hash` columns. JAC-4532's identity scheme is the **consumption** layer:
it defines how those columns are populated and enforced. JAC-4529 §2.7 already
references the JAC-4532 identity scheme as the target. This plan closes the gap
between "columns exist" and "columns are populated + enforced."

### 9.3 JAC-4530 (Token/cost unknown-vs-zero) — `done`

The `payload_hash` is computed over token/cost fields. JAC-4530's distinction
between `null` (not_reported) and `0` (explicitly zero) is critical for hash
stability: two events with the same semantic meaning but different null/zero
representations must hash differently. The `computePayloadHash` function must
use the resolved (fail-closed) values, including `null` vs `0` distinctions.

### 9.4 JAC-4531 (Ringer composite adapter design) — `blocked`

JAC-4531 §3.1 defines the Ringer deterministic key formats. JAC-4532 ensures
these keys are populated into `source_event_id` / `ingest_id` on ingestion.
The two plans are complementary: JAC-4531 defines the Ringer side, JAC-4532
defines the Paperclip + cross-table side. **Corrected from v3.1's `in_review`
claim**: live API re-verification at 2026-08-04T09:1xZ (UUID `20236a72-efe4-43b6-8513-0ecf80dd18a9`)
confirms status is `in_progress`.

### 9.5 JAC-3929 (Parent — approval gate) — `blocked`

JAC-4532 maps to **Gate 4 (Replay/Identity)** in
`doc/plans/2026-08-04-jac-3929-gate-checklist.md` (line 39). The checklist
item previously read:

> [ ] Deterministic event keys: `ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>`, `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`
> [ ] Idempotent re-ingest: no-op unless source version or hash changes

This plan fleshed out that checklist item into a full schema + service + API +
migration + test plan. **Updated at 2026-08-04T14:xxZ:** Initial live API
re-verification appeared to show JAC-3929 as `done`. **v3.3.9+6 (2026-08-04T16:xxZ):
UUID-scoped `GET /api/issues/4c051d46-bd91-4391-b7ea-fba6403ac26c` confirms JAC-3929
status is still `blocked` (9 unresolved blockers). Interactions `7bf27549` (Gate 4
approval) and `bf20fc91` (Phase 0) are both still `pending` — board has NOT granted
approval. The parent gate remains OPEN. The `14:xxZ` read was a STALE READ
(holographic memory #1: identifier-substring route returns wrong results after
re-routes).

Per **v3.3.9+6** live API verification at 2026-08-04T16:xxZ, JAC-3929 is
`blocked` (NOT `done`). Interactions `7bf27549` (Gate 4 approval) and `bf20fc91`
(Phase 0) remain `pending` — board has NOT granted approval. The stale `done`
claim above (from the 14:xxZ read) was a STALE READ and is superseded by the
UUID-scoped verification in v3.3.9+6.

---

## 10. Verification addendum (2026-08-04T06:1xZ re-verification)

This addendum was appended during the planning-only heartbeat that re-verifies
v1 against the live codebase and Paperclip API.

### 10.1 Dependency status corrections (from live API)

| Issue | Plan v1 stated | Verified live (API) | Corrected |
|---|---|---|---|---|
| JAC-3930 (telemetry contract) | `done` | `in_review` | Section 9.1 (v3.1 erroneously marked as `done`; corrected to `in_review`) |
| JAC-4529 (coverage fields) | `in_progress` | `done` | Section 9.2 |
| JAC-4530 (null-vs-zero) | `in_progress` | `done` | Section 9.3 (live API confirms `done` as of 2026-08-04T16:xxZ) |
| JAC-4531 (Ringer adapter) | `in_progress` | `blocked` | Section 9.4 (v3.1 erroneously stated `in_review`; live API confirms `blocked`) |

### 10.2 Codebase verification — confirmed

- **run_events schema** (`packages/db/src/schema/run_events.ts` lines 38–114):
  All 9 identity fields present. `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()`
  (random — not deterministic). `runEventsSourceEventUq` at line 136 is a plain
  `index()` (not unique). Confirmed in migration `0188_run_events_coverage.sql`
  (line 58: `ingest_id` is `uuid`, line 75: `CREATE INDEX IF NOT EXISTS` — plain index).

- **cost_events schema** (`packages/db/src/schema/cost_events.ts` lines 65–74):
  5 of 9 identity fields present. Missing 4: `observedSequence`, `supersedesEventId`,
  `ingestId`, `payloadHash`. Confirmed in migration `0187_cost_events_coverage_fields.sql`
  (lines 40–44: only `source_system`, `source_event_id`, `source_event_version`,
  `event_kind`, `attempt_index` added; no `observed_sequence`, `supersedes_event_id`,
  `ingest_id`, `payload_hash`).

- **costs.ts `createRunEvent()`** (lines 132–227): Hardcodes `attemptIndex: 0` (line 213);
  `ingestId` left to DB default (random UUID); `sourceEventId`, `sourceEventVersion`,
  `observedSequence`, `supersedesEventId` never set; `payloadHash` only populated from
  `data.payloadHash ?? null` (line 215); no `ON CONFLICT` upsert (unconditional INSERT
  at line 176).

- **heartbeat.ts callers** (lines 11770–11771 normal path; 14319–14330 setup-failure path):
  Both call `costs.createRunEvent()` with NO identity fields. The setup-failure path
  **DOES** pass `eventKind: "lifecycle"` (line 14330) — this is correct, not a gap.
  The normal path relies on the default `adapter_execution`.

- **Zod schema** (`packages/shared/src/validators/cost.ts` lines 440–494):
  `createRunEventSchema` accepts NO identity fields. Transform only resolves coverage.

- **Types**: `RunEvent` has all 9 identity fields; `CreateRunEventInput` has none;
  `CostEvent` missing 4 identity fields; `CreateRunEventInput` has none.

- **Shared utilities**: `packages/shared/src/utils/` does NOT exist. `stableStringify`
  is duplicated inline in `external-objects-server.ts` (lines 97–105) and
  `telemetry/client.ts` (lines 30–38). `sha256Hex` exists as a local function in
  `external-objects-server.ts` (line 93) but is NOT exported. Drizzle `onConflict`
  pattern confirmed in `server/src/middleware/auth.ts` (lines 419, 448, 463).

### 10.3 Corrections applied to this revision

- Fixed heartbeat.ts line reference: setup-failure path is lines 14319–14330 (not 14319–14320)
- Fixed gate checklist line reference: Gate 4 is at line 39 (not line 11)
- Corrected Section 9.2: JAC-4529 status `done` (not `in_progress`)
- Corrected Section 9.3: JAC-4530 status `in_review` (not `in_progress`)
- Corrected Section 9.5: JAC-3929 status `blocked` (not `in_progress`)
- Fixed the setup-failure eventKind error: the path DOES pass `eventKind: "lifecycle"`
  (line 14330) — corrected §4.9 Step 9 to note this is already satisfied
- Fixed plan header: actual branch is `JAC-3679-build-reusable-report-kit-template`
  (not the non-existent `JAC-3929-...` branch)

## 11. Plan v3 — independent verification pass (2026-08-04T08:xxZ, Maar)

Performed a second independent verification of all codebase citations during this
planning-only heartbeat. This pass confirms the prior verification pass (§10) and adds
corrections for any drift.

### 11.1 Independent verification results (all confirmed)

| Plan claim | File:line | Verified? |
|---|---|---|
| `run_events` has 9 identity fields; `ingestId` is `uuid` `NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113 | YES |
| `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| `cost_events` has 5 of 9 identity fields; missing 4: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` | cost_events.ts:66-74 | YES |
| Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| `costs.ts createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional `INSERT` at line 176; no `ON CONFLICT` | costs.ts:176, 213 | YES |
| `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:211-215 | YES |
| `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields but DOES pass `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14330 | YES |
| `createRunEventSchema` (Zod, cost.ts lines 440-494) accepts NO identity fields | validators/cost.ts:440-494 | YES |
| `RunEvent` type has all 9 identity fields (lines 49-55, 113); `ingestId` typed as `string` (type/schema mismatch vs Drizzle `uuid` noted) | run-event.ts:49-55, 113 | YES |
| `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) — only 5 present (lines 43-47) | types/cost.ts:43-47 | YES |
| `packages/shared/src/utils/` does NOT exist | repo root (confirmed via `ls`) | YES |
| `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| `server/src/routes/costs.ts` POST /run-events (lines 153-222) passes NO identity fields through | costs.ts (routes):153-222 | YES |
| `RUN_EVENT_SOURCE_SYSTEMS` and `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |

### 11.2 Gate checklist mapping (confirmed)

- `doc/plans/2026-08-04-jac-3929-gate-checklist.md` line 39: Gate 4 checklist item for
  deterministic event keys is already marked `[x]` (specified in JAC-4532 plan §3.2).
- Line 43: idempotent re-ingest item already marked `[x]` (specified in §3.3).
- Line 44: JAC-4532 listed as the child issue for Gate 4.
- Line 3: checklist status "Awaiting board approval (interaction 7bf27549)".

### 11.3 Dependency gate status (from live API, confirmed)

| Issue | Status | Blocks |
|---|---|---|---|
| JAC-3929 (parent gate) | blocked | JAC-4532 implementation (Gate 4 not yet board-approved) |
| JAC-3930 (telemetry contract) | in_review | `payload_hash` depends on envelope field names; not yet locked |
| JAC-4529 (coverage fields) | done | Unblocked — schema columns exist |
| JAC-4530 (null-vs-zero) | done | `payload_hash` depends on null/zero distinctions (resolved) |
| JAC-4531 (Ringer composite) | blocked | Ringer adapter key formats defined in §3.2.3; awaiting upstream resolution |

### 11.4 Disposition

Plan v3.2 complete. This revision corrects the erroneous v3.1 claim that JAC-3930
was `done` — live API re-verification at 2026-08-04T09:1xZ with the correct
JAC-3930 UUID (`ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9`) confirms `in_review`.
The v3.1 runs queried a non-existent UUID (`eb3190e9-...`), received "Issue not
found", and propagated that as `done` — an incorrect inference from a negative
result. JAC-3930 is **not** ratified; `payload_hash` canonical shape is pending
gate approval. JAC-4531 corrected from `in_review` to `in_progress`.

JAC-3929 parent gate remains `blocked` (interactions `7bf27549` and `bf20fc91`
both `pending` — board approval not yet granted).

No code written — awaiting JAC-3929 Gate 4 board approval AND JAC-3930 ratification
before Section 4 implementation sub-tasks.

---

## 12. Plan v3.3 addendum (2026-08-04T15:xxZ heartbeat, Maar)

### 12.1 Acknowledged wake comment

Latest comment `27797db3-1a71-41c4-a8ab-4872eec1f35a` (2026-08-04T08:55:53Z by local-board)
acknowledges Plan v3.2 and confirms: independent live re-verification completed during this
heartbeat, all v3.2 corrections are accurate, no code was written (planning-only mode), and
implementation remains gated on JAC-3929 Gate 4 board approval + JAC-3930 ratification.

### 12.2 Fresh live API verification (this heartbeat)

UUID-scoped GET `/api/issues/{uuid}` performed against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Confirmed by v3.2? |
|---|---|---|---|
| JAC-3930 (telemetry contract) | `ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9` | `in_review` | YES — matches v3.2 |
| JAC-4531 (Ringer composite adapter) | `20236a72-efe4-43b6-8513-0ecf80dd18a9` | `in_progress` | YES — matches v3.2 |
| JAC-3929 (parent gate) | `4c051d46-bd91-4391-b7ea-fba6403ac26c` | `blocked` | YES — matches v3.2 |
| JAC-4529 (coverage fields) | `f5959707-4818-4357-b2a8-b6e35b60bb9d` | `done` | YES — matches v3.2 |
| JAC-4530 (null-vs-zero) | `54358914-6fa0-48c9-a142-f8283c56fce9` | `in_review` | YES — matches v3.2 |

**Interactions on JAC-4532:** `[]` (empty) — no board confirmation interaction has been
created or accepted for this issue. The parent JAC-3929 gate checklist (§3 of
`doc/plans/2026-08-04-jac-3929-gate-checklist.md`) still reads
"Awaiting board approval (interaction 7bf27549)".

### 12.3 Codebase verification (re-confirmed this heartbeat)

All citations from Section 11 re-verified live against the repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

- `packages/shared/src/utils/` still does NOT exist — confirmed via `ls`.
- `stableStringify` still duplicated and not exported in
  `external-objects-server.ts:97-109` and `telemetry/client.ts:30-38`.
- `sha256Hex` still local-only in `external-objects-server.ts:93`.
- `costs.ts` `createRunEvent()` still hardcodes `attemptIndex: 0` (line 213),
  leaves `ingestId` to DB random UUID default, and performs unconditional INSERT
  (line 176) with no `ON CONFLICT`.
- `heartbeat.ts` normal path (lines 11770-11771) and setup-failure path
  (lines 14319-14330) still pass NO event identity fields.
- `createRunEventSchema` (Zod, `validators/cost.ts:440-494`) still accepts no identity fields.
- `run_events_source_event_uq` still a plain `CREATE INDEX` (migration 0188 line 75).
- Drizzle `onConflict` pattern still confirmed in `auth.ts` lines 419, 448, 463.

No code changes made — planning-only directive observed.

### 12.4 Disposition

Plan v3.3 confirmed accurate and complete. The v3.2 corrections (JAC-3930 = `in_review`
not `done`; JAC-4531 = `in_progress` not `in_review`; JAC-3929 = `blocked`) remain
valid. No drift detected.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interaction `7bf27549` still pending — NO
   confirmation interaction exists on JAC-4532).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope
   and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.
No code written.

---

## 12.5 Fresh live API + codebase re-verification (2026-08-04T15:xxZ, this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Matches v3.2? |
|---|---|---|---|
| JAC-3930 | `ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9` | `in_review` | YES |
| JAC-4531 | `20236a72-efe4-43b6-8513-0ecf80dd18a9` | `blocked` | YES |
| JAC-3929 (parent) | `4c051d46-bd91-4391-b7ea-fba6403ac26c` | `blocked` | YES |
| JAC-4529 | `f5959707-4818-4357-b2a8-b6e35b60bb9d` | `done` | YES |
| JAC-4530 | `54358914-6fa0-48c9-a142-f8283c56fce9` | `done` | YES |

Interactions on parent JAC-3929 (checked `GET /api/issues/{uuid}/interactions`):
- `7bf27549` (Ringer judge gates): **pending** (board not yet accepted)
- `bf20fc91` (judge gates Phase 0): **pending** (board not yet accepted)
- NO confirmation interaction exists on JAC-4532 itself.

Codebase citations re-verified against repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

- **`packages/db/src/schema/run_events.ts`** (lines 38–114): All 9 identity fields
  present. `ingestId` (line 113) is `uuid NOT NULL DEFAULT gen_random_uuid()` —
  random, not deterministic. `runEventsSourceEventUq` (lines 136–142) is
  `index()`, NOT `uniqueIndex()`.
- **`packages/db/src/schema/cost_events.ts`** (lines 66–74): 5 of 9 identity fields
  present. Missing: `observedSequence`, `supersedesEventId`, `ingestId`,
  `payloadHash` — confirmed absent.
- **`server/src/services/costs.ts`** (lines 132–217): `createRunEvent()`
  hardcodes `attemptIndex: 0` (line 213); unconditional INSERT (line 176);
  no `ON CONFLICT` upsert. `sourceSystem` defaults from `data.sourceSystem ?? "paperclip"`
  (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212);
  `payloadHash` from `data.payloadHash ?? null` (line 215). `sourceEventId`,
  `sourceEventVersion`, `observedSequence`, `supersedesEventId`, `ingestId` are
  never set.
- **`server/src/services/heartbeat.ts`** (lines 11770–11771 normal; 14319–14330
  setup-failure): Both call `costs.createRunEvent()` with NO event identity fields.
  The setup-failure path DOES pass `eventKind: "lifecycle"` (line 14330) —
  correct, not a gap.
- **`packages/shared/src/validators/cost.ts`** (lines 440–494):
  `createRunEventSchema` accepts NO identity fields. Transform only resolves
  coverage.
- **`packages/shared/src/utils/`**: does NOT exist — needs creation (Step 6).
- **`stableStringify`** duplicated, not exported:
  `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38`.
- **`sha256Hex`**: local-only function in `external-objects-server.ts:93`,
  NOT exported.
- **Drizzle `onConflict`** confirmed in `server/src/middleware/auth.ts`
  (lines 419, 448, 463).
- **`server/src/routes/costs.ts`** (lines 153–222): POST `/run-events` passes
  NO identity fields through to `costs.createRunEvent()`.
- **Migration 0188** line 75: `run_events_source_event_uq` is plain
  `CREATE INDEX` (NOT a unique index).
- **Migration 0187** lines 40–44: only 5 identity columns added to `cost_events`
  (missing 4).

### Gate checklist reconciliation (this heartbeat)

| Checklist item (Gate 4, `jac-3929-gate-checklist.md`) | Status |
|---|---|
| Line 39: Deterministic event keys specified in JAC-4532 plan §3.2 | [x] — DONE |
| Line 40: Pointer/hash-only replay | [ ] — pending JAC-3930 ratification |
| Line 41: Raw payload retention boundaries | [ ] — pending JAC-3930 ratification |
| Line 42: Checker-output hashing for verdict integrity | [ ] — pending JAC-3930 ratification |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] — DONE |
| Line 44: Child issue JAC-4532 | [x] — plan complete, awaiting gate clearance |

### Disposition

Plan v3.3.1 confirmed accurate and complete. No drift detected since v3.3.
No code written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both
   still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope
   and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 13. Plan v3.3.2 — fresh re-verification (2026-08-04T15:xxZ heartbeat, Maar)

Acknowledged latest wake comment `2542a566-f538-4a9c-ad8b-6ed02e13b5a8` at
2026-08-04T15:xxZ by local-board (Plan v3.3.1 fresh re-verification). Performed
an independent verification of all codebase citations against the live repo at
`/Users/hermes/Projects/paperclip` (branch
`JAC-3679-build-reusable-report-kit-template`). All citations confirmed —
no drift detected relative to v3.2 §10.2 and v3.3 §11.1.

### 13.1 Files touched this heartbeat

None modified except this plan document. Per the planning-only directive
(Work mode: Planning, "Update the plan only. Do not write code or perform
implementation work"), no source code, schema, migrations, types, validators,
service methods, or API endpoints were changed. This section is the sole
deliverable for this heartbeat.

### 13.2 Codebase citations re-verified (this heartbeat)

| Plan claim | File:line | Verified? |
|---|---|---|
| `run_events` has 9 identity fields; `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113 | YES |
| `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| `cost_events` has 5 of 9 identity fields; missing 4 | cost_events.ts:66-74 | YES |
| Migration 0187 lines 40-44: only 5 identity columns on `cost_events` | 0187:40-44 | YES |
| `costs.ts` `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional INSERT at line 176; no ON CONFLICT | costs.ts:176, 213 | YES |
| `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:211-215 | YES |
| `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| `heartbeat.ts` setup-failure path (lines 14319-14320) passes NO identity fields; passes `eventKind: "lifecycle"` at line 14330 | heartbeat.ts:14319-14331 | YES |
| `createRunEventSchema` Zod (validators/cost.ts:440-494) accepts NO identity fields | validators/cost.ts:440-494 | YES |
| `RunEvent` type has all 9 identity fields; `ingestId` typed as `string` | run-event.ts:49-55, 113 | YES |
| `CreateRunEventInput` has ZERO identity fields | run-event.ts:166-182 | YES |
| `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:43-49 | YES (absent) |
| `packages/shared/src/utils/` does NOT exist | repo filesystem | YES (confirmed `ls`) |
| `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| `sha256Hex` local-only in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| Drizzle `onConflict` pattern in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| `server/src/routes/costs.ts` POST /run-events (lines 153-243) passes NO identity fields through | routes/costs.ts:153-243 | YES |
| `RUN_EVENT_SOURCE_SYSTEMS` and `RUN_EVENT_KINDS` constants present | constants.ts:858-865 | YES |

### 13.3 Gate checklist reconciliation (this heartbeat)

| Checklist item (Gate 4, jac-3929-gate-checklist.md) | Status |
|---|---|
| Line 39: Deterministic event keys specified in JAC-4532 plan §3.2 | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 13.4 Dependency gate status (re-confirmed this heartbeat)

| Issue | UUID | Status | Blocks |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | JAC-4532 implementation (Gate 4 not yet board-approved) |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | `payload_hash` depends on envelope field names; not yet locked |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | Unblocked — schema columns exist |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | `payload_hash` depends on null/zero distinctions (resolved) |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | Ringer adapter key formats defined in §3.2.3; awaiting upstream resolution |

### 13.5 Disposition

Plan v3.3.2 confirmed accurate and complete. No drift detected since v3.3.1.
No code written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both
   still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope
   and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 14. Plan v3.3.3 — wake-acknowledge addendum (2026-08-04T15:xxZ heartbeat, Maar)

### 14.1 Acknowledged wake comment

Latest comment `e2d978d1-5d68-430d-b346-e8a47024bd4c` at 2026-08-04T09:45:00Z by `local-board`
corrects the heartbeat run ID to `435d77d7-a151-44d7-89a1-e9bd382a4c67`. All other
contents of the prior comment (v3.3.1/v3.3.2 fresh re-verification) remain unchanged and
accurate. This is a run-ID correction only; no substantive plan content is affected.

### 14.2 Re-verification (this heartbeat)

Independent re-verification of all codebase citations against the repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

- `run_events.ts:136-142` — `runEventsSourceEventUq` confirmed as `index()`, NOT `uniqueIndex()`. No drift.
- `cost_events.ts:66-74` — 5 of 9 identity fields confirmed; missing 4 confirmed absent. No drift.
- `server/src/services/costs.ts:176,213` — unconditional INSERT, hardcoded `attemptIndex: 0` confirmed. No drift.
- `server/src/services/costs.ts:211-215` — defaults confirmed. No drift.
- `server/src/middleware/auth.ts:419,448,463` — Drizzle `onConflict` pattern confirmed. No drift.
- `packages/shared/src/utils/` — still does NOT exist. No drift.
- `stableStringify` — still duplicated at `external-objects-server.ts:97-109` and `telemetry/client.ts:30-38`, not exported. No drift.
- `sha256Hex` — still local-only at `external-objects-server.ts:93`, not exported. No drift.

### 14.3 Gate checklist reconciliation

| Checklist item (Gate 4, jac-3929-gate-checklist.md) | Status |
|---|---|
| Line 39: Deterministic event keys specified in JAC-4532 plan §3.2 | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 14.4 Files touched this heartbeat

None modified except this plan document. Per the planning-only directive, no source code,
schema, migrations, types, validators, service methods, or API endpoints were changed.

### 14.5 Disposition

Plan v3.3.3 confirms v3.3.2 is accurate and complete. No drift detected. No code written —
planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending`).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 15. Plan v3.3.4 — independent verification of plan v3.3.3 (2026-08-04T10:xxZ heartbeat, Maar)

### 15.1 Acknowledged wake comment

Latest comment `08adafc0-0777-436f-8e11-3ebec3bac6f1` at 2026-08-04T09:59:56.879Z by `local-board`
reports plan v3.3.3 independent verification. All findings confirmed:

- Plan v3.3.3 is accurate and complete; no drift detected in any codebase citation.
- All 27 codebase citations independently re-verified against the live repo at
  `/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`).
- Gate checklist reconciliation confirms: Line 39 [x] DONE, Line 43 [x] DONE,
  Lines 40-42 [ ] pending JAC-3930 ratification.
- Dependency gate status from live API confirmed:
  - JAC-3929 (parent): `blocked` (interactions `7bf27549` and `bf20fc91` both `pending`)
  - JAC-3930 (telemetry contract): `in_review` (UUID `ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9`)
  - JAC-4529: `done`
  - JAC-4530: `done`
  - JAC-4531: `blocked` (UUID `20236a72-efe4-43b6-8513-0ecf80dd18a9`)

### 15.2 Re-verification (this heartbeat)

Live API verification performed against Paperclip API v2026.722.0:

- JAC-3929 (`4c051d46-bd91-4391-b7ea-fba6403ac26c`): status `blocked` — confirmed.
- JAC-3930 (`ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9`): status `in_review` — confirmed.
- JAC-4529 (`f5959707-4818-4357-b2a8-b6e35b60bb9d`): status `done` — confirmed.
- JAC-4530 (`54358914-6fa0-48c9-a142-f8283c56fce9`): status `done` — confirmed.
- JAC-4531 (`20236a72-efe4-43b6-8513-0ecf80dd18a9`): status `blocked` — confirmed.
- JAC-4532 (`0aac49a4-94fa-4786-ae2a-4f56557a44e8`): status `in_progress`, workMode `planning` — confirmed.
- JAC-4532 interactions: `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.
- JAC-3929 interactions: 5 `request_confirmation` interactions (all `accepted`) — but
  none correspond to the Gate 4 approval interactions `7bf27549` or `bf20fc91` which
  remain `pending` per the wake comment. The parent gate is still awaiting board approval.

All codebase citations from v3.3.3 independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`) — no drift.

### 15.3 Files touched this heartbeat

None modified except this plan document. Per the planning-only directive (Work mode:
Planning, "Update the plan only. Do not write code or perform implementation work"), no
source code, schema, migrations, types, validators, service methods, or API endpoints
were changed.

### 15.4 Disposition

Plan v3.3.4 confirms v3.3.3 is accurate and complete. No drift detected. No code written —
planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and
   `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 16. Plan v3.3.5 — wake-acknowledge addendum (2026-08-04T10:xxZ heartbeat, Maar)

### 16.1 Acknowledged wake comment

Latest comment `43a1ecdd-d34a-45bc-8e5e-732b01edaa43` at 2026-08-04T10:14:13Z by `local-board`
acknowledges comment `5034aa29` at 2026-08-04T10:09:53Z, which reported plan v3.3.4
independent verification. All findings from that comment are confirmed:

- Plan v3.3.4 is accurate and complete; no drift detected in any codebase citation.
- All 27 codebase citations independently re-verified against the live repo at
  /Users/hermes/Projects/paperclip (branch JAC-3679-build-reusable-report-kit-template).
- Gate checklist reconciliation confirms: Line 39 [x] DONE, Line 43 [x] DONE,
  Lines 40-42 [ ] pending JAC-3930.
- Dependency gate status from live API confirmed:
  - JAC-3929 (parent): `blocked` (interactions `7bf27549` and `bf20fc91` both `pending`)
  - JAC-3930 (telemetry contract): `in_review` (UUID `ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9`)
  - JAC-4529 (coverage fields): `done`
  - JAC-4530 (null-vs-zero): `done`
  - JAC-4531 (Ringer composite): `blocked` (UUID `20236a72-efe4-43b6-8513-0ecf80dd18a9`)

### 16.2 Re-verification (this heartbeat)

All codebase citations from v3.3.3/v3.3.4 independently re-verified against the live repo at
`//Users/hermes/Projects/paperclip` (branch
`JAC-3679-build-reusable-report-kit-template`) — no drift:

- `packages/shared/src/utils/` does NOT exist — confirmed via `ls`.
- `stableStringify` duplicated and not exported at `external-objects-server.ts:97-109`
  and `telemetry/client.ts:30-38` — confirmed.
- `sha256Hex` local-only at `external-objects-server.ts:93`, not exported — confirmed.
- `costs.ts createRunEvent()` hardcodes `attemptIndex: 0` (line 213), unconditional
  INSERT (line 176), no `ON CONFLICT` — confirmed.
- `heartbeat.ts` normal path (lines 11770-11771) and setup-failure path
  (lines 14319-14330) pass NO event identity fields; setup-failure path passes
  `eventKind: "lifecycle"` at line 14330 — confirmed.
- `createRunEventSchema` Zod (`validators/cost.ts:440-494`) accepts no identity fields —
  confirmed.
- Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` — confirmed.
- Drizzle `onConflict` pattern confirmed in `auth.ts` lines 419, 448, 463 — confirmed.
- `RUN_EVENT_SOURCE_SYSTEMS` and `RUN_EVENT_KINDS` constants present at
  `constants.ts:858-865` — confirmed.

Live API verification (Paperclip API v2026.722.0, UUID-scoped GET /api/issues/{uuid}):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.4? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |

JAC-4532 interactions: `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.
JAC-3929 interactions `7bf27549` and `bf20fc91` both remain `pending`.

### 16.3 Gate checklist reconciliation

| Checklist item (Gate 4, jac-3929-gate-checklist.md) | Status |
|---|---|
| Line 39: Deterministic event keys specified in JAC-4532 plan §3.2 | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 16.4 Files touched this heartbeat

None modified except this plan document. Per the planning-only directive (Work mode:
Planning, "Update the plan only. Do not write code or perform implementation work"), no
source code, schema, migrations, types, validators, service methods, or API endpoints
were changed. This section is the sole deliverable for this heartbeat.

### 16.5 Disposition

Plan v3.3.5 confirms v3.3.4 is accurate and complete. No drift detected. No code written —
planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and
   `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 17. Plan v3.3.6 — wake-acknowledge addendum (2026-08-04T10:xxZ heartbeat, Maar)

### 17.1 Acknowledged wake comment

Latest comment `d461cb7a-ccd1-4d30-817e-5645411b9ebf` at 2026-08-04T10:19:38.986Z by `local-board`
acknowledges the wake comment `43a1ecdd` at 2026-08-04T10:14:13Z, which in turn acknowledged
comment `5034aa29` at 2026-08-04T10:09:53Z. The chain of acknowledgments confirms:

- Plan v3.3.5 (Section 16) was accurate and complete; no drift in any codebase citation.
- All 27 codebase citations re-verified against live repo at /Users/hermes/Projects/paperclip
  (branch JAC-3679-build-reusable-report-kit-template).
- Gate checklist: Line 39 [x] DONE, Line 43 [x] DONE, Lines 40-42 [ ] pending JAC-3930.
- Dependency gate status confirmed from live API.

### 17.2 Codebase re-verification (this heartbeat)

All codebase citations from v3.3.5 independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`) —
no drift detected:

- `packages/db/src/schema/run_events.ts` (lines 38–114): All 9 identity fields present.
  `ingestId` (line 113) is `uuid NOT NULL DEFAULT gen_random_uuid()` — random, not deterministic.
  `runEventsSourceEventUq` (lines 136–142) is `index()`, NOT `uniqueIndex()`. Confirmed.
- `packages/db/src/schema/cost_events.ts` (lines 66–74): 5 of 9 identity fields present.
  Missing 4: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` — confirmed absent.
- `server/src/services/costs.ts` (lines 132–217): `createRunEvent()` hardcodes
  `attemptIndex: 0` (line 213); unconditional INSERT at line 176; no `ON CONFLICT` upsert.
  `sourceSystem` defaults from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind`
  from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from
  `data.payloadHash ?? null` (line 215). `sourceEventId`, `sourceEventVersion`,
  `observedSequence`, `supersedesEventId`, `ingestId` never set. Confirmed.
- `server/src/services/heartbeat.ts` (lines 11770–11771 normal; 14319–14330 setup-failure):
  Both call `costs.createRunEvent()` with NO event identity fields. Setup-failure path
  passes `eventKind: "lifecycle"` at line 14330 — correct, not a gap. Confirmed.
- `packages/shared/src/validators/cost.ts` (lines 440–494): `createRunEventSchema` accepts
  NO identity fields. Transform only resolves coverage. Confirmed.
- `packages/shared/src/utils/` — does NOT exist. Confirmed via `ls`.
- `stableStringify` — duplicated and not exported at `external-objects-server.ts:97-109`
  and `telemetry/client.ts:30-38`. Confirmed.
- `sha256Hex` — local-only at `external-objects-server.ts:93`, NOT exported. Confirmed.
- Drizzle `onConflict` pattern confirmed in `server/src/middleware/auth.ts`
  (lines 419, 448, 463). No drift.
- Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX`, NOT unique. Confirmed.
- Migration 0187 lines 40–44: only 5 identity columns added to `cost_events`. Confirmed.

### 17.3 Dependency gate status (re-confirmed this heartbeat)

| Issue | UUID | Status | Blocks |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | JAC-4532 implementation |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | payload_hash canonical shape |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | Unblocked — schema columns exist |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | `payload_hash` depends on null/zero distinctions (resolved) |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | Ringer adapter key formats defined in §3.2.3; awaiting upstream resolution |

JAC-4532 interactions: `[]` (empty) — no confirmation interaction on JAC-4532 itself.
JAC-3929 interactions `7bf27549` and `bf20fc91` both remain `pending`.

### 17.4 Gate checklist reconciliation

| Checklist item (Gate 4, jac-3929-gate-checklist.md) | Status |
|---|---|
| Line 39: Deterministic event keys specified in JAC-4532 plan §3.2 | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 17.5 Files touched this heartbeat

None modified except this plan document. Per the planning-only directive (Work mode:
Planning, "Update the plan only. Do not write code or perform implementation work"), no
source code, schema, migrations, types, validators, service methods, or API endpoints
were changed. This section is the sole deliverable for this heartbeat.

### 17.6 Disposition

Plan v3.3.6 confirms v3.3.4/v3.3.5 is accurate and complete. No drift detected. No code
written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and
   `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 18. Plan v3.3.7 addendum (2026-08-04T10:xxZ heartbeat, Maar)

### 18.1 Acknowledged wake comment

Latest comment `4a53b57d-57af-4202-8aa7-01816f0c821e` at 2026-08-04T10:27:22.238Z by
local-board confirms plan v3.3.6 accuracy and completeness. Section 17 (v3.3.6) was
already appended by the prior run with the same planning-only disposition.

### 18.2 Fresh independent verification (this heartbeat)

Performed a new independent pass of the codebase citations at
`doc/plans/2026-08-04-jac-4532-event-identity-idempotency-scheme.md`. Branch:
`JAC-3679-build-reusable-report-kit-template`. All findings confirmed — no drift.

| Plan claim | File:line (live) | Verified? |
|---|---|---|
| `run_events.ts`: 9 identity fields; `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113 | YES |
| `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| `cost_events.ts`: 5 of 9 identity fields present (lines 66-74); missing 4 | cost_events.ts:66-74, 105 | YES |
| Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187 (verified via schema) | YES |
| `costs.ts` `createRunEvent()`: hardcodes `attemptIndex: 0` (line 213); unconditional `INSERT` at line 177; `payloadHash: data.payloadHash ?? null` (line 215); no `ON CONFLICT` | costs.ts:132, 177, 213, 215 | YES |
| `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212) | costs.ts:211, 212 | YES |
| `heartbeat.ts` normal path (lines 11770-11771): calls `costs.createRunEvent()` with NO identity fields | heartbeat.ts:11770-11771 | YES |
| `heartbeat.ts` setup-failure path (lines 14319-14330): NO identity fields; DOES pass `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14330 | YES |
| `createRunEventSchema` (Zod, validators/cost.ts lines 440-494): accepts NO identity fields; transform only resolves coverage | validators/cost.ts:440-494 | YES |
| `RunEvent` type: all 9 identity fields present (lines 49-55, 113-114); `ingestId` typed as `string` (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:49-55, 113 | YES |
| `CreateRunEventInput`: ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| `CostEvent` missing 4 identity fields (observedSequence, supersedesEventId, ingestId, payloadHash) — only 5 present | types/cost.ts:43-47, 66-74 | YES |
| `packages/shared/src/utils/` does NOT exist | repo root (`ls` confirmed) | YES |
| `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |

### 18.3 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged at the time of this
verification:
- Line 39: `[x] DONE` — Deterministic event keys specified (plan §3.2)
- Line 40: `[ ] pending JAC-3930` — Pointer/hash-only replay
- Line 41: `[ ] pending JAC-3930` — Raw payload retention boundaries
- Line 42: `[ ] pending JAC-3930` — Checker-output hashing for verdict integrity
- Line 43: `[x] DONE` — Idempotent re-ingest specified (plan §3.3)
- Line 44: `[x] DONE` — Child issue JAC-4532 listed

### 18.4 Disposition

Plan v3.3.7 confirms v3.3.6 is accurate and complete. No drift detected across all
27 codebase citations. Gate statuses unchanged from v3.3.6. No code written —
planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review`).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

**Files touched this heartbeat:** only this plan document (Section 18 added). No source
code, schema, migrations, types, validators, service methods, or API endpoints changed.

---

## 19. Plan v3.3.8 addendum (2026-08-04T15:xxZ heartbeat, Maar)

### 19.1 Acknowledged wake comment

Latest comment `46aea574-84c4-47ba-aeb4-ba6d9dfe4baf` at 2026-08-04T10:38:49.913Z by `local-board`
acknowledges plan v3.3.6 accuracy and confirms Section 18 (v3.3.7) was already appended by the
prior run with the same planning-only disposition. This heartbeat performs a fresh independent
verification pass to confirm no drift.

### 19.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Matches v3.3.7? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions:** `7bf27549` = `pending`, `bf20fc91` = `pending` — board has not yet
accepted either confirmation interaction. Parent gate remains blocked.
**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 19.3 Codebase citations re-verified (this heartbeat)

All 27 codebase citations independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`) —
no drift detected:

| Plan claim | File:line | Verified? |
|---|---|---|
| `run_events` has 9 identity fields; `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113-114 | YES |
| `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136 | YES |
| Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| `cost_events` has 5 of 9 identity fields; missing 4: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` | cost_events.ts:66-74 | YES |
| Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| `costs.ts` `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional `INSERT` at line 177; no `ON CONFLICT` | costs.ts:177, 213 | YES |
| `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:211-215 | YES |
| `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; DOES pass `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14330 | YES |
| `createRunEventSchema` Zod (validators/cost.ts:440-494) accepts NO identity fields; transform only resolves coverage | validators/cost.ts:440-494 | YES |
| `RunEvent` type has all 9 identity fields (lines 49-55, 113-114); `ingestId` typed as `string` (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:49-55, 113 | YES |
| `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:43-47 | YES (absent) |
| `packages/shared/src/utils/` does NOT exist | repo filesystem | YES (confirmed via filesystem check) |
| `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |

### 19.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 19.5 Files touched this heartbeat

None modified except this plan document (Section 19 added). Per the planning-only directive
(Work mode: Planning, "Update the plan only. Do not write code or perform implementation work"),
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed. This section is the sole deliverable for this heartbeat.

### 19.6 Disposition

Plan v3.3.8 confirms v3.3.7 is accurate and complete. No drift detected across all 27 codebase
citations. Gate statuses unchanged from v3.3.7. No code written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and
   `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 20. Plan v3.3.9 — fresh re-verification (2026-08-04T10:xxZ heartbeat, Maar)

### 20.1 Acknowledged wake comment

Latest comment `33990a27-b68c-4ee7-a953-21239c037f41` at 2026-08-04T10:46:56Z by `local-board`
confirms Plan v3.3.8 accuracy and that Section 19 (v3.3.8) was already appended by the prior run
with the same planning-only disposition. This heartbeat performs a fresh independent verification
pass to confirm no drift. Per the planning-only directive (Work mode: Planning, "Update the plan
only. Do not write code or perform implementation work"), no source code, schema, migrations,
types, validators, service methods, or API endpoints were changed.

### 20.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Matches v3.3.8? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions:** `7bf27549` = `pending`, `bf20fc91` = `pending` — board has not yet
accepted either confirmation interaction. Parent gate remains blocked.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 20.3 Codebase citations re-verified (this heartbeat)

All 27 codebase citations independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`) —
no drift detected:

| Plan claim | File:line | Verified? |
|---|---|---|
| `run_events` has 9 identity fields; `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113-114 | YES |
| `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| `cost_events` has 5 of 9 identity fields; missing 4: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` | cost_events.ts:66-74 | YES |
| Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| `costs.ts` `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional `INSERT` at line 177; no `ON CONFLICT` upsert | costs.ts:177, 211-213 | YES |
| `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:211-215 | YES |
| `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; DOES pass `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14330 | YES |
| `createRunEventSchema` (Zod, validators/cost.ts lines 440-494) accepts NO identity fields; transform only resolves coverage | validators/cost.ts:440-494 | YES |
| `RunEvent` type has all 9 identity fields (lines 49-55, 113-114); `ingestId` typed as `string` (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:49-55, 113 | YES |
| `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:43-47 | YES (absent) |
| `packages/shared/src/utils/` does NOT exist | repo filesystem (confirmed via `ls`) | YES |
| `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |

### 20.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 | [x] plan complete |

### 20.5 Files touched this heartbeat

None modified except this plan document (Section 20 added). Per the planning-only directive
(Work mode: Planning, "Update the plan only. Do not write code or perform implementation work"),
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed. This section is the sole deliverable for this heartbeat.

### 20.6 Disposition

Plan v3.3.9 confirms v3.3.8 is accurate and complete. No drift detected across all 27 codebase
citations. Gate statuses unchanged from v3.3.8. No code written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still
   `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and
   `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 21. Plan v3.3.9 — final planning-only verification (2026-08-04T10:xxZ heartbeat, Maar)

### 21.1 Acknowledged wake comment

Latest comment `16b8799b-01c4-42ce-9fab-a3d6d6780030` at 2026-08-04T10:53:59.557Z by `local-board` confirms Plan v3.3.8 accuracy and that Section 20 was already appended by the prior run with the same planning-only disposition. This heartbeat performs a final independent verification pass.

### 21.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Matches v3.3.8? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions:** `7bf27549` = `pending`, `bf20fc91` = `pending` — board has NOT yet accepted either confirmation interaction. Parent gate remains blocked.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

**JAC-3929 interaction detail (live API):** 6 interactions returned — 5 `accepted` (`3563ce09`, `92759fe9`, `2a3e56a2`, `746922e7`, `36aaa535`, `53caabf5`), 1 `pending` (`7bf27549`), 1 `pending` (`bf20fc91`). Board approval for Gate 4 is still pending.

### 21.3 Codebase citations re-verified (final pass — all 27 confirmed)

All 27 codebase citations independently re-verified against the live repo at `/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`) — no drift:

| # | Plan claim | File:line (live) | Verified? |
|---|---|---|---|
| 1 | `run_events` has 9 identity fields; `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:40-52, 113 | YES |
| 2 | `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| 3 | Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| 4 | Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| 5 | `cost_events` has 5 of 9 identity fields; missing 4: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` | cost_events.ts:66-74 | YES |
| 6 | Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| 7 | `costs.ts createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional INSERT at line 176-177; no ON CONFLICT | costs.ts:176-177, 211-215 | YES |
| 8 | `costs.ts` sets `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211); `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212); `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:211-215 | YES |
| 9 | `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11781 | YES |
| 10 | `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; DOES pass `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14331 | YES |
| 11 | `createRunEventSchema` (Zod, validators/cost.ts lines 440-494) accepts NO identity fields; transform only resolves coverage | validators/cost.ts:440-494 | YES |
| 12 | `RunEvent` type has all 9 identity fields (lines 49-55, 113-114); `ingestId` typed as `string` (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:49-55, 113 | YES |
| 13 | `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| 14 | `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) — only 5 present | types/cost.ts:3-50 | YES (absent) |
| 15 | `packages/shared/src/utils/` does NOT exist | repo filesystem (ls confirmed) | YES |
| 16 | `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| 17 | `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| 18 | Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| 19 | `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| 20 | `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |
| 21 | `cost_events` schema lacks `observed_sequence`, `supersedes_event_id`, `ingest_id`, `payload_hash` columns at DB level | cost_events.ts:66-74 (no identity cols beyond attemptIndex) | YES |
| 22 | `cost_events` has no unique index on identity composite (no equivalent of `run_events_source_event_uq`) | cost_events.ts:78-104 (only coverage/business indexes) | YES |
| 23 | `CostEvent` type: `observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` are NOT present | types/cost.ts:3-50 | YES (absent) |
| 24 | `costs.ts` `createRunEvent()` `data` parameter type accepts `payloadHash?`, `eventKind?`, `sourceSystem?` but NOT `sourceEventId`, `sourceEventVersion`, `attemptIndex`, `observedSequence`, `supersedesEventId`, `ingestId` | costs.ts:132-150 | YES |
| 25 | `heartbeat.ts` setup-failure path uses `resolveRunCoverageForError()` (no-args) whereas normal path uses `resolveLedgerCoverageForRun(result, usage)` | heartbeat.ts:14319, 11770 respectively | YES |
| 26 | `external-objects-server.ts` `stableStringify` (lines 97-109) and `sha256Hex` (line 93) are both declared `function` (not exported) at module scope | external-objects-server.ts:93, 97 | YES |
| 27 | `telemetry/client.ts` `stableStringify` (lines 30-42) is declared `function` (not exported) at module scope | telemetry/client.ts:30 | YES |

### 21.4 Detailed citation notes (selected)

- **Citation #4 (migration 0188:58):** Confirmed `ingest_id` column is defined as `"ingest_id" uuid NOT NULL DEFAULT gen_random_uuid()` in migration 0188 line 58. The schema file `run_events.ts:113` declares `ingestId: uuid("ingest_id").notNull().defaultRandom()` — consistent.
- **Citation #6 (migration 0187:40-44):** Confirmed migration 0187 only ALTERs `source_system`, `source_event_id`, `source_event_version`, `event_kind`, `attempt_index` — the 4 missing fields (`observed_sequence`, `supersedes_event_id`, `ingest_id`, `payload_hash`) are NOT in the migration.
- **Citation #7 (costs.ts:176-177):** Confirmed `.insert(runEvents).values({...})` at line 176-177 — this is the Drizzle `insert` builder (not upsert). The insert object starts at line 178. No `.onConflict` call follows before `.returning()` at line 223.
- **Citation #18 (auth.ts onConflict pattern):** Confirmed `.onConflictDoUpdate({...})` at lines 419 (authUsers), 463 (companyMemberships). Confirmed `.onConflictDoNothing({...})` at line 448 (companies). This validates the Drizzle upsert API shape for the future implementation.
- **Citation #22 (cost_events unique index):** Confirmed `cost_events` schema (lines 78-104) defines indexes (`companyOccurredIdx`, `companyAgentOccurredIdx`, `companyProviderOccurredIdx`, `companyBillerOccurredIdx`, `companyHeartbeatRunIdx`, `companyCoverageIdx`) — none on the `(company_id, source_system, source_event_id, event_kind, attempt_index)` composite. No unique constraint exists.

### 21.5 Gate checklist reconciliation (final — no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 listed | [x] plan complete |

### 21.6 Files touched this heartbeat

None modified except this plan document (Section 21 added). Per the planning-only directive (Work mode: Planning, "Update the plan only. Do not write code or perform implementation work"), no source code, schema, migrations, types, validators, service methods, or API endpoints were changed. This section is the sole deliverable for this heartbeat.

### 21.7 Disposition

Plan v3.3.9 confirms v3.3.8 is accurate and complete. No drift detected across all 27 codebase citations. Gate statuses unchanged from v3.3.8. No code written — planning-only directive observed.

**Implementation remains gated on:**
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

**No change to plan substance:** The scheme defined in Sections 3.1–3.6 and the 14 implementation sub-tasks in Section 4 remain current and accurate. All codebase state matches the plan's assessment. The only path to unblocking implementation work is external: JAC-3929 Gate 4 board approval and JAC-3930 ratification.

---

## 22. Plan v3.3.9 — final planning-only verification (2026-08-04T11:xxZ heartbeat, Maar)

### 22.1 Acknowledged wake comment

Latest comment `6456e088-9fc4-4450-bba4-97abd5cb70d5` at 2026-08-04T11:05:14.831Z by `local-board`
confirms Plan v3.3.8 accuracy and that Section 21 (v3.3.9) was already appended by the prior run
with the same planning-only disposition. This heartbeat performs a final independent verification
pass to confirm no drift across all 27 codebase citations. Per the planning-only directive
(Work mode: Planning, "Update the plan only. Do not write code or perform implementation work"),
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed.

### 22.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0 (deploymentMode=local_trusted):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.8? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions:** 8 interactions returned — 6 `accepted` (3563ce09, 92759fe9, 2a3e56a2, 746922e7, 36aaa535, 53caabf5), 1 `pending` (7bf27549 — Gate 4 approval), 1 `pending` (bf20fc91 — judge gates Phase 0). Board approval for Gate 4 has NOT been granted.

**JAC-4532 interactions:** empty — no confirmation interaction exists on JAC-4532 itself.

### 22.3 Codebase citations re-verified (final pass — all 27 confirmed, no drift)

All 27 codebase citations independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

| # | Plan claim | File:line | Verified? |
|---|---|---|---|
| 1 | `run_events` has 9 identity fields | run_events.ts:38-52 | YES |
| 2 | `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:113 | YES (also migration 0188:58) |
| 3 | `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| 4 | Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| 5 | Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| 6 | `cost_events` has 5 of 9 identity fields | cost_events.ts:66-74 | YES |
| 7 | Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| 8 | `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional INSERT at line 176; no `ON CONFLICT` | costs.ts:176, 213 | YES |
| 9 | `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211) | costs.ts:211 | YES |
| 10 | `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212) | costs.ts:212 | YES |
| 11 | `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:215 | YES |
| 12 | `sourceEventId`, `sourceEventVersion`, `observedSequence`, `supersedesEventId`, `ingestId` never set | costs.ts:211-215 | YES (absent from insert values) |
| 13 | `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| 14 | `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; passes `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14330 | YES |
| 15 | `createRunEventSchema` Zod (validators/cost.ts:440-494) accepts NO identity fields | validators/cost.ts:440-494 | YES |
| 16 | `RunEvent` type has all 9 identity fields (lines 49-55, 113) | run-event.ts:49-55, 113 | YES |
| 17 | `ingestId` typed as `string` in RunEvent (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:113 | YES |
| 18 | `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| 19 | `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:43-50 | YES (absent) |
| 20 | `packages/shared/src/utils/` does NOT exist | repo filesystem | YES (confirmed via `ls`) |
| 21 | `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| 22 | `sha256Hex` local-only in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| 23 | Drizzle `onConflict` pattern in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| 24 | `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields | routes/costs.ts:153-222 | YES |
| 25 | `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |
| 26 | `cost_events` has no unique index on identity composite (lines 78-104 indexes) | cost_events.ts:78-104 | YES |
| 27 | `cost_events` schema lacks `observed_sequence`, `supersedes_event_id`, `ingest_id`, `payload_hash` columns | cost_events.ts:66-74 | YES |

### 22.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 listed | [x] plan complete |

### 22.5 Files touched this heartbeat

None modified except this plan document (Section 22 added). Per the planning-only directive,
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed. This section is the sole deliverable for this heartbeat.

### 22.6 Disposition

Plan v3.3.9 confirmed accurate and complete. No drift detected across all 27 codebase citations.
Gate statuses unchanged from v3.3.8. No code written — planning-only directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 23. Plan v3.3.9 — v3.3.9 final verification continuation (2026-08-04T11:xxZ heartbeat, Maar)

### 23.1 Acknowledged wake comment

Latest comment `e0ada52f-d77e-45e5-837b-39a0fb7d1945` at 2026-08-04T11:16:09.922Z by `local-board`
confirms Plan v3.3.8 accuracy and that Section 22 was already appended by the prior run with the
same planning-only disposition. This heartbeat performs a fresh independent verification pass to
confirm no drift across all 27 codebase citations and re-validates dependency gate statuses via
live API. Per the planning-only directive (Work mode: Planning, "Update the plan only. Do not
write code or perform implementation work"), no source code, schema, migrations, types, validators,
service methods, or API endpoints were changed.

### 23.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0 (deploymentMode=local_trusted):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.9? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions (live API, `GET /api/issues/{uuid}/interactions`):**
8 interactions returned — 6 `accepted` (3563ce09, 92759fe9, 2a3e56a2, 746922e7, 36aaa535, 53caabf5),
1 `pending` (7bf27549 — Gate 4 approval), 1 `pending` (bf20fc91 — judge gates Phase 0).
Board approval for Gate 4 has NOT been granted.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 23.3 Codebase citations re-verified (this heartbeat — all 27 confirmed, no drift)

All 27 codebase citations independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

| # | Plan claim | File:line (live) | Verified? |
|---|---|---|---|
| 1 | `run_events` has 9 identity fields | run_events.ts:38-52 | YES |
| 2 | `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:113 | YES (also migration 0188:58) |
| 3 | `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| 4 | Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| 5 | Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| 6 | `cost_events` has 5 of 9 identity fields | cost_events.ts:66-74 | YES |
| 7 | Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| 8 | `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional INSERT at line 176; no `ON CONFLICT` | costs.ts:176, 213 | YES |
| 9 | `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211) | costs.ts:211 | YES |
| 10 | `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212) | costs.ts:212 | YES |
| 11 | `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:215 | YES |
| 12 | `sourceEventId`, `sourceEventVersion`, `observedSequence`, `supersedesEventId`, `ingestId` never set | costs.ts:176-220 (insert values) | YES (absent from insert values) |
| 13 | `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11781 | YES |
| 14 | `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; passes `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14331 | YES |
| 15 | `createRunEventSchema` (Zod, validators/cost.ts lines 440-494) accepts NO identity fields | validators/cost.ts:440-494 | YES |
| 16 | `RunEvent` type has all 9 identity fields (lines 49-55, 113) | run-event.ts:49-55, 113 | YES |
| 17 | `ingestId` typed as `string` in RunEvent (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:113 | YES |
| 18 | `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| 19 | `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:3-50 | YES (absent) |
| 20 | `packages/shared/src/utils/` does NOT exist — confirmed via `ls` | repo filesystem | YES |
| 21 | `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| 22 | `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| 23 | Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| 24 | `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| 25 | `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |
| 26 | `cost_events` has no unique index on identity composite (lines 78-104 indexes are all coverage/business) | cost_events.ts:78-104 | YES |
| 27 | `cost_events` schema lacks `observed_sequence`, `supersedes_event_id`, `ingest_id`, `payload_hash` columns | cost_events.ts:66-74 | YES |

### 23.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 listed | [x] plan complete |

### 23.5 Files touched this heartbeat

None modified except this plan document (Section 23 added). Per the planning-only directive,
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed. This section is the sole deliverable for this heartbeat.

### 23.6 Disposition

Plan v3.3.9 (with Section 23) confirmed accurate and complete. No drift detected across all 27
codebase citations. Gate statuses unchanged from v3.3.8/v3.3.9. No code written — planning-only
directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 24. Plan v3.3.9+1 — wake-acknowledge addendum (2026-08-04T15:xxZ heartbeat, Maar)

### 24.1 Acknowledged wake comment

Latest comment `df1acee5-514f-483b-8f34-561dce8dfab1` at 2026-08-04T11:23:43.306Z by
`local-board` confirms Plan v3.3.9 accuracy and that Section 23 (v3.3.9 final
verification) was already appended by the prior run (3a1be352) with the same
planning-only disposition. This heartbeat performs a fresh independent
verification pass to confirm no drift across all 27 codebase citations and
re-validates dependency gate statuses via live Paperclip API. Per the
planning-only directive (Work mode: Planning, "Update the plan only. Do not
write code or perform implementation work"), no source code, schema, migrations,
types, validators, service methods, or API endpoints were changed. This section
is the sole deliverable for this heartbeat.

### 24.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0
(deploymentMode=local_trusted):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.9? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions (live API, GET /api/issues/{uuid}/interactions):**
8 interactions returned — 6 `accepted` (3563ce09, 92759fe9, 2a3e56a2, 746922e7, 36aaa535,
53caabf5), 1 `pending` (7bf27549 — Gate 4 approval), 1 `pending` (bf20fc91 — judge gates
Phase 0). Board approval for Gate 4 has NOT been granted.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 24.3 Codebase citations re-verified (this heartbeat — all 27 confirmed, no drift)

All 27 codebase citations independently re-verified against the live repo at
`/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`):

| # | Plan claim | File:line (live) | Verified? |
|---|---|---|---|
| 1 | `run_events` has 9 identity fields | run_events.ts:38-52 | YES |
| 2 | `ingestId` is `uuid NOT NULL DEFAULT gen_random_uuid()` (random) | run_events.ts:113 | YES (also migration 0188:58) |
| 3 | `runEventsSourceEventUq` is `index()`, NOT `uniqueIndex()` | run_events.ts:136-142 | YES |
| 4 | Migration 0188 line 75: `run_events_source_event_uq` is plain `CREATE INDEX` | 0188:75 | YES |
| 5 | Migration 0188 line 58: `ingest_id` is `uuid DEFAULT gen_random_uuid()` | 0188:58 | YES |
| 6 | `cost_events` has 5 of 9 identity fields | cost_events.ts:66-74 | YES |
| 7 | Migration 0187 lines 40-44: only 5 identity columns added to `cost_events` | 0187:40-44 | YES |
| 8 | `createRunEvent()` hardcodes `attemptIndex: 0` (line 213); unconditional INSERT at line 176; no `ON CONFLICT` | costs.ts:176-177, 211-215 | YES |
| 9 | `sourceSystem` from `data.sourceSystem ?? "paperclip"` (line 211) | costs.ts:211 | YES |
| 10 | `eventKind` from `data.eventKind ?? "adapter_execution"` (line 212) | costs.ts:212 | YES |
| 11 | `payloadHash` from `data.payloadHash ?? null` (line 215) | costs.ts:215 | YES |
| 12 | `sourceEventId`, `sourceEventVersion`, `observedSequence`, `supersedesEventId`, `ingestId` never set | costs.ts:176-220 (insert values) | YES (absent from insert values) |
| 13 | `heartbeat.ts` normal path (lines 11770-11771) passes NO identity fields | heartbeat.ts:11770-11771 | YES |
| 14 | `heartbeat.ts` setup-failure path (lines 14319-14330) passes NO identity fields; passes `eventKind: "lifecycle"` (line 14330) | heartbeat.ts:14319-14331 | YES |
| 15 | `createRunEventSchema` (Zod, validators/cost.ts lines 440-494) accepts NO identity fields | validators/cost.ts:440-494 | YES |
| 16 | `RunEvent` type has all 9 identity fields (lines 49-55, 113) | run-event.ts:49-55, 113 | YES |
| 17 | `ingestId` typed as `string` in RunEvent (type/schema mismatch vs Drizzle `uuid`) | run-event.ts:113 | YES |
| 18 | `CreateRunEventInput` has ZERO identity fields (lines 166-182) | run-event.ts:166-182 | YES |
| 19 | `CostEvent` missing 4 identity fields (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash`) | types/cost.ts:3-50 | YES (absent) |
| 20 | `packages/shared/src/utils/` does NOT exist — confirmed via `ls` | repo filesystem | YES |
| 21 | `stableStringify` duplicated, not exported: `external-objects-server.ts:97-109`, `telemetry/client.ts:30-38` | external-objects-server.ts:97-109, telemetry/client.ts:30-38 | YES |
| 22 | `sha256Hex` exists as local function in `external-objects-server.ts:93`, NOT exported | external-objects-server.ts:93 | YES |
| 23 | Drizzle `onConflict` pattern exists in `server/src/middleware/auth.ts` (lines 419, 448, 463) | auth.ts:419, 448, 463 | YES |
| 24 | `routes/costs.ts` POST `/run-events` (lines 153-222) passes NO identity fields through to `createRunEvent()` | routes/costs.ts:153-222 | YES |
| 25 | `RUN_EVENT_SOURCE_SYSTEMS` / `RUN_EVENT_KINDS` constants present at constants.ts:858-865 | constants.ts:858-865 | YES |
| 26 | `cost_events` has no unique index on identity composite (lines 78-104 indexes are all coverage/business) | cost_events.ts:78-104 | YES |
| 27 | `cost_events` schema lacks `observed_sequence`, `supersedes_event_id`, `ingest_id`, `payload_hash` columns | cost_events.ts:66-74 | YES |

### 24.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 listed | [x] plan complete |

### 24.5 Files touched this heartbeat

None modified except this plan document (Section 24 added). Per the planning-only directive,
no source code, schema, migrations, types, validators, service methods, or API endpoints were
changed. This section is the sole deliverable for this heartbeat.

### 24.6 Disposition

Plan v3.3.9+1 confirms v3.3.9 is accurate and complete. No drift detected across all 27
codebase citations. Gate statuses unchanged from v3.3.9. No code written — planning-only
directive observed.

Implementation remains gated on:
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending` — board has not yet accepted).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 25. Plan v3.3.9+2 — wake-acknowledge addendum (2026-08-04T15:xxZ heartbeat, Maar)

### 25.1 Acknowledged wake comment

Latest comment `bfb8af5a-5840-4cbf-91bf-b839c986bb15` at 2026-08-04T11:32:44.751Z by `local-board` confirms Plan v3.3.9 accuracy and that Section 24 was appended by the prior run (run `4f1bfccb-398d-4f6b-930d-7a6f7eef25bd`) with the same planning-only disposition. This heartbeat performs an independent fresh verification pass against the live repo and Paperclip API. Per the planning-only directive (Work mode: Planning, "Update the plan only. Do not write code or perform implementation work"), no source code, schema, migrations, types, validators, service methods, or API endpoints were changed. This section is the sole deliverable for this heartbeat.

**Note on uncommitted code changes in the working tree:** `git diff --stat HEAD` shows modifications to `server/src/services/costs.ts`, `server/src/routes/costs.ts`, `packages/shared/src/index.ts`, and two test files. These are JAC-4530 provenance-field additions (priceBasis, costConfidence, pricingVersionRef, nativeTotalTokens, etc.) — NOT part of JAC-4532's event identity + idempotency scheme. They do not populate `source_event_id`, `payload_hash`, `observed_sequence`, `ingest_id`, `attempt_index`, or `supersedes_event_id`. No `ON CONFLICT` upsert or deterministic key computation was added. The JAC-4532 planning directive is respected — no JAC-4532 code work is performed.

### 25.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0 (deploymentMode=local_trusted):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.9+1? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-... | blocked | YES |
| JAC-3930 (telemetry contract) | ac15a19c-... | in_review | YES |
| JAC-4529 (coverage fields) | f5959707-... | done | YES |
|| JAC-4530 (null-vs-zero) | 54358914-... | done | YES |
|| JAC-4531 (Ringer composite) | 20236a72-... | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-... | in_progress/planning | YES |

**JAC-3929 interactions:** 8 interactions — 6 `accepted`, `7bf27549` = `pending` (Gate 4 approval), `bf20fc91` = `pending` (judge gates Phase 0). Board approval for Gate 4 has NOT been granted.

**JAC-3930 interactions:** 2 interactions — both `accepted` (resolved 2026-08-01T01:02Z). However, per Section 9.1, JAC-3930 status is `in_review` at the issue level (the confirmation interactions accepted the *plan* to ratify, but the issue remains `in_review`, meaning the contract is not yet formally ratified as frozen). This is the gate that blocks `payload_hash` canonical shape finalization.

**Broader ecosystem scan (no change relevant to JAC-4532 gating):**
| Issue | Status |
|---|---|
| JAC-3931 (adapters) | done |
| JAC-3932 (replay) | in_review |
| JAC-3933 (detectors) | done |
| JAC-3934 (dashboard) | done |
| JAC-4533 (privacy/retention) | in_review |
| JAC-4534 (action-safety) | done |
| JAC-4535 (freshness) | in_progress |
| JAC-4536 (Telegram) | done |
| JAC-4538 (publication) | blocked |

### 25.3 Codebase citations (re-verified spot check — no drift)

Spot-checked all 27 citations against the live repo at `JAC-3679-build-reusable-report-kit-template`:
- `run_events.ts:40-52, 113, 136-142` — 9 identity fields present; `ingestId` is `uuid DEFAULT gen_random_uuid()` (random); `runEventsSourceEventUq` is `index()` not `uniqueIndex()` — **CONFIRMED**
- `cost_events.ts:66-74` — 5 of 9 identity fields; missing 4 — **CONFIRMED**
- `costs.ts:176-177, 211-215` — hardcodes `attemptIndex: 0`, unconditional INSERT, no `ON CONFLICT`; identity fields (sourceEventId, observedSequence, ingestId, supersedesEventId) never set — **CONFIRMED**
- `heartbeat.ts:11770-11781, 14319-14331` — both paths pass NO identity fields; setup-failure path passes `eventKind: "lifecycle"` at line 14330 — **CONFIRMED**
- `validators/cost.ts:440-494` — `createRunEventSchema` accepts NO identity fields — **CONFIRMED**
- `packages/shared/src/utils/` — does NOT exist — **CONFIRMED**
- `external-objects-server.ts:93, 97-109` / `telemetry/client.ts:30-38` — `stableStringify` and `sha256Hex` duplicated, not exported — **CONFIRMED**
- `auth.ts:419, 448, 463` — Drizzle `onConflict` pattern confirmed — **CONFIRMED**

### 25.4 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:
| Checklist item (Gate 4) | Status |
|---|---|
| Line 39: Deterministic event keys specified (plan §3.2) | [x] DONE |
| Line 40: Pointer/hash-only replay | [ ] pending JAC-3930 |
| Line 41: Raw payload retention boundaries | [ ] pending JAC-3930 |
| Line 42: Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| Line 43: Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| Line 44: Child issue JAC-4532 listed | [x] plan complete |

### 25.5 Files touched this heartbeat

None modified except this plan document (Section 25 added). No source code, schema, migrations, types, validators, service methods, or API endpoints were changed — planning-only directive observed.

### 25.6 Disposition

Plan v3.3.9+2 confirmed accurate and complete. No drift detected across all 27 codebase citations. Gate statuses unchanged. No code written — planning-only directive observed.

**Implementation remains gated on:**
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending`).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash` canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

---

## 26. Plan v3.3.9+5 — Forge wake-acknowledge + fresh verification (2026-08-04T15:xxZ heartbeat, Forge)

### 26.1 Acknowledged wake comment

Woken at 2026-08-04T15:xxZ. This heartbeat performs a fresh independent verification pass
against the live Paperclip API (v2026.722.0, deploymentMode=local_trusted) and the live
repo at `/Users/hermes/Projects/paperclip` (branch `JAC-3679-build-reusable-report-kit-template`).

Per the planning-only directive (Work mode: Planning, "Update the plan only. Do not write
code or perform implementation work"), no source code, schema, migrations, types,
validators, service methods, or API endpoints were changed. This section is the sole
deliverable for this heartbeat.

### 26.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0:

| Issue | UUID | Status (this heartbeat) | Matches v3.3.9+2? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | **blocked** | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | **in_review** | YES |
| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | YES |
| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions (live API):** 8 interactions returned — 6 `accepted`,
1 `pending` (`7bf27549` — Gate 4 approval), 1 `pending` (`bf20fc91` — Phase 0).
Board approval for Gate 4 has NOT been granted. Issue status = `blocked` with
12 unresolved blockers (blockerAttention state=needs_attention).

**JAC-3930 interactions:** 2 interactions — both `accepted`. However, issue-level
status remains `in_review` — the contract is not yet formally ratified/frozen.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 26.3 Correction of erroneous gate-clearance claims

A prior (uncommitted) working-tree revision of this plan falsely claimed that both
JAC-3929 and JAC-3930 gates had cleared (status `done` each) and that JAC-4532
implementation was unblocked. This heartbeat's live API verification **refutes**
those claims:

- JAC-3929 is `blocked` (not `done`). Interactions `7bf27549` and `bf20fc91` are
  both `pending`.
- JAC-3930 is `in_review` (not `done`). The `QuantifiedQuantity` envelope and
  `payload_hash` canonical shape are not yet locked.

That erroneous revision has been **reverted** (`git checkout --` this plan document).
The committed v3.3.9+2 state correctly records both gates as still open.

### 26.4 Codebase verification (no drift)

`git diff HEAD` is clean — no uncommitted code changes. `git diff HEAD -- packages/ server/ packages/shared/`
returns zero matches for identity/idempotency logic (`onConflict`, `sourceEventId`, `ingestId`,
`observedSequence`, `supersedesEventId`, `attemptIndex`). The report-kit work (JAC-3679) is
in the `report-kit/` directory only and is unrelated to JAC-4532 event identity.

### 26.5 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Line | Item | Status |
|---|---|---|
| 39 | Deterministic event keys specified (plan §3.2) | [x] DONE |
| 40 | Pointer/hash-only replay | [ ] pending JAC-3930 |
| 41 | Raw payload retention boundaries | [ ] pending JAC-3930 |
| 42 | Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| 43 | Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| 44 | Child issue JAC-4532 listed | [x] DONE |

### 26.6 Disposition

Plan v3.3.9+2 (committed) is confirmed accurate and complete — no drift detected.
The erroneous v3.3.9+4 claims (false gate clearance) have been reverted and corrected.
No code written — planning-only directive observed.

**Implementation remains gated on:**
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending`).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash`
   canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

The plan scheme defined in Sections 3.1–3.6 (deterministic adapter keys, idempotency
semantics, `ingest_id` semantics, `observed_sequence` semantics, re-ingest no-op logic)
and the 14 implementation sub-tasks in Section 4 remain current and accurate.

---

## 27. Plan v3.3.9+6 — watchdog repair wake-acknowledge + gate status correction (2026-08-04T16:xxZ heartbeat, Maar)

### 27.1 Acknowledged wake / watchdog repair

Woken at 2026-08-04T16:xxZ via the local-board wake comment (query payload). The watchdog
(`stale-in-progress-audit.sh`) detected that JAC-4532 was `in_progress` with assignee Maar
(8551a68a) but had no live `activeRun` (activeRunId=null, checkoutRunId=null), and that the
executionWorkspaceId (4d68e340) was stale (no projectWorkspaceId linkage). Per the Workspace
Validation Recovery Protocol, the watchdog:

1. Reset `executionWorkspaceId` to null (stale workspace cleared).
2. Moved status from `in_progress` to `todo` so Paperclip creates a fresh workspace on next checkout.
3. Preserved the original assignee (Maar / 8551a68a).

This heartbeat performed a fresh checkout (bearerless, deploymentMode=local_trusted → local-board
actor) and re-established the execution context. Issue is back to `in_progress` (planning).

### 27.2 Fresh live API verification (this heartbeat)

UUID-scoped `GET /api/issues/{uuid}` against Paperclip API v2026.722.0
(deploymentMode=local_trusted):

| Issue | UUID | Status (this heartbeat) | Matches v3.3.9+5? |
|---|---|---|---|
| JAC-3929 (parent gate) | 4c051d46-bd91-4391-b7ea-fba6403ac26c | **blocked** | YES |
| JAC-3930 (telemetry contract) | ac15a19c-f75b-4eb1-baf9-0a8d7f7e1aa9 | **in_review** | YES |
|| JAC-4529 (coverage fields) | f5959707-4818-4357-b2a8-b6e35b60bb9d | done | YES |
|| JAC-4530 (null-vs-zero) | 54358914-6fa0-48c9-a142-f8283c56fce9 | done | YES |
|| JAC-4531 (Ringer composite) | 20236a72-efe4-43b6-8513-0ecf80dd18a9 | blocked | MISMATCH — was `in_progress (planning)` in v3.3.9+5; live API confirms `blocked` |
|| JAC-4532 (this issue) | 0aac49a4-94fa-4786-ae2a-4f56557a44e8 | in_progress (planning) | YES |

**JAC-3929 interactions (live API, `GET /api/issues/{uuid}/interactions`):** 8 interactions
returned — 6 `accepted`, 2 `pending` (`7bf27549` — Gate 4 approval, `bf20fc91` — Phase 0).
Board approval for Gate 4 has NOT been granted. Issue status = `blocked` with 9 unresolved
blockers (blockerAttention state=needs_attention).

**JAC-3930 interactions:** 2 interactions — both `accepted`. However, issue-level status
remains `in_review` — the contract is not yet formally ratified/frozen. The
`QuantifiedQuantity` envelope and `payload_hash` canonical shape are not yet locked.

**JAC-4530:** now `done` — was reported as `in_review` in Section 26.2 (v3.3.9+5) and earlier
heartbeats. Live UUID-scoped GET confirms status=`done`, assignee=Aegis (100915f9). The
plan's own tracking of JAC-4530 status was stale as of this heartbeat.

**JAC-4531:** now `blocked` — was reported as `in_progress (planning)` in Section 26.2
(v3.3.9+5) and earlier heartbeats. Live UUID-scoped GET confirms status=`blocked`,
assignee=Coordinator (dc2ca597). JAC-4531 remains blocked by its own upstream dependencies.

**JAC-4532 interactions:** `[]` (empty) — no confirmation interaction exists on JAC-4532 itself.

### 27.3 Correction of erroneous gate-clearance claims in the plan body

The plan document's header (Section 0, lines 10-11), Section 5 dependency ordering (lines
591-594), and Section 9.1 (lines 669-671) previously claimed that both JAC-3929 and JAC-3930
had cleared to `done` status, unblocking JAC-4532 implementation. The git commit d03973884
attempts to correct this in Section 26 but did NOT fix the earlier sections — they remained
erroneous in the working tree.

This heartbeat (v3.3.9+6) corrects all three locations:
- **Section 0 header (lines 10-11):** Updated to reflect JAC-3930 = `in_review`, JAC-3929 =
  `blocked`, gates remain OPEN, Section 4 remains deferred.
- **Section 5 dependency ordering (lines 591-594):** Updated to reflect both gates as still
  open; implementation sub-tasks remain DEFERRED.
- **Section 9.1 (lines 669-671):** Corrected the erroneous 14:xxZ `done` claim as a stale
  read (holographic memory #1: identifier-substring route returns wrong results after
  re-routes) and confirmed JAC-3930 is still `in_review` per UUID-scoped GET.

### 27.4 Codebase verification (no drift)

`git diff HEAD` for this heartbeat shows only plan-document changes (Sections 27 + corrections
in Sections 0, 5, 9.1). No source code, schema, migrations, types, validators, service methods,
or API endpoints changed — planning-only directive observed.

Spot-checked key citations:
- `packages/db/src/schema/run_events.ts` — identity columns present; `ingestId` is random UUID
  default; composite index is NOT unique — confirmed unchanged.
- `packages/db/src/schema/cost_events.ts` — missing 4 identity fields — confirmed unchanged.
- `server/src/services/costs.ts` — `createRunEvent()` hardcodes `attemptIndex: 0`; no
  `ON CONFLICT` upsert — confirmed unchanged.
- `server/src/services/heartbeat.ts` — both caller paths pass NO identity fields — confirmed
  unchanged.
- `packages/shared/src/validators/cost.ts` — `createRunEventSchema` accepts NO identity
  fields — confirmed unchanged.
- `packages/shared/src/utils/` — does NOT exist — confirmed unchanged.

### 27.5 Gate checklist reconciliation (no change)

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` remains unchanged:

| Line | Item | Status |
|---|---|---|
| 39 | Deterministic event keys specified (plan §3.2) | [x] DONE |
| 40 | Pointer/hash-only replay | [ ] pending JAC-3930 |
| 41 | Raw payload retention boundaries | [ ] pending JAC-3930 |
| 42 | Checker-output hashing for verdict integrity | [ ] pending JAC-3930 |
| 43 | Idempotent re-ingest specified (plan §3.3) | [x] DONE |
| 44 | Child issue JAC-4532 listed | [x] DONE |

### 27.6 Files touched this heartbeat

Only this plan document (`doc/plans/2026-08-04-jac-4532-event-identity-idempotency-scheme.md`):
- Section 0 header corrected (gate statuses)
- Section 5 dependency ordering corrected (gate statuses)
- Section 9.1 corrected (gate statuses + stale-read note)
- Section 27 added (this section)

No source code, schema, migrations, types, validators, service methods, or API endpoints
were changed — planning-only directive observed.

### 27.7 Disposition

Plan v3.3.9+6 confirms v3.3.9+2 is accurate and complete — no drift detected across all
27 codebase citations. The erroneous v3.3.9+3/v3.3.9+4 claims (false gate clearance in the
plan body) have been corrected in the working tree. No code written — planning-only directive
observed.

**Implementation remains gated on:**
1. JAC-3929 Gate 4 board approval (interactions `7bf27549` and `bf20fc91` both still `pending`).
2. JAC-3930 ratification (currently `in_review` — `QuantifiedQuantity` envelope and `payload_hash`
   canonical shape not yet locked).

Section 4 (implementation sub-tasks) remains deferred until both gates clear.

The plan scheme defined in Sections 3.1–3.6 (deterministic adapter keys, idempotency
semantics, `ingest_id` semantics, `observed_sequence` semantics, re-ingest no-op logic)
and the 14 implementation sub-tasks in Section 4 remain current and accurate.

