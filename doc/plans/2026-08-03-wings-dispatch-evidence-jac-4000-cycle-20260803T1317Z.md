# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T13:17Z (Wings run bc187d19)

**Run ID:** bc187d19-18bf-49a7-9f4f-7ee7e6fad8b9 (Wings, hermes_local adapter)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-03T13:17Z (live authenticated GET /api/companies/87c32b8e/agents + UUID-scoped issue fetch)

## Dispatch Decision: 0 dispatches — queue exhausted. No upstream blockers cleared since 13:07Z recovery run.

### Verified-Idle Free Lanes (3/3 eligible-by-lane, 0 dispatchable)

| Lane | Agent ID | Pool/Model | Lane State | Agent Status | HB (fresh) | Assigned Issue | Blocker (live UUID-scoped) |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708 | claude-code / claude-opus-4-8 | verified | idle | 07:41Z | JAC-4187 (blocked, blockedBy=null) | JAC-3933 fc4eb2ca (in_review, unresolved) |
| Plan Runner | 2c6b1cc9-aad2-431b-93ea-e31f0612be65 | claude-code / claude-opus-4-8 | verified | idle | 03:13Z | JAC-3628 (blocked, blockedBy=null) | JAC-4388 4954a59f (todo, Jack gate) + JAC-3629 (todo, dependency) |
| Kimi Code via Ringer | 3f1712eb-7b43-40fa-b893-f36e92bb9ac3 | independent-review / kimi-for-coding/k3 | verified | idle | 08-02T03:22Z | JAC-3596 (todo, blockedBy=null) | JAC-3592 46839114 (blocked, Luna active recovery) |

maxParallel=1 each. Claude-code/OmniGent pool: 2 allowed, 0 in flight on free lanes (1 in flight on Aegis Coder X at capacity). Independent-review pool: 1 allowed, in-use by JAC-3596 dependency chain.

### Corrections vs. 13:07Z Evidence

- **No status changes in any upstream blocker.** All confirmed via live UUID-scoped API fetch:
  - JAC-3933 (fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2): status=in_review, assigneeAgentId=null — UNCHANGED
  - JAC-4388 (4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3): status=todo, assigneeAgentId=null — UNCHANGED (Jack board-action gate)
  - JAC-3592 (46839114-1e68-4296-bc60-9766da1f01d8): status=blocked, assigneeAgentId=2f92499a (Luna) — UNCHANGED
- **Aegis Coder X (da00de99):** lane=verified, agent.status=running (on JAC-4511, execRun=842636f2). At capacity for local-aegis pool (maxParallel=1). CTX-SpO2 P=88 (host P89 gate down). Per policy: local Aegis only while host health is green. NOT dispatched — capacity full + host not green.
- **Aegis Coder Y (181f381b):** lane.state=error (12000s timeout defect from prior cycle). Agent status=idle but lane=error. NOT routable.
- **Hermes Mistral (1029acc4):** lane=paused (manual). Agent status=paused. NOT routable.
- **Flash (b37f4d70):** lane=pending_repair, errorReason=MCPServerTask event-loop-closed. Agent status=idle. NOT routable.
- **Paperclip Agent Auditor (5b2bece1):** lane=quota_blocked until Aug 4 23:09 CT. Pool=codex. Agent status=idle. NOT routable.
- **Omnigent Router (072eada2):** no executionLane. Agent status=idle. NOT compute.
- **Wings (80284e06):** lane=reserved (strategic). Excluded. Agent status=running (this heartbeat).

### Excluded / Non-Routable (not capacity)

| Lane | Agent ID | Lane State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | lane=verified, agent=running | At capacity (JAC-4511 running) + CTX P88 (host gate down). NOT dispatched. |
| Aegis Coder Y | 181f381b | lane=error | 12000s timeout defect. NOT routable. |
| Paperclip Agent Auditor | 5b2bece1 | lane=quota_blocked | Codex limit until Aug 4. NOT routable. |
| Hermes Mistral | 1029acc4 | lane=paused | Manual pause. NOT routable. |
| Flash | b37f4d70 | lane=pending_repair | MCPServerTask event-loop-closed. NOT routable. |
| Omnigent Router | 072eada2 | no executionLane | Routing-only. NOT compute. |
| Wings | 80284e06 | lane=reserved | Strategic reserved (self). Excluded. |

### Upstream Blockers (confirmed live, fresh UUID-scoped fetch)

1. **JAC-3933 (fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2)** — status=in_review, assigneeAgentId=null. Unblocks Herald (JAC-4187). NOT resolved. No blocker on JAC-3933 itself.
2. **JAC-4388 (4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3)** — status=todo, assigneeAgentId=null (Jack board-action gate per description). Unblocks Plan Runner chain (JAC-3628 → JAC-3629 → JAC-4388). NOT resolved.
3. **JAC-3592 (46839114-1e68-4296-bc60-9766da1f01d8)** — status=blocked, assigneeAgentId=2f92499a (Luna High Planner). Execution workspace ID ba32d39b-93fc-4d09-b6e7-eb6694d94867 stale (no activeRunId). Unblocks Kimi (JAC-3596). NOT resolved. Active recovery action c00664a1 still pending — no authenticated generation failure recorded on verified lanes to justify holding.

### Active Runs

0 eligible worker runs on verified-idle lanes. JAC-4000 executionRunId=bc187d19 is this Wings heartbeat. JAC-4511 running on Aegis Coder X (at capacity, host gate down).

### Disposition

**in_progress (restart-ready)** — 0 dispatches, queue exhausted. No upstream blockers cleared since 13:07Z recovery run. Awaiting native child-completion wake on JAC-3933 / JAC-4388 / JAC-3592-3593-3594.

**Recovery action:** This cycle confirms no new dispatchable capacity exists and no stale-log inference was made. All gate states confirmed via authenticated live API data (GET /api/companies/87c32b8e/agents + UUID-scoped issue fetches). JAC-4000 remains in_progress for native child-completion continuation.
