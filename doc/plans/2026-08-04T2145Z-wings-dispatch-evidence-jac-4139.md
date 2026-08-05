# JAC-4139 Dispatch Evidence — Cycle 2026-08-04T21:45Z

**Run:** aegis-local (Wings, hermes_local, poolside/laguna-s-2.1:free)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-04T21:45Z (live authenticated API)

## Dispatches: 0 — Queue Exhausted

## Lane State (from live GET /api/companies/{cid}/agents, bearer-auth)

### Verified-idle free lanes with capacity:
- **Herald** (a1e8cb0d): lane.state=verified, agent.status=error — NOT routable (agent in error despite verified lane metadata)
- **Plan Runner** (2c6b1cc9): lane.state=verified, agent.status=error — NOT routable (agent in error despite verified lane metadata)
- **Coder X** (da00de99): lane.state=verified, agent.status=idle, maxParallel=1 — at capacity (12 in_progress issues, maxParallel=1). Wake comment references JAC-4605 in_progress but no issue with identifier JAC-4605 appears in the in_progress set for Coder X; capacity is full regardless.
- **Kimi Code via Ringer** (3f1712eb): lane metadata empty, agent.status=error — NOT routable

### Excluded lanes:
- **Hermes Mistral** (1029acc4): paused (manual) — not capacity
- **Flash** (b37f4d70): lane.state=pending_repair, agent.status=error — not capacity
- **Wings** (80284e06): self-reserved (strategic)
- **Coordinator** (dc2ca597): agent.status=error — NOT routable
- **Aegis Coder Y** (181f381b): lane.state=error — NOT routable
- **Aegis** (100915f9): agent.status=error, errorReason=Traceback — NOT routable
- **Pi Campaign Auditor** (06e30130): agent.status=error, errorReason=Traceback — NOT routable
- **Dispatcher Worker** (92ac5e51): agent.status=error, errorReason=Traceback — NOT routable
- **Operator** (a5d0eb09): agent.status=error, errorReason=Traceback — NOT routable

### Pool capacity summary:
- local-aegis: 0/2 usable (Herald+Coder X lanes; Herald in error, Coder X at capacity)
- ollama-cloud: 0/3 usable (Mistral paused, Flash pending_repair, no third routable lane)
- claude-code (opencode_local): Coder X idle but at capacity; Coder Y lane.state=error

## TODO Scan (status=todo, limit=100)
- **Total todo issues:** 28
- **Plan-backed TODOs (plan or planId set):** 0
- All 28 TODOs lack plan/planId fields — none qualify as "plan-backed" per the dispatch criteria.

### TODOs assigned to verified-idle lanes:
- Coder X (da00de99): 0 todo (12 in_progress already, at capacity)
- Herald (a1e8cb0d): 4 todos — all dependency-gated or part of broader recovery (JAC-4565-3, JAC-4565-7, Wings recovery, etc.)
- Plan Runner (2c6b1cc9): 0 todo directly assigned (JAC-3628 is assigned elsewhere or completed)

### Policy-excluded TODOs (uncategorized/unassigned):
- 12 high-priority: human gates (Prius mobile test, Belmont records, Oklahoma Integrated Care refill), credential-bound (API key recovery), Jack decision gates (DECISION: migrate Claude, DECISION: re-enable ollama-cloud), board actions
- 13 medium-priority: personal tasks (haircut, notebook, Toyota diagnostic), unassigned low-value
- 1 low-priority: "Dispatch JAC-3705 (Canary) to a local-aegis lane" — blocked upstream (JAC-3705 preconditions blocked)

## Active Runs (in_progress assigned to verified lanes)
- Coder X: 12 in_progress (at capacity, maxParallel=1)
- Wings: 1 in_progress (6fdb3b88 — this coordinator issue, self-reserved)
- No external fast-lane canary active; no independent Ringer review in progress

## Root Cause (confirmed fresh live)
1. Herald + Plan Runner: agent status=error (not just lane metadata stale) — Herald errorReason=Traceback from hermes CLI bootstrap; Plan Runner agent.status=error
2. Coder X: at capacity (maxParallel=1, 12 in_progress issues including JAC-4565-4/2, JAC-4575-5, etc.)
3. No independent plan-backed TODO exists across any verified+idle lane
4. All unassigned TODOs are policy-excluded (credential-bound, human-gate, Jack-decision-gate, dependency-gated)

## Awaiting
- Herald recovery (agent.status=error → idle/running)
- Plan Runner recovery (agent.status=error → idle/running)
- Coder X capacity (in_progress issues resolve to free the single run slot)

## Disposition: in_progress (restart-ready)
Native child-completion continuation remains the liveness path.
Evidence: doc/plans/2026-08-04T2145Z-wings-dispatch-evidence-jac-4139.md
