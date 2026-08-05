# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-02T20:42Z

**Run ID:** 2f953eb2-4125-4ddf-9ac8-c1ee7317431b
**Date:** 2026-08-02
**Issue:** JAC-4000 — Coordinator Fleet Coordination Check
**Verdict:** 0 dispatches — queue exhausted

## Fresh authenticated live verification

Performed at 2026-08-02T20:42Z via authenticated GET
`/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` (bearer=Wings 80284e06)
and UUID-scoped GET `/api/issues/{uuid}` (Paperclip v2026.722.0, deploymentMode=local_trusted).
All gate states confirmed via live API `metadata.executionLane.state` — no stale-log inference.

## Verified-idle free lanes (0 eligible for dispatch)

| Agent | Pool | laneState | verifiedAt | agentStatus | Assigned Todo | Verdict |
|---|---|---|---|---|---|---|
| Herald (a1e8cb0d) | claude-code | verified | 2026-07-31T19:56:00Z | idle | JAC-4187 (blocked), JAC-4422 (blocked), JAC-3876 (blocked), JAC-3494 (blocked), JAC-4081 (blocked), JAC-4069 (blocked), JAC-3716 (blocked) | No ready work — all upstream blocked |
| Plan Runner (2c6b1cc9) | claude-code | verified | 2026-07-31T19:56:00Z | idle | JAC-4190 (blocked), JAC-4462 (blocked), JAC-3628 (todo, blocked on JAC-4388→3629), JAC-3665 (blocked), JAC-4105 (blocked), JAC-4093 (blocked, ws=leased), JAC-4348 (blocked) | No ready work — all upstream blocked |
| Kimi Code via Ringer (3f1712eb) | independent-review | verified | 2026-07-23T20:03:10Z | idle | JAC-3596 (todo, ws=leased, blocked on Luna JAC-3592/3593/3594 in_progress) | No ready work — upstream in_progress |

**Pool limits:** Claude Code/OmniGent = 2 (0/2 free; 2 occupied, no ready work);
independent-review = 1 (0/1 free; 1 occupied, no ready work).

## Excluded lanes (confirmed live)

| Agent | Pool | laneState | agentStatus | Reason |
|---|---|---|---|---|
| Aegis Coder X (da00de99) | local-aegis | verified | error | Process lost — server may have restarted; P89 gate down (CTX-SpO2 P:down) |
| Aegis Coder Y (181f381b) | local-aegis | error | idle | Lane error (Timed out after 12000s); NOT routable |
| Paperclip Agent Auditor (5b2bece1) | codex | quota_blocked | error | Usage limit until Aug 4 23:09 PM CT — NOT routable |
| Hermes Mistral (1029acc4) | ollama-cloud | paused | paused | Manual pause — NOT capacity |
| Flash (b37f4d70) | ollama-cloud | pending_repair | idle | MCPServerTask Event loop is closed defect — NOT capacity |
| Wings (self) (80284e06) | ollama-cloud | reserved | running | Strategic reserve — NOT routine dispatch |

## Upstream blockers (confirmed live via UUID-scoped GET /api/issues/{uuid})

| Issue | UUID | Status | Blocked By | Blocks |
|---|---|---|---|---|
| JAC-4388 | 4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3 | todo | [] (board action) | JAC-3629 → JAC-3628 → Plan Runner |
| JAC-3629 | f57af738-34fb-4f3a-9094-2416731d45d0 | blocked | [JAC-4388] | JAC-3628 → Plan Runner |
| JAC-4187 | b203d10f-eecf-4587-ba19-bd9a7f5d4b1b | blocked | [JAC-4184 done, JAC-3933 in_review, JAC-3931 done, JAC-4491 done] | JAC-4190 → Plan Runner |
| JAC-3933 | fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2 | in_review | [] | JAC-4187 |
| JAC-4190 | aaed5fd3-fc39-4cf1-9c89-a132ac5c0b85 | blocked | [JAC-4187] | Plan Runner |
| JAC-4462 | e915780a-cc95-4a35-8a83-b463bccf5df1 | blocked | [] | Plan Runner |
| JAC-3596 | 23c04a76-669d-4a1f-a216-2d68218810ef | todo | [JAC-3592 in_progress, JAC-3593 in_progress, JAC-3594 in_progress] | Kimi |
| JAC-4093 | d27f48db-5bf0-4c81-abce-cabea2528d9d | blocked | [] (ws=leased) | JAC-3628 → Plan Runner |

## Unassigned todo queue (0 eligible)

| Issue | Priority | Exclusion |
|---|---|---|
| JAC-3671 | critical | credential-bound — NOT routable |
| JAC-4500 | high | review/meta — NOT dispatchable |
| JAC-4501 | high | review/meta — NOT dispatchable |
| JAC-4388 | high | board action — NOT routable |
| JAC-4217 | high | Jack decision gate — NOT routable |
| JAC-4216 | high | Jack decision gate — NOT routable |
| JAC-3714 | high | approval-gated / interactive sudo — NOT routable |
| JAC-3558 | high | human gate — NOT routable |
| JAC-3557 | high | human gate — NOT routable |
| JAC-3555 | high | human gate — NOT routable |
| JAC-4171 | medium | coordinator sibling check (fallback schedule) |
| JAC-4173 | medium | coordinator sibling check (fallback schedule) |

## Verdict

0 dispatches — queue exhausted. State unchanged from the 20:30Z cycle.

- All 3 verified-idle free lanes (Herald, Plan Runner, Kimi) have assigned work blocked upstream.
- All 6 excluded lanes are not routable (error, quota_blocked, paused, pending_repair, reserved).
- All 5 unassigned high-priority todo candidates are policy-excluded (credential-bound, review/meta, board action, Jack decision gates, human gates).
- No independent plan-backed task found.
- No fresh authenticated generation failures on any verified lane.

## Liveness path

Native Paperclip child-completion continuation on upstream resolution:
- JAC-4388 (board action) → unblocks JAC-3629 → unblocks JAC-3628 → Plan Runner
- Luna JAC-3592/3593/3594 (in_progress) → unblocks JAC-3596 → Kimi
- JAC-4187 → unblocks JAC-4190 → Plan Runner + Herald
- JAC-3933 (in_review) → unblocks JAC-4187
- JAC-4093 + P89 recovery → unblocks JAC-3705 → Aegis Coder X

## Fallback schedule

JAC-4171 and JAC-4173 (coordinator sibling checks) queued for next heartbeat.

## Disposition

in_progress (restart-ready), awaiting native child-completion continuation on
upstream resolution. No dispatch, no issue state mutation, no credential
changes.