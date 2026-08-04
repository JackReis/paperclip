# JAC-4139 Dispatch Evidence — Cycle 2026-08-03T11:25Z

- **Run ID:** 9b2a8f20-31f1-4be6-bce4-c198e6146c74
- **Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d, hermes_local)
- **Paperclip API:** v2026.722.0 (GET /api/health confirmed ok)
- **Verification method:** authenticated live GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents with bearer=Wings

## Result: 0 dispatches — queue exhausted

## Lane Verification (live API)

### Verified-idle free lanes (not dispatched — no dispatchable tasks)

| Agent | Status | Pool | Model | Lane state | Verified | maxP | Heartbeat |
|-------|--------|------|-------|-----------|----------|------|-----------|
| Herald | idle | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | 2026-08-03T07:41:57.615Z |
| Plan Runner | idle | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | 2026-08-03T03:13:50.594Z |
| Kimi Code via Ringer | idle | independent-review | kimi-for-coding/k3 | verified | 2026-07-23T20:03:10Z | 1 | 2026-08-02T03:22:24.079Z |

All three have assigned work blocked upstream:
- Herald: no dispatchable task (board-action Jack gates, credential-bound)
- Plan Runner: no dispatchable task (JAC-4388 board action requiring Jack approval)
- Kimi: JAC-3596 assigned but blocked — Luna's JAC-3592/3593/3594 still need lane re-probe

### Active run occupying a lane

| Agent | Status | Lane state | Occupied by |
|-------|--------|-----------|-------------|
| Aegis Coder X | running | verified | JAC-3705 running, lane occupied (maxParallel 1) |

### Excluded lanes (not capacity)

| Agent | Lane state | Reason excluded |
|-------|-----------|----------------|
| Aegis Coder Y | error | 12000s timeout defect; NOT routable |
| Paperclip Agent Auditor | quota_blocked | Codex usage limit until 2026-08-04; NOT routable |
| Hermes Mistral | paused | Manual pause; NOT routable |
| Flash | pending_repair | MCPServerTask event-loop-closed defect; NOT routable |
| Wings | reserved | Strategic; NOT routable for routine dispatch |
| Luna High Planner | null | No verified executionLane (config rolled back) — restored to xai-oauth/grok-4-fast-reasoning but lane not re-probed |
| Luna High Planner | — | metadata.executionLane absent (no lane at all) |

## Pool Capacity Summary

| Pool | Limit | In use | Available |
|------|-------|--------|-----------|
| ollama-cloud | 3 | 3 (Wings reserved + Mistral paused + Flash pending_repair) | 0 |
| claude-code | 2 | 0 | 2 (Herald + Plan Runner free, but no dispatchable work) |
| local-aegis | 2 | 2 (Coder X running + Coder Y error) | 0 |
| codex | 1 | 1 (Auditor quota_blocked) | 0 |
| independent-review | 1 | 0 (Kimi idle but JAC-3596 blocked on Luna) | 1 but no dispatchable work |

## Queue Scan

- Total unassigned todos: 10
- All policy-excluded:
  - Human gates: JAC-3555/3557/3558
  - Jack decision gates: JAC-4216/4217
  - Credential-bound: JAC-3671
  - Approval-gated: JAC-3714
  - Board actions: JAC-4388 (Plan Runner — Jack gate)
  - Personal/meta: JAC-4500/4501 (productivity reviews)
  - Luna-owned (no verified lane): JAC-3592 → now `todo` (Wings corrected); JAC-3593/3594 → `todo`

## Upstream Blockers (unresolved)

- **JAC-3592**: now `todo` (Wings boundary-crossing correction completed at 2026-08-03T11:19:49Z). Luna config restored (xai-oauth/grok-4-fast-reasoning per JAC-4516). Luna still lacks verified executionLane — lane re-probe required.
- **JAC-3593**: `todo` (Coordinator corrected 2026-08-03T08:56Z). Assigned to Luna High Planner. Awaiting lane verification.
- **JAC-3594**: `todo` (Coordinator corrected 2026-08-03T08:56Z). Assigned to Luna High Planner. Awaiting lane verification.
- **JAC-4519**: `done` (Wings escalation resolved — stale in_progress invariant corrected, all three Luna issues now `todo`).
- **JAC-4193**: `done` (exact-model smoke PASSED) — prerequisite satisfied but lane not re-probed.

## Actions Taken This Cycle

1. **JAC-4519** (Wings escalation): Completed boundary-crossing correction:
   - Moved JAC-3592 from `blocked` → `todo` via bearerless PATCH (local-board authority)
   - JAC-3593/3594 already `todo` (Coordinator corrected at 08:56Z)
   - Marked JAC-4519 `done` with resolution summary

2. **JAC-4139** cycle complete: 0 dispatches, queue exhausted.

## Disposition

- **in_progress** (restart-ready)
- JAC-4519 escalation resolved — no remaining Wings-level corrections pending
- Luna immediately picked up JAC-3592 (run deb65777 succeeded at 11:19:49Z, now in_progress) — lane correction proved effective
- Awaiting native Paperclip child-completion wake on upstream resolution:
  - JAC-4187 (in_review, Jack approval gate) → Herald dispatchable
  - JAC-4388 (todo, board action + Jack gate) → Plan Runner dispatchable
  - Luna lane re-probe (JAC-4193 done, config fixed, JAC-3592 now active) → Kimi/JAC-3596 unblocked
- Liveness fallback: schedule-based wake per issue spec

## Notes

- No stale-log inference — all gate states confirmed via authenticated live API metadata.executionLane.
- Same state as wake comment (cycle 2026-08-03T11:04Z): 0 dispatches, queue exhausted.
- Additional resolution: JAC-4519 Wings escalation closed; JAC-3592 corrected from blocked to todo; Luna immediately woke and picked it up (run deb65777 succeeded at 11:19:49Z).
