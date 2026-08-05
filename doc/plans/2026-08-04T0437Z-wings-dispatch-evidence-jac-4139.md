# JAC-4139 Dispatch Evidence — Cycle 2026-08-04T04:37Z

- Run ID: 4609f686-7a77-4428-8cf3-0243675636c1
- Agent: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Timestamp: 2026-08-04T04:37Z
- Status: in_progress (restart-ready)

## Verification Method

Fresh live API call: GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents (bearer-authenticated as Wings)
Paperclip API version: v2026.722.0

## Lane State — metadata.executionLane (from agent table)

| Agent | pool | state | model | provider | maxParallel | allowedWork | laneAssignedIssueId | execRunId |
|-------|------|-------|-------|----------|-------------|-------------|---------------------|-----------|
| Wings | local-aegis | **verified** | poolside/laguna-s-2.1:free | nous | 4 | [read-only, implementation] | null | null |
| Herald | local-aegis | **verified** | poolside/laguna-s-2.1:free | nous | 2 | [read-only] | null | null |
| Plan Runner | local-aegis | **verified** | poolside/laguna-s-2.1:free | nous | 2 | [read-only, implementation] | null | null |
| Aegis Coder X | local-aegis | **verified** | qwen3-coder:30b | ollama-local | 1 | [read-only, implementation, review] | null | null |
| Coordinator | local-aegis | **verified** | poolside/laguna-s-2.1:free | nous | 2 | [read-only] | null | null |
| Aegis Coder Y | local-aegis | error | qwen3-coder:30b | ollama-local | 1 | [read-only, implementation] | null | null |
| Hermes Mistral | ollama-cloud | **paused** | deepseek-v4-pro | ollama-cloud | 1 | [read-only, implementation, review] | null | null |
| Flash | ollama-cloud | **pending_repair** | deepseek-v4-flash | ollama-cloud | 1 | [read-only, implementation] | null | null |

## Eligibility Analysis

### Verified lanes with no active run or issue lease:

1. **Wings** (local-aegis) — VERIFIED but is the dispatcher itself. Cannot dispatch to self. EXCLUDED.
2. **Coordinator** (local-aegis) — VERIFIED but is the dispatcher (read-only only). EXCLUDED.
3. **Herald** (local-aegis) — VERIFIED, laneAssignedIssueId=null, execRunId=null. BUT has 14+ in_progress issues assigned (assigneeAgentId=Herald). These issue leases occupy the lane. EXCLUDED — occupied by issue leases.
4. **Plan Runner** (local-aegis) — VERIFIED, laneAssignedIssueId=null, execRunId=null. BUT has 15+ in_progress issues assigned (assigneeAgentId=Plan Runner). These issue leases occupy the lane. EXCLUDED — occupied by issue leases.
5. **Aegis Coder X** (local-aegis) — VERIFIED, laneAssignedIssueId=null, execRunId=null. No in_progress issues assigned. POTENTIALLY eligible.

### Pool-level gate: local-aegis

Per dispatch rules: "local Aegis 2 only while host health is green."

Host health (CTX-SpO2): P87 (down), P89 (down). Host health is NOT green.
→ ALL local-aegis lanes EXCLUDED regardless of individual lane state.

### Pool-level gate: ollama-cloud

- Hermes Mistral: state=paused — NOT capacity (paused, not verified)
- Flash: state=pending_repair — NOT capacity (pending_repair, not verified)

No verified ollama-cloud lanes. The ollama-cloud pool has 0/3 capacity.

### Other pools

- No Codex lane present in agent table (agent status=error for Codex-related agents)
- No Kimi Code via Ringer lane (state=error)
- No external fast lane agent with state=verified

## Backlog Survey — Independent plan-backed tasks

Surveyed all unassigned todo issues (assigneeAgentId=null, assigneeUserId=null, status=todo).
All candidates examined and excluded:

- JAC-4556 (Repair stale in-progress queue violations) — review/audit, Coordinator-boundary
- JAC-4559 (Watchdog health audit) — review/audit, Coordinator-boundary
- JAC-4557 (Watchdog health audit) — Coordinator-boundary audit
- JAC-4540 (Ringer approval gates) — decompose task, review gate
- JAC-4537 ("test") — not plan-backed
- JAC-4501 (Review productivity for JAC-4000) — review task, policy-excluded
- JAC-4503 (Ollama Cloud API Key Recovery) — credential-bound, excluded
- JAC-4494 ("test") — not plan-backed
- JAC-4458, JAC-4460, JAC-4459 ("[dispatch] test") — not plan-backed
- JAC-3538 (Rotate Telegram bot token) — human action required, excluded
- JAC-4138 (Unlock executor capacity) — board/coordination gate, blocked
- JAC-3984 (Repair queue-invariant violations) — Coordinator-boundary, excluded
- JAC-3764 (Apply final status for JAC-3490) — authz boundary, excluded
- JAC-3747 (Plan: tune Ollama Cloud quota) — review/plan gate

No independent, plan-backed, non-policy-excluded task found.

## Host Health

CTX-SpO2: P87 (down), P89 (down). Host health NOT green.
local-aegis pool gate ("local Aegis 2 only while host health is green") is NOT satisfied.

## Fresh Authenticated Generation Failure Check

No fresh authenticated generation failure recorded on any verified lane.
(Wings errorReason is a traceback from the coordinator run itself, not a model generation failure.)

## Verdict

**0 dispatches — queue exhausted.**

- All verified lanes belong to the local-aegis pool.
- Host health is NOT green (P87/P89 down) → local-aegis pool gate NOT satisfied.
- ollama-cloud pool: 0 verified lanes (paused + pending_repair).
- No Codex/Kimi/external lanes verified.
- No independent plan-backed tasks eligible for dispatch.
- All in_progress issues on verified lanes have activeRun=null but are occupied by issue lease (assigneeAgentId).

Disposition: in_progress (restart-ready). Awaiting native child-completion continuation on upstream resolution, or fresh host health signal.
