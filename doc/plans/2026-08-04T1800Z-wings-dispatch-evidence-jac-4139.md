# JAC-4139 Cycle 2026-08-04T18:00Z — Fresh Live Re-Verification

**Run:** 6e6a6a35-eff0-4ad2-9ad7-99490e0e7051 (Wings, hermes_local)
**Paperclip API:** http://127.0.0.1:3101 (v2026.722.0, deploymentMode=local_trusted)
**Method:** authenticated GET /api/companies/87c32b8e.../agents + paginated GET /issues (limit=100, offset loop) + selective GET /issues/{id} for verified-lane assignments only

## Acknowledged Wake

Latest wake comment reports run `66a4cdf5-7099-4eb5...` timed out. The timeout was caused
by an N+1 API pattern: the verify script iterated over ALL issues (1000+ in a single batch) and
called `get_detail()` on every one, hitting the API rate limit and stalling. This cycle's verify
script (doc/plans/_wings_verify5.py) paginates issues with offset and only fetches detail for
issues assigned to verified-lane agents, completing well under the run timeout.

## Lane State — Fresh Live Read (18:00Z)

| Agent | status | errorReason | lane.state | pool | model | maxPar | Dispatchable? |
|---|---|---|---|---|---|---|---|
| Wings (self) | running | none | verified | local-aegis | poolside/laguna-s-2.1:free | 4 | NO (self-reserved) |
| Coordinator (self) | idle | none | verified | local-aegis | poolside/laguna-s-2.1:free | 2 | NO (self-reserved) |
| Herald | **error** | **Traceback (most recent call last)** | verified | local-aegis | poolside/laguna-s-2.1:free | 2 | **NO (agent error, not routable)** |
| Plan Runner | idle | none | verified | local-aegis | poolside/laguna-s-2.1:free | 2 | YES (capacity=2, but no eligible child work) |
| Aegis Coder X | idle | none | verified | local-aegis | ollama/qwen3-coder:30b | 1 | NO (occupied by JAC-4606 in_progress) |
| Aegis Coder Y | idle | none | **error** | local-aegis | ollama/qwen3-coder:30b | 1 | NO (lane.state=error) |
| Hermes Mistral | paused | none | paused | ollama-cloud | deepseek-v4-pro | 1 | NO (paused) |
| Flash | error | Traceback (adapter init) | pending_repair | ollama-cloud | deepseek-v4-flash | 1 | NO (pending_repair) |

### Pool Capacity

| Pool | Capacity | Available | Reason |
|---|---|---|---|
| local-aegis | 4 | 0 dispatchable with eligible work | Herald error; Plan Runner has capacity but assigned issue is coordinator's own; Coder X at capacity; Coder Y lane=error |
| ollama-cloud | 2 | 0 | Mistral paused, Flash pending_repair |
| independent-review | 0 | 0 | No formal independent-review lanes |

## Active Runs — Critical Finding

**ALL 7 in_progress issues have execRunId=None.** No active runs exist across the entire fleet right now:

| Issue | Assignee | execRunId | Status |
|---|---|---|---|
| JAC-4532 | Maar | None (orphaned) | in_progress |
| JAC-4629 | Karax | None (orphaned) | in_progress |
| JAC-4643 | Bright | None (orphaned) | in_progress |
| JAC-4554 | Kimi Code via Ringer | None (orphaned) | in_progress |
| JAC-4503 | Dinkelspiel | None (orphaned) | in_progress |
| JAC-4606 | Aegis Coder X | None (orphaned) | in_progress |
| JAC-4139 | Wings (self) | None | in_progress |

Note: JAC-4606 is in_progress assigned to Coder X and consumes 1/1 maxParallel capacity,
even though execRunId=None. Per the issue contract: "no live run OR issue lease already occupies
it" — the in_progress lease itself occupies the lane.

## TODO Queue — 32 Issues, All Policy-Excluded

### Assigned to verified lane agents:

| Issue | Assignee | Policy Exclusion |
|---|---|---|
| JAC-3628 | Plan Runner | Coordinator's own planning issue — not independent task |
| JAC-3705 | Aegis Coder X | Canonize canary work; Coder X at capacity (JAC-4606) |
| JAC-3770 | Coordinator | Approval-gated production deploy (self) |
| JAC-3634 | Coordinator | Blocked on JAC-3628 |
| JAC-3400 | Coordinator | Human gate (medication refill for Jack) |
| JAC-4000 | Wings (self) | This coordinator issue (self) |
| JAC-4139 | Wings (self) | This issue (self) |

### Assigned to non-lane agents (no executionLane metadata):
- JAC-4632–JAC-4640 (8 issues) → assigned to Maar (read-only+impl, but no formal lane)
- JAC-4644 → assigned to Karax (no formal lane)
- JAC-3970 → unassigned (canary, no independent plan)

### Unassigned / human-gated:
- JAC-4217, JAC-4216 — Jack decision gates
- JAC-3714 — approval-gated (Nix install, interactive sudo)
- JAC-3555, JAC-3557, JAC-3558 — human gates (Jack action required)
- JAC-3358–JAC-3361 — children of cancelled JAC-2447
- JAC-3365 — NotebookLM login gated
- JAC-3437 — personal task (haircut)

### Assigned to non-verified lanes:
- JAC-4058, JAC-4059, JAC-4060 → Hermes Mistral (paused lane)

**No independent plan-backed task found.**

## Root Cause Analysis

1. **Herald re-errored** (Traceback in adapter init) — lane state=verified but agent status=error.
   This is the same recurring adapter-init traceback class as JAC-4580 (assigned to Fenix, blocked)
   and JAC-4575 (20.errored agents incident, done — root cause was NOUS_API_KEY, now restored per
   JAC-4604 which shows status=done). Herald's re-error may be a transient openrouter/poolside
   connectivity issue or a stale adapter config issue tracked by JAC-4577 (blocked, assigned to Pi).

2. **NOUS_API_KEY recovery is done** (JAC-4604 status=done). However, Herald continues to error
   with adapter-init Tracebacks, suggesting the issue is NOT the API key itself but rather an
   adapter initialization or config-drift problem (JAC-4577: residual hermes_local config).

3. **No new fresh generation failures** can be recorded on verified-idle lanes because:
   - Herald (the only free verified-idle lane besides Plan Runner) is in error state
   - Plan Runner's only assigned work is JAC-3628 (the coordinator's own projection issue)
   - No independent TODO exists for Plan Runner to dispatch

## Dispatches: 0 — Queue Exhausted (confirmed fresh live at 18:00Z)

No dispatchable lane has eligible independent work:
1. Herald: agent error (Traceback) — not routable despite verified lane
2. Plan Runner: verified+idle, capacity=2, but no independent plan-backed TODO assigned to it
3. Coder X: at capacity (JAC-4606 in_progress, maxParallel=1)
4. Coder Y: lane.state=error
5. Hermes Mistral: paused
6. Flash: pending_repair, agent error
7. Coordinator/Wings: self-reserved

## Disposition: in_progress (restart-ready)

Awaiting:
1. Herald re-recovery (recurring adapter-init Traceback — JAC-4577/JAC-4580)
2. JAC-4606 completion (frees Coder X capacity)
3. JAC-3628 completion (Plan Runner's own work; would free Plan Runner's assigned slot)
4. Native child-completion continuation remains the liveness path; fallback schedule secondary

Evidence: doc/plans/2026-08-04T1800Z-wings-dispatch-evidence-jac-4139.md
