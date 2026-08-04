# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T03:46Z

**Run:** 67ba2f52-97a3-4797-ab6f-b1965f8cddce
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Time:** 2026-08-03T03:46:42Z
**Paperclip API:** v2026.722.0
**Verification method:** authenticated GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents + GET /api/companies/87c.../issues?status={todo,in_progress,in_review,blocked}

## Wake Acknowledged

Comment e0938296-260a-4e6d-9ad5-4f5f272b59f5 at 2026-08-03T03:45:00.524Z by local-board — fresh authenticated verification cycle at 03:41Z. State unchanged since last cycle. No upstream blockers cleared in the ~5 minutes between cycles.

## Dispatch Decision: 0 dispatches

No independent plan-backed unleased task found. All candidate issues dependency-blocked or policy-excluded. No stale-log inference — all gate states confirmed via authenticated live API.

## Lane Verification (live, authenticated)

### Verified-idle free lanes (3/3) — all assigned work blocked upstream

| Lane | Agent | Pool | Model | State | verifiedAt | maxParallel | Assigned Issue | Upstream Blocker |
|------|-------|------|-------|-------|------------|-------------|----------------|-----------------|
| Herald | a1e8cb0d | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | JAC-4187 (blocked) | JAC-3933 (in_review), JAC-3932 (in_review) |
| Plan Runner | 2c6b1cc9 | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | JAC-3628 (blocked) | JAC-3629 → JAC-4388 (todo, Jack gate), JAC-3634 (todo), JAC-4093 (blocked) |
| Kimi Code via Ringer | 3f1712eb | independent-review | kimi-for-coding/k3 | verified | 2026-07-23T20:03:10Z | 1 | JAC-3596 (todo) | Luna: JAC-3592/3593/3594 (in_progress) |

### Excluded lanes (not capacity)

| Lane | Agent | Pool | State | Reason |
|------|-------|------|-------|--------|
| Aegis Coder X | da00de99 | local-aegis | verified | status=running but errorReason="Process lost -- server may have restarted" — NOT routable |
| Aegis Coder Y | 181f381b | local-aegis | error | 12000s timeout defect — NOT routable |
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked | "You've hit your usage limit" — quota_blocked until Aug 4 11:09 PM CT |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused | manual pause, heartbeat ~15h stale — NOT routable |
| Flash | b37f4d70 | ollama-cloud | pending_repair | MCPServerTask event-loop-closed defect — NOT routable |
| Wings | 80284e06 | ollama-cloud | reserved | strategic reserve — excluded per policy |

### Pool capacity
- Claude Code (OmniGent): 2/2 verified-idle free lanes (Herald, Plan Runner) — both blocked upstream
- Independent Review (Ringer): 1/1 verified-idle free lane (Kimi) — blocked upstream
- Local Aegis: 0/2 (both excluded — X has process-lost error, Y has lane error)
- Codex: 0/1 (quota_blocked)
- Ollama Cloud pool: 0/3 (Wings reserved, Mistral paused, Flash pending_repair)
- External fast lane: 0/1 (no external canary agent present in table)

## Unassigned Todo Pool — all policy-excluded

| Issue | Priority | Exclusion |
|-------|----------|-----------|
| JAC-3671 | critical | credential-bound |
| JAC-4388 | high | board action / Jack approval gate |
| JAC-4501 | high | self-review (Wings productivity) |
| JAC-4500 | high | self-review (JAC-4139 productivity) |
| JAC-4217 | high | DECISION (Jack) — migrate autonomous org |
| JAC-4216 | high | DECISION (Jack) — re-enable ollama-cloud |
| JAC-3705 | high | assigned to Aegis Coder X (da00de99, error) |
| JAC-3714 | high | approval-gated (interactive sudo) |
| JAC-3558 | high | Human gate — Oklahoma Integrated Care |
| JAC-3557 | high | Human gate — Prius mobile 12V test |
| JAC-3555 | high | Human gate — Belmont records |
| JAC-3590 | high | Fable diagnostic lane (dependency-gated) |
| JAC-3597 | high | DECISION gate (Jack) |
| JAC-3802 | low | assigned to Paperclip Agent Auditor (5b2bece1, quota_blocked) |

## Upstream Blocker Status (live API, confirmed via UUID-scoped detail endpoints)

- JAC-3933 (in_review, unassigned): terminal blocker on Herald's JAC-4187
- JAC-3932 (in_review, unassigned): related blocker on Herald's JAC-4187
- JAC-4388 (todo, local-board, Jack approval gate): terminal blocker on Plan Runner's JAC-3629 chain
- JAC-3592 (in_progress, Luna 2f92499a): blocks Kimi's JAC-3596
- JAC-3593 (in_progress, Luna 2f92499a): blocks Kimi's JAC-3596
- JAC-3594 (in_progress, Luna 2f92499a): blocks Kimi's JAC-3596
- JAC-4093 (blocked, Plan Runner): blocks Plan Runner's JAC-3628 chain
- JAC-3634 (todo, Coordinator): blocks Plan Runner's JAC-3628 chain

## Disposition

**in_progress (restart-ready).** Awaiting native child-completion wake on upstream resolution of JAC-3933, JAC-4388, JAC-3592/3593/3594.
