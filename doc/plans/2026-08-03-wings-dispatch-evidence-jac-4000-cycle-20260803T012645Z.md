# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T01:26Z

- **Date**: 2026-08-03T01:26:45Z (this run: 76bcacaf-4249-4543-9b24-fa80c508bb78)
- **Run ID**: 76bcacaf-4249-4543-9b24-fa80c508bb78
- **Issue**: JAC-4000 — Coordinator Fleet Coordination Check
- **Status**: in_progress

## Fresh Authenticated Live API Verification

**Endpoint**: GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents
**Paperclip API**: v2026.722.0, deploymentMode=local_trusted
**Timestamp**: 2026-08-03T01:26:45Z

## Verified-Idle Free Lanes (3/3) — Unchanged Since 01:07Z

| Agent | Pool / Model | Lane State | maxParallel | verifiedAt | assigned | Host Health |
|-------|-------------|------------|-------------|------------|----------|-------------|
| Herald (a1e8cb0d) | claude-code / claude-opus-4-8 | verified / idle | 1 | 2026-07-31T19:56:00Z | None | fresh heartbeat (2026-08-02T15:40:22Z) |
| Plan Runner (2c6b1cc9) | claude-code / claude-opus-4-8 | verified / idle | 1 | 2026-07-31T19:56:00Z | None | fresh heartbeat (2026-08-02T23:51:39Z) |
| Kimi Code via Ringer (3f1712eb) | independent-review / kimi-for-coding/k3 | verified / idle | 1 | 2026-07-23T20:03:10Z | JAC-3596 | fresh heartbeat (2026-08-02T03:22:24Z) |

All three lanes are state=verified, verification is current, and no live run occupies them.

## Assigned Work — All Blocked Upstream

### Herald (a1e8cb0d) — assigned work blocked
- JAC-4187 (blocked; JAC-3933 in_review) — D3 fleet dashboard wireframes
- JAC-4422 (blocked; JAC-3629 chain) — dispatch notes-pc9x1 Herald
- JAC-3876 (blocked; JAC-3577 approval gate) — Gemini team chat merge approval
- JAC-3494 (blocked; JAC-3752 unresolved) — Bootsie Sally-pattern concierge
- JAC-4081 (blocked; JAC-3629) — dispatch Fable 5 project page (Herald)
- JAC-4069 (blocked; JAC-4073 unresolved) — clear stale agent error breadcrumbs

### Plan Runner (2c6b1cc9) — assigned work blocked
- JAC-3628 (blocked; JAC-3634 + JAC-3705 upstream) — pull-first fleet beacon
- JAC-4190 (blocked; JAC-3934) — D5 fleet dashboard V1 read-only build
- JAC-4462 (blocked; JAC-3628) — dispatch execute notes-pc9x1
- JAC-4105 (blocked; JAC-3629) — dispatch pull-first fleet beacon + Fable page
- JAC-3665 (blocked; JAC-3629 root) — Wave 4-5 rebuild
- JAC-4093 (blocked; JAC-4388 todo -> JAC-3629 blocked root) — canary preconditions

### Kimi Code via Ringer (3f1712eb) — assigned work
- JAC-3596 (todo, assigned) — independent exact-SHA verification; logically blocked on Luna JAC-3592/3593/3594 (in_progress); no candidate to verify yet

## Excluded Lanes (Unchanged from 01:21Z)

| Lane | State | Reason |
|------|-------|--------|
| Aegis Coder X (da00de99) | agent=error, lane=verified | "Process lost -- server may have restarted"; host P89 gate down |
| Aegis Coder Y (181f381b) | lane=error | "Timed out after 12000s"; NOT routable until clean re-probe |
| Paperclip Agent Auditor (5b2bece1) | quota_blocked until Aug 4 | Codex usage limit (ChatGPT credits) |
| Hermes Mistral (1029acc4) | paused | Manual pause |
| Flash (b37f4d70) | pending_repair | MCPServerTask event-loop-closed defect |
| Wings (80284e06) | reserved | Strategic reserve (this agent) |
| Scout (c093061e) | paused | Manual pause |
| Klaw (d216ee6e) | error | "No API key found for provider anthropic" |
| ollama-cloud pool | 0/3 | No routable lanes (Ollama Cloud pool unused currently) |

## Unassigned Todo Pool (All Policy-Excluded)

| Issue | Title | Exclusion Reason |
|-------|-------|-----------------|
| JAC-3671 | Restore Talaris anthropic + mistral credentials | Credential-bound |
| JAC-4501 | Review productivity for JAC-4000 | Self-review |
| JAC-4500 | Review productivity for JAC-4139 | Self-review |
| JAC-4388 | Repair Fable executionLane + authorizationPolicy | Jack approval gate |
| JAC-4217 | DECISION: migrate autonomous org to local-first? | Jack decision gate |
| JAC-4216 | DECISION: re-enable ollama-cloud tier-2? | Jack decision gate |
| JAC-3714 | Install Nix (interactive sudo gate) | Interactive sudo gate |
| JAC-3558/57/55 | Human gates (medical, insurance) | Human gates |
| JAC-3437 | Get haircut | Personal |
| JAC-3970/3541 | Low/test | Low priority / test |

## In Review Issues (Not Dispatchable to Our Lanes)

JAC-3584, JAC-3933, JAC-3930, JAC-3935, JAC-3932, JAC-3439, JAC-4432 — system specs awaiting board review.

## Key Blocker UUID Verification (by direct UUID fetch)

| Issue | UUID | Status | assigneeId |
|-------|------|--------|------------|
| JAC-3933 | fc4eb2ca | in_review | none |
| JAC-3629 | f57af738 | blocked | none |
| JAC-4388 | 4954a59f | todo | none |
| JAC-3494 | c485fbcf | blocked | none |
| JAC-3628 | b29da130 | blocked | none |
| JAC-3705 | 4eda180d | todo | none |
| JAC-3596 | 23c04a76 | todo | none |
| JAC-3592 | 46839114 | in_progress | none |
| JAC-3593 | 8b616780 | in_progress | none |
| JAC-3594 | feacb699 | in_progress | none |

## Disposition

**0 dispatches. Queue exhausted.**

No independent plan-backed unleased task available. All 3 verified-idle free lanes have assigned work that is blocked upstream by higher-level issues. No stale-log inference — all gate states confirmed via authenticated live API metadata.executionLane and direct UUID issue fetches.

Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-3933 (in_review, unblocks Herald JAC-4187)
- JAC-3592/3593/3594 (in_progress, unblocks Kimi JAC-3596)
- JAC-4388 (todo, unblocks Plan Runner JAC-3629 chain)
- JAC-3752 (unblocks Herald JAC-3494) — UUID not found via identifier; requires follow-up
- JAC-4073 (unblocks Herald JAC-4069) — UUID not found via identifier; requires follow-up

**Disposition: in_progress (restart-ready)** — Native Paperclip child-completion continuation remains the liveness path. Fallback schedule (JAC-4173) is secondary.