# JAC-4000 Dispatch Evidence — Cycle 2026-08-03T00:22Z

## Run
- Run ID: b6525cc8-45a5-4415-bc5c-420da32f6466
- Agent: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Verified against: Paperclip API v2026.722.0 at http://127.0.0.1:3101
- Verification method: authenticated live GET (bearer=Wings 80284e06)

## Agent Table (live — GET /api/companies/87c32b8e.../agents)

### Verified-idle free lanes (3/3) — all assignedIssueId=null, agentStatus=idle

| Agent | Pool | Model | State | maxParallel | Verified At |
|---|---|---|---|---|---|
| Herald | claude-code | claude-opus-4-8 | verified | 1 | 2026-07-31T19:56:00Z |
| Plan Runner | claude-code | claude-opus-4-8 | verified | 1 | 2026-07-31T19:56:00Z |
| Kimi Code via Ringer | independent-review | kimi-for-coding/k3 | verified | 1 | 2026-07-23T20:03:10Z |

### Excluded lanes (NOT routable)

| Agent | Pool | Model | State | Reason |
|---|---|---|---|---|
| Aegis Coder X | local-aegis | ollama/qwen3-coder:30b | verified | agent.status=error, host P89 gate down |
| Aegis Coder Y | local-aegis | ollama/qwen3-coder:30b | error | lane=error (12000s timeout defect) |
| Paperclip Agent Auditor | codex | codex_local | quota_blocked | quota_blocked until Aug 4 ~15:09 CT |
| Hermes Mistral | ollama-cloud | deepseek-v4-pro | paused | manual |
| Flash | ollama-cloud | deepseek-v4-flash | pending_repair | MCPServerTask event-loop-closed defect |
| Wings (self) | ollama-cloud | deepseek-v4-pro | reserved | strategic reserve |

## Dispatch Decision: 0 dispatches

### Herald (claude-code / omningent)
- assignedIssueId=null, no live lease.
- Candidate issues for this lane checked: JAC-4187 (status=blocked, dependency-blocked on JAC-3933/JAC-4495 — in_review/backlog), JAC-4422, JAC-3876, JAC-3716 (all dependency-blocked or excluded).
- No independent plan-backed unleased task found on Herald's eligible issue set.
- Herald's allowedWork = [read-only, implementation, review].

### Plan Runner (claude-code / omningent)
- assignedIssueId=null, no live lease.
- Candidate: JAC-3628 (status=blocked, dependency-blocked on JAC-3629→JAC-4388 which is a board action requiring Jack approval — not resolved).
- JAC-3629: status=blocked (depends on JAC-4388).
- JAC-4388: status=todo (board action requiring Jack approval — policy-excluded as board action requiring human decision).
- No independent plan-backed unleased task found.

### Kimi Code via Ringer (independent-review / ringer)
- assignedIssueId=null, no live lease.
- Candidate: JAC-3596 (status=todo, blocked on Luna items JAC-3592/3593/3594 which are in_progress — dependency gate).
- JAC-3592/3593/3594: status=in_progress, no new activity since 2026-08-01.
- No independent plan-backed unleased task found.

## Unassigned todo issues (reviewed — all policy-excluded)

| Issue | Status | Exclusion reason |
|---|---|---|
| JAC-3671 | todo | credential-bound (Restore Talaris credentials) |
| JAC-4501 | todo | self-review (Review productivity for JAC-4000) |
| JAC-4500 | todo | self-review (Review productivity for JAC-4139) |
| JAC-4388 | todo | board action requiring Jack approval |
| JAC-3705 | todo | canary (policy-excluded) |
| JAC-3970 | todo | canary dispatch (policy-excluded) |
| JAC-4046 | todo | ollama-cloud lane (pool exhausted, Hermes Mistral) |
| JAC-4060 | todo | ollama-cloud lane (pool exhausted) |
| JAC-4059 | todo | ollama-cloud lane (pool exhausted) |
| JAC-4058 | todo | ollama-cloud lane (pool exhausted) |
| JAC-3802 | todo | Kloud audit — review/implementation candidate but no plan document attached (not plan-backed) |
| JAC-3634 | todo | depends on .1-.4 rollout receipts + Fable page transition (dependency-blocked) |
| JAC-3596 | todo | independent review but depends on Luna leaves in_progress (dependency-blocked) |
| JAC-4217 | todo | DECISION (Jack) gate |
| JAC-4216 | todo | DECISION (Jack) gate |
| JAC-3558 | todo | human gate |
| JAC-3557 | todo | human gate |
| JAC-3555 | todo | human gate |
| JAC-3590 | todo | Zatara lane restoration — depends on operator/host config (credential/host-scoped) |
| JAC-3400 | medium | human gate (Oklahoma Integrated Care) |
| JAC-3437 | medium | human gate (haircut) |
| JAC-3365 | medium | human gate (NotebookLM) |
| JAC-3359 | medium | human gate (Toyota) |
| JAC-3361 | medium | human gate (obd codes) |
| JAC-3358 | medium | human gate (AutoZone) |
| JAC-3360 | medium | human gate (hybrid battery) |
| JAC-3437 | medium | human gate |
| JAC-3714 | high | approval-gated (interactive sudo / Nix install) |
| JAC-3597 | high | Jack approval gate |
| JAC-3541 | low | test artifact |

## Key Discrepancies vs. Previous Cycle's Report

- The 00:14Z comment described the 3 free lanes as having "assigned work blocked upstream." Live verification shows assignedIssueId=null for all three — the issues are dependency-blocked in the queue, not formally assigned to the lanes. This is a wording correction, not a state change: the lanes remain free but no eligible independent plan-backed task exists.

## Upstream Blockers (live — no stale-log inference)

| Issue | Status | Dependency |
|---|---|---|
| JAC-4187 | blocked | depends on JAC-3933 (in_review) + JAC-4495 (backlog) |
| JAC-3933 | in_review | stalled — blocks JAC-4187 |
| JAC-4495 | backlog | needs resolution to unblock 3933 |
| JAC-3629 | blocked | depends on JAC-4388 (Jack approval) |
| JAC-4388 | todo | board action requiring Jack approval |
| JAC-3628 | blocked | depends on JAC-3629→JAC-4388 |
| JAC-3596 | todo | depends on Luna JAC-3592/3593/3594 (in_progress) |
| JAC-3592/3593/3594 | in_progress | Luna leaves, no new activity since 2026-08-01 |

## Disposition

in_progress (restart-ready) — 0 dispatches. Queue exhausted. All 3 verified-idle free lanes confirmed live; no independent plan-backed unleased task available. Awaiting native child-completion wake on upstream resolution of:
- JAC-4388 (Jack approval → JAC-3629 → JAC-3628 → Plan Runner)
- JAC-3933/JAC-4495 (→ JAC-4187 → Herald)
- JAC-3592/3593/3594 (→ JAC-3596 → Kimi)

Evidence confirmed via authenticated live API at 2026-08-03T00:22Z — no stale-log inference.
