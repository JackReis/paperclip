# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T05:53Z

**Run ID:** 9fa4e076-2290-4aea-a88b-b84ddddde3f6 (Wings, hermes_local)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-03T06:06Z (live authenticated GET /api/agents)

## Dispatch Decision: 0 dispatches — queue exhausted. No change since 05:53Z cycle. No upstream blockers cleared.

### Verified-Idle Free Lanes (3/3 eligible, 0 dispatchable)

All three verified-idle lanes have assigned work that is blocked upstream:

1. **Herald (a1e8cb0d)** — pool=claude-code, model=claude-opus-4-8, state=verified, verifiedAt=2026-07-31T19:56:00Z, maxParallel=1, heartbeat=03:12:37Z (fresh)
   - Assigned issue: JAC-4187 (status=blocked → in_review, depends on JAC-3933)

2. **Plan Runner (2c6b1cc9)** — pool=claude-code, model=claude-opus-4-8, state=verified, verifiedAt=2026-07-31T19:56:00Z, maxParallel=1, heartbeat=03:13:50Z (fresh)
   - Assigned issue: JAC-3628 (status=blocked, depends on JAC-4388)

3. **Kimi Code via Ringer (3f1712eb)** — pool=independent-review, model=kimi-for-coding/k3, state=verified, verifiedAt=2026-07-23T20:03:10Z, maxParallel=1, heartbeat=2026-07-02T03:22Z (stale but verified)
   - Assigned issue: JAC-3596 (status=todo, parent=JAC-3577, depends on Luna JAC-3592/3593/3594 in_progress)

### Corrections vs. 05:53Z Wake

- **Aegis Coder X (da00de99):** status=error, errorReason="Timed out after 12000s", executionLane.state=verified (pool=local-aegis). The wake's "Process lost" is stale — the live error is now "Timed out after 12000s". Either way: agent status=error. NOT dispatched. Host P-gate applies.
- **Hermes Mistral (1029acc4):** status=paused, pauseReason=manual, executionLane.state=paused. NOT routable. Recommend removal from canonical pool.
- **Flash (b37f4d70):** status=idle but errorReason="Event loop is closed" (MCPServerTask coroutine defect), executionLane.state=pending_repair. NOT routable.
- **Aegis Coder Y (181f381b):** executionLane=null — agent object not accessible via /api/agents (404 on detail). NOT routable.
- **Paperclip Agent Auditor (5b2bece1):** status=error, errorReason="usage limit ... try again at Aug 4th, 2026 11:09 PM", executionLane.state=quota_blocked. NOT routable.
- **Omnigent Router (072eada2):** executionLane=null. NOT compute.
- **Wings (80284e06):** executionLane.state=reserved (strategic). Excluded.

### Upstream Blockers (confirmed live, fresh fetch)

1. **JAC-3933 (fc4eb2ca-832c-4ab8-9dd3-3299400bb8c2)** — status=in_review, assigneeAgentId=null. Unblocks Herald (JAC-4187). NOT resolved.
2. **JAC-4388 (4954a59f-f85b-4b3f-ae03-8ab0b02f3ab3)** — status=todo, assigneeUserId=local-board (Jack board-action gate). Unblocks Plan Runner chain. NOT resolved.
3. **JAC-3592/3593/3594** — all status=in_progress, assigneeAgentId=2f92499a (Luna High Planner). Unblocks Kimi (JAC-3596). NOT resolved.

### Remaining Unleased Pool (all policy-excluded)

- JAC-3671 (credential-bound) — status=todo, no assignee
- JAC-4501 (self-review) — status=todo, parent=JAC-4000
- JAC-4500 (self-review) — status=todo, parent=JAC-4139
- JAC-4494 (backlog) — status=backlog, parent=JAC-4187
- JAC-4503 (backlog) — status=backlog, UUID 58717b5a not found via /api/issues (404; likely wrong UUID in prior evidence doc, re-fetching needed)
- JAC-4505 (blocked) — assigned to Herald a1e8cb0d, blocked
- JAC-3705 (depends on Coder X) — status=todo, assigneeAgentId=da00de99 (Aegis Coder X, error state)

No newly-independent plan-backed task found.

### Active Runs

0 eligible. JAC-4000 executionRunId=9fa4e076 is this Wings heartbeat.

### Disposition

in_progress (restart-ready) — 0 dispatches. Awaiting native child-completion wake on JAC-3933 / JAC-4388 / JAC-3592-3593-3594.
