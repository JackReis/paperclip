# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T13:07Z (Recovery Run)

**Run ID:** 13f1203e-6482-4990-8369-07b4f79202c7 (Wings, hermes_local)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-03T13:07Z (live authenticated GET /api/companies/87c32b8e/agents)
**Recovery cause:** process_lost — previous run 9fa4e076 succeeded but recovery action remained active (JAC-4000 was `blocked`, status `in_progress` via continuation summary)

## Dispatch Decision: 0 dispatches — queue exhausted. No change since 05:53Z cycle. No upstream blockers cleared.

### Verified-Idle Free Lanes (3/3 eligible-by-lane, 0 dispatchable)

| Lane | Agent | Pool/Model | Lane State | Agent Status | HB | Assigned Issue | Blocker (live UUID-scoped) |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code/opus-4-8 | verified | idle | 07:41Z (fresh) | JAC-4187 (blocked) | JAC-3933 in_review (unresolved) |
| Plan Runner | 2c6b1cc9 | claude-code/opus-4-8 | verified | idle | 03:13Z (fresh) | JAC-3628 (blocked) | JAC-4388 todo (Jack gate), JAC-3629 todo, JAC-4093 blocked |
| Kimi Code via Ringer | 3f1712eb | independent-review/k3 | verified | idle | 08-02T03:22Z | JAC-3596 (todo) | JAC-3592 blocked (Luna, active recovery), JAC-3593 todo, JAC-3594 todo |

maxParallel=1 each. Claude-code/OmniGent pool: 2 allowed, 1 in flight (Plan Runner has JAC-3628 but it's blocked). Independent-review pool: 1, in-use by JAC-3596.

### Corrections vs. 05:53Z Evidence

- **No status changes in any upstream blocker.** JAC-3933 still in_review, JAC-4388 still todo, JAC-3592 still blocked with active recovery action (attemptCount=1, lastAttempt 12:35Z).
- **Aegis Coder X (da00de99):** agent.status=running, executionLane.state=verified. Currently running JAC-4511 (execRun=842636f2). At capacity for local-aegis pool (maxParallel=1). However, CTX-SpO2 P=88 (host gate down). Per policy: local Aegis only while host health is green. NOT dispatched — capacity full + host not green.
- **Aegis Coder Y (181f381b):** lane.state=error (12000s timeout defect from prior cycle). Agent status=idle but lane=error. NOT routable.
- **Hermes Mistral (1029acc4):** lane=paused (manual). NOT routable.
- **Flash (b37f4d70):** lane=pending_repair, errorReason=MCPServerTask event-loop-closed. NOT routable.
- **Paperclip Agent Auditor (5b2bece1):** lane=quota_blocked until Aug 4 11:09 PM CT. NOT routable.
- **Omnigent Router (072eada2):** no executionLane. NOT compute.
- **Wings (80284e06):** lane=reserved (strategic). Excluded.

### Excluded / Non-Routable (not capacity)

| Lane | Agent | State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | lane=verified, agent=running | At capacity (JAC-4511 running) + CTX P88 (host gate down). NOT dispatched. |
| Aegis Coder Y | 181f381b | lane=error | 12000s timeout defect. NOT routable. |
| Paperclip Agent Auditor | 5b2bece1 | lane=quota_blocked | Codex limit until Aug 4. NOT routable. |
| Hermes Mistral | 1029acc4 | lane=paused | Manual pause. NOT routable. |
| Flash | b37f4d70 | lane=pending_repair | MCPServerTask event-loop-closed. NOT routable. |
| Omnigent Router | 072eada2 | no executionLane | Routing-only. NOT compute. |
| Wings | 80284e06 | lane=reserved | Strategic reserved (self). Excluded. |

### Upstream Blockers (confirmed live, fresh UUID-scoped fetch)

1. **JAC-3933 (fc4eb2ca)** — status=in_review, assignee=none. Unblocks Herald (JAC-4187). NOT resolved. blockerAttention=none on JAC-3933 itself.
2. **JAC-4388 (4954a59f)** — status=todo, assigneeUserId=local-board (Jack board-action gate). Unblocks Plan Runner chain (JAC-3628 → JAC-3629 → JAC-4388). NOT resolved.
3. **JAC-3592 (46839114)** — status=blocked, assignee=2f92499a (Luna). Active recovery action c00664a1: missing_disposition, cause=successful_run_missing_state, attemptCount=1. Unblocks Kimi (JAC-3596). NOT resolved.

### Remaining Unleased Pool (all policy-excluded)

Surveyed 33 todo issues via GET /api/companies/{cid}/issues?status=todo. All assigned or policy-excluded:
- JAC-3671 (credential-bound) — unassigned
- JAC-4500 (self-review of JAC-4139) — unassigned
- JAC-4501 (self-review of JAC-4000) — unassigned, parent=JAC-4000
- JAC-4388 (Jack board-action gate) — unassigned
- JAC-4217 (Jack decision gate) — unassigned
- JAC-4216 (Jack decision gate) — unassigned
- JAC-3714 (sudo/approval-gated) — unassigned
- JAC-3558/3557/3555 (human gate) — unassigned
- JAC-3705 (todo, depends on Coder X which is at capacity + host down) — assignee=da00de99
- JAC-3802 (assigned to Paperclip Agent Auditor, quota_blocked)
- JAC-3629 (assigned to Fable f1ef5e14, blocked via JAC-4388)
- JAC-3593/3594 (assigned to Luna 2f92499a, blocked upstream)
- JAC-4046/4060/4059/4058 (assigned to Hermes Mistral 1029acc4, paused/lane=paused)
- JAC-3770 (assigned to Coordinator dc2ca597, approval-gated production deploy)
- JAC-3590 (assigned to Coordinator dc2ca597, blocked by JAC-3592)
- JAC-3634 (assigned to Coordinator dc2ca597, SOP integration — dependent on JAC-3629 chain)
- JAC-3400 (assigned to Coordinator, human gate for medication refill)
- JAC-3970 (Jack decision gate)
- JAC-3541 (TEST_DELETE)

No newly-independent, plan-backed, non-gated task found.

### Active Runs

0 eligible worker runs on verified-idle lanes. JAC-4000 executionRunId=13f1203e is this Wings heartbeat. JAC-4511 is running on Aegis Coder X (at capacity).

### Disposition

**in_progress (restart-ready)** — 0 dispatches, queue exhausted. No upstream blockers cleared. Awaiting native child-completion wake on JAC-3933 / JAC-4388 / JAC-3592-3593-3594.

**Recovery action:** Resolving active recovery action 5f6f8e91 (process_lost) — the previous run 9fa4e076 succeeded and its dispatch evidence is durable. This recovery run confirms no new dispatchable capacity exists and no stale-log inference was made. Restoring JAC-4000 to in_progress with a fresh verified lane snapshot.
