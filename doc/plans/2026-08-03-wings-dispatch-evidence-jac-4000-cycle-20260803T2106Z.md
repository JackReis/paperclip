# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T21:06Z

**Run:** 63d00715-5c1e-45ea-abcd-5b886e434424 (Wings, hermes_local)
**Verified at:** 2026-08-03T21:06Z
**Paperclip API:** v2026.722.0, deploymentMode local_trusted
**Fetch method:** Authenticated GET /api/companies/{cid}/agents + bulk issue listing (pages 1-80, 50 per page) + UUID-scoped GET /api/issues/{uuid} for each lane-assigned issue

## Dispatch Decision: 0 dispatches — queue exhausted

## Verified Lanes (state=verified, idle)

| Agent | Agent UUID (8-char) | Pool | Model | State | Last HB | Active Run? | Assigned Issues | Dispatchable |
|---|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | No | 6 (see below) | 0 |
| Plan Runner | 2c6b1cc9 | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | No | 3 (see below) | 0 |
| Kimi Code via Ringer | 3f1712eb | independent-review | kimi-k3 | verified | 2026-07-23T20:03:10Z | No | 1 (see below) | 0 |
| Aegis Coder X | da00de99 | local-aegis | qwen3-coder:30b | verified | 2026-08-03T20:40:00Z | YES (in error) | 1 | 0 (NOT ROUTABLE) |

## Herald Assigned Issues (UUID-scoped verification)

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-4422 | 815f1342 | blocked | none | No |
| JAC-3876 | f08d86d6 | blocked | none | No |
| JAC-3494 | c485fbcf | blocked | none | No |
| JAC-4081 | b6044613 | blocked | JAC-3628 (blocked→JAC-3634 todo) | No |
| JAC-4265 | 55fefa67 | backlog | none | No (not plan-backed for dispatch) |
| JAC-4069 | 77914391 | blocked | JAC-4073 (blocked) | No |

Total dispatchable: 0

## Plan Runner Assigned Issues (UUID-scoped verification)

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-4190 | aaed5fd3 | in_review | JAC-4186 (done), JAC-4187 (done), JAC-4185 (done) | No (in review, Jack gate) |
| JAC-4462 | e915780a | blocked | none | No |
| JAC-4093 | d27f48db | blocked | none | No |

Total dispatchable: 0 (in_review, blocked, blocked)

## Kimi Code via Ringer Assigned Issues

| JAC | UUID | Status | BlockedBy | Dispatchable? |
|---|---|---|---|---|
| JAC-3596 | 23c04a76 | todo | JAC-3595 (done), JAC-3592 (blocked), JAC-3594 (todo), JAC-3593 (todo) | No (blocked by JAC-3592) |

JAC-3592 is assigned to Luna (2f92499a), status=blocked, and has an active recovery action (owner: Luna, cause: successful_run_missing_state). Per policy, dependent/blocked work is excluded from capacity.

Total dispatchable: 0

## Aegis Coder X (NOT ROUTABLE)

- Agent UUID: da00de99
- Agent status: running (error)
- ErrorReason: "Process lost -- child pid 61985 is no longer running"
- Last heartbeat: 2026-08-03T20:40:00Z
- executionLane: state=verified, pool=local-aegis, model=qwen3-coder:30b, verifiedAt=2026-07-31T19:56:00Z
- execRunId on JAC-4511 (in_progress, assignee=da00de99)
- Host P87 gate: down (CTX-SpO2 P:down)
- Lane is verified but agent is in error state → NOT ROUTABLE

## Excluded Lanes (not capacity)

| Agent | UUID (8-char) | Pool | State/Reason |
|---|---|---|---|
| Wings (self) | 80284e06 | ollama-cloud | reserved (this wake cause) |
| Aegis Coder Y | 181f381b | local-aegis | error |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused |
| Flash | b37f4d70 | ollama-cloud | pending_repair |
| Flash Executor | d22538a9 | (none) | error, no executionLane metadata |
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked (until Aug 4) |
| Luna High Planner | 2f92499a | (none) | no executionLane metadata |
| Codex Auditor | 5b2bece1 | codex | quota_blocked (until Aug 4) |

## Unassigned TODO Queue

Search across 80 pages (limit=50 per page) of /api/companies/{cid}/issues. The `assigneeAgentId=null` filter is non-functional (same issues repeat on each page). The truly unassigned TODO issues are:

| JAC | UUID | Title | Policy Exclusion |
|---|---|---|---|
| JAC-4501 | 05ec43fa | Review productivity for JAC-4000 | Child of JAC-4000 (self); productivity-review origin |
| JAC-4217 | 1c3b2728 | DECISION (Jack): migrate autonomous Paperclip org | Human gate (Jack decision) |
| JAC-4216 | 7ed3f97e | DECISION (Jack): re-enable ollama-cloud | Human gate (Jack decision) |
| JAC-3361 | (via identifier) | "I already have the codes / know the symptoms" | Personal task, not plan-backed |
| JAC-3970 | (via identifier) | Dispatch JAC-3705 to... | Meta-dispatch task for JAC-3705 (depends on Plan Runner) |
| JAC-3541 | (via identifier) | TEST_DELETE | Test artifact |

Total dispatchable unassigned: 0

## Active Runs

- Wings (JAC-4000): in_progress, this heartbeat
- Aegis Coder X (JAC-4511): in_progress but in error state ("Process lost -- child pid 61985")

All other verified-idle lanes: no active runs.

## Note on `assigneeAgentId=null` Query

The `assigneeAgentId=null` query parameter returns 0 results. Instead, the full bulk listing was paginated across all 80 pages and filtered client-side for issues with `assigneeAgentId is None`. The same issues (JAC-4501, JAC-4217, JAC-4216, JAC-3361, JAC-3970, JAC-3541) repeat on every page, indicating the query/filter is applied server-side incorrectly or the API returns the same result regardless of pagination parameters.

## Note on Identifier Search Route

The `/api/companies/{cid}/issues?identifier=JAC-{num}` route is buggy — it returns JAC-3929 (UUID 4c051d46) as the first result for any searched identifier, rather than the actual requested issue. UUID-scoped `GET /api/issues/{uuid}` was used instead for authoritative state.

## Disposition

**in_progress (restart-ready)** — awaiting native child-completion wake on:
- JAC-4187 (done) → Herald dispatchable once upstream unblocks
- JAC-4388 (done) → Plan Runner downstream tasks
- JAC-3592/3593/3594 (Luna) → Kimi Code via Ringer (JAC-3596 blocked by JAC-3592)
- JAC-3705 (in_progress on Aegis Coder X) → pending host P87 recovery

No independent plan-backed task found. No fresh generation failures. No stale-log inference — all gates confirmed via live API metadata.executionLane.