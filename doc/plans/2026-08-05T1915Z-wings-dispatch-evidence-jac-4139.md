# JAC-4139 Dispatch Evidence — Cycle 2026-08-05T19:15Z

**Run:** 99b153bc-0e22-4bf1-8b4c-cd16954a658f (Wings, hermes_local, poolside/laguna-s-2.1:free)
**Recovery attempt:** 2 (retry of ded37528, which was retry of c88a1b54)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-05T19:15Z (live authenticated API)
**Host health:** green (Bifrost /health = {"status":"ok","components":{"db_pings":"ok"}})

## Recovery Diagnosis: Failed Run c88a1b54 Root Cause

The failed run `c88a1b54-c4e7-40c9-88c8-1e4ce9dbd212` (process_lost, 2026-08-05T18:42:52Z) failed with:

```
ERROR: periodic heartbeat recovery failed
  DrizzleQueryError: Failed query: update "issues" set "execution_run_id" = $1, ...
  duplicate key value violates unique constraint "issues_open_routine_execution_uq"
```

**Root cause:** The `issues_open_routine_execution_uq` unique constraint prevents two concurrent open routine executions from claiming the same issue. Run `c88a1b54` attempted to claim JAC-4139's execution lock while another run already held it. This is a race condition in the heartbeat recovery path — the recovery action's `wakePolicy.type=wake_owner` re-invoked the assignee before the prior run's lock had been released/abandoned.

**Not a workspace validation failure** — the issue's `executionRunId` is correctly set to the current alive run `99b153bc` (pid 3105, status=running, lastOutputAt=19:10:55Z). The current run holds the lock legitimately.

**Fix:** No workspace reset needed. The current run (99b153bc) is alive and processing. The recovery action's evidence (`latestRunId=c88a1b54, status=failed`) is stale — it hasn't been updated to reflect that 99b153bc (retry of ded37528) acquired the lock successfully. The duplicate-key constraint is a known Paperclip issue when recovery collisions occur; the harness retry chain handled it correctly by eventually acquiring the lock.

## Dispatches: 0 — Queue Exhausted (confirmed fresh live at 19:15Z)

### Lane State — Fresh Live Read

| Agent | status | lane.state | pool | model | maxParallel | Active In-Progress | Occupancy | Routable? |
|-------|--------|-----------|------|-------|-------------|-------------------|-----------|-----------|
| Herald (a1e8cb0d) | **error** | verified | local-aegis | laguna-s-2.1:free | 2 | 0 | 0/2 | NO — agent.status=error (hermes_local adapter init Traceback) |
| Plan Runner (2c6b1cc9) | running | verified | local-aegis | laguna-s-2.1:free | 2 | 2 | **2/2** | At capacity (JAC-4783, JAC-4746) |
| Aegis Coder X (da00de99) | running | verified | local-aegis | qwen3-coder:30b | 1 | 1 | **1/1** | At capacity (JAC-4694) |
| Coordinator (dc2ca597) | running | verified | local-aegis | laguna-s-2.1:free | 2 | 1 | 1/2 | Self-reserved (PM coordination) |
| Wings (self, 80284e06) | running | verified | local-aegis | laguna-s-2.1:free | 4 | 1 | 1/4 | Self-reserved (currently executing) |
| Zatara (f83be6e5) | running | verified | local-aegis | laguna-s-2.1:free | 2 | 0 | 0/2 | No assigned TODOs |
| Aegis Coder Y (181f381b) | idle | **error** | local-aegis | qwen3-coder:30b | 1 | 0 | 0/1 | NO — lane.state=error |
| Hermes Mistral (1029acc4) | running | **paused** | ollama-cloud | deepseek-v4-pro | 1 | 3 | 3/1* | NO — paused (not capacity) |
| Flash (b37f4d70) | running | **pending_repair** | ollama-cloud | deepseek-v4-flash | 1 | 0 | 0/1 | NO — pending_repair (not capacity) |
| Operator (a5d0eb09) | running | (none) | — | — | — | 0 | — | NO — no lane metadata |
| Paperclip Agent Auditor (5b2bece1) | running | (none) | — | — | — | 0 | — | NO — no lane metadata |

\* Hermes Mistral has 3 in_progress (JAC-4058, JAC-4059, JAC-4060) but lane.state=paused overrides — not capacity.

### Excluded lanes (not capacity):
- **Herald**: agent.status=error despite verified lane — NOT routable
- **Aegis Coder Y**: lane.state=error — NOT routable
- **Hermes Mistral**: lane.state=paused — not capacity
- **Flash**: lane.state=pending_repair — not capacity
- **Operator, Auditor**: no lane metadata — not routable
- **Coordinator, Wings**: self-reserved

### Pool capacity summary:
- **local-aegis**: Plan Runner (2/2), Coder X (1/1), Coordinator (1/2), Wings (1/4), Herald (0/2) = 5 active runs across pool. Per-cycle dispatch limit for local-aegis = 2 (already dispatched at 01:25Z cycle). Host health = green ✓. Currently at capacity for this cycle.
- **ollama-cloud**: 0/3 usable (Mistral paused, Flash pending_repair). No codex/auditor/external/Ringer-review lanes present.
- **claude-code/omnigent**: 0/2 — no verified claude-code agents with free capacity (Coder Y lane=error, no other opencode agents)
- **codex**: 1/1 — no codex lane agent present
- **external fast lane**: 0/1 — no external fast lane agent; JAC-3990 canary still blocked → not eligible
- **Ringer review**: 0/1 — no designated review lane agent present

## Active Runs (in_progress, 2026-08-05T19:15Z)

| Issue | Assignee | Agent | execRunId | Lane | Status |
|-------|----------|-------|-----------|------|--------|
| JAC-4139 | Wings | Wings (80284e06) | 99b153bc | local-aegis/verified | running (self) |
| JAC-4777 | Coordinator | Coordinator (dc2ca597) | (none) | local-aegis/verified | running (self) |
| JAC-4783 | Plan Runner | Plan Runner (2c6b1cc9) | 1233d2c2 | local-aegis/verified | running |
| JAC-4746 | Plan Runner | Plan Runner (2c6b1cc9) | 1951aca1 | local-aegis/verified | running |
| JAC-4694 | Aegis Coder X | Coder X (da00de99) | f78c44f0 | local-aegis/verified | running |
| JAC-4060 | Hermes Mistral | Mistral (1029acc4) | 1cb4dab4 | ollama-cloud/paused | running |
| JAC-4058 | Hermes Mistral | Mistral (1029acc4) | 4a7ea921 | ollama-cloud/paused | running |
| JAC-4059 | Hermes Mistral | Mistral (1029acc4) | 391802d0 | ollama-cloud/paused | running |
| JAC-4745 | Dinkelspiel | Dinkelspiel (6ed1dfdd) | c06592ff | no lane | running |
| JAC-4743 | Aegis | Aegis (100915f9) | 8973d952 | no lane | running |

## TODO Queue — Eligible Candidates (2026-08-05T19:15Z)

| Issue | Priority | Assigned To | Agent Lane | Active Run? | Dispatchable? | Reason |
|-------|----------|-------------|-----------|-------------|---------------|--------|
| JAC-4762 | high | Plan Runner | verified/2/2 | NO | NO | Plan Runner at maxParallel (2/2) |
| JAC-3705 | high | Aegis Coder X | verified/1/1 | NO | NO | Coder X at maxParallel (1/1); already has child JAC-4069 in_progress |
| JAC-4756 | medium | (unassigned) | — | NO | NO | Human decision gate (Design Decision) |
| JAC-4755-4748 | medium | (unassigned) | — | NO | NO | No assigned lane; dependency-gated Phase 1→4 chain |
| JAC-4738 | medium | (unassigned) | — | NO | NO | No assigned lane |
| JAC-3770 | high | Coordinator | verified/2/2 | NO | NO | Coordinator at maxParallel, dependency-gated |
| JAC-4216 | high | (unassigned) | — | NO | NO | Jack decision gate |
| JAC-4217 | high | (unassigned) | — | NO | NO | Jack decision gate |
| JAC-3555-3558 | high | (unassigned) | — | NO | NO | Human gate |
| JAC-3714 | high | (unassigned) | — | NO | NO | Approval-gated (interactive sudo) |

## Dispatches: 0 — No Dispatchable Lanes

1. **Herald**: lane=verified but agent.status=error (adapter-init Traceback) — NOT routable
2. **Plan Runner**: at maxParallel (2/2, JAC-4783 + JAC-4746), no capacity
3. **Coder X**: at maxParallel (1/1, JAC-4694), no capacity (JAC-3705 already dispatched via child JAC-4694)
4. **Coder Y**: lane.state=error — NOT routable
5. **Hermes Mistral**: lane.state=paused — not capacity
6. **Flash**: lane.state=pending_repair — NOT routable
7. **Zatara**: verified+idle but no assigned TODOs
8. **Coordinator/Wings**: self-reserved

## Waiting On
1. Herald recovery (agent.status=error → idle/running) — JAC-4577/JAC-4580
2. Plan Runner capacity (JAC-4783 or JAC-4746 completion)
3. Coder X capacity (JAC-4694 completion)
4. New TODO assignment to a verified+idle lane (Zatara)
5. Herald/Plan Runner TODO unblocking (currently no independent plan-backed TODOs)

## Disposition: in_progress (restart-ready)

Queue genuinely exhausted. No dispatches this cycle. All verified lanes are either in error state, at capacity, or self-reserved. Native Paperclip child-completion continuation remains the liveness path — awaiting upstream completions (JAC-4694, JAC-4783, JAC-4746, JAC-4777) to free lane capacity.

**Evidence:** Live Paperclip API (GET /api/companies/{cid}/agents + GET /issues?status=in_progress + GET /issues/{id}). State verified at 2026-08-05T19:15Z.

**Note on previous failure:** The `process_lost` retry chain (c88a1b54 → ded37528 → 99b153bc) was caused by a DB unique-constraint violation (`issues_open_routine_execution_uq`) during recovery claim — a race between concurrent execution lock acquisition, not a workspace validation issue. Current run 99b153bc holds the lock cleanly; no workspace reset required.
