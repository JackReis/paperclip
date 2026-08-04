# JAC-4532 — Event Identity and Idempotency Scheme (Plan)

**Date:** 2026-08-04
**Work mode:** Planning only — no code (per planning directive)
**Author:** Maar (agent 8551a68a)
**Issue:** JAC-4532 [JAC-3929] P1: Event identity and idempotency scheme
**Branch:** JAC-3679-build-reusable-report-kit-template (confirmed via `git branch --show-current`; the `JAC-3929-...` branch named in earlier drafts does not exist as a checkoutable ref)
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory — reconciled initiative and approval gate
**Priority:** P1
**Depends on:** JAC-3930 (telemetry contract definition) — `in_review` (NOT done; corrected from erroneous v3.1 claim after re-verification with correct UUID `ac15a19c` at 2026-08-04T09:1xZ)
**Status:** v3.2 — planning revision (v3.2 corrects erroneous v3.1 claim that JAC-3930 was `done`; re-verification with correct UUID `ac15a19c` confirms `in_review`; JAC-4531 corrected from `in_review` to `in_progress`)
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
|- JAC-3930 (telemetry contract) — `in_review` (NOT done as erroneously claimed in v3.1; re-verified live at 2026-08-04T09:1xZ with correct UUID `ac15a19c`). The `QuantifiedQuantity` envelope and event schema are still under review; `payload_hash` canonical shape is not yet locked.
|- JAC-3929 (parent) — `blocked (critical)`. The 6-approval-gate checklist
  (doc/plans/2026-08-04-jac-3929-gate-checklist.md) maps JAC-4532 to
  Gate 4 (Replay/Identity). Board approval of interaction `bf20fc91` is required
  before implementation begins.

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
confirms the status is `in_review` — the `QuantifiedQuantity` envelope and
`payload_hash` canonical shape are not yet locked. The v3.1 runs queried a
non-existent UUID (`eb3190e9-...`) which returned "Issue not found", and the
`done` status was assumed from that negative result. This plan is written to
be retargetable: the key format and idempotency logic are stable regardless
of envelope field names, but `payload_hash` input shape will be finalized once
JAC-3930 ratifies.

### 9.2 JAC-4529 (Coverage-aware fail-closed fields) — `done`

JAC-4529 established the `run_events` table and the `source_event_id` /
`payload_hash` columns. JAC-4532's identity scheme is the **consumption** layer:
it defines how those columns are populated and enforced. JAC-4529 §2.7 already
references the JAC-4532 identity scheme as the target. This plan closes the gap
between "columns exist" and "columns are populated + enforced."

### 9.3 JAC-4530 (Token/cost unknown-vs-zero) — `in_review (high)`

The `payload_hash` is computed over token/cost fields. JAC-4530's distinction
between `null` (not_reported) and `0` (explicitly zero) is critical for hash
stability: two events with the same semantic meaning but different null/zero
representations must hash differently. The `computePayloadHash` function must
use the resolved (fail-closed) values, including `null` vs `0` distinctions.

### 9.4 JAC-4531 (Ringer composite adapter design) — `in_progress`

JAC-4531 §3.1 defines the Ringer deterministic key formats. JAC-4532 ensures
these keys are populated into `source_event_id` / `ingest_id` on ingestion.
The two plans are complementary: JAC-4531 defines the Ringer side, JAC-4532
defines the Paperclip + cross-table side. **Corrected from v3.1's `in_review`
claim**: live API re-verification at 2026-08-04T09:1xZ (UUID `20236a72-efe4-43b6-8513-0ecf80dd18a9`)
confirms status is `in_progress`.

### 9.5 JAC-3929 (Parent — approval gate)

JAC-4532 maps to **Gate 4 (Replay/Identity)** in
`doc/plans/2026-08-04-jac-3929-gate-checklist.md` (line 39). The checklist
item currently reads:

> [ ] Deterministic event keys: `ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>`, `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`
> [ ] Idempotent re-ingest: no-op unless source version or hash changes

This plan fleshes out that checklist item into a full schema + service + API +
migration + test plan. Implementation is gated on JAC-3929 gate approval.
Per live API verification (2026-08-04T06:1xZ), JAC-3929 is currently
`blocked` — the parent gate has not been approved yet. This plan remains in
planning revision; implementation sub-tasks (Section 4) await gate clearance.

---

## 10. Verification addendum (2026-08-04T06:1xZ re-verification)

This addendum was appended during the planning-only heartbeat that re-verifies
v1 against the live codebase and Paperclip API.

### 10.1 Dependency status corrections (from live API)

| Issue | Plan v1 stated | Verified live (API) | Corrected |
|---|---|---|---|---|
| JAC-3929 (parent gate) | `in_progress (critical)` | `blocked` | Section 9.5 |
| JAC-3930 (telemetry contract) | `in_review` | `in_review` | Section 9.1 (v3.1 erroneously marked as `done` based on non-existent UUID `eb3190e9`; corrected to `in_review`) |
| JAC-4529 (coverage fields) | `in_progress` | `done` | Section 9.2 |
| JAC-4530 (unknown-vs-zero) | `in_progress (high)` | `in_review` | Section 9.3 |
| JAC-4531 (Ringer adapter) | `in_progress` | `in_progress` | Section 9.4 (v3.1 erroneously stated `in_review`; corrected to `in_progress`) |
| JAC-3933 (detectors) | (not in v1 table) | `done` | Added for completeness |
| JAC-3931 (adapter discovery) | (not in v1 table) | `done` | Added for completeness |

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
| JAC-4530 (null-vs-zero) | in_review | `payload_hash` depends on null/zero distinctions |
| JAC-4531 (Ringer composite) | in_progress | Ringer adapter key formats defined in §3.2.3 |

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
