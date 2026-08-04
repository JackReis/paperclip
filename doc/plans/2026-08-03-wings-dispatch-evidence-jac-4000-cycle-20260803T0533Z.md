# 2026-08-03T05:33Z — Wings dispatch evidence for JAC-4000

Cycle: 2026-08-03T05:33Z
Run: daf95c53-424b-4408-bf49-6f8de6504d65 (Wings, hermes_local)
API: http://127.0.0.1:3101/api — Paperclip v2026.722.0 (serverStarted 2026-08-02T00:38:49Z)
Method: fresh authenticated GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06) + UUID-scoped GET /api/issues/{uuid} for JAC-4000 and its outbound blocker graph (not identifier-substring search — JAC-4000 is not resolvable via the ?identifier= substring endpoint; fetched by canonical UUID 2c2b568e-ec92-486c-9fa9-d189750b0c5e).

## Dispatch Decision
**0 dispatches — queue exhausted.** No change in lane eligibility since 05:26Z. All three verified-idle free lanes carry assigned work whose upstream blockers are unresolved. No independent plan-backed unleased task was found in the unassigned-todo pool.

## Verified-Idle Free Lanes (3/3 eligible-by-lane, 0 dispatchable)

| Lane | Agent | Pool/Model | Lane State | Agent Status | HB (fresh?) | Assigned Issue | Blocker |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d-... | claude-code / claude-opus-4-8 | verified | idle | 03:12:37Z (< today, fresh) | JAC-4187 (blocked) | -> JAC-3933 in_review, JAC-3931 done, JAC-4491 done |
| Plan Runner | 2c6b1cc9-... | claude-code / claude-opus-4-8 | verified | idle | 03:13:50Z (fresh) | JAC-3628 (blocked) | -> JAC-3629 todo, JAC-4093 blocked -> JAC-3705 todo |
| Kimi Code via Ringer | 3f1712eb-... | independent-review / kimi-for-coding/k3 | verified | idle | 08-02T03:22 (~26h, verification current per lane receipt) | JAC-3596 (todo, parentId=bd78b074 Luna) | -> JAC-3592/3593/3594 in_progress (Luna) |

maxParallel=1 each (claude-code/OmniGent pool: 2 allowed, 1 in flight; independent-review pool: 1).

## Corrections vs. 05:26Z comment
- **Aegis Coder X (da00de99)**: 05:26Z reported `lane=verified, agent=error, "Process lost -- server may have restarted", hb 36h stale`. LIVE fetch at 05:33Z shows `status=running`, `errorReason=null`, hb `2026-08-03T05:32:13` (fresh, <2min). The agent/lane has **recovered**. Lane `state=verified`, `verification="WS1 re-probe: running, heartbeat fresh, no errorReason"`. HOWEVER: pool=local-aegis; per dispatch policy "local Aegis 2 only while host health is green" — current context P88 (P-gate DOWN), so Coder X remains NOT dispatched despite verified lane. No fresh authenticated generation failure recorded (recovery is real, not stale-log inference). Flagged for config-drift note: lane now recovered; host gate P still down.
- **Hermes Mistral (1029acc4)**: 404 confirmed (decommissioned/deleted). ✓ matches 05:26Z. Recommend removing from canonical lane pool.
- **Flash (b37f4d70)**: 05:26Z reported 404/decommissioned. LIVE fetch returns **HTTP 200**: `status=idle`, lane `state=pending_repair`, `errorReason="...MCPServerTask run at 0x... RuntimeError: Event loop is closed"`, hb `2026-07-30T22:53` (stale). Flash is **NOT decommissioned** — it is pending_repair, excluded per policy. 05:26Z over-reported this as 404. No config-drift action needed; pool entry correct (pending_repair, not routable).

## Excluded / Non-Routable Lanes
| Lane | Agent | State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | lane=verified, agent=running (RECOVERED) | Host P-gate DOWN (CTX P88). Policy: local Aegis only while host green. NOT dispatched. |
| Aegis Coder Y | 181f381b | lane=error | 12000s timeout defect; status=idle but lane error. NOT routable until clean re-probe. |
| Paperclip Agent Auditor | 5b2bece1 | lane=quota_blocked | Codex usage limit until 2026-08-04T23:09 CT; status=error. NOT routable. |
| Hermes Mistral | 1029acc4 | — | HTTP 404 GET /agents/{id} — decommissioned. Remove from pool. |
| Flash | b37f4d70 | lane=pending_repair | MCPServerTask event-loop-closed defect. NOT routable. |
| Omnigent Router | 072eada2 | no executionLane | Routing-only; status=idle. NOT a compute lane. |
| Wings | 80284e06 | lane=reserved | Strategic reserved (self). Excluded per policy. Current run daf95c53 active. |

## Active Runs / In-Flight Capacity
0 eligible dispatches. No lane carries a fresh `currentRunId`/`executionRunId` that constitutes new capacity. (JAC-4000's own executionRunId = daf95c53 is this Wings heartbeat, not worker capacity.)

## Unleased Todo Pool (sample, all policy-excluded)
- JAC-3671 (credential-bound — Restore Talaris anthropic + mistral credentials)
- JAC-4501, JAC-4500 (self-reviews of JAC-4000 / JAC-4139 productivity)
- JAC-4388 (board action / Jack approval gate — Repair Fable executionLane)
- JAC-3590 (dependent — Restore/designate Zatara lane)
- JAC-3705 (dependent — Canary efficient Hermes-local agents)
- JAC-3629 (dependent — Plan Runner notes-pc9x1)
- JAC-4046 (dependent — Stop Hermes gateway Telegram-token rotation)
- JAC-4503 (backlog — Ollama Cloud key recovery)
- JAC-4494 (backlog — test backlog, placeholder)
- JAC-4505 (blocked — MLX spike)

No newly-independent plan-backed task identified.

## Upstream Blockers (confirmed live, fresh fetch)
1. **JAC-3933** — `in_review`, assignee=null. Blocks Herald's JAC-4187 (JAC-4187 blockedBy includes JAC-3933 terminalBlocker). Also JAC-3933 is itself blocked? `blockedByIds=null` on JAC-3933; blockerAttention on JAC-3933 not fetched here, but its relatedWork.inbound on JAC-4190 references it. Unblocks Herald.
2. **JAC-4388** — `todo`, assignee=null, parentId=f57af738 (JAC-3629). Jack approval gate (board action). Unlocks Plan Runner chain (JAC-3628 -> JAC-3629 -> JAC-4388).
3. **JAC-3592 / JAC-3593 / JAC-3594** — `in_progress` (Luna). Block Kimi's JAC-3596 (JAC-3596 todo, parentId=bd78b074). Unlocks Kimi.

JAC-4000 itself: `blockerAttention.state=none`, `blockedByIds=[]`, `unresolvedBlockerCount=0` — the coordinator issue is not itself dependency-blocked; it waits on lane capacity which is dependency-blocked upstream.

## Disposition
in_progress (restart-ready). 0 dispatches. Native Paperclip child-completion continuation remains the liveness path: await child-completion wake on JAC-3933 (unblocks Herald), JAC-4388 (unblocks Plan Runner chain), and JAC-3592/3593/3594 (unblocks Kimi). No stale-log inference — all gate states from live authenticated GET /api/issues/{uuid}.
