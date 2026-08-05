# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T16:50Z

- **Run**: 0d552165-6097-4db2-9168-f8438663c4d1
- **Agent**: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- **Paperclip version**: v2026.722.0 (local_trusted, git 759cd22d0)
- **Method**: authenticated GET `/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents`, bulk `/issues?status=*` (blocked/todo/in_progress/in_review), per-agent `orgChainHealth`
- **All gates from live API, no stale-log inference.**

## Dispatch Decision: 0 dispatches — queue exhausted (re-verified live at 16:50Z)

### Verified lanes (state=verified)

| Agent | Pool/Model | Agent status | VerifiedAt | Lane hb | orgChainHealth | execRunId |
|---|---|---|---|---|---|---|
| Herald (a1e8cb0d) | claude-code/opus-4-8 | idle | 2026-07-31T19:56Z | 16:59Z | healthy | none |
| Plan Runner (2c6b1cc9) | claude-code/opus-4-8 | idle | 2026-07-31T19:56Z | 16:19Z | healthy | none |
| Aegis Coder X (da00de99) | local-aegis/qwen3-coder:30b | running | 2026-07-31T19:56Z | 15:26Z | healthy | JAC-4511 (4d59aef5) |
| Kimi Code via Ringer (3f1712eb) | independent-review/kimi/k3 | idle | 2026-07-23T20:03Z | 03:22Z (08-02) | healthy | none |

> Note: wake comment stated Aegis Coder X host health P88 (down). Live `orgChainHealth` returns `healthy` for all four verified lanes including Coder X. No host-gate failure observed in this cycle's authenticated probe.

### Capacity verdict per lane

- **Herald**: verified + idle + no execRunId → eligible. But all 6 assigned issues blocked (JAC-4422, JAC-3876, JAC-3494, JAC-4081, JAC-4069, JAC-4506/3716) + 1 in_review (JAC-3439). No unassigned or dispatchable todo in pool. **0 dispatchable.**
- **Plan Runner**: verified + idle + no execRunId → eligible. All 6 assigned blocked (JAC-3628, JAC-4462, JAC-3665, JAC-4093, JAC-4348) + 1 in_review (JAC-4190). Note: wake said JAC-3628 blocks on JAC-3629 (board action); JAC-3629 not found in current scoped issue sets — stale linkage reference. **0 dispatchable.**
- **Aegis Coder X**: agent status=running, execRunId=JAC-4511 active (JAC-4505 follow-up). Lane leased by its own run. JAC-3705 (todo) is blocked by JAC-4093. **Not free → 0 dispatchable.**
- **Kimi (independent-review)**: verified + idle + no execRunId → nominally eligible. But JAC-3596 (its only assigned todo) is a verification leaf gated on "four implementation leaves" of an immutable candidate that has not yet produced a PASS/HOLD artifact. Wake comment excluded as stale verification (verifiedAt 07-23, 10d old). No fresh authenticated generation failure recorded. Per policy, no stale-log inference to infer a quota outage; lane remains technically `verified`. However the dispatchable work is an implicit-dependency review task (candidate artifact not produced) → excluded as dependent work. **0 dispatchable.**

### Excluded lanes (not capacity)

| Agent | State | Reason |
|---|---|---|
| Wings (self, 80284e06) | reserved | strategic |
| Aegis Coder Y (181f381b) | error | executionLane.state=error (12000s timeout defect); agent idle but NOT routable |
| Hermes Mistral (1029acc4) | paused | manual |
| Flash (b37f4d70) | pending_repair | errorReason=MCPServerTask event-loop-closed defect (cosmetic to completed work, blocks trust) |
| Paperclip Agent Auditor (5b2bece1) | quota_blocked | codex usage limit until 2026-08-04 |
| Luna High Planner (2f92499a) | verified-idle | host-only, no executionLane dispatch surface; Luna is a planner not a worker lane |

### Unassigned TODO pool (16) — all policy-excluded

JAC-3671 (credential-bound/critical), JAC-4501 (self-referential: "Review productivity for JAC-4000"), JAC-4216/4217 (Jack DECISION gates), JAC-3714 (approval-gated/sudo), JAC-3558/3557/3555 (human gates), JAC-3437/3365/3359/3361/3358/3360 (personal), JAC-3970 (dependency-gated self-dispatch meta), JAC-3541 (test artifact).

### Upstream blockers (live)

- JAC-4190 (in_review, Plan Runner) — awaiting Jack approval → frees Plan Runner.
- JAC-4093 (blocked, Plan Runner) — precondition gate for JAC-3705 (Coder X) → frees Coder X dispatch path.
- JAC-3596 (todo, Kimi) — waiting on Luna candidate artifact; Luna idle, no green smoke receipt → Kimi lane not dispatchable on real work.
- JAC-4422 (blocked, Herald) + JAC-4462 (blocked, Plan Runner) — notes-pc9x1 upstream → free Herald/Plan Runner.
- JAC-4187, JAC-3933, JAC-4388 — confirmed DONE (08-03T15:22Z/15:33Z) in done-set. Resolved.

## Active runs

- Wings (self): JAC-4000 (this coordinator issue).
- Aegis Coder X: JAC-4511 (in_progress, run 4d59aef5).
- All other verified-idle lanes: no active runs.

## Fresh authenticated generation failures

None. No stale-log inference used for any lane hold decision.

## Disposition

`in_progress` (restart-ready), 0 dispatches, queue exhausted. Awaiting native Paperclip child-completion wake on:
1. JAC-4190 (Jack approval → Plan Runner capacity available)
2. JAC-4093 resolution → JAC-3705 (Aegis Coder X)
3. JAC-4422/4462 resolution (notes-pc9x1 → Herald/Plan Runner capacity)
4. JAC-3596 candidate artifact produced → Kimi lane dispatchable

Evidence file: this document.
