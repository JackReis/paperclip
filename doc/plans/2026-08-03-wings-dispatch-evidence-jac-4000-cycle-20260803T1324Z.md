# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T13:24Z (Wings run fdaf478d)

**Run ID:** fdaf478d-c59f-4635-b715-2bdb90df0a99 (Wings, hermes_local)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-03T13:24Z (live authenticated GET /api/companies/87c32b8e/agents + per-agent /api/agents/{uuid} + UUID-scoped issue fetches)

## Dispatch Decision: 0 dispatches — queue exhausted.

Fresh live verification confirms no change since 13:17Z cycle. No upstream blockers cleared. All gate states confirmed via authenticated live API; no stale-log inference.

### Verified-Idle Free Lanes (3/3 eligible-by-lane, 0 dispatchable)

| Lane | Agent ID | Pool/Model | Lane State | Agent Status | HB (live) | Assigned Issue | Blocker (live UUID-scoped) |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code/opus-4-8 | verified | idle | 2026-08-03T07:41:57Z | JAC-4187 | JAC-3933 (in_review, unresolved) |
| Plan Runner | 2c6b1cc9 | claude-code/opus-4-8 | verified | idle | 2026-08-03T03:13:50Z | JAC-3628 | JAC-4388 (todo, Jack gate) + JAC-3629 (todo, dependency) |
| Kimi Code via Ringer | 3f1712eb | independent-review/kimi-for-coding/k3 | verified | idle | 2026-08-02T03:22:24Z | JAC-3596 | JAC-3592 (blocked, Luna recovery) |

maxParallel=1 each. Claude-code/OmniGent pool: 2 allowed, 0 in flight on free lanes (1 in flight on Aegis Coder X at capacity). Independent-review pool: 1 allowed, in-use by JAC-3596 dependency chain.

### Corrections vs. 13:17Z Evidence (none)

All upstream blocker statuses confirmed unchanged via live UUID-scoped API fetches:
- JAC-3933 (fc4eb2ca): status=in_review, assigneeAgentId=null — UNCHANGED
- JAC-4388 (4954a59f): status=todo, assigneeAgentId=null — UNCHANGED (Jack board-action gate)
- JAC-3592 (46839114): status=blocked, assigneeAgentId=2f92499a (Luna), executionWorkspaceId=ba32d39b (stale, no activeRunId) — UNCHANGED

### Excluded / Non-Routable (not capacity) — confirmed live

| Lane | Agent ID | Lane State | Model | Reason |
|---|---|---|---|---|
| Aegis Coder X | da00de99 | verified | ollama/qwen3-coder:30b | status=running on JAC-4511 (at capacity, maxParallel=1). CTX-SpO2 P=88 (host P89 gate down). NOT dispatched — capacity full + host not green. |
| Aegis Coder Y | 181f381b | error | ollama/qwen3-coder:30b | errorReason=Timed out after 12000s; NOT routable until clean re-probe. |
| Paperclip Agent Auditor | 5b2bece1 | quota_blocked | configured codex_local | codex usage limit until 2026-08-04; NOT routable. |
| Hermes Mistral | 1029acc4 | paused | deepseek-v4-pro | pauseReason=manual; hb ~15h stale; NOT routable while paused. |
| Flash | b37f4d70 | pending_repair | deepseek-v4-flash | errorReason=MCPServerTask event-loop-closed defect; pending repair, NOT routable. |
| Omnigent Router | 072eada2 | none | n/a | No executionLane; routing-only, NOT compute. |
| Wings | 80284e06 | reserved | deepseek-v4-pro | Strategic reserved (self). Excluded. Agent status=running (this heartbeat). |

### Upstream Blockers (confirmed live, fresh UUID-scoped fetch)

1. JAC-3933 (fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2): status=in_review, assignee=none. Unblocks Herald (JAC-4187). NOT resolved. blockerAttention.state=none.
2. JAC-4388 (4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3): status=todo, assignee=none (Jack board-action gate). Unblocks Plan Runner chain (JAC-3628 → JAC-3629 → JAC-4388). NOT resolved.
3. JAC-3592 (46839114-1e68-4296-bc60-9766da1f01d8): status=blocked, assignee=2f92499a (Luna High Planner). executionWorkspaceId=ba32d39b-93fc-4d09-b6e7-eb6694d94867 (stale, no activeRunId). blockerAttention.state=needs_attention. Unblocks Kimi (JAC-3596). NOT resolved.

### Active Runs

0 eligible worker runs on verified-idle lanes. JAC-4000 executionRunId=fdaf478d is this Wings heartbeat. JAC-4511 running on Aegis Coder X (at capacity, host gate down).

### Disposition

**in_progress (restart-ready)** — 0 dispatches, queue exhausted. No upstream blockers cleared. Awaiting native child-completion wake on JAC-3933 / JAC-4388 / JAC-3592-3593-3594.

All gate states confirmed via authenticated live API data (GET /api/companies/87c32b8e.../agents + /api/agents/{uuid} + /api/issues/{uuid}). No stale-log inference made. JAC-4000 remains in_progress for native child-completion continuation.
