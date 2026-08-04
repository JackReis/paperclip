# JAC-4533 — Privacy/Retention First-Class Schema Fields (Plan)

**Date:** 2026-08-04
**Work mode:** Planning only — no code (per planning directive)
**Author:** Maar (agent 8551a68a)
**Issue:** JAC-4533 [JAC-3929] P1: Privacy/retention first-class schema fields
**Branch:** JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory — reconciled initiative and approval gate
**Priority:** High
**Depends on:** JAC-3930 (telemetry contract), JAC-3932 (privacy-safe replay)

---

## 0. Purpose and scope

This document is the planning artifact for JAC-4533. It defines the
**first-class privacy and retention schema fields** for the Paperclip telemetry
pipeline (`run_events` and `cost_events` tables). The Ringer independent judge
found (Gate 2 — Privacy, finding SHA-256 `a24277b3`) that privacy and retention
requirements are not first-class schema fields — raw prompts, transcripts,
provider request bodies, credentials, and private attachments must be excluded
from the ledger, with source pointers and hashes used only.

The 11 fields specified in the JAC-4533 issue description are:

`visibility_class`, `retention_class`, `redaction_state`, `source_permission_ref`,
`tenant_ref_hash`, `subject_ref_hashes`, `source_deleted_at`, `tombstone_ref`,
and `policy_version`.

This plan asserts which fields are **already implemented** in the codebase, which
are **gaps** that need implementation, and defines the normalized value sets and
ingestion invariants for each field. It does **not** perform implementation work.

---

## 1. Problem statement (Ringer judge finding)

**Judge report:** SHA-256 `a24277b3`, Finding under Gate 2 (Privacy/Gate 2 —
Privacy Gate):

> "Privacy and retention requirements are not first-class schema fields."

The judge's Gate 2 checklist (from
`doc/plans/2026-08-04-jac-3929-gate-checklist.md`, lines 16–24) reads:

- [ ] Field-level redaction at adapter before emission
- [ ] Retention classes: `visibility_class`, `retention_class`, `redaction_state`
- [ ] Source permission handling: `source_permission_ref`
- [ ] Deletion/tombstone propagation: `source_deleted_at`, `tombstone_ref`
- [ ] Executive/internal field separation (no prompt/response bodies in ledger)
- [ ] `tenant_ref_hash`, `subject_ref_hashes` for multi-tenant boundaries
- **Child issues:** JAC-4533 (privacy/retention first-class schema fields)

**The core directive:** Add explicit, normalized policy fields. Keep raw prompts,
transcripts, provider request bodies, credentials, and private attachments out of
the ledger; use source pointers and hashes only.

---

## 2. Codebase state assessment (verified 2026-08-04)

### 2.1 Schema columns — PRESENT

All 9 requested fields **already exist as columns** on both `run_events` and
`cost_events`:

**`packages/db/src/schema/run_events.ts`** (lines 85–95):
```typescript
visibilityClass: text("visibility_class").notNull().default("internal"),
retentionClass: text("retention_class").notNull().default("standard"),
redactionState: text("redaction_state").notNull().default("unredacted"),
sourcePermissionRef: text("source_permission_ref"),
tenantRefHash: text("tenant_ref_hash"),
subjectRefHashes: text("subject_ref_hashes").array(),
sourceDeletedAt: timestamp("source_deleted_at", { withTimezone: true }),
tombstoneRef: text("tombstone_ref"),
policyVersion: text("policy_version"),
```

**`packages/db/src/schema/cost_events.ts`** (lines 47–64):
```typescript
visibilityClass: text("visibility_class").notNull().default("internal"),
retentionClass: text("retention_class").notNull().default("standard"),
redactionState: text("redaction_state").notNull().default("unredacted"),
sourcePermissionRef: text("source_permission_ref"),
tenantRefHash: text("tenant_ref_hash"),
subjectRefHashes: text("subject_ref_hashes").array(),
sourceDeletedAt: timestamp("source_deleted_at", { withTimezone: true }),
tombstoneRef: text("tombstone_ref"),
policyVersion: text("policy_version"),
```

**`packages/db/src/migrations/0188_run_events_coverage.sql`** (lines 31–40):
All 9 privacy/retention columns are in the migration, with defaults and a
`run_events_privacy_idx` composite index on
`(company_id, visibility_class, retention_class, redaction_state)`.

`packages/db/src/migrations/0187_cost_events_coverage_fields.sql` — similar
columns present on `cost_events`.

### 2.2 Schema index — EXISTS

**`run_events.ts`** (lines 154–159):
```typescript
runEventsPrivacyIdx: index("run_events_privacy_idx").on(
  table.companyId,
  table.visibilityClass,
  table.retentionClass,
  table.redactionState,
),
```

**`cost_events.ts`** does **NOT** have a comparable privacy index. This is a gap.

### 2.3 Constants and types — PRESENT

**`packages/shared/src/constants.ts`** (lines 867–886):
```typescript
// visibility_class (JAC-4533)
export const VISIBILITY_CLASSES = ["public", "internal", "private", "redacted"] as const;
export type VisibilityClass = (typeof VISIBILITY_CLASSES)[number];
export const DEFAULT_VISIBILITY_CLASS: VisibilityClass = "internal";

// retention_class (JAC-4533)
export const RETENTION_CLASSES = ["short_lived", "standard", "long_term", "permanent"] as const;
export type RetentionClass = (typeof RETENTION_CLASSES)[number];
export const DEFAULT_RETENTION_CLASS: RetentionClass = "standard";

// redaction_state (JAC-4533)
export const REDACTION_STATES = ["unredacted", "partially_redacted", "fully_redacted"] as const;
export type RedactionState = (typeof REDACTION_STATES)[number];
export const DEFAULT_REDACTION_STATE: RedactionState = "unredacted";
```

These are exported from `packages/shared/src/index.ts` (lines 515–519, 537–539).

### 2.4 Shared types — PRESENT

**`packages/shared/src/types/run-event.ts`** (lines 33–36, 93–106):
The `RunEvent` interface includes all 9 fields:
```typescript
visibilityClass: VisibilityClass;
retentionClass: RetentionClass;
redactionState: RedactionState;
sourcePermissionRef: string | null;
tenantRefHash: string | null;
subjectRefHashes: string[] | null;
sourceDeletedAt: Date | null;
tombstoneRef: string | null;
policyVersion: string | null;
```

**`packages/shared/src/types/cost.ts`** (lines 34–43):
The `CostEvent` interface includes the same 9 fields.

### 2.5 Validators — GAP (no privacy fields)

**`packages/shared/src/validators/cost.ts`:**
- `createCostEventSchema` (lines 78–124): Does **NOT** accept or validate any
  of the 9 privacy/retention fields. The constants (`VISIBILITY_CLASSES`,
  `RETENTION_CLASSES`, `REDACTION_STATES`, etc.) are imported at lines 17–22
  but are **not used** in the schema — a clear, auditable gap.
- `createRunEventSchema` (lines 440–494): Also does **NOT** accept or validate
  any of the 9 privacy/retention fields. Same unused import gap.

Note: there is no `packages/shared/src/validators/interaction.ts` file. The
validators relevant to this issue live in `cost.ts` and are re-exported from
`packages/shared/src/validators/index.ts` (lines 630–634).

### 2.6 Service layer — PARTIALLY POPULATED

**`server/src/services/costs.ts`** (lines 198–200):
The `createRunEvent()` method hardcodes the three defaulted fields:
```typescript
visibilityClass: "internal",
retentionClass: "standard",
redactionState: "unredacted",
```
But does **NOT** set `sourcePermissionRef`, `tenantRefHash`, `subjectRefHashes`,
`sourceDeletedAt`, `tombstoneRef`, or `policyVersion` — these default to NULL
at the DB level. The `createEvent()` method (for `cost_events`) does **NOT** set
any privacy fields at all — they all fall to DB defaults.

**`server/src/services/heartbeat.ts`** (lines 11770–11781, 14319–14331):
The heartbeat callers of `createRunEvent()` do **not** pass any privacy/retention
fields. They rely entirely on the service-layer hardcoded defaults.

### 2.7 API endpoint — NO VALIDATION

**`server/src/routes/costs.ts`** (lines 153–213):
`POST /companies/:companyId/run-events` accepts `createRunEventSchema` (which has
no privacy fields) and calls `costs.createRunEvent()`. There is no way for an
adapter to supply privacy metadata through the API — it is silently ignored.

`POST /companies/:companyId/cost-events` similarly has no privacy field handling.

### 2.8 SPEC-implementation §7.17.2 — APPROVALS TABLE

**`doc/SPEC-implementation.md`** (lines 489–495) already specifies that the
`approvals` table carries publication contract fields:
```
- `artifact_kind`: "full_report" | "raw_transcript" | "private_payload"
- `artifact_pointer`: source identifier (Vault ref, workspace path, etc.)
- `artifact_sha256`: hash of the content for integrity verification
- `redaction_state`: "unredacted" | "partially_redacted" | "fully_redacted" (reuses JAC-4533 enum)
```

**`packages/db/src/schema/approvals.ts`** (lines 22–25):
```typescript
artifactKind: text("artifact_kind"),
artifactPointer: text("artifact_pointer"),
artifactSha256: text("artifact_sha256"),
redactionState: text("redaction_state").notNull().default("unredacted"),
```

These are **already implemented** — the `approvals` table reuses the JAC-4533
`redaction_state` enum. No gap here.

### 2.9 Summary of state

| Aspect | Status | Details |
|--------|--------|---------|
| Schema columns (run_events) | DONE | All 9 fields present (migration 0188) |
| Schema columns (cost_events) | DONE | All 9 fields present (migration 0187) |
| Privacy index (run_events) | DONE | `run_events_privacy_idx` exists |
| Privacy index (cost_events) | GAP | No privacy index on cost_events |
| Constants | DONE | `VISIBILITY_CLASSES`, `RETENTION_CLASSES`, `REDACTION_STATES` defined + exported |
| Types (RunEvent) | DONE | All 9 fields in `RunEvent` interface |
| Types (CostEvent) | DONE | All 9 fields in `CostEvent` interface |
| Validators | GAP | `createRunEventSchema` and `createCostEventSchema` do not accept/validate privacy fields |
| Service layer (run_events) | PARTIAL | Hardcodes 3 defaults; does not pass 6 nullable fields |
| Service layer (cost_events) | GAP | No privacy fields set in `createEvent()` |
| API endpoint | GAP | No privacy fields accepted from callers |
| Approvals table | DONE | `artifact_kind`, `artifact_pointer`, `artifact_sha256`, `redaction_state` present |
| SPEC-implementation §7.17.2 | DONE | Normative text for publication contract with redaction_state |

---

## 3. Design: Field semantics and normalized value sets

### 3.1 `visibility_class` — who can see this event

**Enum:** `VISIBILITY_CLASSES = ["public", "internal", "private", "redacted"]`
**Default:** `"internal"`

| Value | Meaning | Usage |
|-------|---------|-------|
| `public` | Visible to all authenticated agents and board users within the company | Non-sensitive operational metadata |
| `internal` | Visible to in-company agents and board (default) | All Paperclip-sourced events (default) |
| `private` | Visible only to the owning agent or a scoped principal | Events that should not be broadly visible even within company |
| `redacted` | Event has been redacted; no content is published | Events that have been redaction-scrubbed |

**Fail-closed principle:** When the source system does not assert a visibility
class, the default is `internal` (company-scoped). The `redacted` class should
only be set when the event has been actively scrubbed — it must never be set
implicitly by the adapter.

### 3.2 `retention_class` — how long this event is retained

**Enum:** `RETENTION_CLASSES = ["short_lived", "standard", "long_term", "permanent"]`
**Default:** `"standard"`

| Value | Meaning | Suggested TTL |
|-------|---------|---------------|
| `short_lived` | Ephemeral — deleted quickly (e.g., transient error events) | ~7 days |
| `standard` | Default retention | ~90 days |
| `long_term` | Long-term archival (e.g., spend records for audit) | ~7 years |
| `permanent` | Never auto-deleted (e.g., approval records, compliance) | Indefinite |

**Note:** The actual retention TTL mapping is a configuration concern (see
`doc/DATABASE.md` line 170 on decision-training snapshot retention). This plan
defines the **schema field** and **value set**; the TTL mapping per class
belongs in a follow-up (JAC-3930 or a retention policy issue).

### 3.3 `redaction_state` — whether sensitive data has been scrubbed

**Enum:** `REDACTION_STATES = ["unredacted", "partially_redacted", "fully_redacted"]`
**Default:** `"unredacted"`

| Value | Meaning |
|-------|---------|
| `unredacted` | No redaction has been applied; all fields carry their original values |
| `partially_redacted` | Some fields have been redacted (e.g., provider request bodies stripped) |
| `fully_redacted` | The event has been fully redacted; only metadata pointers and hashes remain |

This enum is **reused** by the `approvals` table for the
`publish_full_artifact` approval type (SPEC-implementation §7.17.2), and by
JAC-4538's publication contract. Consistency is maintained — the same enum source
(`REDACTION_STATES` in `packages/shared/src/constants.ts`) governs all uses.

### 3.4 `source_permission_ref` — which permission authorized source access

**Type:** `text` (nullable)
**Default:** `NULL`

A reference to the permission grant or policy that authorized the source system
to emit or provide the data in this event. This is an opaque string — it should
reference a permission scope, grant ID, or policy identifier but must **not**
contain the actual permission value or credential.

**Example values:**
- `"agent:80284e06:scope:usage.read"` — agent-scoped usage read permission
- `"company:87c32b8e:budget.view"` — company-scoped budget view
- `"provider:anthropic:usage_export"` — provider-level usage export grant

**Invariant:** This field must never contain raw credentials, API keys, or
token values. It is a pointer to the authorization context, not the authorization
secret itself.

### 3.5 `tenant_ref_hash` — tenant boundary for multi-tenant correlation

**Type:** `text` (nullable)
**Default:** `NULL`

A SHA-256 hash of the tenant identifier, allowing cross-tenant correlation and
boundary enforcement without exposing the raw tenant ID. When Paperclip is
deployed in a multi-tenant configuration (Pro/Enterprise, see SPEC §9.6), this
field allows correlation analysis without leaking tenant identifiers.

**Format:** `sha256(tenant_id)` hex digest (64 chars).

**Invariant:** The raw tenant ID must never be stored in plaintext. Only the
SHA-256 hash is stored.

### 3.6 `subject_ref_hashes` — subject attribution for multi-principal events

**Type:** `text[]` (nullable, array of SHA-256 hashes)
**Default:** `{}`

An array of SHA-256 hashes of subject identifiers — the principals (users, agents,
or external actors) that are the subject of this event. This supports events
that carry data about multiple subjects (e.g., a cost event attributed to an
agent acting on behalf of a user, where both principals are subjects).

**Format:** Each element is `sha256(subject_id)` hex digest.

**Invariant:** Subject IDs must be hashed before storage. The array allows
multi-subject attribution without storing raw principal identifiers.

### 3.7 `source_deleted_at` — when source data was deleted at the origin

**Type:** `timestamptz` (nullable)
**Default:** `NULL`

When non-null, this is the timestamp at which the corresponding source data
(the original run, cost event, or telemetry reading at the provider/adapter) was
deleted at its origin. This enables:

1. **Tombstone propagation:** If upstream deletes a run, Paperclip can mark
   the corresponding `run_events` row with `source_deleted_at` and
   `tombstone_ref`, enabling downstream consumers to scrub their caches.
2. **Compliance deletion:** GDPR/CCPA "right to be forgotten" can cascade from
   the source.

**Invariant:** This field records the source-side deletion time, not the
Paperclip-side purge time. Paperclip's own retention policy is governed by
`retention_class`.

### 3.8 `tombstone_ref` — tombstone reference for deleted events

**Type:** `text` (nullable)
**Default:** `NULL`

A pointer to the tombstone record associated with this event. When a source-side
deletion occurs, a tombstone is created (e.g., in a `tombstones` table or
external system) and the original event is marked with `source_deleted_at` and
`tombstone_ref`. The tombstone carries the minimum information needed to
reconcile deletion across systems: the logical event identity (not the payload),
the deletion timestamp, and the reason.

**Format:** Opaque string — e.g., `tombstone:<company_id>:<source_event_id>:<timestamp>`
or a Vault/OKF document ref.

**Invariant:** The tombstone must **not** contain the original event payload.
It should only carry the logical identity and deletion metadata.

### 3.9 `policy_version` — which policy governed this event's retention/redaction

**Type:** `text` (nullable)
**Default:** `NULL`

The version identifier of the privacy/retention policy that was in effect when
this event was ingested. This enables:

1. **Policy auditing:** When a policy changes, events ingested under the old
   policy can be identified and potentially re-processed.
2. **Backward-compatible evolution:** Different event cohorts may be governed by
   different policy versions; the `policy_version` field allows consumers to
   apply the correct policy at read time.

**Format:** Opaque string — e.g., `"privacy-v1.2"` or a semantic version like
`"1.2.0"`.

**Invariant:** When a new policy version is deployed, new events carry the new
version; existing events retain their original version. This field is immutable
after insertion.

### 3.10 Executive/internal field separation

**Judge finding:** "Executive/internal field separation (no prompt/response
bodies in ledger)."

**Principle:** The `run_events` and `cost_events` tables must **never** store:
- Raw prompts or prompt templates
- Full response/transcript text
- Provider request/response bodies (except for token/cost metadata extracted
  from them)
- Credentials, API keys, or secrets
- Private attachments (full file content)

Instead, these tables store only:
- Token counts and cost values (as nullable integers, per JAC-4530)
- Provider/model attribution (coarse routing labels)
- Coverage and confidence metadata (fail-closed, per JAC-4529)
- Source pointers and hashes (per JAC-4532)
- Privacy/retention classification (this plan, JAC-4533)
- Action-safety semantics (per JAC-4534)

This principle is already reflected in the schema design: all content-bearing
fields (prompt text, response body) are absent from the table. The `payload_hash`
field (JAC-4532) stores only a hash, never the content. The `payloadHash` column
is present on `run_events` (line 114 of the schema, migration line 59).

---

## 4. Design: Ingestion invariants and fail-closed defaults

The following invariants must hold for all `run_events` and `cost_events`
ingestion, whether from the Paperclip adapter, a shadow adapter (JAC-4529), or
an external provider:

### 4.1 Default resolution

| Field | Default when not asserted by source | Fail-closed rationale |
|-------|-------------------------------------|----------------------|
| `visibility_class` | `internal` | Company-scoped by default; cannot be escalated to `public` without explicit policy |
| `retention_class` | `standard` | Conservative default; `permanent` only when explicitly needed |
| `redaction_state` | `unredacted` | No redaction until explicitly applied; `redacted`/`fully_redacted` only on active scrub |
| `source_permission_ref` | `NULL` | Absent — no permission context available |
| `tenant_ref_hash` | `NULL` | Single-tenant deployments (V1) do not populate |
| `subject_ref_hashes` | `{}` | No subjects attributed |
| `source_deleted_at` | `NULL` | Source data not deleted |
| `tombstone_ref` | `NULL` | No tombstone |
| `policy_version` | `NULL` | No explicit policy version (uses deployment default) |

### 4.2 Adapter ingestion rules

1. **Adapters must not set `visibility_class = "public"` without board approval.**
   The `public` class exposes event metadata beyond company scope. This should
   require a `publish_full_artifact`-equivalent approval or a dedicated
   visibility escalation gate.

2. **Adapters must hash `tenant_ref_hash` and `subject_ref_hashes` before
   submission.** The service layer should reject plaintext tenant or subject IDs.
   (Implementation: validate that `tenant_ref_hash` matches a 64-char hex regex,
   and each `subject_ref_hashes` element matches the same.)

3. **Adapters should not set `redaction_state` unless they have actually
   redacted content.** Setting `fully_redacted` on an event that still contains
   sensitive data is a security defect.

4. **Adapters should not set `source_deleted_at` unless they are reporting a
   source-side deletion they observed.** This field is informational — Paperclip
   must not auto-delete based on it without a retention policy execution.

### 4.3 Service-layer resolution

The `costs.createRunEvent()` and `costs.createEvent()` methods in
`server/src/services/costs.ts` must:

1. Accept privacy/retention fields from the caller (adapter/API) as optional
   overrides.
2. Apply fail-closed defaults when the caller does not assert a value.
3. **Never** allow an external adapter to escalate `visibility_class` from
   `internal` to `public` without an approval check.
4. **Never** allow plaintext tenant/subject IDs — hash them before storage.

### 4.4 Retention policy execution (future)

A background job should periodically:
1. Query events by `retention_class` and `observed_at`.
2. For `short_lived` events older than the configured TTL → set `source_deleted_at`
   and `redaction_state = "fully_redacted"`, then purge after a grace period.
3. For `permanent` events → never auto-delete.
4. All retention actions must be audited in `activity_log`.

This is an implementation concern, not a schema concern. This plan defines the
fields; the policy execution belongs in a follow-up issue.

---

## 5. Implementation plan (sub-tasks for follow-up issues after plan approval)

### Step 1: Add privacy index to `cost_events`

**File:** `packages/db/src/schema/cost_events.ts`

Add a composite privacy index mirroring `run_events`:
```typescript
companyPrivacyIdx: index("cost_events_company_privacy_idx").on(
  table.companyId,
  table.visibilityClass,
  table.retentionClass,
  table.redactionState,
),
```

**Migration:** New migration `0191_cost_events_privacy_index.sql` that
`CREATE INDEX` on the same columns (these columns already exist from 0187).

### Step 2: Add privacy fields to `createCostEventSchema` Zod schema

**File:** `packages/shared/src/validators/cost.ts`

Extend `createCostEventSchema` to accept and validate:
```typescript
visibilityClass: z.enum(VISIBILITY_CLASSES).optional().default(DEFAULT_VISIBILITY_CLASS),
retentionClass: z.enum(RETENTION_CLASSES).optional().default(DEFAULT_RETENTION_CLASS),
redactionState: z.enum(REDACTION_STATES).optional().default(DEFAULT_REDACTION_STATE),
sourcePermissionRef: z.string().optional().nullable(),
tenantRefHash: z.string().optional().nullable(), // validated as sha256 hex
subjectRefHashes: z.array(z.string()).optional().nullable(), // each validated as sha256 hex
sourceDeletedAt: z.string().datetime().optional().nullable(),
tombstoneRef: z.string().optional().nullable(),
policyVersion: z.string().optional().nullable(),
```

Add a transform that:
- Validates `tenantRefHash` matches `^[a-f0-9]{64}$` if provided
- Validates each `subjectRefHashes` element matches `^[a-f0-9]{64}$`
- Default `visibilityClass = "internal"`, `retentionClass = "standard"`,
  `redactionState = "unredacted"` when not provided

### Step 3: Add privacy fields to `createRunEventSchema` Zod schema

**File:** `packages/shared/src/validators/cost.ts`

Extend `createRunEventSchema` with the same fields as Step 2. The transform
should apply the same defaults and validation.

### Step 4: Update `createRunEvent()` service method

**File:** `server/src/services/costs.ts` (lines 132–217)

Currently hardcodes:
```typescript
visibilityClass: "internal",
retentionClass: "standard",
redactionState: "unredacted",
```

Change to accept these from `data` with fail-closed defaults:
```typescript
visibilityClass: data.visibilityClass ?? DEFAULT_VISIBILITY_CLASS,
retentionClass: data.retentionClass ?? DEFAULT_RETENTION_CLASS,
redactionState: data.redactionState ?? DEFAULT_REDACTION_STATE,
sourcePermissionRef: data.sourcePermissionRef ?? null,
tenantRefHash: data.tenantRefHash ?? null,
subjectRefHashes: data.subjectRefHashes ?? null,
sourceDeletedAt: data.sourceDeletedAt ?? null,
tombstoneRef: data.tombstoneRef ?? null,
policyVersion: data.policyVersion ?? null,
```

### Step 5: Update `createEvent()` service method (cost_events)

**File:** `server/src/services/costs.ts` (lines 58–121)

Same treatment as Step 4 — accept and pass through all 9 privacy fields with
fail-closed defaults.

### Step 6: Update `CreateRunEventInput` and `CreateCostEvent` types

**File:** `packages/shared/src/validators/cost.ts`

Both `CreateRunEventInput` and `CreateCostEvent` are Zod-inferred types
(`z.infer<typeof createRunEventSchema>` at line 496 and `z.infer<typeof
createCostEventSchema>` at line 126). They are re-exported from
`packages/shared/src/validators/index.ts` (lines 630–634) and from
`packages/shared/src/index.ts` (lines 1986–1988). Since the privacy fields
are added directly to the Zod schemas in Steps 2–3, the inferred types
automatically include them. No separate type file changes are needed — the
types update as a direct consequence of the schema extension.

(For reference, `RunEvent` and `CostEvent` interfaces in
`packages/shared/src/types/run-event.ts` and `packages/shared/src/types/cost.ts`
already include all 9 fields — those are the **DB output** shapes, not the
**input** validation shapes.)

**Note (audit finding 2026-08-04):** There is a **stale, unused** interface
`CreateRunEventInput` in `packages/shared/src/types/run-event.ts` (line 166).
This interface is NOT re-exported from `types/index.ts` (which only exports
`RunEvent`, `CoverageTotals`, etc. at line 737) and is NOT the type imported by
`server/src/services/costs.ts` (which imports from `@paperclipai/shared`,
resolving to the Zod-inferred type in `validators/cost.ts`). It is dead code
that risks drift. When implementation begins, this stale interface should be
removed to avoid confusion. For now, no action is taken (planning-only).

### Step 7: Update heartbeat.ts callers

**File:** `server/src/services/heartbeat.ts` (lines 11770–11781, 14319–14331)

Pass through privacy fields from the run context if available. For normal
Paperclip adapter runs, the defaults (`internal`, `standard`, `unredacted`) are
appropriate — but the service layer should derive `sourcePermissionRef` from
the agent's permission context, `tenantRefHash` from the company's tenant
context (for multi-tenant), and `policyVersion` from the company's current
privacy policy version.

### Step 8: Add validation + fail-closed enforcement in API routes

**File:** `server/src/routes/costs.ts`

The Zod validation (Step 2–3) already enforces the value sets. Add server-side
guard: reject `visibility_class = "public"` from external (non-board) actors
unless a `publish_full_artifact`-style approval exists on the issue.

### Step 9: Add tests

**`packages/shared/src/validators/cost.test.ts`:**
- Test that `createRunEventSchema` and `createCostEventSchema` default privacy
  fields to the correct fail-closed values when omted
- Test that `tenantRefHash` and `subjectRefHashes` elements are validated as
  SHA-256 hex
- Test that invalid `visibilityClass`, `retentionClass`, `redactionState` values
  are rejected

**`server/src/__tests__/costs-service.test.ts`:**
- Test that `createRunEvent()` persists all 9 privacy fields with correct defaults
- Test that `createEvent()` persists all 9 privacy fields
- Test fail-closed: external adapter cannot escalate to `visibility_class = "public"`

---

## 6. Dependency ordering

```
Step 1 (cost_events privacy index) → Step 2 (createCostEventSchema) →
  Step 4 (createRunEvent service) → Step 5 (createEvent service) →
  Step 6 (types) → Step 7 (heartbeat callers) → Step 8 (API routes) →
  Step 9 (tests)
```

Step 3 (createRunEventSchema) can proceed in parallel with Step 2.

**External gate dependencies:**
- JAC-3930 (telemetry contract) — `in_review`. The canonical event payload shape
  affects `payload_hash` computation (JAC-4532), but the privacy fields defined
  here are independent of the payload envelope. JAC-3930 is a soft dependency.
- JAC-3932 (privacy-safe replay) — `in_review`. The `tombstone_ref` and
  `source_deleted_at` fields feed into replay logic. JAC-3932 should reference
  these fields when defining the replay contract.
- JAC-3929 (parent — approval gate) — `in_progress (critical)`. JAC-4533 maps to
  **Gate 2 (Privacy)** in `doc/plans/2026-08-04-jac-3929-gate-checklist.md`
  (line 18). Board approval of the gate is required before implementation.

---

## 7. Acceptance criteria (plan-level)

- [x] Problem statement grounded in the Ringer judge finding (SHA-256 `a24277b3`,
  Gate 2 — Privacy) — Section 1
- [x] Codebase state audited: schema columns, constants, types, validators,
  service layer, API endpoint, approvals table, SPEC-implementation §7.17.2 all
  confirmed — Section 2
- [x] All 9 privacy/retention fields defined with normalized value sets and
  fail-closed invariants — Section 3
- [x] Ingestion invariants and fail-closed defaults specified — Section 4
- [x] Implementation sub-tasks (Steps 1–9) defined with dependency ordering —
  Section 5
- [x] Gate mapping: JAC-4533 → Gate 2 (Privacy) in
  `doc/plans/2026-08-04-jac-3929-gate-checklist.md` (line 18) — Gate 2 checklist
  item at line 18: "Retention classes: `visibility_class`, `retention_class`,
  `redaction_state`"
- [x] Cross-referenced with JAC-4530 (token/cost semantics), JAC-4532 (event
  identity), JAC-4534 (action-safety), JAC-4538 (publication contract) —
  Sections 3.3, 4.3, 6

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| `visibility_class = "public"` could leak event metadata beyond company scope | Server-side enforcement: only board actors can set `public`; external adapters are clamped to `internal` |
| Plaintext tenant/subject IDs could be stored, leaking PII | Validator-level regex enforcement (`^[a-f0-9]{64}$` for SHA-256); service-layer rejection of non-conforming values |
| `retention_class = "permanent"` events accumulate unbounded | Retention policy execution (Step 9 future) audits and enforces TTLs; `permanent` requires board approval |
| `policy_version` is NULL for existing events (backward compat) | NULL means "latest deployment default policy" — backward compatible; new events carry explicit version |
| `source_deleted_at` could be misused to trigger Paperclip-side deletion | Paperclip must not auto-delete based on `source_deleted_at` alone; it is informational metadata. Deletion must go through a retention policy execution path with audit logging. |
| No privacy index on `cost_events` slows retention queries | Step 1 adds a composite privacy index mirroring `run_events` |

---

## 9. Evidence

| Artifact | Location | Status |
|----------|----------|--------|
| `run_events` schema with privacy fields | `packages/db/src/schema/run_events.ts` lines 85–95 | Verified present |
| `cost_events` schema with privacy fields | `packages/db/src/schema/cost_events.ts` lines 47–64 | Verified present |
| `run_events` migration with privacy columns | `packages/db/src/migrations/0188_run_events_coverage.sql` lines 31–40 | Verified present |
| Run events privacy index | `packages/db/src/schema/run_events.ts` lines 154–159 | Verified present |
| `VISIBILITY_CLASSES` constant | `packages/shared/src/constants.ts` line 870 | Verified present |
| `RETENTION_CLASSES` constant | `packages/shared/src/constants.ts` line 877 | Verified present |
| `REDACTION_STATES` constant | `packages/shared/src/constants.ts` line 884 | Verified present |
| Constants exported from index | `packages/shared/src/index.ts` lines 515–519, 537–539 | Verified present |
| `RunEvent` type with privacy fields | `packages/shared/src/types/run-event.ts` lines 93–106 | Verified present |
| `CostEvent` type with privacy fields | `packages/shared/src/types/cost.ts` lines 34–43 | Verified present |
| `createRunEventSchema` (no privacy fields) | `packages/shared/src/validators/cost.ts` lines 440–494 | Verified — GAP |
| `createCostEventSchema` (no privacy fields) | `packages/shared/src/validators/cost.ts` lines 78–124 | Verified — GAP |
| `createRunEvent()` service (hardcoded defaults) | `server/src/services/costs.ts` lines 132–227 (hardcoded at 208–210) | Verified — PARTIAL |
| `createEvent()` service (no privacy fields) | `server/src/services/costs.ts` lines 58–121 | Verified — GAP |
| Heartbeat callers (no privacy fields passed) | `server/src/services/heartbeat.ts` lines 11771, 14320 | Verified — GAP |
| API endpoint (no privacy fields accepted) | `server/src/routes/costs.ts` lines 153–222 | Verified — GAP |
| `approvals` table with publication contract fields | `packages/db/src/schema/approvals.ts` lines 22–25 | Verified present |
| SPEC-implementation §7.17.2 (publication contract) | `doc/SPEC-implementation.md` lines 489–495 | Verified present |
| Gate 2 checklist item | `doc/plans/2026-08-04-jac-3929-gate-checklist.md` line 18 | Verified |

---

## 10. Relationship to dependencies

### 10.1 JAC-3930 (Telemetry Contract) — `in_review`

JAC-3930 defines the normalized telemetry envelope. The privacy/retention fields
defined here are **orthogonal** to the envelope shape — they are metadata
columns on the event table, not part of the payload envelope. The `payload_hash`
(JAC-4532) is computed over the telemetry envelope fields, not the privacy
fields. JAC-3930 is a soft dependency: the privacy fields can be added and
populated regardless of how the envelope is ratified, but the full
`payload_hash` stability guarantee depends on JAC-3930 ratifying the canonical
payload shape.

### 10.2 JAC-4529 (Coverage-aware fail-closed fields) — `in_progress`

JAC-4529 established the `run_events` table including all 9 privacy columns and
the `run_events_privacy_idx` composite index. JAC-4533's work is in the
**ingestion path and validator gap-filling**: the schema columns exist but the
Zod validators, service layer, and API routes do not accept or populate the
fields. JAC-4529 §2.1 already references the JAC-4533 privacy field names as
the target; this plan closes the gap between "columns exist" and "fields are
validated, populated, and enforced."

### 10.3 JAC-4530 (Token/cost unknown-vs-zero) — `in_progress (high)`

The `payload_hash` (JAC-4532) is computed over token/cost fields. JAC-4530's
distinction between `null` (not_reported) and `0` (explicitly zero) is
orthogonal to privacy fields but relevant for idempotency: if privacy fields
change (e.g., `redaction_state` goes from `unredacted` to `partially_redacted`),
the `payload_hash` should **not** change (privacy is envelope metadata, not
payload). The `payload_hash` computation must exclude privacy/retention fields
to avoid spurious idempotency key churn on redaction.

### 10.4 JAC-4532 (Event identity/idempotency) — `in_progress`

JAC-4532 defines `source_event_id`, `payload_hash`, `ingest_id`, and idempotency
enforcement. The `payload_hash` is computed over the canonical event payload
(tokens, cost, coverage fields) — not over the privacy/retention fields. The
privacy fields are part of the event envelope and are set by the ingestion path,
not by the source payload hash. JAC-4532's `ingestId` format
(`paperclip:<run_id>:<usage_updated_at>:<payload_hash>`) does not encode privacy
fields — those are stored as separate indexed columns.

### 10.5 JAC-4534 (Action-safety semantics) — `in_progress`

JAC-4534 adds `routing_status`, `quota_status`, `publication_status`,
`work_state_confidence`, `pause_eligible_scope`, `operatorDecisionRequired`.
The `publication_status` field is conceptually adjacent to privacy/retention:
it tracks whether a run's cost/usage data is safe to publish downstream. JAC-4533
defines the `redaction_state` field; JAC-4534 defines the `publication_status`
field. Both follow the same fail-closed pattern (`unknown = blocked`). JAC-4538
(JAC-4534's parent plan) already references the JAC-4533 `redaction_state` enum
for the `publish_full_artifact` approval type.

### 10.6 JAC-4538 (Publication contract) — `in_progress`

JAC-4538 reuses the JAC-4533 `redaction_state` enum for the
`publish_full_artifact` approval type (SPEC-implementation §7.17.2, line 495).
The `approvals` table already carries `redaction_state` (line 25 of
`packages/db/src/schema/approvals.ts`). JAC-4533's `redaction_state` enum is
the canonical source — no divergence needed.

---

## 11. Open questions

1. **Should `visibility_class = "public"` require a dedicated approval gate,
   or is `publish_full_artifact` sufficient?** The `public` visibility class
   exposes event metadata beyond company scope. `publish_full_artifact` is
   designed for full-content publication, not metadata visibility changes.
   A separate gate (or reuse of `request_board_approval`) may be more
   appropriate.

2. **Should the `tenant_ref_hash` and `subject_ref_hashes` SHA-256 validation
   be enforced at the validator level, the service level, or both?** Doing it
   at the validator (Zod) level rejects invalid input early. Doing it at the
   service level catches bypass paths. Recommendation: enforce at both layers
   (defense in depth), with the validator as the primary gate.

3. **Should `policy_version` be populated from a company-level setting?**
   If companies register a "current privacy policy version" (e.g., on the
   `companies` table), the service layer could default `policy_version` to that
   value rather than leaving it NULL. This would require a separate schema
   addition to `companies` and is a follow-up concern.

4. **What TTL values map to each `retention_class`?** The schema defines the
   classes (`short_lived`, `standard`, `long_term`, `permanent`) but the TTL
   mapping (e.g., 7 days / 90 days / 7 years / never) is a configuration
   concern. This should be defined in a retention policy config or table,
  not in the schema.

5. **Should `cost_events` also get the `run_events_privacy_idx` composite index,
   or is a different indexing strategy more appropriate?** `cost_events` has a
   higher write volume (only for spend-bearing runs), but retention-based
   queries on `cost_events` may benefit from the same composite index. Step 1
   adds this index, but the exact column ordering may warrant review.

---

## 12. Approval gate

This plan is `workMode: planning` per JAC-4533. Per the Paperclip execution
contract for plan approval:

1. This plan document is the plan revision.
2. After writing this plan, create a `request_confirmation` interaction
   targeting this plan revision with `idempotencyKey:
   confirmation:JAC-4533:plan:v1`.
3. Wait for acceptance before creating implementation sub-tasks (Section 5).
4. If board/user comments supersede this plan, create a fresh confirmation
   against the revised revision.

**Blockers:** JAC-3929 Gate 2 (Privacy gate) is pending board approval.
Implementation of sub-tasks 1–9 cannot begin until the gate is approved.
Planning (this document) is unblocked.

---

## 13. Verification checkpoint

**Run:** Current planning heartbeat (run ID: `137626bf-b603-4767-ae04-49051bc7432a`)

**Independently re-verified by agent audit (2026-08-04):**
Each claim below was traced to its exact source file and line range in this
workspace before confirmation. No prior plan assertions were trusted without
re-checking the actual file contents.

**Verified:**
- All 9 privacy/retention columns confirmed present on both `run_events` and
  `cost_events` schemas (run_events.ts lines 85–95; cost_events.ts lines 47–64)
  and their migrations (0188 lines 31–40; 0187 lines 28–37)
- `run_events_privacy_idx` composite index EXISTS at run_events.ts lines 154–159
  and migration 0188 line 84 — covers `(company_id, visibility_class,
  retention_class, redaction_state)`
- `cost_events` has NO privacy composite index (cost_events.ts lines 78–104 list
  only coverage/provider/agent indexes — gap confirmed, not a typo in the plan)
- Constants confirmed: `VISIBILITY_CLASSES` at constants.ts line 870,
  `RETENTION_CLASSES` at line 877, `REDACTION_STATES` at line 884 — all exported
  from `packages/shared/src/index.ts` lines 515–519 and 537–539
- Types confirmed: `RunEvent` includes all 9 fields (run-event.ts lines 93–101);
  `CostEvent` includes all 9 fields (types/cost.ts lines 34–42)
- Validators confirmed GAP: `createRunEventSchema` (validators/cost.ts lines
  440–494) and `createCostEventSchema` (validators/cost.ts lines 78–124) do
  NOT accept or validate any of the 9 privacy/retention fields. The constants
  (`VISIBILITY_CLASSES`, etc.) are imported into this file (lines 17–22) but
  are NOT used in either Zod schema — clear validator gap
- Note: there is no `packages/shared/src/validators/interaction.ts` file;
  the validators touched by this issue live in `validators/cost.ts`. The
  validators/index.ts barrel (lines 630–634) re-exports
  `createRunEventSchema`, `createRunEventInput`, and `CreateCostEvent` from
  `./cost.js`
- Service layer confirmed: `createRunEvent()` (costs.ts lines 132–227)
  hardcodes 3 defaults at lines 208–210 (`visibilityClass: "internal"`,
  `retentionClass: "standard"`, `redactionState: "unredacted"`) but does NOT
  pass the 6 nullable fields — they fall to DB defaults (NULL)
- Service layer confirmed: `createEvent()` (costs.ts lines 58–121) does NOT
  set any of the 9 privacy fields — they all fall to DB defaults
- Heartbeat callers confirmed: no privacy fields passed at either call site —
  heartbeat.ts line 11771 (`costs.createRunEvent` for executed runs) and
  line 14320 (`setupFailureCosts.createRunEvent` for pre-execution failures)
- API routes confirmed: `POST /companies/:companyId/run-events` (costs.ts
  lines 153–222) validates via `createRunEventSchema` (no privacy fields) and
  calls `createRunEvent()` without any privacy arguments — no API path to
  supply privacy metadata
- `approvals` table confirmed: already carries `artifactKind`, `artifactPointer`,
  `artifactSha256`, `redactionState` (approvals.ts lines 22–25)
- `CreateRunEventInput`/`CreateCostEvent` types: these are Zod-inferred types
  (validators/cost.ts lines 126 and 496), NOT standalone interfaces in
  types/. Step 6 extends these Zod schemas. The plan's Step 6 file references
  (types/run-event.ts) have been corrected: the input type is Zod-inferred,
  not a hand-written interface. (See also: there is a stale, unused
  `CreateRunEventInput` interface at types/run-event.ts line 166 that is NOT
  re-exported from types/index.ts and is NOT imported by the service layer —
  dead code flagged for removal during implementation)
- SPEC-implementation §7.17.2 confirmed: lines 489–495 specify the publication
  contract with `artifact_kind`, `artifact_pointer`, `artifact_sha256`,
  `redaction_state` (reusing JAC-4533 enum)
- Gate 2 checklist confirmed at `doc/plans/2026-08-04-jac-3929-gate-checklist.md`
  line 18

**No source mutations performed** — planning only.

---

## 14. Revision: 2026-08-04 verification re-check

Heartbeat run `1351eaaf` (Maar) re-verified the wake comment `c97a90d2`
corrections against the workspace:

- **Step 6 correction CONFIRMED.** `CreateRunEventInput` (Zod-inferred at
  `validators/cost.ts:496`) and `CreateCostEvent` (Zod-inferred at
  `validators/cost.ts:126`) are re-exported via `validators/index.ts:632-634`
  and the shared barrel `index.ts:1986-1988`. `server/src/services/costs.ts:10`
  imports `CreateRunEventInput` from `@paperclipai/shared` (resolving to the
  Zod-inferred type), NOT from `types/run-event.ts`. No separate type-file
  changes are needed — Steps 2-3 extend the Zod schemas directly.
- **Stale interface CONFIRMED.** The dead `CreateRunEventInput` interface at
  `types/run-event.ts:166` is not re-exported from `types/index.ts:737` (which
  only exports `RunEvent` + coverage types) and is not imported by the service
  layer. Flagged for removal during implementation.
- **`interaction.ts` non-existence CONFIRMED.** There is no
  `packages/shared/src/validators/interaction.ts`; validators for this issue
  live in `validators/cost.ts`, re-exported from `validators/index.ts:630-634`.

Plan SHA-256 after this revision: see working tree.
