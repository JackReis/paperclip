# JAC-4139 Dispatch Evidence — Cycle 2026-08-03T11:04Z

- **Run ID:** 945b5259-4ba6-4bcc-bd9a-5d1d4d45d61a
- **Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d, hermes_local)
- **Paperclip API:** v2026.722.0 (GET /api/health confirmed ok)
- **Verification method:** authenticated live GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents with bearer=Wings

## Result: 0 dispatches — queue exhausted

## Lane Verification (live API)

### Verified-idle free lanes (not dispatched — no dispatchable tasks)

| Agent | Status | Pool | Model | Verification |
|-------|--------|------|-------|-------------| 
| Herald | idle | claude-code | claude-opus-4-8 | verified, hb <15m, no errorReason — no dispatchable task |
| Plan Runner | idle | claude-code | claude-opus-4-8 | verified, hb <20m, no errorReason — no dispatchable task |
| Kimi Code via Ringer | idle | independent-review | kimi-for-coding/k3 | verified, K3 smoke PASS 2026-07-23 — JAC-3596 assigned but blocked upstream (Luna JAC-3592 blocked) |

### Active run occupying a lane

| Agent | Status | Lane state | Occupied by |
|-------|--------|-----------|-------------|
| Aegis Coder X | running | verified | JAC-4511 running, lane occupied (maxParallel 1) |

### Excluded lanes (not capacity)

| Agent | Lane state | Reason excluded |
|-------|-----------|----------------|
| Aegis Coder Y | error | 12000s timeout defect; NOT routable |
| Paperclip Agent Auditor | quota_blocked | Codex usage limit until 2026-08-04; NOT routable |
| Hermes Mistral | paused | Manual pause; NOT routable |
| Flash | pending_repair | MCPServerTask event-loop-closed defect; NOT routable |
| Wings | reserved | Strategic; NOT routable for routine dispatch |
| Luna High Planner | null | No verified executionLane (config rolled back) |

## Pool Capacity Summary

| Pool | Limit | In use | Available |
|------|-------|--------|-----------|
| ollama-cloud | 3 | 3 (Wings reserved + Mistral paused + Flash pending_repair) | 0 |
| claude-code | 2 | 0 | 2 (Herald + Plan Runner free, but no dispatchable work) |
| local-aegis | 2 | 2 (Coder X running + Coder Y error) | 0 |
| codex | 1 | 1 (Auditor quota_blocked) | 0 |
| independent-review | 1 | 0 (Kimi idle but JAC-3596 blocked on Luna) | 1 but no dispatchable work |

## Queue Scan

- Total unassigned todos: 34
- All policy-excluded:
  - Human gates: JAC-3555/3557/3558
  - Jack decision gates: JAC-4216/4217
  - Credential-bound: JAC-3671
  - Approval-gated: JAC-3714
  - Board actions: JAC-4388/4500/4501
  - Personal/meta tasks: various
  - Dependency-gated: JAC-3629 (blocked on JAC-4388), JAC-3705 (blocked on JAC-4093), JAC-3770 (blocked)
  - Upstream blockers: JAC-3933 (in_review, Jack gate), JAC-4388 (todo, Jack gate), JAC-3592/3593/3594 (Luna, no verified lane)

## Upstream Blockers (unresolved)

- JAC-3933: in_review (Jack approval gate)
- JAC-4388: todo (board action + Jack gate)
- JAC-3592/3593/3594: Luna-owned, Luna has no verified executionLane until smoke receipt completes

## Disposition

- **in_progress** (restart-ready)
- Awaiting native Paperclip child-completion wake on upstream resolution (JAC-3933, JAC-4388, JAC-3592/3593/3594)
- Awaiting Wings-level correction of JAC-4519 (boundary-crossing escalation)
- Liveness fallback: schedule-based wake per issue spec

## Notes

- No stale-log inference — all gate states confirmed via authenticated live API metadata.executionLane.
- Same state as wake comment (cycle 2026-08-03T11:02Z): 0 dispatches, queue exhausted.