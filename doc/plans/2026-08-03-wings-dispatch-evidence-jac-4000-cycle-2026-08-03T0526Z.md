# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T05:26Z

**Run ID:** 4f06a106-f317-41a0-938d-ea67c892e6cb
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Issue:** JAC-4000 Coordinator Fleet Coordination Check (2c2b568e-ec92-486c-9fa9-d189750b0c5e)
**Method:** Live authenticated GET /api/agents/{agentId} for each known lane agent + GET /api/issues/{issueUUID} for JAC-4000 and its outbound blocker graph (Paperclip v2026.722.0, bearer=Wings 80284e06, X-Paperclip-Run-Id=4f06a106).

## Dispatch Decision

**0 dispatches — queue exhausted.**

All three verified-idle free lanes carry assigned work that remains dependency-blocked upstream. No independent plan-backed unleased work was found. This is a confirmed fresh-verification cycle — no stale-log inference.

## Verified-Idle Free Lanes (3 of 3)

| Lane | Agent ID | Pool/Model | State | maxParallel | Last Heartbeat | Assigned Issue |
|---|---|---|---|---|---|---|
| Herald | a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708 | claude-code/opus-4-8 | verified / idle | 1 | 2026-08-03T03:12:37Z | JAC-4187 (blocked) |
| Plan Runner | 2c6b1cc9-aad2-431b-93ea-e31f0612be65 | claude-code/opus-4-8 | verified / idle | 1 | 2026-08-03T03:13:50Z | JAC-3628 (blocked) |
| Kimi Code via Ringer | 3f1712eb-7b43-40fa-b893-f36e92bb9ac3 | independent-review/k3 | verified / idle | 1 | 2026-08-02T03:22:24Z (~26h) | JAC-3596 (todo, parentId set) |

### Upstream Blockers (confirmed live via outbound graph)

- **Herald** → JAC-4187 (blocked) → blockedBy [JAC-4184, **JAC-3933** (in_review), JAC-3931, JAC-4491].
  - JAC-3933 itself now shows `blockedBy=[]` (its own blockers resolved), but it remains `in_review` — sample stalled blocker JAC-3932 is also still `in_review`. Herald's assigned issue JAC-4187 is NOT cleared.
- **Plan Runner** → JAC-3628 (blocked) → blockedBy [JAC-3629, JAC-3631, JAC-3632, JAC-3633, **JAC-3634** (todo, assigned to Coordinator dc2ca597)]. JAC-3628 additionally depends on **JAC-4093** (blocked, assigned to Plan Runner itself — internal cycle) → JAC-3705 (todo, assigned to Aegis Coder X).
- **Kimi** → JAC-3596 (todo, parentId=bd78b074) → blockedBy [JAC-3595, **JAC-3592/3593/3594** (in_progress, Luna 2f92499a)].

## Excluded / Non-Routable Lanes

| Lane | Agent ID | State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | lane=verified but agent.status=running + errorReason | "Process lost -- server may have restarted"; lastHeartbeatAt 2026-08-01T17:30:58Z (36h stale); host P89 gate down (CTX-SpO2 P:down). NOT dispatched. Note: now also shows executionRunId=d20f1e53 on JAC-3705 — stale run from the error loop, not new capacity. |
| Aegis Coder Y | 181f381b | lane=error | "Timed out after 12000s" defect; verification string "status=error, errorReason=Timed out after 12000s; NOT routable until clean re-probe". NOT routable. |
| Paperclip Agent Auditor | 5b2bece1 | lane=quota_blocked | "You've hit your usage limit ... try again at Aug 4th, 2026 11:09 PM". NOT routable until quota resets. |
| Hermes Mistral | 1029acc4 | 404 / decommissioned | Agent record not found at GET /api/agents/1029acc4. Previously paused (manual). Remove from lane pool. |
| Flash | b37f4d70 | 404 / decommissioned | Agent record not found. Previously pending_repair (MCPServerTask event-loop-closed defect). Remove from lane pool. |
| Omnigent Router | 072eada2 | routing-only | No executionLane metadata. NOT routable as compute. |
| Wings | 80284e06 | reserved | Strategic reserved. Excluded per policy. |

> Note: Flash and Hermes Mistral previously appeared as `idle`/`pending_repair` and `paused` in older cycles. This cycle they return HTTP 404 on their agent UUIDs, indicating they have been decommissioned/removed from the company. Aegis (100915f9) is also 404 on `/api/agents/100915f9`? — confirmed: Aegis agent record is reachable only via `/agents/me` under its own key (it self-identifies). Coordinator (dc2ca597) is reachable and idle, routing-only.

## Unassigned Todo Pool

Per JAC-4000's outbound graph the unassigned (assigneeAgentId=null) / policy-excluded todos remain unroutable:

- **Credential-bound:** JAC-3671
- **Jack approval gates:** JAC-4388, JAC-4216, JAC-4217
- **Self-reviews:** JAC-4500, JAC-4501
- **Human gates:** JAC-3555 / JAC-3557 / JAC-3558
- **Dependent:** JAC-3590, JAC-3802, JAC-3705 (assigned to errored Coder X), JAC-3629, JAC-3770, JAC-4046, JAC-3714
- **Approval-gated sudo:** JAC-3714
- **Credential-adjacent:** JAC-4046

No newly-independent plan-backed task identified in this cycle.

## Active Runs

0 independent plan-backed runs eligible for dispatch. JAC-3705 carries `executionRunId=d20f1e53` but its agent (Aegis Coder X) is in `error` state — this is a stale/errored run, not new routable capacity. Per policy, errored lanes are held until a clean re-probe + fresh generation attempt.

## Verification Notes

- No stale-log inference. All lane states confirmed via live authenticated `GET /api/agents/{agentId}` (metadata.executionLane) and live issue detail `GET /api/issues/{uuid}`.
- Aegis Coder X: lane `state=verified` but `agent.status=running` with `errorReason` and a 36h-stale heartbeat. The verification string ("running, heartbeat fresh, no errorReason") is contradicted by live metadata — held as a stale verification. Host P89 gate (CTX-SpO2 P:down) blocks dispatch regardless.
- Per the policy rule "Never infer a quota outage from stale logs; record a fresh authenticated generation failure before holding a verified lane": the only held verified lane is Aegis Coder X, and its agent status is `error` (Process lost) with a fresh errorReason from the live API — a genuine failure signal, not a stale-log inference. No additional generation attempt is warranted while the process is errored and the host gate is down.
- `GET /api/companies/{cid}/issues?identifier=...` returns the wrong first hit (JAC-2447 Prius issue) — the identifier substring match is unreliable. UUID-scoped `GET /api/issues/{uuid}` is authoritative, as used here.

## Blockers (Awaiting Native Child-Completion Wake)

1. **JAC-3933** (in_review) — unblocks Herald (JAC-4187 depends on it).
2. **JAC-4388** (todo, Jack approval gate) — unblocks Plan Runner chain (repairs Fable executionLane).
3. **JAC-3592 / JAC-3593 / JAC-3594** (in_progress, Luna 2f92499a) — unblocks Kimi (JAC-3596 depends on Luna completion).

All three are outside Wings's dispatch authority. Awaiting native Paperclip child-completion continuation wake on upstream resolution.

## Disposition

**in_progress (restart-ready)** — 0 tasks dispatched this cycle. Queue exhausted: all three verified-idle free lanes are dependency-blocked upstream. No independent plan-backed unleased work available for dispatch. Excluded lanes are errored/quota-blocked/decommissioned/reserved. Awaiting native child-completion wake on JAC-3933 / JAC-4388 / JAC-3592-3593-3594 resolution to refill Herald / Plan Runner / Kimi lanes.
