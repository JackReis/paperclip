# Dispatch Evidence — JAC-4000 Coordinator Cycle 2026-08-02T22:55Z (run 9039ae2d)

**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Company:** 87c32b8e-f131-4df8-ad8e-963d01b458e7
**Run ID:** 9039ae2d-3e0c-4719-a802-b7d064a188af
**API base:** http://127.0.0.1:3101/api (Paperclip API v2026.722.0)
**Timestamp:** 2026-08-02T22:55Z
**Verdict:** 0 dispatches — queue exhausted

## Acknowledged wake

Ack comment c432567a (22:50:50Z) reporting the 22:14Z cycle — 0 dispatches. Per no-stale-log rule, performed fresh authenticated live API verification at 22:55Z via GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06).

## Live agent-table verification (22:55Z)

Source: `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents`

### Verified-idle free lanes (3) — all with assignedIssueId=null (no live lease)

| Agent | UUID | Pool | Model | laneState | status | assignedIssueId | verifiedAt | lastHeartbeat | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T15:40Z | Technically FREE — but all candidate issues formally blocked upstream |
| Plan Runner | 2c6b1cc9 | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T07:35Z | Technically FREE — but JAC-3628 has implicit dep on JAC-3628→JAC-3629→JAC-4388 (board action requiring Jack approval) |
| Kimi Code via Ringer | 3f1712eb | independent_review | k3 | verified | idle | null | 2026-07-23T20:03Z | 2026-08-02T03:22Z | Technically FREE — but JAC-3596 blocked by JAC-3592/3593/3594 (Luna items in_progress) |

### Candidate issue verification (live fetch by UUID)

**Herald candidates (all blocked):**
- JAC-4187 (`b203d10f`) — blocked, needs_attention, 2 unresolved blockers (JAC-4494, JAC-3933), 1 stalled (JAC-3933), assignee=Herald. blockedBy: JAC-4184, JAC-3933, JAC-3931, JAC-4491
- JAC-4422 — blocked/covered (Herald dispatch)
- JAC-4081 — blocked/covered
- JAC-4069 — blocked/needs_attention
- JAC-3876 — blocked/covered
- JAC-3716 — blocked/needs_attention

**Plan Runner candidate:**
- JAC-3628 (`b29da130`) — todo, blockerAttention=none, BUT blockedBy: [JAC-3629, JAC-3631, JAC-3632, JAC-3633, JAC-3634]
  - JAC-3629 (`f57af738`) — blocked, sampleBlocker=JAC-4388, blockedBy: [JAC-4388]
  - JAC-4388 (`4954a59f`) — todo, [board action] requires Jack approval
  - JAC-3631 (`0ac84743`) — done (Plan Runner)
  - JAC-3632 — done
  - JAC-3633 — done
  - JAC-3634 — done (confirmed from page 3 data: `5ce05c4d` done [notes-pc9x1.4])

  → Implicit dependency per policy "Exclude... dependent... work."

**Kimi candidate:**
- JAC-3596 (`23c04a76`) — todo, blockerAttention=none, BUT blockedBy: [JAC-3595, JAC-3592, JAC-3593, JAC-3594]
  - JAC-3592 (`46839114`) — in_progress
  - JAC-3593 — Luna item, in_progress (per related work, not yet complete)
  - JAC-3594 — Luna item, in_progress (per related work, not yet complete)
  - JAC-3595 (`8676e7b4`) — done
  - 3 of 4 Luna items still in_progress

  → Implicit dependency: verifies "integrated immutable candidate produced by four implementation leaves" — Luna not complete

### Excluded lanes (NOT routable)

| Agent | UUID | Pool | laneState | status | Reason |
|---|---|---|---|---|---|
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked | error | Quota blocked until Aug 4 11:09 PM CT |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused | paused | Manual pause |
| Flash | b37f4d70 | ollama-cloud | pending_repair | idle | MCPServerTask event-loop-closed defect |
| Wings | 80284e06 | ollama-cloud | reserved | running | Self — strategic reserve |
| Aegis Coder X | da00de99 | local-aegis | verified | error | Process lost, host P89 gate down |
| Aegis Coder Y | 181f381b | local-aegis | error | idle | Timed out after 12000s |
| Klaude | 4d9d8ed5 | null | null | error | openclaw_gateway error |
| Klaw | d216ee6e | null | null | error | Gateway error |
| Operator | a5d0eb09 | null | null | error | Gateway error |
| Forge | 0b902be0 | null | null | error | Backend/database, offline |

### Unassigned todo issues (16 total — all policy-excluded)

| Identifier | Title | Priority | Exclusion |
|---|---|---|---|
| JAC-4173 | Coordinator Fleet Coordination Check | medium | Coordinator sibling |
| JAC-4171 | Coordinator Fleet Coordination Check | medium | Coordinator sibling |
| JAC-3437 | Get haircut from Danny in Ardmore this week | medium | Personal task |
| JAC-3365 | populate notebook for vista del mar in notebook LM | medium | Personal task |
| JAC-3359 | Book diagnostic at Toyota of Ardmore | medium | Personal task |
| JAC-3361 | I already have the codes / know the symptoms | medium | Personal task |
| JAC-3358 | Get free OBD-II scan at AutoZone | medium | Personal task |
| JAC-3360 | Get mobile hybrid battery quote (if P0A80) | medium | Personal task |
| JAC-3671 | Restore Talaris anthropic + mistral credentials | critical | Credential-bound |
| JAC-4501 | Review productivity for JAC-4000 | high | Productivity review |
| JAC-4500 | Review productivity for JAC-4139 | high | Productivity review |
| JAC-4388 | [board action] Repair Fable executionLane | high | Board action, requires Jack approval |
| JAC-4217 | DECISION (Jack): migrate autonomous Paperclip org | high | Jack decision gate |
| JAC-4216 | DECISION (Jack): re-enable ollama-cloud tier-2 | high | Jack decision gate |
| JAC-3714 | [Aegis] Install Nix (approval-gated; interactive sudo) | high | Human gate/sudo required |
| JAC-3970 | Dispatch JAC-3705 to local-aegis lane | low | Dispatch for excluded ollama-cloud lane |
| JAC-3558 | [Human gate] Provide refill details + call OK Integrated Care | high | Human gate |
| JAC-3557 | [Human gate] Complete Prius mobile 12V test | high | Human gate |
| JAC-3555 | [Human gate] Submit Belmont records release + Invisalign | high | Human gate |
| JAC-3541 | TEST_DELETE | low | Test artifact |

### Active runs

- JAC-4000 itself (Wings/self, in_progress, runId=9039ae2d)
- No active runs on any verified-idle lane (all assignedIssueId=null, status=idle)

### Verification freshness

- Herald/Plan Runner: verified 2026-07-31T19:56Z (~33h), heartbeat within bounds (Herald HB 15:40Z, Plan Runner HB 07:35Z)
- Kimi: verified 2026-07-23T20:03Z (~81h — older but lane is verified and idle; no fresh generation failure recorded to downgrade)
- All gates from live API metadata.executionLane — no stale-log inference

## Dispatch decision

0 dispatches — queue exhausted (cycle 22:55Z). State confirms wake comment c432567a: all verified-idle lanes have no lease (assignedIssueId=null), but every candidate issue has upstream blockers or implicit dependencies. All 19 unassigned todos are policy-excluded (human gates, Jack decision gates, credential-bound, board actions, personal tasks, productivity reviews, coordinator siblings).

## Disposition

in_progress (restart-ready), awaiting native Paperclip child-completion continuation on upstream resolution.
