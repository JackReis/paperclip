# JAC-3929 — 6 Ringer Judge Approval Gates Checklist

**Status:** Awaiting board approval (interaction 7bf27549)
**Judge report:** `/Users/hermes/.ringer/artifacts/deliverables/fleet-spend-observatory-independent-judge-20260729-20260729T202530Z-p58409/independent-judge/report.md`
**Report SHA-256:** `a24277b3`

## Gate 1 — Schema Gate [P0/P1]
|- [x] Quantity/null semantics: `{value|null, unit, reported_state, source_field, observed_at, confidence}` — implemented as nullable columns with fail-closed coverage resolution (null=not_reported, 0=explicitly zero). Full `QuantifiedQuantity` envelope per-quantity is planned in JAC-4530 §3.1 (Path B preferred for V1).
|- [x] Add `reasoning_tokens`, `tool_call_tokens` fields — already on both `cost_events` and `run_events` (migration 0187/0188)
|- [x] Add `currency`, `pricing_version_ref`, `cost_confidence` fields — `currency` and `pricing_version_ref` on `cost_events`; `currency` on `run_events`. **`cost_confidence` is still MISSING** (only generic `confidence` exists). `price_basis` is also MISSING. See JAC-4530 plan §2.2.
|- [ ] Event identity algorithm: `source_system` + `source_event_id` + `source_event_version` + `event_kind` + `attempt_index` + `observed_sequence` — columns exist; `sourceEventId` + `payloadHash` not yet populated (JAC-4532)
|- [ ] Lineage edge vocabulary: parent, child, handoff, retry, fan-out group, aggregation boundary
|- [x] Confidence levels defined and applied — `CONFIDENCE_LEVELS` = ["high", "medium", "low"], applied in fail-closed resolution
|- **Child issues:** JAC-4530 (token/cost unknown-vs-zero), JAC-4532 (event identity/idempotency)

## Gate 2 — Privacy Gate [P1]
**- Plan:** JAC-4533 (privacy/retention first-class schema fields) — plan revision 2 published and awaiting board approval (interaction `confirmation:JAC-4533:plan:v1`).
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
|**Remaining gap to close for Gate 2 approval:** Validators (Steps 2–3), service layer (Steps 4–5), heartbeat callers (Step 7), API routes (Step 8), tests (Step 9). See full 9-step dependency-ordered plan in `doc/plans/2026-08-04-jac-4533-privacy-retention-schema-fields.md`.

## Gate 3 — Adapter Gate [P0/P1]
- [ ] Read-only Paperclip shadow adapter (Phase 1A)
  - Ingest: projects, issues, agents, approvals, run coordination, `usageJson`
  - Coverage-aware: `coverage_state`, `source_status`, `safe_status`, `confidence` per run
  - Fail-closed: absence/uncertainty = `unknown`, never promoted to available
- [ ] Ringer composite shadow adapter (Phase 1B)
  - Ingest: manifest + run-state + eval log + launch receipts
  - Map manifests to run-graph nodes, task attempts to spend-bearing legs, checks to verdict events
  - Receipts to provenance events, preserve failed/degraded attempts
  - Missing per-agent spend = `unknown`, not evenly allocated
- [ ] Explicit proof of NO provider/telemetry/alert/service/credential/runtime mutation
- **Child issues:** JAC-4529 (Paperclip adapter fail-closed), JAC-4531 (Ringer composite adapter)

## Gate 4 — Replay/Identity Gate [P1]
|- [x] Deterministic event keys: `ringer:<receipt_id>:<event>:<emitted_at>:<payload_hash>`, `paperclip:<run_id>:<usage_updated_at>:<payload_hash>` — specified in JAC-4532 plan §3.2 (verified 2026-08-04)
|- [ ] Pointer/hash-only replay (no raw payload re-emission)
|- [ ] Raw payload retention boundaries defined
|- [ ] Checker-output hashing for verdict integrity
|- [x] Idempotent re-ingest: no-op unless source version or hash changes — specified in JAC-4532 plan §3.3 with ON CONFLICT + attempt_index increment (verified 2026-08-04)
|- **Child issues:** JAC-4532 (event identity/idempotency scheme)

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
- [ ] Exact pointer surfaces projected to Paperclip/Ringer (pointer-only, not canonical ownership)
- [ ] Rollback acceptance tests:
  - Read-only adapters removable without data loss
  - Normalized events include schema and pricing versions
  - Dashboard publication can revert to previous versioned artifact
  - Alerting and pause controls have independent kill switches
  - Cost recomputation from immutable source pointers is tested
- **Child issues:** JAC-4538 (publication contract), JAC-4535 (freshness split)

## What acceptance authorizes
Planning-only follow-up: adapter-discovery child issues + schema-validation spike. NO provider-account changes, telemetry re-configuration, or dashboard external publication.
