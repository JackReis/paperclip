# Coordinator Dispatch Evidence — JAC-4000

## Cycle: 2026-08-03T00:44Z (heartbeat d0ebae14)

## Objective
Read metadata.executionLane from the live agent table. Select at most ten independent, plan-backed tasks per cycle, one run per selected agent. Enforce each verified lane maxParallel and pool limits.

## Fresh Authenticated Live API Verification

- Paperclip API v2026.722.0, deploymentMode=local_trusted
- Bearer: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Endpoint: GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents

## Verified-Idle Free Lanes (3/3)

| Agent | Pool | Model | State | Transport | VerifiedAt | maxParallel | assignedIssueId |
|-------|------|-------|-------|-----------|------------|-------------|-----------------|
| Herald | claude-code | claude-opus-4-8 | verified | omnigent | 2026-07-31T19:56:00Z | 1 | null |
| Plan Runner | claude-code | claude-opus-4-8 | verified | omnigent | 2026-07-31T19:56:00Z | 1 | null |
| Kimi Code via Ringer | independent-review | kimi-for-coding/k3 | verified | ringer | 2026-07-23T20:03:10Z | 1 | null |

All three lanes: state=verified, no assigned work, no live lease. maxParallel=1 each → 3 dispatch slots available.

## Excluded Lanes (NOT dispatchable capacity)

| Agent | Pool | Lane State | Agent Status | Reason Excluded |
|-------|------|------------|--------------|-----------------|
| Aegis Coder X | local-aegis | verified | error | Lane=verified but agent status=error ("Process lost -- server may have restarted"); host P89 gate down per CTX-SpO2 |
| Aegis Coder Y | local-aegis | error | idle | Lane state=error (12000s timeout defect) |
| Paperclip Agent Auditor | codex | quota_blocked | error | Codex usage limit until 2026-08-04; NOT routable |
| Hermes Mistral | ollama-cloud | paused | paused | Lane=paused, manual intervention |
| Flash | ollama-cloud | pending_repair | idle | MCPServerTask event-loop-closed defect |
| Wings (self) | ollama-cloud | reserved | running | Strategic/reserved |

## Dispatch Candidate Evaluation

### Herald (claude-code/Opus, 1 slot)

Candidate issues for Herald:
- JAC-4187 (D3 — Fleet dashboard wireframes): status=blocked, blockerAttention={state: needs_attention, unresolvedBlockerCount: 2, sampleBlocker: JAC-4494 (attention_required), JAC-3933 (stalled)} → **blocked upstream, excluded**
- JAC-4422: status=blocked → **blocked, excluded**
- JAC-3876 (JAC-3577 owner preview card): status=blocked, assigned to Aegis Coder X (da00de99), blockerAttention needs_attention → **blocked upstream, excluded**
- JAC-3716: not found in active set → stale reference, excluded
- JAC-4190 (D5 — Fleet dashboard build slice): status=blocked, blockerAttention needs_attention → **dependency-blocked, excluded**

Herald dispatch: **0** (no independent unblocked work)

### Plan Runner (claude-code/Opus, 1 slot)

Candidate issues for Plan Runner:
- JAC-3628 (notes-pc9x1 Pull-first fleet beacon): status=blocked, blockerAttention={state: needs_attention, unresolvedBlockerCount: 2, sampleBlocker: JAC-3634 (attention_required)} → **blocked upstream, excluded**
- JAC-3629 (notes-pc9x1.1 Fable 5 project page): status=blocked, parentId=JAC-3628, blockedBy JAC-4388 (board action / Jack approval gate) → **dependency-blocked, excluded**
- JAC-4388 ([board action] Repair Fable executionLane): status=todo, assigned to none, **Jack approval gate** → policy-excluded
- JAC-4217 (DECISION Jack: migrate off claude_local): status=todo, **Jack decision gate** → policy-excluded
- JAC-4216 (DECISION Jack: re-enable ollama-cloud): status=todo, **Jack decision gate** → policy-excluded

Plan Runner dispatch: **0** (no independent unblocked work)

### Kimi Code via Ringer (independent-review/K3, 1 slot)

Candidate issue:
- JAC-3596 (Independent exact-SHA verification): status=todo, assigned to Kimi (3f1712eb), parentId=bd78b074. Description states "verify the integrated immutable candidate produced by the four implementation leaves." Dependencies: JAC-3592/3593/3594 (in_progress, Luna items under parent bd78b074). → **dependency-blocked (implementation leaves not complete), excluded**

Kimi dispatch: **0** (dependent work, excluded)

### Unassigned Todo Pool (4 issues, all policy-excluded)

| Issue | Priority | Reason Policy-Excluded |
|-------|----------|----------------------|
| JAC-3671 | critical | credential-bound (restore Talaris anthropic + mistral credentials) |
| JAC-4501 | high | self-review (productivity review for JAC-4000 — Wings' own issue) |
| JAC-4500 | high | self-review (productivity review for JAC-4139 — Coordinator) |
| JAC-4388 | high | board action / Jack approval gate |

No independent plan-backed unleased task available.

## ollama-cloud Pool

0/3 dispatchable. Wings (reserved), Hermes Mistral (paused), Flash (pending_repair) — all excluded.

## Stale-Log Inference Check

Per Wings job contract: "Never infer a quota outage from stale logs; record a fresh authenticated generation failure before holding a verified lane."

All lane states above are from fresh authenticated live API GET at cycle start time (2026-08-03T00:44Z). No stale-log inference used. Aegis Coder X's error status is the live agent.status=error field, not from stale logs.

## Dispatch Decision: 0 dispatches

Queue exhausted. All verified-idle free lanes have candidate work that is dependency-blocked upstream or policy-excluded.

## Disposition

in_progress (restart-ready) — 0 dispatches. Queue exhausted. Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-3933 (in_review) unblocks Herald (JAC-4187)
- JAC-4388 (todo) unblocks Plan Runner (JAC-3629)
- JAC-3592/3593/3594 (in_progress) unblock Kimi (JAC-3596)

Native Paperclip child-completion continuation remains the liveness path. Fallback schedule (JAC-4171/JAC-4173) secondary.
