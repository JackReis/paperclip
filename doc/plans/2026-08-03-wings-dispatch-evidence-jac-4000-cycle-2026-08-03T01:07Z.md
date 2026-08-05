# Coord Evidence — JAC-4000 Cycle 2026-08-03T01:07Z

Run: cde78ff0-2b92-4510-9469-b5f630599da9 (Wings / hermes_local)
Paperclip API: v2026.722.0, deploymentMode=local_trusted
Bearer: Wings 80284e06-41ab-415a-ba1c-6c3121debd0d

## Verified-idle free lanes (3/3)

All have assignedIssueId=null, no live lease.

| Agent | Pool | Model | State | VerifiedAt | maxParallel | Allowed Work |
|-------|------|-------|-------|------------|-------------|--------------|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | read-only, implementation, review |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | implementation, review |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | verified | 2026-07-23T20:03:10Z | 1 | review, implementation |

## Excluded lanes (not capacity)

| Agent | Lane | Exclusion | Evidence |
|-------|------|-----------|----------|
| Aegis Coder X (da00de99) | local-aegis | agent status=error | errorReason="Process lost -- server may have restarted"; host P89 gate down (CTX-SpO2 P:down per 2026-08-02) |
| Aegis Coder Y (181f381b) | local-aegis | lane=error | state=error, errorReason="Timed out after 12000s" |
| Paperclip Agent Auditor (5b2bece1) | codex | quota_blocked | state=quota_blocked, "usage limit ... Aug 4th, 2026 11:09 PM" |
| Hermes Mistral (1029acc4) | ollama-cloud | paused | status=paused, lane=paused |
| Flash (b37f4d70) | ollama-cloud | pending_repair | state=pending_repair, "MCPServerTask event-loop-closed defect" |
| Wings (80284e06) | ollama-cloud | reserved | state=reserved, "strategic Hermes gateway, excluded from routine dispatch" |

## ollama-cloud pool

0/3 routable. Wings (reserved), Flash (pending_repair), Hermes Mistral (paused) — all excluded.

## Dispatch decision: 0 dispatches

### Herald (claude-code/opus-4-8) — all assigned work blocked

| Issue | Status | Reason |
|-------|--------|--------|
| JAC-4187 | blocked | D3 wireframes, blocked on JAC-3933 (in_review, stalled) |
| JAC-4422 | blocked | notes-pc9x1 beacon, blocked on JAC-3634 |
| JAC-3876 | blocked | JAC-3577 Gemini team chat merge approval — human gate |
| JAC-3494 | blocked | Bootsie Sally-pattern concierge — blocked on JAC-3725 (Klaw bootstrap failure, human gate) |
| JAC-4081 | blocked | Fable 5 project page — blocked on JAC-3629 |
| JAC-4069 | blocked | JAC-4066.3 stale breadcrumbs — blocked |
| JAC-3716 | blocked | Talaris Nix baseline — blocked |

Unassigned todo/backlog candidates reviewed: JAC-3671 (credential-bound — Restore Talaris anthropic+mistral credentials, human gate), JAC-4495 (backlog — requires judgment call on JAC-3933 in_review stall; board decision gate), JAC-4265 (backlog, assigned to Herald). No eligible unleased work.

### Plan Runner (claude-code/opus-4-8) — all assigned work blocked

| Issue | Status | Reason |
|-------|--------|--------|
| JAC-3628 | blocked | Pull-first fleet beacon, blocked on JAC-3629 |
| JAC-4190 | blocked | D5 build slice, blocked on JAC-4187 (in_review) |
| JAC-4462 | blocked | Execute notes-pc9x1 — blocked |
| JAC-4440 | blocked | Repair stale in-progress queue violations — assigned to Coordinator (not Plan Runner) |
| JAC-3665 | blocked | Wave 4–5 rebuild — blocked |
| JAC-4348 | blocked | Pull-first fleet beacon dispatch — blocked |
| JAC-4105 | blocked | Pull-first fleet beacon dispatch — blocked |
| JAC-4093 | blocked | JAC-3705 canary preconditions — blocked (trust gap on parser fix) |

No unassigned todo candidates match claude-code implementation/review capabilities that aren't policy-excluded.

### Kimi Code via Ringer (independent-review/k3) — assigned work dependency-blocked

| Issue | Status | Reason |
|-------|--------|--------|
| JAC-3596 | todo, assigned to Kimi | Independent exact-SHA verification — depends on Luna JAC-3592/3593/3594 (all in_progress) |

Luna items JAC-3592/3593/3594 are in_progress (assigned to Luna High Planner 2f92499a). JAC-3596 cannot proceed until implementation leaves complete.

## Unassigned todo/backlog pool (all policy-excluded)

| Issue | Status | Exclusion |
|-------|--------|-----------|
| JAC-3671 | todo | credential-bound (Restore Talaris anthropic+mistral credentials) |
| JAC-4501 | todo | self-review for JAC-4000 (Wings) |
| JAC-4500 | todo | self-review for JAC-4139 (Wings) |
| JAC-4388 | todo | board action (Jack approval gate — Board interaction required) |
| JAC-4217 | todo | Jack decision gate (self-referential authorization, human gate) |
| JAC-4216 | todo | Jack decision gate (self-referential authorization, human gate) |
| JAC-4503 | backlog | credential-bound (Ollama Cloud API Key Recovery) |
| JAC-4495 | backlog | board decision gate (requires judgment on JAC-3933 in_review stall) |
| JAC-4494 | backlog | test/placeholder (title="test", no description) |

## Pool limits

- claude-code: 2 maxParallel (Herald 1 + Plan Runner 1 — both idle but blocked)
- ollama-cloud: 3 maxParallel (0/3 routable — all excluded)
- codex: 1 maxParallel (0/1 — Auditor quota_blocked)
- independent-review: 1 maxParallel (Kimi idle but dependency-blocked)

## Disposition

0 dispatches. Queue exhausted — all verified-idle lanes have assigned work blocked upstream or all unassigned candidates are policy-excluded (credential-bound, human/Jack gates, self-reviews, or dependency-blocked).

No stale-log inference — all gate states confirmed via authenticated live API GET /api/companies/87c32b8e.../agents and bulk issue fetch. No independent plan-backed unleased task available.

Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-3933 (in_review) — unblocks Herald JAC-4187 → JAC-4081 chain
- JAC-3592/3593/3594 (in_progress) — unblock Kimi JAC-3596
- JAC-4388 (Jack approval gate) — unblocks Plan Runner JAC-3629 chain

Status: in_progress (restart-ready).
