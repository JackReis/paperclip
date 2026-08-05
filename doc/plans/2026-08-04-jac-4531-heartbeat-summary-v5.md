## JAC-4531 — §9.9 Planning-mode heartbeat confirming §9.8 verification

**Wake comment acknowledged:** 670ed9ab-07d9-468e-a37f-4c944d9cfc47 (2026-08-04T12:07:37Z, local-board) — the §9.8 independent planning-mode re-verification from the current run.

**Work mode:** Planning only — no code (per workMode: planning on JAC-4531).

**Independent live verification performed this heartbeat:**

- **Plan artifact on disk:** `doc/plans/2026-08-04-ringer-composite-adapter-design.md` — confirmed 1031 lines, MD5 `68c9d9b90d027d7265a9e42d7f2f53f9`. This matches the §9.8 recorded MD5 exactly. No edits required — the §9.8 re-verification already corrected the §9.7 gate-checklist discrepancy (Gate 3 Phase 1B shows `- [ ]` unchecked, matching live state).

- **Ringer worktree:** `/Users/hermes/.hermes/worktrees/ringer-fleet-wave-candidate-20260716-v1/ringer.py` — confirmed 8637 lines. All 19+ line citations verified (Manifest.from_path @478, Manifest.from_obj @494, StateWriter.snapshot @1196, flush @1184, os.replace @1189, build_summary @1275, _loop @1390, LogAttemptQueue._log_attempt @7512, EvalLogger.log_attempt @4616/class @4607, ReceiptWriter.emit @1075/class @1064, scan_receipt_material @952, build_launch_receipt @992, prompt_sha256 @1028, build_terminal_receipt @1038, parse_token_count @7688/call @7447, retry logic @7158-7168, token accumulation @7148-7149, token sums @1249/1280, worker_tokens per-attempt @7547, TaskSpec.from_obj @406).

- **Schema files verified:** `schema/launch-receipt.v1.json` (96 lines), `schema/fleet-wave.v1.json` (37 lines), `schema/fleet-wave-receipt.v1.json` (39 lines) — all present in worktree.

- **Adapter README verified:** `/Users/hermes/.paperclip/adapters-local/ringer-kimi-0.1.1/README.md` — confirms `ringerStateDir`, `ringerCommand`, `pythonBin`, `engine`, `model`, `timeoutSec`, `taskTimeoutSec`, `check`, `expectFiles`, `identity` config fields. `samples/smoke-manifest.template.json` and `samples/smoke.sh` confirmed present in the npm package (not in the worktree — corrected per §9.2).

- **config.sample.toml line 96 verified:** Grok note confirmed — "carries no usage/token fields (verified v0.2.81)".

- **Live Paperclip API verification (v2026.722.0, :3101):** All 8 dependency statuses confirmed via GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues?limit=500 then UUID-scoped detail fetch:
  - JAC-4531 (self): in_progress / planning — matches §1.4
  - JAC-3929 (parent): blocked — matches §1.4
  - JAC-3930 (telemetry contract): in_review — matches §1.4
  - JAC-4262 (adapter discovery): done — matches §1.4
  - JAC-3933 (detectors): done — matches §1.4
  - JAC-4530 (token/cost semantics): in_review — matches §1.4
  - JAC-4532 (event identity/idempotency): in_progress — matches §1.4
  - JAC-4540 (gate checklist): done — matches §1.4
  - JAC-4597 (child review): blocked — matches §1.4

**Gate checklist grounding:** `doc/plans/2026-08-04-jac-3929-gate-checklist.md` §3 Gate 3 Phase 1B (Ringer composite shadow adapter) confirms `- [ ]` unchecked — JAC-3929 board approval (interaction 7bf27549) not yet granted. This plan's design in Sections 2.1–2.8 specifies the full composite mapping.

**Approval interaction:** 75ff75ad (`confirmation:JAC-4531:plan:v3`) — confirmed pending, created 2026-08-04T04:59:45Z. No acceptance yet. Plan approval remains the liveness gate for implementation sub-tasks (Section 6).

**Design status:** No design changes. The plan defines the composite adapter as manifest + run-state + eval log + launch receipts, mapping:
- Manifests to run-graph nodes (Section 2.2/2.4)
- Task attempts to spend-bearing legs (Section 2.2/2.5)
- Checks to verdict events (Section 2.2/2.6)
- Launch receipts to provenance events (Section 2.2/2.7)
- Failed/degraded attempts preserved (Section 2.3, risk mitigation row 6)
- Missing per-agent spend = unknown, never aggregate-allocated (Section 2.3/3.2)
- Event identity/idempotency scheme from JAC-4532 (Section 3.1)
- Token/cost unknown-vs-zero semantics from JAC-4530 (Section 3.2)

**Disposition:** in_progress (planning). Plan v3 fully verified and grounded on disk (1031 lines, MD5 68c9d9b90d027d7265a9e42d7f2f53f9) — all §9 line citations independently re-confirmed live against the Ringer worktree (8637 lines) and live Paperclip API. Awaiting board approval on interaction 75ff75ad (pending) and JAC-3930 ratification (in_review, gates sub-task 1). No code written per planning-only directive.
