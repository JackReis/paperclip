# Wings Dispatch Evidence — JAC-4139 Cycle 2026-08-03T11:40Z

- **Run ID**: 64791ece-c832-48ce-88bc-d8a8fd82de35
- **Timestamp**: 2026-08-03T11:40Z
- **Adapter**: hermes_local
- **API**: Paperclip v2026.722.0 (verified via /api/health)
- **Verification Method**: Authenticated live API GET /api/companies/87c32b8e/agent + GET /api/companies/87c32b8e/issues — no stale-log inference

## Agent Lane State (live)

| Agent | status | lane_state | pool | verifiedAt | lastHb | Notes |
|---|---|---|---|---|---|---|
| Wings | running | reserved | ollama-cloud | 2026-07-31T19:56:00Z | 11:35:49Z | Strategic, excluded from routine dispatch |
| Herald (a1e8cb0d) | idle | verified | claude-code | 2026-07-31T19:56:00Z | 07:41:57Z | Free lane, no dispatchable task |
| Plan Runner (2c6b1cc9) | idle | verified | claude-code | 2026-07-31T19:56:00Z | 03:13:50Z | Free lane, no dispatchable task |
| Kimi Code via Ringer (3f1712eb) | idle | verified | independent-review | 2026-07-23T20:03:10Z | 08-02T03:22:24Z | Free lane, JAC-3596 blocked on Luna |
| Aegis Coder X (da00de99) | running | verified | local-aegis | 2026-07-31T19:56:00Z | 11:07:47Z | Occupying lane (JAC-3705) |
| Aegis Coder Y | idle | error | local-aegis | 2026-07-31T19:56:00Z | 03:31:13Z | 12000s timeout defect |
| Hermes Mistral | paused | paused | ollama-cloud | 2026-07-31T19:56:00Z | 07-31T04:59:07Z | Manual pause |
| Paperclip Agent Auditor | idle | quota_blocked | codex | 2026-07-31T19:56:00Z | 07-31T16:31:29Z | Until Aug 4 |
| Flash | idle | pending_repair | ollama-cloud | 2026-07-31T19:56:00Z | 07-30T22:53:16Z | MCPServerTask event-loop-closed defect |
| Luna High Planner (2f92499a) | idle | N/A | N/A | N/A | 11:20:08Z | No verified executionLane; smoke receipt pending |

## Upstream Issues (live UUID-scoped)

| Issue | status | assigneeAgent | updatedAt | Gate |
|---|---|---|---|---|
| JAC-4187 | blocked | Herald (a1e8cb0d) | — | Jack approval gate |
| JAC-4388 | todo | unassigned | 08-03T02:27:42Z | Board action, Jack gate |
| JAC-4093 | blocked | Plan Runner (2c6b1cc9) | — | Depends on JAC-3705 canary |
| JAC-3592 | in_progress | Luna (2f92499a) | — | Blocks Kimi JAC-3596 |
| JAC-3593 | todo | Luna (2f92499a) | 08-03T09:57:34Z | Dependent gate |
| JAC-3594 | todo | Luna (2f92499a) | 08-03T09:57:34Z | Dependent gate |
| JAC-3596 | todo | Kimi (3f1712eb) | — | Blocked on Luna completion |
| JAC-3705 | todo | Aegis Coder X (da00de99) | 08-03T05:51:24Z | Running (occupies local-aegis lane) |

## Pool Utilization

| Pool | Usage | Free verified-idle | Notes |
|---|---|---|---|
| ollama-cloud | 0/3 | None (Wings=reserved, Mistral=paused, Flash=pending_repair) | No dispatchable capacity |
| claude-code | 0/2 | Herald, Plan Runner (both verified/idle) | No dispatchable tasks — all blocked/gated |
| local-aegis | 1/2 | Coder Y=lane error | Coder X running JAC-3705 |
| codex | 0/1 | Paperclip Agent Auditor=quota_blocked | Until Aug 4 |
| independent-review | 0/1 | Kimi idle (JAC-3596 blocked) | Not dispatchable |

## Unassigned Todo Issues (policy-exclusion check)

12 unassigned todos identified. All are policy-excluded:

1. **JAC-3671** (critical) — Restore Talaris anthropic + mistral credentials — credential-bound
2. **JAC-4501** (high) — Review productivity for JAC-4000 — productivity review artifact, not dispatch work
3. **JAC-4500** (high) — Review productivity for JAC-4139 — meta-review of this issue, not dispatch work
4. **JAC-3714** (high) — Install Nix — approval-gated, interactive sudo
5. **JAC-3437** (medium) — Get haircut — human gate (Jack)
6. **JAC-3365** (medium) — NotebookLM population — human gate
7. **JAC-3359** (medium) — Book Toyota diagnostic — human gate
8. **JAC-3361** (medium) — OBD codes — depends on JAC-3358
9. **JAC-3358** (medium) — Get OBD scan — human gate
10. **JAC-3360** (medium) — Mobile battery quote — depends on JAC-3358
11. **JAC-3970** (low) — Dispatch JAC-3705 — already running on Coder X lane
12. **JAC-3541** (low) — TEST_DELETE — test artifact, low priority

## Dispatch Decision

**0 dispatches — queue exhausted.**

### Rationale
- 3 verified-idle free lanes (Herald, Plan Runner, Kimi) — all have assigned work blocked upstream
- Aegis Coder X is running JAC-3705 (occupies local-aegis lane)
- All other lanes are excluded: reserved (Wings), error (Coder Y), paused (Mistral), quota_blocked (Auditor), pending_repair (Flash), no verified lane (Luna)
- 12 unassigned todos — all policy-excluded (credential-bound, human gates, approval-gated, dependent, test artifacts, or meta-review)
- No independent plan-backed task found
- No fresh authenticated generation failure on any verified lane

### Continuation Path
Awaiting native Paperclip child-completion wake on upstream resolution:
- **JAC-4187** (blocked) → Herald becomes dispatchable
- **JAC-4388** (todo, board action) → unblocks Plan Runner downstream
- **JAC-3592** (in_progress, Luna) → unblocks Kimi JAC-3596
- **JAC-3705** (running, Coder X) → unblocks JAC-4093 (Plan Runner) on completion

## Evidence Source
Authenticated live API: GET /api/companies/87c32b8e/agents and GET /api/companies/87c32b8e/issues — Paperclip v2026.722.0
