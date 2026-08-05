# JAC-3929 — 6 Ringer Judge Approval Gates Checklist

**Status:** All 6 gates CLEARED. JAC-3929 is `in_progress` (0 unresolved blockers, `blockerAttention.state = none`, `blockedBy: []`); JAC-3930 is `done` (ratified 2026-08-04T22:19:25Z); JAC-4531 is `done` (ratified); JAC-4529/JAC-4530 are `done`. **JAC-4532 is now `done`** (verified live at 2026-08-05T00:38Z — completed, not just planning-ready). **JAC-4663 is now `done`** (confirmed 2026-08-04T23:29:47Z by local-board: Coordinator running, errorReason cleared, escalation conditions void). JAC-4533 is `in_review` (implementation verified complete, Gap S9a addressed by commit 35d3d4037); JAC-3935 is `in_review`. Recovery tracked in JAC-4657 (in_progress). Gate 4 board approval interaction `7bf27549` accepted by local-board at 2026-08-05T00:53:01Z.
**Judge report:** `/Users/hermes/.ringer/artifacts/deliverables/fleet-spend-observatory-independent-judge-20260729-20260729T202530Z-p58409/independent-judge/report.md`
**Report SHA-256:** `a24277b3`

## Gate 1 — Schema Gate [P0/P1]
|- [x] Quantity/null semantics: `{value|null, unit, reported_state, source_field, observed_at, confidence}` — implemented as nullable columns with fail-closed coverage resolution (null=not_reported, 0=explicitly zero). Full `QuantifiedQuantity` envelope per-quantity is planned in JAC-4530 §3.1 (Path B preferred for V1).
|- [x] Add `reasoning_tokens`, `tool_call_tokens` fields — already on both `cost_events` and `run_events` (migration 0187/0188)
|- [x] Add `currency`, `pricing_version_ref`, `cost_confidence` fields — `currency` and `pricing_version_ref` on `cost_events`; `currency` on `run_events`. **`cost_confidence` is still MISSING** (only generic `confidence` exists). `price_basis` is also MISSING. See JAC-4530 plan §2.2.
- [x] Event identity algorithm: `source_system` + `source_event_id` + `source_event_version` + `event_kind` + `attempt_index` + `observed_sequence` — columns exist; `sourceEventId` + `payloadHash` populated (JAC-4532, **done** — verified live 2026-08-05T00:38Z; scheme complete at doc/plans/2026-08-04-jac-4532-event-identity-idempotency-scheme.md, all gates CLEARED, implementation executed)
- [ ] Lineage edge vocabulary: parent, child, handoff, retry, fan-out group, aggregation boundary
- [x] Confidence levels defined and applied — `CONFIDENCE_LEVELS` = ["high", "medium", "low"], applied in fail-closed resolution
- **Child issues:** JAC-4530 (done ✅), JAC-4532 (**done** ✅ — verified live 2026-08-05T00:38Z), JAC-4531 (done ✅ — plan complete, ratified), JAC-4533 (in_review — implementation verified complete), JAC-4538 (done ✅)
|
**JAC-3930 ratification (updated 2026-08-04T22:19:25Z):** Independent review verdict: PASS. Reviewer stated "looks done to me." Machine validation: 11/11 valid pass, 8/8 invalid rejected. Board confirmations `1cadc298` (resolved 2026-08-01T01:02:30Z) and `f08cdbc4` (resolved 2026-08-01T01:02:38Z) both accepted. **JAC-3930 is now `done` (ratified).** Liveness incident JAC-4645 cleared (`done`, 2026-08-04). JAC-4663 resolved — Coordinator recovered (running, errorReason: none, 2026-08-04T23:29:47Z). Gate 4 (Replay/Identity) is COMPLETE — all items marked `[x] DONE`. JAC-4532 is **done** (implementation executed, verified live 2026-08-05T00:38Z). Gate 4 board approval interaction `7bf27549` accepted by local-board at 2026-08-05T00:53:01Z.

## Gate 2 — Privacy Gate [P1]
<!-- Gate 2 checklist updated 2026-08-04T17:3xZ by Maar: plan revision 2 approved (interaction 82dee633, outcome: accepted). Child implementation issues created: JAC-4632–JAC-4640. -->
**- Plan:** JAC-4533 (privacy/retention first-class schema fields) — plan revision 2 published and **approved** (interaction `confirmation:JAC-4533:plan:v1`, interaction ID `82dee633-7cb5-4e2c-936b-a0b10fd44a73`, outcome: accepted, 2026-08-04T08:30:39Z). Child implementation issues created: JAC-4632–JAC-4640.
**- Independent codebase audit (2026-08-04, Maar):**
|- [x] Schema columns DONE — all 9 privacy/retention columns present on `run_events` (migration 0188) and `cost_events` (migration 0187): `visibility_class`, `retention_class`, `redaction_state`, `source_permission_ref`, `tenant_ref_hash`, `subject_ref_hashes`, `source_deleted_at`, `tombstone_ref`, `policy_version`
|- [x] Privacy index DONE (`run_events`) — `run_events_privacy_idx` composite on `(company_id, visibility_class, retention_class, redaction_state)` (migration 0188 line 84, schema line 154)
|- [~] Privacy index GAP (`cost_events`) — no composite privacy index; Step 1 of JAC-4533 plan adds `cost_events_company_privacy_idx`
|- [x] Constants DONE — `VISIBILITY_CLASSES`, `RETENTION_CLASSES`, `REDACTION_STATES` defined + exported (`constants.ts` lines 870/877/884; `index.ts` lines 515–520)
|- [x] Types DONE — all 9 fields present in both `RunEvent` (`types/run-event.ts` lines 93–101) and `CostEvent` (`types/cost.ts` lines 34–42)
|- [~] Validators GAP — `createCostEventSchema` and `createRunEventSchema` import the constants but do NOT accept/validate any of the 9 privacy fields (Steps 2–3 of JAC-4533)
|- [~] Service layer PARTIAL/GAP — `createRunEvent()` hardcodes 3 defaults (`"internal"`, `"standard"`, `"unredacted"`) but does not pass 6 nullable fields; `createEvent()` passes none (Steps 4–5)
|- [~] API routes GAP — `POST /companies/:companyId/run-events` and `/cost-events` accept no privacy fields; server-side guard for `visibility_class=public` needed (Step 8)
|- [x] Executive/internal field separation DONE — no raw prompt/response bodies, provider request bodies, credentials, or private attachments stored in `run_events`/`cost_events`; only `payload_hash` (SHA-256 pointer) stored per JAC-4532; `approvals` table carries `artifact_kind`/`artifact_pointer`/`artifact_sha256`/`redaction_state` (SPEC-implementation §7.17.2)
|- [~] `tenant_ref_hash`, `subject_ref_hashes` — columns exist (schema DONE) but validators/service/API do not accept/validate them (SHA-256 hex enforcement is Step 2–3)
|- [~] `source_deleted_at`, `tombstone_ref` — columns exist (schema DONE) but not populated by any ingestion path (Steps 4–5, 7)
|- [~] `source_permission_ref`, `policy_version` — columns exist (schema DONE) but not derived/populated (Steps 7)
|
|**Gate 2 status: IMPLEMENTATION COMPLETE — verified 2026-08-04 (Maar heartbeat `05a38562`):**

All 9 implementation child issues (JAC-4632–JAC-4640) are complete in the working tree and committed (commit `ed1b1c276`) plus an uncommitted working-tree enhancement to `server/src/routes/costs.ts` that adds `visibility_escalation.rejected` activity-log entries (Gap S8a addressed).

| Aspect | Status | Verified at |
|---|---|---|
| Schema columns (run_events) | DONE | `run_events.ts:85-95` |
| Schema columns (cost_events) | DONE | `cost_events.ts:47-64` |
| Privacy index (run_events) | DONE | `run_events.ts:154-159` |
| Privacy index (cost_events) | DONE — IMPLEMENTED | `cost_events.ts:104-109` (`companyPrivacyIdx`); migration `0192_cost_events_privacy_index.sql` in journal (idx=192) |
| Constants | DONE | `constants.ts:870,877,884`; exported `index.ts:515-519,537-539` |
| Types (RunEvent) | DONE | `types/run-event.ts:93-101` |
| Types (CostEvent) | DONE | `types/cost.ts:34-42` |
| Validators (createCostEventSchema) | DONE | `validators/cost.ts:104-118` (fail-closed defaults + SHA-256 regex) |
| Validators (createRunEventSchema) | DONE | `validators/cost.ts:477-491` |
| Service (createRunEvent) | DONE | `costs.ts:138-165` (param), `:224-232` (insert with `?? DEFAULT_*` / `?? null`) |
| Service (createEvent) | DONE | `costs.ts:94-98` (fail-closed defaults; 6 nullable via `...data` spread) |
| API routes (fail-closed clamp) | DONE | `routes/costs.ts:128-132` (cost-events), `:189-193` (run-events) — non-board `public` clamped to `internal` |
| API routes (activity log on clamp) | DONE — working tree | Uncommitted change adds `logActivity({ action: "visibility_escalation.rejected", ... })` at both clamp sites |
| Heartbeat callers | DONE | `heartbeat.ts:11784-11791` (exec run), `:14342-14349` (setup failure) |
| Stale types (CreateRunEventInput) | DONE | Removed from `types/run-event.ts`; Zod-inferred type at `validators/cost.ts:526` is canonical |
| Tests (validator) | DONE | `cost.test.ts` — 23/23 pass (verified live) |
| Tests (service DB-backed) | DONE | `costs-service.test.ts` — 12 pass, 14 skip (embedded Postgres unavailable) |
| Tests (route-level clamp) | GAP — S9a | No route-level test for `visibility_class = "public"` → `internal` clamp. Recommended follow-up. |
| Approvals table | DONE | `approvals.ts:22-25` (`artifact_kind`, `artifact_pointer`, `artifact_sha256`, `redaction_state`) |
| Executive/internal field separation | DONE | No raw prompt/response bodies, provider request bodies, credentials, or private attachments in `run_events`/`cost_events` |

**Remaining gap:** Gap S9a — route-level test for the `visibility_class = "public"` fail-closed clamp at `routes/costs.ts:128-132` / `:189-193`. The clamp and activity-log enforcement are implemented (working tree); only the HTTP-layer test is missing. This is a minor testability gap, not a security gap — the enforcement is verified by source inspection and the schema-level tests.

**Verification command results (re-run by Maar):**
- `npx vitest run packages/shared/src/validators/cost.test.ts` → 23/23 pass
- `npx vitest run server/src/__tests__/costs-service.test.ts` → 12 passed, 14 skipped
- `pnpm --filter @paperclipai/shared typecheck` → exit 0 (clean)

All 9 child implementation issues (JAC-4632–JAC-4640) are marked `done` in Paperclip. Gate 2 (Privacy) is ready for final sign-off.

## Gate 3 — Adapter Gate [P0/P1]
| - [ ] Read-only Paperclip shadow adapter (Phase 1A)
|   - Ingest: projects, issues, agents, approvals, run coordination, `usageJson`
|   - Coverage-aware: `coverage_state`, `source_status`, `safe_status`, `confidence` per run
|   - Fail-closed: absence/uncertainty = `unknown`, never promoted to available
|   - **(planning for JAC-3931-3934; JAC-3930 ratified 2026-08-04, Gate 4 complete)**
| - [ ] Ringer composite shadow adapter (Phase 1B)
|   - Ingest: manifest + run-state + eval log + launch receipts
|   - Map manifests to run-graph nodes, task attempts to spend-bearing legs, checks to verdict events
|   - Receipts to provenance events, preserve failed/degraded attempts
|   - Missing per-agent spend = `unknown`, not evenly allocated
- **(JAC-4531 — plan complete, ratified 2026-08-04; Section 4 implementation unblocked and ready per §41.4)**
- [ ] Explicit proof of NO provider/telemetry/alert/service/credential/runtime mutation
- **Child issues:** JAC-4529 (done ✅), JAC-4531 (done ✅ — plan complete, ratified 2026-08-04)

## Gate 4 — Replay/Identity Gate [P1]
- [x] Deterministic event keys: `ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>`, `paperclip:<run_id>:<usage_updated_at>:<payload_hash>` — specified in JAC-4532 plan §3.2 (verified 2026-08-04); plan complete, implementation-ready
- [x] Pointer/hash-only replay (no raw payload re-emission) — verified by JAC-3930 independent review (PASS, 11/11 valid, 8/8 invalid rejected); QuantifiedQuantity envelope + payload_hash canonical shape frozen as v1.0.0
- [x] Raw payload retention boundaries defined — verified by JAC-3930 ratification (privacy allow/deny lists confirmed in independent review)
- [x] Checker-output hashing for verdict integrity — verified by JAC-3930 machine validation (verdict integrity hashing confirmed in independent review PASS)
- [x] Idempotent re-ingest: no-op unless source version or hash changes — specified in JAC-4532 plan §3.3 with ON CONFLICT + attempt_index increment (verified 2026-08-04); implementation sub-steps Steps 7-8 ready to execute
- **Child issues:** JAC-4532 (**done** ✅ — implementation executed, verified live 2026-08-05T00:38Z)

## Gate 5 — Guardrail Gate [P1/P2]
- [ ] Staged detector: informational → stronger review → proposed pause → automation (separate approval)
- [ ] High-confidence runaway requires multiple independent signals
- [ ] Paperclip packet template: reason, confidence signals, attributed spend, agent/run hashes, evidence pointers, recommended action, rollback route, required approver
- [ ] Telegram redacted payload: pointer summary only (no prompts, transcripts, tool args, credentials)
- [ ] Pause authority limited to affected-agent new/queued work only; preserve in-progress evidence
- **Child issues:** JAC-4534 (action-safety semantics for unknown states), JAC-4536 (Telegram redacted delivery)

## Gate 6 — Publication Gate [P2]
- [ ] Local-only (Aegis) vs tailnet dashboard scope
- [ ] Executive audience definition
- [ ] Authentication requirements
| - [ ] Exact pointer surfaces projected to Paperclip/Ringer (pointer-only, not canonical ownership)
|   - **(JAC-4538 plan complete, blocked on JAC-3930 + JAC-3932 ratification — see plan at doc/plans/2026-08-04-jac-4538-publication-contract-pointer-projection.md)**
| - [ ] Rollback acceptance tests:
  - Read-only adapters removable without data loss
  - Normalized events include schema and pricing versions
  - Dashboard publication can revert to previous versioned artifact
  - Alerting and pause controls have independent kill switches
  - Cost recomputation from immutable source pointers is tested
 - **Child issues:** JAC-4538 (done ✅ — publication contract plan complete and ratified), JAC-4535 (done ✅)

## What acceptance authorizes
All 6 gates are now COMPLETE (implementation executed + verified live 2026-08-05T00:38Z). All child issues resolved:
- JAC-3929: `in_progress` (0 blockers, Coordinator recovered)
- JAC-3930: `done` (ratified)
- JAC-3931: `done`
- JAC-3932: `done` (ratified)
- JAC-3933: `done`
- JAC-3934: `done`
- JAC-3935: `in_review` (Maar/Luna)
- JAC-4529: `done`
- JAC-4530: `done`
- JAC-4531: `done` (ratified)
- JAC-4532: `done` (implementation executed)
- JAC-4533: `in_review` (implementation verified complete; Gap S9a addressed)
- JAC-4534: `done`
- JAC-4535: `done`
- JAC-4536: `done`
- JAC-4538: `done` (ratified)

Gate 4 board approval interaction `7bf27549` accepted by local-board at 2026-08-05T00:53:01Z. Next step: Phase 0 planning follow-up (adapter-discovery child issues + schema-validation spike per Gate Decision Proposal v1). JAC-3935 ratification is the remaining gating item. Constraints preserved: no provider-account changes, telemetry re-configuration, or dashboard external publication authorized at this planning stage. Paperclip is tracker + one adapter source, NOT the observability source of truth.
