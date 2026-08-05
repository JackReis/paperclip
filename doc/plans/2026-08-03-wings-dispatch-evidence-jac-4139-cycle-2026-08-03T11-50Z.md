# JAC-4139 Dispatch Evidence — Cycle 2026-08-03T11:50Z

**Run:** 1add3543-6795-47f7-8fe6-35713fc16734 (Wings, hermes_local)
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Verified:** Authenticated live API at 2026-08-03T11:48–11:59Z

## 1. Live Agent Table (executionLane metadata)

Authenticated GET http://127.0.0.1:3101/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents

### Verified-idle free lanes (eligible but blocked upstream)

| Agent | UUID | Pool | Provider/Model | State | Last HB |
|---|---|---|---|---|---|
| Herald | a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708 | claude-code | claude-opus-4-8 via omnigent | verified/idle | 07:41Z |
| Plan Runner | 2c6b1cc9-aad2-431b-93ea-e31f0612be65 | claude-code | claude-opus-4-8 via omnigent | verified/idle | 03:13Z |
| Kimi Code via Ringer | 3f1712eb-7b43-40fa-b893-f36e92bb9ac3 | independent-review | kimi-for-coding/k3 via ringer | verified/idle | Aug 2 03:22Z |

- All three have assigned todo work blocked upstream (see Section 3). No dispatchable independent task.

### Active run on verified lane

| Agent | UUID | Pool | Provider/Model | State | Last HB | Assigned Issue |
|---|---|---|---|---|---|---|
| Aegis Coder X | da00de99-f978-4296-b969-c1b7c663a3c7 | local-aegis | ollama/qwen3-coder:30b via paperclip-direct | verified/running | 11:07Z | JAC-3705 |

- Host P89 gate: green (CTX-SpO2 98%). Lane is occupied; not available for new dispatch.

### Excluded (not capacity)

| Agent | UUID | Pool | Reason | State |
|---|---|---|---|---|
| Wings | 80284e06 | ollama-cloud | strategic, reserved | reserved |
| Aegis Coder Y | 181f381b | local-aegis | 12000s timeout defect | error |
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked until Aug 4 | quota_blocked |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused manual | paused |
| Flash | b37f4d70 | ollama-cloud | MCPServerTask event-loop-closed defect | pending_repair |

### Pools summary

| Pool | Used/Max | Notes |
|---|---|---|
| ollama-cloud | 0/3 capacity (Wings reserved; Mistral paused; Flash pending_repair) | Strategic pool excluded from routine dispatch |
| claude-code | 2/2 free (Herald, Plan Runner idle, no routable work) | |
| local-aegis | 0/2 (Coder X running, Coder Y error) | P89 gate green |
| codex | 0/1 (Auditor quota_blocked) | |
| independent-review | 0/1 (Kimi idle, blocked on Luna) | |

## 2. Dispatch Decision

**Dispositions: 0 dispatches — queue exhausted.**

No verified-idle free lane has an independent, plan-backed task that is not:
- Blocked upstream
- Credential-bound
- Approval-gated (Jack decision)
- Dependent on an in-progress upstream
- Already leased to the lane

No stale-log inference — all gates confirmed via authenticated live API GET.

## 3. Upstream Blocker Verification

All confirmed via UUID-scoped GET /api/issues/{uuid}:

| Issue | UUID | Status | Assignee | Blocker |
|---|---|---|---|---|
| JAC-4187 | b203d10f-eecf-4587-ba19-bd9a7f5d4b1b | blocked | Herald (a1e8cb0d) | Jack approval gate |
| JAC-4388 | 4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3 | todo | unassigned | Board action, Jack gate |
| JAC-4093 | d27f48db-5bf0-4c81-abce-cabea2528d9d | blocked | Plan Runner (2c6b1cc9) | Depends on JAC-3705 canary |
| JAC-3592 | 46839114-1e68-4296-bc60-9766da1f01d8 | in_progress | Luna (2f92499a) | Blocks Kimi JAC-3596 |
| JAC-3593 | 8b616780-38e8-4196-957b-607018ec2ee9 | todo | Luna (2f92499a) | Dependent on JAC-3592 |
| JAC-3594 | feacb699-f804-4836-b589-ff50677ca9bf | todo | Luna (2f92499a) | Dependent on JAC-3592 |
| JAC-3596 | 23c04a76-669d-4a1f-a216-2d68218810ef | todo | Kimi (3f1712eb) | Blocked on Luna completion |
| JAC-3705 | 4eda180d-baa2-4a50-981f-91a3edbb6a1d | todo | Aegis Coder X (da00de99) | Currently running (lane occupied) |
| JAC-3629 | f57af738-34fb-4f3a-9094-2416731d45d0 | todo | Fable (f1ef5e14) | Depends on JAC-4388 board action |
| JAC-3665 | f2ed34c5-f4fb-44f1-bb73-9c0eb3c154d5 | blocked | Plan Runner | Depends on JAC-3629/JAC-4388 |
| JAC-4190 | aaed5fd3-fc39-4cf1-9c89-a132ac5c0b85 | blocked | Plan Runner | Review gate |
| JAC-4462 | e915780a-cc95-4a35-8a83-b463bccf5df1 | blocked | Plan Runner | Depends on Herald (JAC-4422) |

## 4. Unassigned Todo Queue

18 unassigned todo issues — all policy-excluded per the coordinator contract:

| # | Issue | Priority | Exclusion reason |
|---|---|---|---|
| 1 | JAC-3671 — Restore Talaris anthropic + mistral credentials | critical | Credential-bound (secrets) |
| 2 | JAC-4500 — Review productivity for JAC-4139 | high | Meta-review (self-coordination issue) |
| 3 | JAC-4388 — Repair Fable executionLane | high | Board action, Jack gate |
| 4 | JAC-4501 — Review productivity for JAC-4000 | high | Meta-review |
| 5 | JAC-4217 — DECISION: migrate off claude_local | high | Jack decision gate |
| 6 | JAC-4216 — DECISION: re-enable ollama-cloud | high | Jack decision gate |
| 7 | JAC-3714 — Install Nix (approval-gated) | high | Approval-gated, interactive sudo |
| 8 | JAC-3558 — Call Oklahoma Integrated Care | high | Human gate |
| 9 | JAC-3557 — Prius mobile 12V test | high | Human gate |
| 10 | JAC-3555 — Submit Belmont records | high | Human gate |
| 11 | JAC-3437 — Get haircut | medium | Human gate (personal, non-fleet) |
| 12 | JAC-3365 — Populate notebook | medium | Human gate |
| 13 | JAC-3359 — Book diagnostic at Toyota | medium | Human gate |
| 14 | JAC-3361 — OBD-II codes / symptoms | medium | Human gate |
| 15 | JAC-3358 — Free OBD-II scan at AutoZone | medium | Human gate |
| 16 | JAC-3360 — Mobile hybrid battery quote | medium | Human gate |
| 17 | JAC-3970 — Dispatch JAC-3705 | low | Test artifact / self-referential dispatch |
| 18 | JAC-3541 — TEST_DELETE | low | Test artifact |

## 5. Note on identifier= search anomaly

GET /api/companies/{cid}/issues?identifier=JAC-4187 returns a DIFFERENT issue (JAC-2447, cancelled) as first hit. Confirmed per holographic memory fact #1142. All upstream verification above used UUID-scoped GET /api/issues/{uuid}.

## 6. Evidence file

This document: doc/plans/2026-08-03-wings-dispatch-evidence-jac-4139-cycle-2026-08-03T11-50Z.md

## 7. Disposition

**in_progress (restart-ready).** Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-4187 → unblocks Herald dispatch
- JAC-4388 → unblocks Plan Runner + Fable (JAC-3629)
- JAC-3592/3593/3594 → Luna smoke receipt completes → unblocks Kimi JAC-3596

Fallback schedule (secondary liveness path) remains the existing heartbeat cadence.
