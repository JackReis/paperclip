# Wings Dispatch Evidence — JAC-4139 Cycle 2026-08-03T23:50Z

- **Run ID:** f42a042e-2b4c-47e7-acc6-f0bba202e11d
- **Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- **Issue:** JAC-4139 — Coordinator Fleet Coordination Check
- **Status:** in_progress
- **Liveness reason:** run_liveness_continuation (attempt 1/2)

---

## LIVE AGENT TABLE (GET /api/companies/87c32b8e.../agents, bearer=Wings, 2026-08-03T23:48Z)

Paperclip v2026.722.0, deploymentMode=local_trusted. 48 agents returned.

### Lanes with executionLane metadata

| Agent | Status | Pool | State | Model | maxParallel | verifiedAt | Notes |
|-------|--------|------|-------|-------|-------------|------------|-------|
| Herald | idle | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:37Z | Restored after JAC-4187 completion |
| Aegis Coder X | running | local-aegis | verified | ollama/qwen3-coder:30b | 1 | 2026-07-31T19:56Z | Running, no error (execRunId=JAC-4511 active) |
| Aegis Coder Y | idle | local-aegis | error | ollama/qwen3-coder:30b | 1 | 2026-07-31T19:56Z | WS1 re-probe: error, Timed out 12000s; NOT routable |
| Hermes Mistral | paused | ollama-cloud | paused | deepseek-v4-pro | 1 | 2026-07-31T19:56Z | Manually paused; NOT routable |
| Flash | idle | ollama-cloud | pending_repair | deepseek-v4-flash | 1 | 2026-07-31T19:56Z | MCPServerTask event-loop-closed defect; NOT routable |
| Coordinator | running | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:38Z | Restored; reports to Wings |
| Plan Runner | idle | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:15Z | Lane metadata restored after JAC-3629 |
| Wings (self) | running | local-aegis | verified | nous/laguna-s-2.1:free | 4 | 2026-08-03T23:38Z | Restored; PM coordination role |

### Agents without executionLane metadata (no verified lane)

| Agent | Status | adapterType | Notes |
|-------|--------|-------------|-------|
| Herald | idle | hermes_local | Has lane (see above) |
| Kimi Code via Ringer | idle | hermes_local | No executionLane metadata; independent-review lane |
| Paperclip Agent Auditor | idle | hermes_local | No executionLane metadata; Codex lane |
| Flash Executor | idle | hermes_local | external fast lane; profile-and-receipts-only |
| Omnigent Router | idle | hermes_local | On-demand router; not a direct lane |

---

## LANE ELIGIBILITY ANALYSIS

### local-aegis pool (maxParallel 2 per lane, 2 while host health green)
- **Herald**: idle, verified, clean re-probe at 23:37Z. **ELIGIBLE.** maxParallel=2. Currently 0 active runs assigned (issues assigned to Herald are all done/blocked/backlog).
- **Aegis Coder X**: running, verified, no error. **ELIGIBLE.** maxParallel=1. Currently has JAC-4511 in_progress (execRunId active), JAC-3705 todo, JAC-4521 backlog. Occupied 1/1.
- **Aegis Coder Y**: idle, lane=error. **NOT ELIGIBLE** — state=error, Timed out 12000s.
- **Coordinator**: running, verified. **NOT ELIGIBLE** — this IS the coordinator, not a dispatch lane.
- **Plan Runner**: idle, verified. **ELIGIBLE.** maxParallel=2. Assigned issues: JAC-3628 blocked, JAC-4462 blocked, rest done. 0 active runs.

### ollama-cloud pool (maxParallel 3)
- **Hermes Mistral**: paused. **NOT ELIGIBLE.**
- **Flash**: pending_repair. **NOT ELIGIBLE.**
- No other ollama-cloud agents with executionLane. Pool occupancy: 0/3 active.

### External fast lane (maxParallel 1 after no-write canary)
- **Flash Executor**: idle, profile-and-receipts-only. No executionLane metadata in standard form. **NOT ELIGIBLE as direct dispatch lane** — execution is projected via Herdr, not a live lane.

### Codex lane (maxParallel 1)
- **Paperclip Agent Auditor**: idle, no executionLane metadata, no verification timestamp. **NOT ELIGIBLE** — no verified lane state.

### Independent-review lane (Kimi Code via Ringer, maxParallel 1)
- **Kimi Code via Ringer**: idle, no executionLane metadata. **NOT ELIGIBLE** — no verified lane state in metadata.

---

## ISSUE LANDSCAPE (from live API, 2026-08-03T23:48Z)

### Issues assigned to dispatchable lanes

**Herald (a1e8cb0d):** 50 issues fetched
- Active: JAC-4422 blocked, JAC-3876 blocked, JAC-4081 backlog
- Most recent activity: JAC-3593/3594 (completed), JAC-4060 (done)
- JAC-3439: in_review, medium priority (assigned to Herald)

**Plan Runner (2c6b1cc9):** 50 issues fetched
- JAC-3628: blocked (child JAC-3629 blocked — dependency)
- JAC-4462: blocked (dependency on notes-pc9x1)
- Other assigned issues: all done
- No active in-progress runs

**Aegis Coder X (da00de99):** 3 issues
- JAC-4511: in_progress (execRunId active)
- JAC-3705: todo (high priority — canary efficient Hermes-local agents)
- JAC-4521: backlog

**Aegis Coder Y (181f381b):** 6 issues, all done/cancelled
- JAC-4016 cancelled, JAC-3988 done, JAC-3579 done, etc.

### Unassigned todo issues (policy-excluded scan)
- JAC-4501: todo, high, assigneeUser=local-board (Jack decision gate)
- JAC-4217: todo, high, assigneeUser=local-board (Jack decision gate)
- JAC-4216: todo, high, assigneeUser=local-board (Jack decision gate)
- JAC-3437: todo, medium, no assignee (no plan backing)
- JAC-3358-3361: todo, medium, no assignee (dependency chain)
- JAC-3970: todo, low, no assignee
- JAC-3541: todo, low, no assignee

### Key blocked issues
- JAC-3705 (assigned to Aegis Coder X): todo, but blocked upstream by JAC-4093 (dependency-gated)
- JAC-3596 (assigned to Kimi): todo, blocked by Luna JAC-3592/3593/3594 (in_progress)
- JAC-3628 (assigned to Plan Runner): blocked, child JAC-3629 blocked by JAC-4388 (board action)

---

## HOST HEALTH
- Paperclip API: ok, v2026.722.0, local_trusted mode
- CTX-SpO2: 98% (H100 N100 F100 G100 I100 A100 P87 T100) — P=aegis host at 87, within green threshold for local-Aegis dispatch
- Database: ok, backup recent (23h old)

---

## DISPATCH DECISION

**0 dispatches — queue exhausted.**

Verified-idle free lanes:
1. **Herald** (local-aegis, verified, idle) — 0 active runs, but all assigned issues are done/blocked/backlog. No new dispatchable work.
2. **Plan Runner** (local-aegis, verified, idle) — 0 active runs, but assigned issues all blocked by upstream dependencies (JAC-3628→JAC-3629→JAC-4388 board action; JAC-4462 dependency).
3. **Wings (self)** (local-aegis, verified, running) — executing this coordination cycle. Not a dispatch lane.

Excluded lanes:
- Aegis Coder X: verified+running but occupied 1/1 by JAC-4511.
- Aegis Coder Y: lane=error (12000s timeout). NOT routable.
- Hermes Mistral: paused. NOT routable.
- Flash: pending_repair (MCPServerTask defect). NOT routable.
- Paperclip Agent Auditor: no verified lane metadata. NOT routable.
- Kimi Code via Ringer: no verified lane metadata. NOT routable.
- Flash Executor: profile-and-receipts-only. NOT routable.
- Omnigent Router: on-demand router, not a direct lane.

All 40 fetched todo issues are policy-excluded (blocked by upstream, Jack decision gates, credential-bound, no plan backing, or already leased).

No fresh authenticated generation failure on verified lanes — exclusion is based on live metadata, not stale logs.

---

## DISPOSITION

**in_progress** (restart-ready)

Native Paperclip child-completion continuation is the liveness path. Expected wake triggers:
- JAC-4187 (in_review → Herald dispatchable on completion)
- JAC-4388 (board action → unblocks Plan Runner JAC-3628)
- JAC-3592/3593/3594 (Luna in_progress → unblocks Kimi JAC-3596)

Evidence written to: doc/plans/2026-08-03-wings-dispatch-evidence-jac-4139-cycle-2026-08-03T23-50Z.md