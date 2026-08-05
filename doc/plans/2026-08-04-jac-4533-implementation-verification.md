# JAC-4533 Implementation Verification

**Date:** 2026-08-04  
**Author:** Luna High Planner (agent 2f92499a)  
**Run ID:** 4a5403a8-5341-4848-b3f3-1331c2355337  
**Host:** Aegis

## Status: VERIFIED

## Scope

Independent verification of the JAC-4533 implementation (privacy/retention first-class schema fields)
in the working tree at branch `JAC-3679-build-reusable-report-kit-template`.

## Verification Results

### Step 1: cost_events privacy index
- **File:** `packages/db/src/schema/cost_events.ts` (lines 106-110)
- **Change:** Added `companyPrivacyIdx` composite index on `(company_id, visibility_class, retention_class, redaction_state)`
- **Migration:** `packages/db/src/migrations/0192_cost_events_privacy_index.sql` — generated, registered in `_journal.json` (idx=192)
- **Status:** ✅ Complete

### Step 2: createCostEventSchema Zod validator
- **File:** `packages/shared/src/validators/cost.ts` (lines 101-119)
- **Change:** Added 9 privacy fields with fail-closed defaults and SHA-256 hex validation
- **Status:** ✅ Complete

### Step 3: createRunEventSchema Zod validator
- **File:** `packages/shared/src/validators/cost.ts` (lines 474-492)
- **Change:** Same 9 fields added to createRunEventSchema
- **Status:** ✅ Complete

### Step 4: createRunEvent() service
- **File:** `server/src/services/costs.ts` (lines 208-222)
- **Change:** Hardcoded defaults replaced with `data.*` pass-through + fail-closed constants
- **Status:** ✅ Complete

### Step 5: createEvent() service
- **File:** `server/src/services/costs.ts` (lines 91-100)
- **Change:** All 9 privacy fields passed through with fail-closed defaults
- **Status:** ✅ Complete

### Step 6: Remove stale CreateRunEventInput
- **File:** `packages/shared/src/types/run-event.ts` — dead interface removed (was at line 166)
- **Status:** ✅ Complete

### Step 7: heartbeat.ts callers
- **File:** `server/src/services/heartbeat.ts` (lines 11781-11790, 14339-14349)
- **Change:** Privacy fields derived from agent context (`sourcePermissionRef: agent:{id}:scope:usage.report`) + fail-closed defaults
- **Status:** ✅ Complete

### Step 8: API route enforcement
- **File:** `server/src/routes/costs.ts` (lines 125-130, 186-192, 237-247)
- **Change:** `visibility_class=public` clamped to `internal` for non-board actors on both endpoints
- **Status:** ✅ Complete

### Step 9: Tests
- **File:** `packages/shared/src/validators/cost.test.ts` — 23 new tests added, all pass
- **File:** `server/src/__tests__/costs-service.test.ts` — 4 new tests added
- **Test results:** `npx vitest run packages/shared/src/validators/cost.test.ts` → 23/23 pass
- **Status:** ✅ Complete

## Test Results

```
 RUN  v4.1.10 /Users/hermes/Projects/paperclip
 ✓  @paperclipai/shared  src/validators/cost.test.ts (23 tests) 26ms
 Test Files  1 passed (1)
        Tests  23 passed (23)
```

DB tests in `packages/db/src/` → 46 pass / 28 skip (skip = embedded Postgres not available on this host).

## Typecheck Results

- `packages/shared` typheck: ✅ clean
- `packages/db` tests: ✅ 46 pass, 28 skip (embedded Postgres unavailable)
- `packages/server` costs-service tests: ✅ 12 pass, 14 skip (DB-embedded tests skip without Postgres)

## Paperclip Issue Status

| Issue | Status in Paperclip | Code Status |
|---|---|---|
| JAC-4533 (parent) | in_review | Implementation complete |
| JAC-4632 (Step 1) | todo | Code in working tree, migration generated |
| JAC-4633 (Step 2) | done | ✅ |
| JAC-4634 (Step 3) | done | ✅ |
| JAC-4635 (Step 4) | done | ✅ |
| JAC-4636 (Step 5) | done | ✅ |
| JAC-4637 (Step 6) | done | ✅ |
| JAC-4638 (Step 7) | done | ✅ |
| JAC-4639 (Step 8) | done | ✅ |
| JAC-4640 (Step 9) | done | ✅ |

## Note

JAC-4632 remains `todo` in Paperclip despite the code being fully implemented in the working tree.
The migration file (0192) exists and is registered in the journal. This appears to be a status
synchronization gap — the implementation agent (Maar/8551a68a) has committed the changes but
has not yet checked out and closed the issue in Paperclip.

## Artifacts

- Plan: `doc/plans/2026-08-04-jac-4533-privacy-retention-schema-fields.md`
- Migration: `packages/db/src/migrations/0192_cost_events_privacy_index.sql`
- Schema: `packages/db/src/schema/cost_events.ts`
- Validators: `packages/shared/src/validators/cost.ts`
- Service: `server/src/services/costs.ts`
- Routes: `server/src/routes/costs.ts`
- Heartbeat: `server/src/services/heartbeat.ts`
- Types: `packages/shared/src/types/run-event.ts` (stale interface removed)
- Tests: `packages/shared/src/validators/cost.test.ts`, `server/src/__tests__/costs-service.test.ts`
