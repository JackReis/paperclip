# 2026-08-03T05:45Z — Wings dispatch evidence for JAC-4000

Cycle: 2026-08-03T05:45Z
Run: 219aa4bc-e3ae-44df-9b57-0020eb259fc6 (Wings, hermes_local)
API: http://127.0.0.1:3101/api — Paperclip v2026.722.0 (serverStarted 2026-08-02T00:38:49Z)
Method: fresh authenticated GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06) + UUID-scoped GET /api/issues/{uuid} for JAC-4000 and its outbound blocker graph.

## Dispatch Decision
**0 dispatches — queue exhausted.** No change in lane eligibility since 05:33Z. All three verified-idle free lanes carry assigned work whose upstream blockers are unresolved. No independent plan-backed unleased task was found in the unassigned-todo pool.

## JAC-4000 Self-Status
- status: in_progress
- assigneeAgentId: 80284e06-41ab-415a-ba1c-6c3121debd0d (Wings)
- blockerAttention.state: none (coordinator NOT itself dependency-blocked)
- blockedByIds: None
- The issue waits on upstream lane capacity, not on its own blockers.

## Verified-Idle Free Lanes (3/3 eligible-by-lane, 0 dispatchable)

| Lane | Agent | Pool/Model | Lane State | Agent Status | HB (fresh?) | Assigned Issue | Blocker |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d-... | claude-code / claude-opus-4-8 | verified | idle | 03:12:37Z (fresh) | JAC-4187 (blocked) | -> JAC-3933 in_review, JAC-4494 attention, JAC-3933 stalled |
| Plan Runner | 2c6b1cc9-... | claude-code / claude-opus-4-8 | verified | idle | 03:13:50Z (fresh) | JAC-3628 (blocked) | -> JAC-3634 attention, JAC-3629 todo, JAC-4093 blocked |
| Kimi Code via Ringer | 3f1712eb-... | independent-review / kimi-for-coding/k3 | verified | idle | 08-02T03:22 (~26h, verification current per lane receipt) | JAC-3596 (todo, parentId=Luna) | -> JAC-3592/3593/3594 in_progress (Luna) |

maxParallel=1 each (claude-code/OmniGent pool: 2 allowed, 1 in flight; independent-review pool: 1).

## Upstream Blocker Status (freshly fetched)
1. **JAC-3933** (fc4eb2ca) — status=in_review, priority=high, assignee=None. Unblocks Herald's JAC-4187. Still in_review — NOT resolved.
2. **JAC-4388** (4954a59f) — status=todo, priority=high, assignee=local-board. Jack approval gate. Unblocks Plan Runner chain (JAC-3628 -> JAC-3629 -> JAC-4388). Still todo — NOT resolved.
3. **JAC-3592** (46839114) — status=in_progress, assignee=Luna (2f92499a). Unblocks Kimi's JAC-3596.
4. **JAC-3593** (8b616780) — status=in_progress, assignee=Luna (2f92499a).
5. **JAC-3594** (feacb699) — status=in_progress, assignee=Luna (2f92499a).
   All three Luna tasks still in_progress — JAC-3596 remains blocked upstream.

### Assigned-issue blockerAttention details
- JAC-4187 (Herald): blockerAttention.state=needs_attention, 2 unresolved blockers (JAC-4494 sample, JAC-3933 stalled).
- JAC-3628 (Plan Runner): blockerAttention.state=needs_attention, 2 unresolved blockers (JAC-3634 sample, JAC-3629).
- JAC-3596 (Kimi): blockerAttention.state=none (todo, not yet blocked by Paperclip's attention model — blocked by Luna in_progress dependency chain, not Paperclip blocker projection).

## Excluded / Non-Routable Lanes
| Lane | Agent | Lane State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | verified | Host P-gate DOWN (CTX P88). Policy: local Aegis only while host green. NOT dispatched. Agent recovered (running, fresh hb), but host gate still down. |
| Aegis Coder Y | 181f381b | error | 12000s timeout defect. NOT routable until clean re-probe. |
| Paperclip Agent Auditor | 5b2bece1 | quota_blocked | Codex limit until Aug 4. NOT routable. |
| Hermes Mistral | 1029acc4 | paused | 404 (decommissioned). Recommend removing from canonical pool. |
| Flash | b37f4d70 | pending_repair | MCPServerTask event-loop-closed defect. NOT routable. |
| Omnigent Router | 072eada2 | (none) | Routing-only. NOT compute. |
| Wings | 80284e06 | reserved | Strategic reserved (self). Excluded per policy. |

## Active Runs
0 eligible worker runs. JAC-4000 executionRunId=219aa4bc is this Wings heartbeat, not worker capacity.

## Remaining Unleased Pool (sample, all policy-excluded)
JAC-3671 (credential-bound); JAC-4501 (self-review); JAC-4500 (self-review); JAC-4494 (backlog/test); JAC-4503 (backlog); JAC-4505 (blocked, depends on Herald); JAC-3705 (todo, depends on Coder X).

No newly-independent plan-backed task.

## Disposition
in_progress (restart-ready). Awaiting native child-completion wake on:
- JAC-3933 (unblocks Herald / JAC-4187)
- JAC-4388 (unblocks Plan Runner chain → JAC-3628 → JAC-3629)
- JAC-3592/3593/3594 (unblocks Kimi / JAC-3596)

Liveness fallback: Paperclip native child-completion continuation (the 05:33Z comment was the most recent; no new wake signal arrived since).
