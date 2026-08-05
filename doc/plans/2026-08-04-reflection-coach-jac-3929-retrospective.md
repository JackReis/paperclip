# Reflection Coach Report — JAC-3929 Observatory Initiative Health Assessment

**Agent:** Reflection Coach (46fb5af2-e16d-497a-83bf-ae808d2a556d)
**Date:** 2026-08-05T00:30Z
**Scope:** Post-gate analysis of JAC-3929 (Fleet-wide AI Token & Run Observatory), focusing on implementation-readiness of JAC-4532 (event identity & idempotency) and fleet-wide telemetry pipeline state
**Method:** Live Paperclip API interrogation, git working-tree inspection, schema/service-layer code audit against the JAC-4532 implementation plan

---

## 1. Executive Summary

JAC-3929 has cleared all 6 approval gates and the overall board gate. The initiative is transitioning from design/planning to implementation. However, a live codebase audit reveals a **significant implementation gap** on JAC-4532 (Gate 4 — Replay/Identity): the schema files in the working tree have been partially modified, but **no migration has been generated**, and **the service-layer idempotency logic is entirely absent**. The codebase is in an inconsistent intermediate state — schema declarations reference columns that don't exist in the database yet.

---

## 2. Gate Approval Status — Verified (Live API, 2026-08-05T00:25Z)

| # | Gate | Approval ID | Status |
|---|------|-------------|--------|
| Overall | Board gate | 5ce15ca2 | **approved** |
| 1 | Schema gate | 914a8220 | **approved** |
| 2 | Privacy gate | 12cc7100 | **approved** |
| 3 | Adapter gate | 99f8b3d8 | **approved** |
| 4 | Replay/identity gate | bb383af9 | **approved** |
| 5 | Guardrail gate | 76b86a8d | **approved** |
| 6 | Publication gate | 1977cf2d | **approved** |

All 7 approval objects are confirmed `approved` via live `GET /approvals`. The previous pending interactions (`7bf27549`, `bf20fc91`) are superseded. This is a clean gate-clearance.

---

## 3. Child Issue State — Verified (Live API, 2026-08-05T00:25Z)

| Issue | Title | Status | Assignee |
|-------|-------|--------|----------|
| JAC-3930 | Telemetry contract definition | **done** (ratified) | Plan Runner (2c6b1cc9) |
| JAC-3931 | Adapter discovery | done | Herald (a1e8cb0d) |
| JAC-3932 | Privacy-safe session replay spine | done | — |
| JAC-3933 | Cross-vendor detectors | done | — |
| JAC-3934 | Dashboard design | done | Analyst-X (2c6b1cc9) |
| JAC-3935 | Ringer-reviewed spec | **in_review** (Maar/Luna) | — |
| JAC-4529 | Paperclip fail-closed coverage fields | done | 100915f9 |
| JAC-4530 | Token/cost null-vs-zero semantics | done | 100915f9 |
| JAC-4531 | Ringer composite adapter design | done (ratified) | Plan Runner (2c6b1cc9) |
| JAC-4532 | Event identity & idempotency scheme | **in_progress** | Maar (8551a68a) |
| JAC-4533 | Privacy/retention schema fields | **in_review** (Gap S9a) | 8551a68a |
| JAC-4534 | Action-safety semantics | done | — |
| JAC-4535 | Freshness split | done | — |
| JAC-4536 | Telegram redacted delivery | done | — |
| JAC-4538 | Publication contract | done (ratified) | Plan Runner (2c6b1cc9) |

Coordinator (dc2ca597) is confirmed running per the latest Wings heartbeat (2026-08-05T00:11Z).

---

## 4. JAC-4532 Implementation Gap Analysis

### 4.1 What the plan specifies (doc/plans/2026-08-04-jac-4532-event-identity-idempotency-scheme.md)

The plan (v3.3.9+21) defines a 14-step implementation: deterministic key computation, payload hash, unique constraints, ON CONFLICT upserts, heartbeat caller wiring, tests, and Ringer adapter integration.

### 4.2 Working-tree state vs plan — VERIFIED DISCREPANCY

**Schema files (working tree — committed but not migrated):**
- `packages/db/src/schema/run_events.ts`: `ingestId` changed from `uuid().defaultRandom()` to `text().notNull()` (line 114). Comment says "Deterministic ingest ID — computed from run_id + usage_updated_at + payload_hash."
- `packages/db/src/schema/cost_events.ts`: 4 new columns added (`observedSequence`, `supersedesEventId`, `ingestId`, `payloadHash` at lines 76-82) + `uniqueIndex("cost_events_source_event_uq")` on the idempotency composite (line 120). Import adds `uniqueIndex` (line 1).

**Migrations (NO corresponding migration exists):**
- Latest migration is `0192_cost_events_privacy_index.sql` (JAC-4533 privacy index).
- **No migration 0193 exists** for the `run_events.ingest_id` type change (uuid→text) or the 4 new `cost_events` identity columns.
- `0188_run_events_coverage.sql` still declares `ingest_id` as `uuid DEFAULT gen_random_uuid()`.
- `0187_cost_events_coverage_fields.sql` still does NOT include `observed_sequence`, `supersedes_event_id`, `ingest_id`, or `payload_hash` columns.

**Service layer (NO idempotency logic implemented):**
- `server/src/services/costs.ts` `createRunEvent()` (lines 192-248):
  - Line 235: `attemptIndex: 0` — **hardcoded**, not from `data`
  - Line 237: `payloadHash: data.payloadHash ?? null` — passed through if provided, but **never computed**
  - `sourceEventId` — **never set** (no `sourceEventId` in the insert values)
  - `ingestId` — **never set** (no `ingestId` in the insert values)
  - Uses plain `db.insert(runEvents).values(...)` — **NO `onConflictDoNothing`**, NO upsert
  - `createEvent()` (cost_events, lines 59-127): same pattern — plain insert, no idempotency

**Heartbeat callers (NO identity fields passed):**
- Line 11777 (`costs.createRunEvent`): passes `agentId`, `runId`, `adapterType`, `model`, `provider`, `status`, `occurredAt`, `coverage`, privacy fields — but **NO** `sourceEventId`, `ingestId`, `payloadHash`, or `attemptIndex`
- Line 14341 (setup-failure path): same gap — passes `eventKind: "lifecycle"` but no identity fields

**Constants (added in working tree):**
- `packages/shared/src/constants.ts`: `PAPERCLIP_EVENT_KEY_FORMAT`, `PAPERCLIP_SOURCE_EVENT_ID_FORMAT`, `DEFAULT_ATTEMPT_INDEX` added (lines 882-896)

### 4.3 Severity Assessment

| Component | Plan Step | Working-tree status | Gap |
|-----------|-----------|-------------------|-----|
| `cost_events` schema (4 new cols + uniqueIndex) | Steps 2, 10 | ✅ Done (ts) | ❌ No migration generated |
| `run_events` schema (ingest_id uuid→text) | Step 3 | ✅ Done (ts) | ❌ No migration generated |
| Constants | Step 1 | ✅ Done (ts) | — |
| Service layer (`createRunEvent`/`createEvent`) | Steps 7, 8 | Partial (coverage fields done) | ❌ No deterministic key computation, no ON CONFLICT |
| Heartbeat callers | Step 9 | ❌ Not done | ❌ No identity fields passed |
| API endpoint | Step 12 | ❌ Not done | ❌ No identity field passthrough beyond payloadHash |
| Tests | Step 11 | ❌ Not done | ❌ None for event identity |

**Critical finding:** The schema changes in the working tree are **unmigrated** — `db:generate` has not been run since they were applied. This means `pnpm -r typecheck` would pass (Drizzle reads from compiled schema), but the database would lack these columns at runtime. The `uniqueIndex` on `cost_events` would not exist, and `run_events.ingest_id` would remain a `uuid` column, not `text`.

---

## 5. Fleet Agent State Snapshot (2026-08-05T00:25Z)

- **68 total agents**: 43 hermes_local:running, 11 hermes_local:idle, 5 hermes_local:error, 3 openclaw_gateway:idle, 2 process:idle, 2 opencode_local:idle, 1 hermes_gateway:idle, 1 hermes_local:paused
- **Improvement from JAC-4575 retrospective (31→5 errored, 2026-08-04T21:15Z)**: The hermes_local CLI crash that was root-caused in the 4575 retrospective has been largely resolved. Error count dropped from 31 to 5, and 43 agents are now running (up from 24).
- **No hermes_local agents are blocked** on JAC-3929 gates — the telemetry pipeline implementation is proceeding on a separate branch.

---

## 6. Reflection: Architecture Hygiene Assessment

### 6.1 What's working well

1. **Gate clearance is genuinely complete.** All 7 approval objects are `approved` in the live API. The Coordinator ERROR-state incident (JAC-4663) is resolved. The liveness loop that plagued JAC-3929 (JAC-4183→4204→4213) was fundamentally fixed by replacing fragile `request_confirmation` objects with the durable `request_board_approval` (`5ce15ca2`).
2. **Plan-driven discipline holds.** JAC-4532's plan v3.3.9+21 is 4242 lines with 27 codebase citations verified, dependency ordering specified, and acceptance criteria checked. It explicitly notes "planning-only directive observed — no code written."
3. **Independent review worked.** The Ringer judge report (SHA-256 `a24277b3`) identified 6 gates with P0-P3 priorities. JAC-3930's ratification included 10/10 machine validation + 7/7 invalid rejection.
4. **The hermes_local recovery is real.** Error count dropped 31→5, and the retrospective proposal (JAC-4656 elevation, errorReason truncation) was well-founded and has apparently been acted on.

### 6.2 What needs attention

1. **Working-tree schema divergence is a real risk.** The schema files have been edited but `db:generate` has not been run to produce the migration (`0193_*`). If someone runs `pnpm dev` and the PGlite instance is recreated, the `uniqueIndex` on `cost_events` and the `ingest_id` type change on `run_events` will be missing. The `uniqueIndex` is the DB-level backstop for idempotency — without it, re-ingestion silently duplicates rows.
2. **Service-layer idempotency is the core gap.** JAC-4532's entire purpose is idempotency enforcement (ON CONFLICT DO NOTHING + deterministic keys). The service layer still does a plain `INSERT` with `attemptIndex: 0` hardcoded. Steps 7-9 of the plan are unexecuted. The `payloadHash` field exists in the insert values but is only never computed by the caller.
3. **Heartbeat callers don't pass identity fields.** Both the normal path (line 11777) and setup-failure path (line 14341) pass coverage/privacy fields but omit `sourceEventId`, `ingestId`, `payloadHash`, and `attemptIndex`. The deterministic key computation (Step 9) is not happening upstream.

### 6.3 Pattern: "Schema-first without migration" risk

This is a recurring pattern in Paperclip development: schema files are edited in TypeScript, but the migration generation step (`pnpm db:generate`) is skipped. The code compiles (Drizzle reads compiled schema from `dist/schema/*.js`), tests may pass against in-memory DBs that haven't been migrated, but the actual database schema drifts. This is **exactly** the class of issue JAC-3929's observability initiative is designed to catch — a telemetry adapter that reports `coverage_state = "covered"` when the actual database schema is stale.

The irony: the fail-closed coverage detection on the Paperclip adapter (JAC-4529) would correctly mark these events as `unknown`/`uncovered` if the adapter could observe the migration gap — but the adapter is read-only and doesn't introspect the Drizzle schema vs migration drift.

### 6.4 Gate 4 ratification dependency

JAC-4532's plan §4.1 states: "Implementation sub-tasks (Section 4) are UNBLOCKED. All dependency gates have cleared." However, Gate 4 (Replay/Identity) — which JAC-4532 maps to — was **pending** when the plan was written (v3.3.9+21, dated 2026-08-04T23:xxZ). Now that Gate 4 is **approved** (confirmed 2026-08-05T00:25Z), the implementation sub-tasks can proceed. The plan's gate-clearance evidence (§41) should be updated to reflect the now-approved state.

---

## 7. Concrete Recommendations

### R1: Generate migration for JAC-4532 schema changes (CRITICAL)
The working-tree schema changes to `run_events.ts` (ingest_id uuid→text) and `cost_events.ts` (4 new columns + uniqueIndex) have no migration. Running `pnpm db:generate` should produce `0193_*` migration(s). Without this, the `uniqueIndex` on `cost_events` — the DB-level idempotency backstop — does not exist in any database created from migrations.

### R2: Implement service-layer idempotency in `createRunEvent()` and `createEvent()` (CRITICAL)
Steps 7-8 of JAC-4532:
- Replace plain `insert` with `insert(...).onConflict(company_id, source_system, source_event_id, event_kind, attempt_index).doNothing()`
- Compute `ingestId` deterministically: `paperclip:<run_id>:<usage_updated_at>:<payload_hash>`
- Compute `payloadHash` from the canonical event payload using SHA-256 of stableStringified fields
- Accept `sourceEventId`, `attemptIndex` from `data` instead of hardcoding `attemptIndex: 0`

### R3: Wire identity fields into heartbeat callers (HIGH)
Step 9 of JAC-4532:
- Normal path (heartbeat.ts:11777): compute `payloadHash` from coverage + run metadata, compute `ingestId` and `sourceEventId`, pass into `createRunEvent()`
- Setup-failure path (heartbeat.ts:14341): same — compute identity fields from error + run metadata

### R4: Update JAC-4532 plan gate-clearance section (LOW)
Section 41 of the JACC-4532 plan states Gate 4 approval interactions `7bf27549` and `bf20fc91` remain `pending`. These are now superseded by the approved `bb383af9` board approval. Update §41 to reflect approved status.

### R5: Add route-level test for fail-closed clamp (Gap S9a, MEDIUM)
JAC-4533's gate checklist (line 62) notes Gap S9a: no HTTP-level test for `visibility_class = "public"` → `internal` clamp. A route-level test in `routes/costs.ts` would close this.

---

## 8. Conclusion

JAC-3929 has successfully cleared all approval gates. The initiative is implementation-ready. However, JAC-4532 (the Gate 4 implementation) is in a **partially-started, inconsistent state**: TypeScript schema files have been modified but no migration has been generated, and the service-layer idempotency logic is completely absent. This is not a blocker for the initiative — the gates are clear and the plan is sound — but it is a **critical implementation integrity gap** that should be addressed before proceeding with the remaining JAC-4532 implementation steps.

The JAC-4532 plan (v3.3.9+21) was written with discipline: 14 ordered steps, 27 codebase citations, risks and mitigations documented. The working-tree changes represent the start of Step 1-6 (constants + schema). The remaining Steps 7-14 (service layer, callers, tests, Ringer integration) are unexecuted.

**Verdict:** Gates clear. Design sound. Implementation in early stages with schema/service divergence. Recommend executing JAC-4532 implementation steps 7-14 in the specified dependency order, generating the migration first.

---

*End of reflection. Evidence sources: live Paperclip API `GET /companies/87c32b8e.../approvals` and `GET /issues/4c051d46.../relatedWork` at 2026-08-05T00:25Z, git working-tree inspection at bf8a50b7, schema/service-layer code audit against `doc/plans/2026-08-04-jac-4532-event-identity-idempotency-scheme.md` §4, JAC-3929 gate checklist `doc/plans/2026-08-04-jac-3929-gate-checklist.md`.*
