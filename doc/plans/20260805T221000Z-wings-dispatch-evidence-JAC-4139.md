# JAC-4139 Dispatch Evidence — Cycle 2026-08-05T22:10Z

**Run:** 9ec76b13-f553-4bf1 (Wings, hermes_local, poolside/laguna-s-2.1:free)
**Paperclip API:** v2026.722.0, deploymentMode=local_trusted
**Verification timestamp:** 2026-08-05T22:10Z (live authenticated API)
**Host health:** green (Bifrost /health = {"status":"ok","components":{"db_pings":"ok"}})

## Acknowledged Wake Comment

Comment 446682de-5ce4-4888-bb45-96756192043c (2026-08-05T21:34:28Z) by local-board — Cycle 20260805T2125Z, reporting 0 dispatches.

## Fresh Authenticated Live Verification

Authenticated GET /api/companies/{cid}/agents (Bearer=Wings 80284e06). Paperclip API HTTP 200 on 127.0.0.1:3101.

### Lane State (live API re-verification)

| Agent | status | lane.state | pool | model | maxParallel | Active Run | Occupancy | Routable? |
|---|---|---|---|---|---|---|---|---|
| Plan Runner (2c6b1cc9) | idle | verified | local-aegis | laguna-s-2.1:free | 2 | none | 0/2 | YES — free |
| Aegis Coder X (da00de99) | running | verified | local-aegis | qwen3-coder:30b | 1 | a05e06b6 (running) | 1/1 | NO — occupied |
| Herald (a1e8cb0d) | **error** | verified | local-aegis | laguna-s-2.1:free | 2 | none | 0/2 | NO — agent.status=error |
| Aegis Coder Y (181f381b) | idle | **error** | local-aegis | qwen3-coder:30b | 1 | none | 0/1 | NO — lane.state=error |
| Zatara (f83be6e5) | running | verified | local-aegis | laguna-s-2.1:free | 2 | none | 0/2 | NO — diagnostic/release/review only, no impl |
| Coordinator (dc2ca597) | running | verified | local-aegis | laguna-s-2.1:free | 2 | (self) | 1/2 | NO — self-reserved |
| Wings (self, 80284e06) | running | verified | local-aegis | laguna-s-2.1:free | 4 | (self) | 1/4 | NO — self-reserved |
| Hermes Mistral (1029acc4) | **paused** | verified | ollama-cloud | deepseek-v4-pro | 1 | none | 0/1 | NO — paused (not capacity) |
| Flash (b37f4d70) | running | **pending_repair** | ollama-cloud | deepseek-v4-flash | 1 | none | 0/1 | NO — pending_repair |

### Excluded lanes:
- **Herald**: agent.status=error despite verified lane metadata — NOT routable
- **Aegis Coder Y**: lane.state=error — NOT routable
- **Hermes Mistral**: lane.state=paused — not capacity
- **Flash**: lane.state=pending_repair — not capacity
- **Zatara**: verified but allowedWork=[read-only, diagnostic, release, review] — no implementation capability
- **Coordinator, Wings**: self-reserved

### JAC-4694 Active Run Detail

Coder X (da00de99) has active run `a05e06b6-942a-4dd4-af41-484d7e3aab1b` on JAC-4694:
- Status: running
- StartedAt: 2026-08-05T21:28:56Z
- LastOutputAt: 2026-08-05T22:01:03Z
- Silence age: ~31s (within ok threshold, 3600000ms)
- Current status: "Receiving agent output"

The issue status shows `todo` (UpdatedAt 21:44:03Z) because the execution workspace lock was set but the issue status hasn't been updated to `in_progress` by the harness. However, the active run confirms the lane is occupied 1/1. Coder X is NOT free for dispatch.

### JAC-3705 Dependency Check

JAC-3705 (the underlying canary task that JAC-4694 dispatches) is blocked by JAC-4093 (status=blocked). However, Coder X's active run is already executing JAC-4694, so this is an in-flight canary task. The blocking relationship is pre-existing and was noted in prior dispatch evidence.

## TODO Queue — Eligible Candidates (2026-08-05T22:10Z)

| Issue | Priority | Assigned To | Routable Lane | Active Run? | Dispatchable? | Reason |
|---|---|---|---|---|---|---|
| JAC-3705 | high | Coder X | verified | YES (run a05e06b6) | NO | Already dispatched, Coder X 1/1 occupied |
| JAC-4756 | medium | None | — | NO | NO | Jack decision gate (human-gated) |
| JAC-4217 | high | None | — | NO | NO | Jack decision gate |
| JAC-4216 | high | None | — | NO | NO | Jack decision gate |
| JAC-3714 | high | None | — | NO | NO | Approval-gated, requires interactive sudo |
| JAC-3558 | high | None | — | NO | NO | Human gate |
| JAC-3557 | high | None | — | NO | NO | Human gate |
| JAC-3555 | high | None | — | NO | NO | Human gate |
| JAC-4748-4755 | medium | None | — | NO | NO | Parent JAC-4746 is done; Phase 1-4 stale |
| JAC-4738 | medium | None | Zatara | NO | NO | Zatara has no implementation capability |
| JAC-4695 | medium | None | — | NO | NO | Review issue (policy-excluded) |
| JAC-4736 | low | None | — | NO | NO | Test child |
| JAC-3970 | low | None | — | NO | NO | Dispatch child of JAC-3705 (already dispatched) |

No plan-backed TODO issues found in the queue. All plan-backed candidates are either:
- Already dispatched and running (JAC-4694 → JAC-3705 on Coder X)
- Human-gated (Jack decisions, approval gates)
- Test children
- Dependent on done parent projects (stale)

## Dispatch Decision: 0 dispatches

Plan Runner is free (0/2, verified, idle) but has no eligible plan-backed TODO assigned or available for dispatch. All unassigned TODOs are policy-excluded (human gates, Jack decisions, approval-gated, test children, or stale dependent phases). Coder X is occupied (1/1) by the active run on JAC-4694. No other verified lanes are routable or have implementation capability.

No fresh authenticated generation failure on any verified lane — the hold is capacity, not outage.

## Active Runs (in_progress, 2026-08-05T22:10Z)

| Issue | Assignee | Agent | execRunId | Lane | Status |
|---|---|---|---|---|---|
| JAC-4139 | Wings | Wings (80284e06) | 9ec76b13 | local-aegis/verified | running (self) |
| JAC-4694 | Coder X | Coder X (da00de99) | a05e06b6 | local-aegis/verified | running |

## Pool Capacity Summary

- **local-aegis**: Coder X 1/1, Coordinator 1/2, Wings 1/4, Plan Runner 0/2, Herald 0/2 (errored) = 2 active runs. Within pool limits. Host health: green. Per-cycle dispatch limit: 2. Currently 0 dispatched this cycle (all remaining capacity is either occupied, error, or diagnostic-only).
- **ollama-cloud**: 0/3 usable (Mistral paused, Flash pending_repair).
- **No claude-code/omnigent, codex, external-fast-lane, or Ringer-review lane agents present.**

## Actions

1. Fresh authenticated agent-table GET at 22:10Z (this cycle).
2. Verified JAC-4694 active run `a05e06b6` is still running on Coder X (1/1 occupied).
3. Scanned TODO queue for eligible independent plan-backed tasks — none found.
4. Confirmed no fresh generation failures on any verified lane.

## Disposition

in_progress (restart-ready) — awaiting native child-completion wake on JAC-4694 (Coder X active run a05e06b6) to free Coder X 1/1 slot, and eligible TODO arrival for Plan Runner.

**Evidence:** doc/plans/20260805T221000Z-wings-dispatch-evidence-JAC-4139.md