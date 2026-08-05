# JAC-4139 Dispatch Evidence — Cycle 2026-08-04T21:50Z

**Run:** af91b501-145a-4185-a7c3-d82631417f2e (Wings, hermes_local, poolside/laguna-s-2.1:free)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-04T21:50Z (live authenticated API)

## Dispatches: 0 — Queue Exhausted

## Lane State (fresh live GET /api/companies/{cid}/agents)

### Verified-idle free lanes with capacity:
- **Herald** (a1e8cb0d): lane.state=verified, agent.status=error (Traceback, hermes_local adapter init) — NOT routable
- **Plan Runner** (2c6b1cc9): lane.state=verified, agent.status=error — NOT routable
- **Coder X** (da00de99): lane.state=verified, agent.status=idle, maxParallel=1 — at capacity (1 in_progress: JAC-4606, execRunId=aef7b42a)
- **Coder Y** (181f381b): lane.state=error — NOT routable

### Excluded lanes:
- **Hermes Mistral** (1029acc4): lane.state=paused — not capacity
- **Flash** (b37f4d70): lane.state=pending_repair — not capacity
- **Wings** (80284e06): self-reserved (strategic)
- **Coordinator** (dc2ca597): self-reserved
- All 12 error-status agents (Aegis, Scout, Operator, Fenix, Klaw, Klaude Pi, etc.): agent.status=error — NOT routable
- **Pi Campaign Auditor** (06e30130): agent.status=error (Traceback) — NOT routable

### Pool capacity summary:
- local-aegis: 0/2 usable (Herald+Coder X lanes; Herald in error, Coder X at capacity)
- ollama-cloud: 0/3 usable (Mistral paused, Flash pending_repair, no third routable lane)
- claude-code (opencode_local): Coder X idle but at capacity (1/1); Coder Y lane.state=error

## Active Runs (in_progress)

| Issue | Assignee | execRunId | Lane |
|---|---|---|---|
| JAC-4606 | Aegis Coder X (da00de99) | aef7b42a (live) | verified, 1/1 maxParallel |
| JAC-4550 | Coordinator (dc2ca597) | None (orphaned) | self-reserved |
| JAC-4532 | Maar (8551a68a) | 41f65145 (live) | no lane metadata |
| JAC-4580 | Fenix (5056439a) | None (orphaned) | error — not routable |
| JAC-4657 | Bright (f83be6e5) | None (orphaned) | error — not routable |
| JAC-4139 | Wings (80284e06) | 6a34ddb1 (live) | self |
| JAC-4652 | Goblin (b0c533ba) | None (orphaned) | error — not routable |
| JAC-4655 | Bright (f83be6e5) | None (orphaned) | error — not routable |

Coder X is the only verified-idle lane with capacity, and it is at its maxParallel=1 (JAC-4606 in_progress with a live execRunId=aef7b42a). No free slot.

## TODO Queue — 29 Issues, 0 Plan-Backed, All Policy-Excluded

- Plan-backed TODOs (plan or planId set): 0
- All 29 TODOs lack plan/planId fields — none qualify per dispatch criteria
- Unassigned high-priority TODOs: human gates (Prius 12V test, Belmont records, Oklahoma Integrated Care refill), Jack decision gates (JAC-4216, JAC-4217), credential-bound (JAC-4503 — Ollama Cloud API key recovery)
- Medium/low TODOs: personal tasks (haircut, notebook, Toyota diagnostic), unassigned low-value
- TODOs on verified-lane agents: JAC-3628 (Plan Runner — Plan Runner now error), JAC-3705 (Coder X — at capacity)

## Root Cause (confirmed fresh live at 21:50Z)

1. **Herald + Plan Runner**: agent status=error (hermes_local adapter init config drift — same class as JAC-4577/JAC-4580). lane.state=verified but agent error makes them non-routable.
2. **Coder X**: at capacity (maxParallel=1, JAC-4606 in_progress with live execRunId).
3. **Coder Y**: lane.state=error — non-routable.
4. **Mistral**: paused — non-routable.
5. **Flash**: pending_repair — non-routable.
6. **No independent plan-backed TODO exists** across any lane — zero of 29 TODOs have plan/planId.

## Dispatches: 0 — Queue Exhausted (confirmed)

No dispatchable lane has eligible independent work:
1. Herald: agent.status=error — not routable despite verified lane
2. Plan Runner: lane.state=verified but agent.status=error — not routable
3. Coder X: at capacity (JAC-4606 in_progress, maxParallel=1)
4. Coder Y: lane.state=error — not routable
5. Hermes Mistral: paused — not routable
6. Flash: pending_repair — not routable
7. Coordinator/Wings: self-reserved

## Awaiting

1. Herald recovery (agent.status=error → idle; JAC-4577/JAC-4580 root cause: hermes_local adapter init config drift)
2. Plan Runner recovery (agent.status=error → idle; same hermes_local config drift class)
3. JAC-4606 completion (frees Coder X's single maxParallel slot; 0/1 currently)
4. Any TODO gaining plan/planId + assignment to a recovered lane
5. Native child-completion continuation remains the liveness path

## Disposition: in_progress (restart-ready)

Queue genuinely exhausted at fresh live read. No dispatch action taken — all verified-level lanes either in error state, at capacity, or self-reserved. All 29 TODOs are policy-excluded or lack plan-backed qualification. Awaiting upstream completion events (JAC-4606, Herald/Plan Runner recovery) to restore dispatchable capacity.
