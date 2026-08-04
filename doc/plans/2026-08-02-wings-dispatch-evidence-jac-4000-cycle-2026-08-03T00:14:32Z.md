# JAC-4000 Dispatch Evidence — Cycle 2026-08-02T23:55Z

## Run
- Run ID: 55ab3596-a2a6-43e5-8625-08958317036e
- Agent: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Timestamp: 2026-08-02T23:55Z
- Paperclip API: v2026.722.0
- Verification method: Authenticated live GET /api/companies/87c32b8e-fa131-4df8-ad8e-963d01b458e7/agents

## Lane States (Live)

### Verified-idle free lanes (3/3) — all assignedIssueId=null, no live lease

| Agent | Pool | Model | State | maxParallel | Verified At |
|---|---|---|---|---|---|
| Herald | claude-code | claude-opus-4-8 | verified | 1 | 2026-07-31T19:56:00Z |
| Plan Runner | claude-code | claude-opus-4-8 | verified | 1 | 2026-07-31T19:56:00Z |
| Kimi Code via Ringer | independent-review | kimi-for-coding/k3 | verified | 1 | 2026-07-23T20:03:10Z |

### Pool capacity limits
- claude-code (Herald + Plan Runner): maxParallel=1 each → lane limit 2 (OmniGent)
- independent-review (Kimi): maxParallel=1
- local-aegis (Aegis Coder X+Y): maxParallel=1 each → lane limit 2 (only while host health green)
- ollama-cloud (Flash, Hermes Mistral, Wings): pool limit 3 total

### Excluded lanes (NOT routable)

| Agent | State | Reason |
|---|---|---|
| Aegis Coder X (da00de99) | verified | agent.status=error ("Process lost -- server may have restarted"); host P89 gate down per CTX-SpO2 |
| Aegis Coder Y (181f381b) | error | errorReason="Timed out after 12000s"; 12000s timeout defect |
| Paperclip Agent Auditor (5b2bece1) | quota_blocked | codex usage limit until 2026-08-04T15:09 CT |
| Hermes Mistral (1029acc4) | paused | manually paused (hb ~15h stale) |
| Flash Executor (b37f4d70) | pending_repair | MCPServerTask event-loop-closed defect |
| Wings (self, 80284e06) | reserved | strategic reserved, excluded from routine dispatch |
| Klaude (4d9d8ed5) | error | gateway token mismatch |
| Klaw (d216ee6e) | error | no anthropic API key |
| Operator (a5d0eb09) | error | unknown |
| Forge (0b902be0) | error | unknown |

## Upstream Blocker Status (Live API — no stale-log inference)

| Issue | Status | Assignee | Notes |
|---|---|---|---|
| JAC-4187 (Herald) | blocked | Herald (a1e8cb0d) | D3 dashboard wireframes, blocked upstream |
| JAC-3933 (Plan Runner) | in_review | unassigned | Cross-vendor detector spec, stuck in review |
| JAC-4495 | backlog | none | Unblock JAC-3933: detector spec stalled in review — not resolved |
| JAC-4494 | backlog | none | "test" — not actionable |
| JAC-3629 (Plan Runner dep) | blocked | Coordinator (dc2ca597) | Requires Fable repair (JAC-4388) first |
| JAC-4388 (Jack board action) | todo | local-board | Board action requiring Jack approval — not resolved |
| JAC-3596 (Kimi) | todo | Kimi (3f1712eb) | Independent exact-SHA verification, blocked on Luna leaves |
| JAC-3592 (Luna) | in_progress | Luna (2f92499a) | Exact model-catalog and footer gates |
| JAC-3593 (Luna) | in_progress | Luna (2f92499a) | Working-transition and deadline-before-mutation gates |
| JAC-3594 (Luna) | in_progress | Luna (2f92499a) | Initial-modal cleanup and lane-session cleanup |

## Dispatch Decision

0 dispatches.

### Rationale per lane:

1. **Herald** (verified, idle, assignedIssueId=null): JAC-4187 assigned to Herald is blocked. All other Herald candidates are blocked upstream (JAC-4222, JAC-3876, JAC-3716). No independent plan-backed task found.

2. **Plan Runner** (verified, idle, assignedIssueId=null): JAC-3628 assigned to Plan Runner is blocked on JAC-3629, which is blocked on JAC-4388 (requires Jack approval). No independent plan-backed task found.

3. **Kimi Code via Ringer** (verified, idle, assignedIssueId=null): JAC-3596 assigned to Kimi is todo but blocked on Luna leaves JAC-3592/3593/3594 (all in_progress, no new activity since 2026-08-01T02:5xZ). No independent plan-backed task found.

4. **Aegis Coder X** (verified lane but agent.status=error): Host P89 gate down per CTX-SpO2. Not dispatched despite verified lane.

5. **Aegis Coder Y** (lane=error): 12000s timeout defect. Not routable.

6. **Paperclip Agent Auditor** (quota_blocked): Quota blocked until Aug 4. Not routable.

7. **External fast lane / ollama-cloud pool**: Flash pending_repair, Hermes Mistral paused, Wings reserved — pool at 0/3 routable capacity (pending_canary, pending_repair, reserved, paused are not capacity per policy).

## Unassigned todo issues with no blockers

| Issue | Priority | Title |
|---|---|---|
| JAC-3671 | critical | Restore Talaris anthropic + mistral credentials |
| JAC-4501 | high | Review productivity for JAC-4000 (self-review, policy-excluded) |
| JAC-4500 | high | Review productivity for JAC-4139 (policy-excluded) |

- JAC-3671: Credential-bound (restoring Talaris anthropic + mistral credentials) — policy-excluded (externally destructive / credential-bound).
- JAC-4501/JAC-4500: Self-authored productivity reviews of Wings/Coordinator cycles — policy-excluded (human gate / Jack decision gate).

## Disposition

**in_progress (restart-ready)** — 0 dispatches. Queue exhausted. All 3 verified-idle free lanes (Herald, Plan Runner, Kimi) have assigned work blocked upstream. No independent plan-backed unleased task found among policy-eligible candidates.

Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-4388 (Jack approval → JAC-3629 → JAC-3628 → Plan Runner)
- JAC-3933 / JAC-4495 (JAC-3933 in_review stalled → Herald)
- JAC-3592/3593/3594 (Luna in_progress → JAC-3596 → Kimi)

All gates confirmed via authenticated live API metadata.executionLane — no stale-log inference.
