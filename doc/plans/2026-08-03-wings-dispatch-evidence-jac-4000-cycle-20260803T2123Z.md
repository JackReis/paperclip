# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T21:23Z

**Run:** 5261cc63-3647-4ff6-9443-d2c8fb447ae6 (Wings, hermes_local)
**Verified at:** 2026-08-03T21:23Z
**Paperclip API:** v2026.722.0, deploymentMode local_trusted
**Fetch method:** Authenticated GET /api/agents/{uuid} + GET /api/companies/{cid}/agents (bulk) + paginated GET /api/companies/{cid}/issues (10 pages, 50 per page) + UUID-scoped GET /api/issues/{uuid}

## Dispatch Decision: 0 dispatches — queue exhausted

## Verified Lanes (state=verified)

| Agent | UUID (8-char) | Pool | Model | State | Last HB | Agent Status | Active Run? | Dispatchable? |
|---|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | idle | No | 0 dispatchable (all assigned work blocked) |
| Plan Runner | 2c6b1cc9 | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | idle | No | 0 dispatchable (all assigned work blocked/review) |
| Kimi Code via Ringer | 3f1712eb | independent-review | kimi-k3 | verified | 2026-07-23T20:03:10Z | idle | No | 0 dispatchable (blocked by Luna JAC-3592) |
| Aegis Coder X | da00de99 | local-aegis | qwen3-coder:30b | verified | 2026-08-03T20:40:00Z | running | Yes (status=running, errorReason stale) | NOT ROUTABLE |

## Herald Assigned Issues (UUID-scoped verification)

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-4422 | 815f1342 | blocked | none | No |
| JAC-3876 | f08d86d6 | blocked | none | No |
| JAC-3494 | c485fbcf | blocked | none | No |
| JAC-4081 | b6044613 | blocked | JAC-3628 | No |
| JAC-4265 | 55fefa67 | backlog | none | No (not plan-backed for dispatch) |
| JAC-4069 | 77914391 | blocked | JAC-4073 | No |

Total dispatchable: 0

## Plan Runner Assigned Issues (UUID-scoped verification)

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-4190 | aaed5fd3 | in_review | JAC-4187 (done) | No (in review, Jack gate) |
| JAC-4462 | e915780a | blocked | none | No |
| JAC-4093 | d27f48db | blocked | none | No |

Total dispatchable: 0

## Kimi Code via Ringer Assigned Issues

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-3596 | 23c04a76 | todo | JAC-3592 (blocked, Luna) | No (dependent on Luna) |

JAC-3592 is assigned to Luna (2f92499a), status=blocked. Per policy, dependent/blocked work is excluded from capacity.

Total dispatchable: 0

## Aegis Coder X (NOT ROUTABLE)

- Agent UUID: da00de99-f978-4296-b969-c1b7c663a3c7
- Agent status: running (errorReason: "Process lost -- child pid 61985 is no longer running" — stale in agent record, but errorReason field still populated)
- Last heartbeat: 2026-08-03T20:40:00.829Z
- executionLane: state=verified, pool=local-aegis, model=qwen3-coder:30b, verifiedAt=2026-07-31T19:56:00Z
- Lane-level verification note (updated): "WS1 re-probe: running, heartbeat fresh, no errorReason"
- Assigned issue: JAC-3705 (todo, high priority, "Canary efficient Hermes-local agents...") — plan-backed, not blocked
- Host P87 gate: down (CTX-SpO2 P:down)
- Lane is verified, but agent status=running with stale errorReason and active assignment (JAC-3705) → NOT ROUTABLE. Agent is occupied and host gate is down.

## Excluded Lanes (not capacity)

| Agent | UUID (8-char) | Pool | State/Reason |
|---|---|---|---|
| Wings (self) | 80284e06 | ollama-cloud | reserved (this wake cause) |
| Aegis Coder X | da00de99 | local-aegis | verified lane, but agent=running, errorReason stale, host P87 down, NOT ROUTABLE |
| Aegis Coder Y | 181f381b | local-aegis | error (12000s timeout defect) |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused (manual) |
| Flash | b37f4d70 | ollama-cloud | pending_repair |
| Flash Executor | d22538a9 | (none) | error, no executionLane metadata |
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked (until Aug 4) |
| Luna High Planner | 2f92499a | (none) | no executionLane metadata |

## Unassigned TODO Queue

Scanned 10 pages (limit=50 per page) of /api/companies/{cid}/issues, filtered client-side for status=todo AND assigneeAgentId=null.

| JAC | UUID | Title | Policy Exclusion |
|---|---|---|---|
| JAC-4501 | 05ec43fa | Review productivity for JAC-4000 | Self-referential meta-task on current coordinator issue; not plan-backed worker task |
| JAC-3671 | 3b4fd83f | Restore Talaris anthropic + mistral credentials | Credential-bound → explicitly excluded from dispatch capacity |

Total dispatchable unassigned: 0

Note: The `assigneeAgentId=null` query parameter is non-functional (returns 0 results regardless of filter). Pagination was used across all 10 pages with client-side filtering instead.

## Active Runs

- Wings (JAC-4000): in_progress, this heartbeat (coordinator)
- Aegis Coder X (JAC-3705): agent status=running, JAC-3705 assigned (todo but agent is in active running state with stale errorReason)

All other verified-idle lanes: no active runs.

## Change Since Previous Cycle (21:06Z)

The 21:06Z comment noted Aegis Coder X in error state ("Process lost -- child pid 61985"). On this re-verification at 21:23Z:
- The lane-level verification metadata note was updated to "WS1 re-probe: running, heartbeat fresh, no errorReason"
- However, the agent-level `errorReason` field still reads "Process lost -- child pid 61985 is no longer running"
- The agent `status` remains "running" (not reverted to idle)
- Host P87 gate remains down per CTX-SpO2
- JAC-4511 (previously in_progress on this agent) is no longer found in issue listings — likely resolved
- JAC-3705 remains assigned (todo) to this agent

The agent is still NOT ROUTABLE: status=running with stale errorReason and host P87 gate down means the lane is occupied and host health is red.

## Disposition

**in_progress (restart-ready)** — awaiting native child-completion wake on:
- JAC-4187 (done) → Herald dispatchable once upstream unblocks
- JAC-4388 → Plan Runner downstream tasks
- JAC-3592/3593/3594 (Luna) → Kimi Code via Ringer (JAC-3596 blocked by JAC-3592)
- Aegis Coder X host P87 gate recovery → JAC-3705 dispatchable

No independent plan-backed unassigned task found. No fresh generation failures on verified lanes. No stale-log inference — all gates confirmed via live API metadata.executionLane and agent status fields.
