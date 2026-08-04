# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T05:10Z

## Coordinator Cycle Timestamp
2026-08-03T05:10Z (run 413ac1a1-d121-4b56-a5de-555118c9b4d5)

## Verification Method
Fresh authenticated live re-verification via:
- `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` (Paperclip v2026.722.0, bearer=Wings 80284e06)
- `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues?limit=2000` (bulk fetch for all statuses)
- `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues?limit=2000&status=todo` (filter for unassigned todos)

No stale-log inference. All gate states confirmed from live API metadata.

## Dispatch Decision
0 dispatches — queue exhausted.

## Verified Idle Free Lanes (3/3 capacity available)

| Lane | Pool | Model | State | maxParallel | Status |
|------|------|-------|-------|-------------|--------|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | 1 | idle |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | 1 | idle |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | verified | 1 | idle |

Pool limits: claude-code 2/2, independent-review 1/1.

## Lane Occupancy and Blocker Analysis

### Herald (a1e8cb0d) — ASSIGNED
- Assigned issue: **JAC-4187** — "D3 — Fleet dashboard: wireframes for the six V1 views"
- Issue status: **blocked**
- Blocker chain: JAC-4187 (blocked) → JAC-3933 (in_review, assigned to nobody)
- JAC-3933 confirmed live: status=in_review, assignee=none
- **Root cause:** Awaiting review completion on JAC-3933 (cross-vendor long-run/retry-loop/context/tool-call detectors). No lane lease available.

### Plan Runner (2c6b1cc9) — ASSIGNED
- Assigned issue: **JAC-3628** — "Pull-first fleet beacon, natural-turn context, and Fable project visibility"
- Issue status: **blocked**
- Blocker chain: JAC-3628 (blocked) → JAC-4093 (blocked) → JAC-3705 (todo, activeRun=true on Aegis Coder X)
- JAC-4093 confirmed live: blocked, dependent on JAC-3705
- JAC-3705 confirmed live: status=todo, assignee=Aegis Coder X (da00de99), activeRun=true
- **Root cause:** JAC-3705 canary preconditions require Fable repair (JAC-4388) and live Hermes parser verification. Dependent chain.

### Kimi Code via Ringer (3f1712eb) — ASSIGNED
- Assigned issue: **JAC-3596** — "Independent exact-SHA verification of all HOLD gates"
- Issue status: **todo**
- ParentId: bd78b074-950e-4731-b796-0ca32e5b7339 (parent issue exists)
- Dependency chain: JAC-3596 (todo) → Luna tasks JAC-3592/3593/3594 (in_progress, Luna High Planner 2f92499a)
- JAC-3592 confirmed live: in_progress
- JAC-3593 confirmed live: in_progress
- JAC-3594 confirmed live: in_progress
- **Root cause:** Kimi lane is blocked on Luna implementation tasks (parent dependency). Not independently dispatchable.

## Excluded Lanes (not capacity)

| Lane | Pool | State | Status | Reason |
|------|------|-------|--------|--------|
| Aegis Coder X (da00de99) | local-aegis | verified | running | agent.status=error: "Process lost -- server may have restarted"; P89 gate down; active run on JAC-3705; NOT routable |
| Aegis Coder Y (181f381b) | local-aegis | error | idle | errorReason: Timed out after 12000s; NOT routable until clean re-probe |
| Paperclip Agent Auditor (5b2bece1) | codex | quota_blocked | error | quota_blocked until Aug 4 11:09 PM CT; NOT routable |
| Hermes Mistral (1029acc4) | ollama-cloud | paused | paused | Manual pause; NOT routable |
| Flash (b37f4d70) | ollama-cloud | pending_repair | idle | errorReason: MCPServerTask event-loop-closed defect; pending repair; NOT routable |
| Wings self (80284e06) | ollama-cloud | reserved | running | Reserved strategic lane; excluded from routine dispatch |
| Flash Executor (d22538a9) | — | — | idle | No executionLane configured; not routable |
| Klaude (4d9d8ed5) | — | — | error | gateway token mismatch; NOT routable |
| Fable (f1ef5e14) | — | — | error | errorReason: Traceback (see agent detail); NOT routable |

## Unassigned Todo Pool (7 issues, all policy-excluded)

| Identifier | Priority | Labels | Reason for Exclusion |
|-----------|----------|--------|---------------------|
| JAC-3671 | critical | — | credential-bound (Restore Talaris anthropic + mistral credentials — human-gate) |
| JAC-4388 | high | — | board action: Jack approval gate (Repair Fable executionLane + authorizationPolicy) |
| JAC-4501 | high | — | self-review (Review productivity for JAC-4000 — assigned to Wings' own coordination issue) |
| JAC-4500 | high | — | self-review (Review productivity for JAC-4139) |
| JAC-4217 | high | — | DECISION (Jack): human decision gate |
| JAC-4216 | high | — | DECISION (Jack): human decision gate |
| JAC-3714 | high | — | approval-gated: requires interactive sudo (Install Nix) |
| JAC-3558 | high | — | Human gate |
| JAC-3557 | high | — | Human gate |
| JAC-3555 | high | — | Human gate |
| JAC-3970 | low | — | dependent (dispatches JAC-3705 to local-aegis lane — Aegis Coder X is down) |
| JAC-3437 | medium | — | dependent (Get haircut — personal, not plan-backed) |
| JAC-3365 | medium | — | dependent (populate notebook — backlog, not plan-backed) |
| JAC-3541 | low | — | TEST_DELETE (test artifact) |

## No-Writes-During-Canary Condition
No dispatchable independent work exists. The external fast lane (ollama-cloud) is not eligible for new dispatch — Wings is reserved, Hermes Mistral is paused, Flash is pending_repair, and the ollama-cloud pool has 0/3 available capacity (all lanes either reserved, paused, or in repair).

## Active Runs Summary
- **JAC-4000** (this issue): activeRun=true, running
- **JAC-3705**: activeRun=true, assigned to Aegis Coder X (da00de99), status=todo, agent in error state
- **JAC-4000/JAC-4187/JAC-3628/JAC-3596**: lane-level activeRun=none on the idle lanes (Herald, Plan Runner, Kimi)

## Blockers
1. **JAC-3933** (in_review) — blocks Herald's assigned JAC-4187
2. **JAC-4388** (todo, Jack approval gate) — blocks Plan Runner chain via JAC-3629 → JAC-3628 → JAC-4093 → JAC-3705
3. **JAC-3592/3593/3594** (in_progress, Luna High Planner) — blocks Kimi's assigned JAC-3596
4. **Aegis Coder X health** (error: Process lost) — blocks local-aegis pool and JAC-3705 canary

## Conclusion
Queue exhausted. All 3 verified-idle free lanes have assigned work blocked upstream. No independent plan-backed unleased tasks available. Disposition: in_progress (restart-ready), awaiting native Paperclip child-completion continuation on upstream resolution of JAC-3933, JAC-4388, and Luna JAC-3592/3593/3594.
