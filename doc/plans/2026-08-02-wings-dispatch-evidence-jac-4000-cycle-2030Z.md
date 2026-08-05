# Dispatch Evidence — JAC-4000 Cycle 2026-08-02T20:30Z (run 39cb8b54)

- **Heartbeat run:** 39cb8b54-91db-4512-ac91-6bfab99e2035
- **Adapter:** hermes_local
- **Paperclip:** v2026.722.0, deploymentMode=local_trusted
- **Auth:** bearer=Wings (80284e06-41ab-415a-ba1c-6c3121debd0d) via X-Paperclip-Run-Id header

## Verified-idle free lanes (3/3 — all occupied by blocked upstream issues)

| Agent | Pool | laneState | verifiedAt | agentStatus | Assigned Todo | Verdict |
|---|---|---|---|---|---|---|
| Herald (a1e8cb0d) | claude-code | verified | 2026-07-31T19:56:00Z | idle | JAC-4187 (blocked→JAC-4184 done, JAC-3933 in_review, JAC-3931 done, JAC-4491 done) | No ready work — all upstream blocked/in_review |
| Plan Runner (2c6b1cc9) | claude-code | verified | 2026-07-31T19:56:00Z | idle | JAC-3628 (todo, blocked on JAC-4388→JAC-3629), JAC-4190 (blocked→JAC-4187), JAC-4462 (blocked), JAC-4093 (blocked, ws-leased) | No ready work — all upstream blocked |
| Kimi Code via Ringer (3f1712eb) | independent-review | verified | 2026-07-23T20:03:10Z | idle | JAC-3596 (todo, ws-leased, blocked on Luna JAC-3592/3593/3594 in_progress) | No ready work — upstream in_progress |

**Pool limits:** Claude Code/OmniGent = 2 (0/2 free; 2 occupied, no ready work); independent-review = 1 (0/1 free; 1 occupied, no ready work).

## Excluded lanes (6 — confirmed live, not routable)

| Agent | Pool | laneState | agentStatus | errorReason | Reason |
|---|---|---|---|---|---|
| Aegis Coder X (da00de99) | local-aegis | verified | error | Process lost -- server may have restarted | P89 gate down (CTX-SpO2 P:down); NOT routable |
| Aegis Coder Y (181f381b) | local-aegis | error | idle | Timed out after 12000s | Lane error — NOT routable |
| Paperclip Agent Auditor (5b2bece1) | codex | quota_blocked | error | Usage limit until Aug 4 23:09 PM CT | NOT routable until quota resets |
| Hermes Mistral (1029acc4) | ollama-cloud | paused | paused | (none) | Manual pause — NOT capacity |
| Flash (b37f4d70) | ollama-cloud | pending_repair | idle | MCPServerTask Event loop is closed | Defect — NOT routable |
| Wings (80284e06) | ollama-cloud | reserved | running | (none) | Strategic reserve — NOT routine dispatch |

## Upstream blockers (confirmed live via UUID-scoped GET /api/issues/{uuid})

| Issue | UUID | Status | Blocked By | Blocks |
|---|---|---|---|---|
| JAC-4388 | 4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3 | todo | [] (board action) | JAC-3629 → JAC-3628 → Plan Runner |
| JAC-3629 | f57af738-34fb-4f3a-9094-2416731d45d0 | blocked | [JAC-4388] | JAC-3628 → Plan Runner |
| JAC-4187 | b203d10f-eecf-4587-ba19-bd9a7f5d4b1b | blocked | [JAC-4184(done), JAC-3933(in_review), JAC-3931(done), JAC-4491(done)] | Plan Runner |
| JAC-3933 | fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2 | in_review | [] | JAC-4187 |
| JAC-4190 | aaed5fd3-fc39-4cf1-9c89-a132ac5c0b85 | blocked | [JAC-4187] | Plan Runner |
| JAC-4462 | e915780a-cc95-4a35-8a83-b463bccf5df1 | blocked | [] | Plan Runner |
| JAC-3596 | 23c04a76-669d-4a1f-a216-2d68218810ef | todo | [JAC-3595(done), JAC-3592(in_progress), JAC-3594(in_progress), JAC-3593(in_progress)] | Kimi |
| JAC-4093 | d27f48db-5bf0-4c81-abce-cabea2528d9d | blocked | [] (ws=leased) | Aegis Coder X |

## Unassigned todo queue scan (5 candidates, 0 eligible)

| Issue | Priority | Title | Exclusion |
|---|---|---|---|
| JAC-3671 | critical | Restore Talaris anthropic + mistral credentials | credential-bound |
| JAC-4501 | high | Review productivity for JAC-4000 | review/meta |
| JAC-4500 | high | Review productivity for JAC-4139 | review/meta |
| JAC-4388 | high | [board action] Repair Fable executionLane | board action |
| JAC-3714 | high | [Aegis] Install Nix (approval-gated; requires interactive sudo) | approval-gated / interactive sudo |
| JAC-3557 | high | [Human gate] Complete Prius mobile 12V test | human gate |
| JAC-3555 | high | [Human gate] Submit Belmont records | human gate |

Additional unassigned todos (JAC-4216, JAC-4217, JAC-3714) are workspace-leased — excluded as already leased.

## Verdict: 0 dispatches — queue exhausted

**Root cause analysis:**
- 3 verified-idle free lanes exist (Herald, Plan Runner, Kimi) but each has assigned todos that are upstream-blocked.
- 6 lanes are excluded (error, quota_blocked, paused, pending_repair, reserved) — none represent routable capacity.
- All 5 unassigned todo candidates are policy-excluded (credential-bound, review/meta, board action, approval-gated with interactive sudo, human gates).
- No independent plan-backed task found.
- No fresh authenticated generation failures on any verified lane (no quota/log inference).

**Liveness path:** Native Paperclip child-completion continuation on upstream resolution:
- JAC-4388 (board action) → unblocks JAC-3629 → unblocks JAC-3628 → Plan Runner
- Luna JAC-3592/3593/3594 (in_progress) → unblocks JAC-3596 → Kimi
- JAC-4187 → unblocks JAC-4190 → Plan Runner + Herald
- JAC-3933 (in_review) → unblocks JAC-4187
- JAC-4093 + P89 recovery → unblocks JAC-3705 → Aegis Coder X

**Fallback schedule:** JAC-4171, JAC-4173 (coordinator sibling checks) remain queued for next heartbeat.

**Disposition:** in_progress (restart-ready), awaiting native child-completion continuation.
