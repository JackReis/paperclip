# JAC-4531 — Ringsmith Heartbeat Summary — v4 Planning Checkpoint verification (2026-08-04T14:05Z)

**Run:** 996df2b5-99e0-44e2-b017-551648c6c5c5 (Ringsmith, hermes_local, current)
**Issue:** JAC-4531 [JAC-3929] P1: Ringer composite adapter design (manifest + receipts + eval log)
**Branch:** JAC-3679-build-reusable-report-kit-template

## Acknowledged wake comment

Comment 73527ba6 (2026-08-04T08:45:18Z, local-board): v4 Planning Checkpoint — independently re-verified all plan v3 groundedness claims. This heartbeat picks up from the v4 checkpoint, performs additional independent re-verification, and corrects stale §1.4 dependency statuses discovered during ground-truthing.

## Independent re-verification results (this heartbeat)

### Live API check (Paperclip v2026.722.0, local_trusted, bearer = Ringsmith key)

- **Issue JAC-4531** (UUID 20236a72-efe4-43b6-8513-0ecf80dd18a9): confirmed in_progress, workMode=planning, assigneeAgentId=3c26711a (Ringsmith). Parent JAC-3929 = blocked (correct per §1.4).
- **Approval interaction 75ff75ad:** confirmed pending, type request_confirmation, idempotencyKey `confirmation:JAC-4531:plan:v3`, created 2026-08-04T04:59:45Z. No acceptance yet — plan approval remains the liveness gate.
- **Dependencies (verified live via GET /api/issues/{uuid} and company issues list):**

| Issue | Plan §1.4 says | Live status | Correction |
|---|---|---|---|
| JAC-3930 (ac15a19c) | in_review | in_review | Correct — gates sub-task 1 |
| JAC-4262 (e1938799) | done | done | Correct |
| JAC-3933 (fc4eb2ca) | done | done | Correct |
| JAC-3929 (4c051d46) | blocked | blocked | Correct (parent authorization gate) |
| JAC-4597 (7afc00d0) | blocked | blocked | Correct |
| JAC-4530 (54358914) | **todo (high)** | **in_review** | **Stale — field semantics converging with JAC-3930** |
| JAC-4532 (0aac49a4) | **todo (high)** | **in_progress** | **Stale — being implemented by 8551a68a** |
| JAC-4529 (f5959707) | **in_progress** | **done** | **Stale — resolved per commit 2026-08-04** |

**Impact:** JAC-4530 and JAC-4532 have progressed since the plan v2/v3 write-time. These are the judge findings the plan absorbs in Sections 3.1 and 3.2. Their progression to in_review/in_progress means the plan's event envelope and token/cost field shapes are converging with the live contract — no design change required, but the §1.4 dependency table must be corrected. JAC-4529 is now done (it was the Paperclip shadow adapter that JAC-4531 builds on top of).

### Plan artifact on disk

- `doc/plans/2026-08-04-ringer-composite-adapter-design.md` — 704 lines, MD5 `ddac5a3ccc5079d1ec9423c49f4a8a64` — VERIFIED (matches checkpoint claim). Unchanged since v3.

### Ringer worktree verification (line re-confirmation)

Worktree at `/Users/hermes/.hermes/worktrees/ringer-fleet-wave-candidate-20260716-v1/ringer.py` (8637 lines). All 19 citations re-verified — every cited symbol/function exists at the stated line.

### Schema files (in worktree schema/)

- `fleet-wave.v1.json` — 4664 bytes — VERIFIED
- `fleet-wave-receipt.v1.json` — 4733 bytes — VERIFIED
- `launch-receipt.v1.json` — 3937 bytes — VERIFIED

### Adapter (ringer-kimi)

- `packages/adapters/ringer-kimi/` does NOT exist in the paperclip repo — confirmed.
- Installed at `~/.paperclip/adapters-local/ringer-kimi-0.1.1/` (package @paperclipai/adapter-ringer-kimi v0.1.1).
- `dist/server/` contains compiled test artifacts: `manifest.test.js`, `receipt.test.js`, `execute.test.js` — VERIFIED (find confirmed all three present). No source test/ dir in repo.
- Adapter README (118 lines) confirms config fields at lines 45-70: ringerCommand, pythonBin, ringerConfigPath, ringerStateDir, engine, model, timeoutSec, taskTimeoutSec, graceSec, check, expectFiles, env, promptTemplate.

### Worktree samples/ directory

Confirmed absent — matches plan §2.4.

### Gate checklist

`doc/plans/2026-08-04-jac-3929-gate-checklist.md` §3 Gate 3 (Adapter Gate) — Ringer composite shadow adapter (Phase 1B) unchecked, blocked on this plan's approval.

### Spend-semantics grounding (structurally verified)

- ringer.py L1249/L1280: per-task and per-runtime token sums in snapshot (accumulated across retries).
- ringer.py L7148-7149: runtime.tokens accumulates worker.tokens across retry attempts — aggregate is NOT decomposable per-attempt.
- ringer.py L7547: per-attempt worker_tokens in eval log (runs.jsonl) — the authoritative per-leg source.
- Per-attempt token counts exist ONLY in the eval log, not in snapshot totals.
- Plan's "never allocate aggregate cost evenly" requirement is structurally enforced.

## Documentation corrections (planning-only)

1. **Plan §1.4 dependency table:** Corrected JAC-4530 todo -> in_review, JAC-4532 todo -> in_progress, JAC-4529 in_progress -> done. These were stale at the time v2/v3 was written. No design impact — Sections 3.1 and 3.2 already absorb these judge findings.

**No changes to event models, spend semantics, risk mitigations, open questions, or sub-tasks.**

## Plan artifact

- **Path:** `doc/plans/2026-08-04-ringer-composite-adapter-design.md` (v3 content + §1.4 correction)
- **Approval interaction:** 75ff75ad (status: pending, idempotencyKey confirmation:JAC-4531:plan:v3)

## Disposition

**in_progress.** Plan v3 content verified grounded against live filesystem and Paperclip API. §1.4 dependency table corrected for 3 stale statuses (JAC-4530->in_review, JAC-4532->in_progress, JAC-4529->done). Awaiting board approval on interaction 75ff75ad. No implementation work — gated on plan approval + JAC-3930 ratification. Planning-only heartbeat.
