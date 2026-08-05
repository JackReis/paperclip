# Dispatch Evidence — JAC-4000 Coordinator Cycle 2026-08-02T23:15Z (run 7c05c9f4)

**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Company:** 87c32b8e-f131-4df8-ad8e-963d01b458e7
**Run ID:** 7c05c9f4-797e-4d95-b7c2-62b5f7cad455
**API base:** http://127.0.0.1:3101/api (Paperclip API v2026.722.0)
**Timestamp:** 2026-08-02T23:15Z
**Verdict:** 0 dispatches — queue exhausted, no upstream resolution since 23:05Z cycle

## Acknowledged wake

Ack comment cc071e54 (23:09:42Z) reporting the 23:05Z cycle — 0 dispatches. Per no-stale-log rule, performed fresh authenticated live API verification at 23:15Z via GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06).

## Live agent-table verification (23:15Z)

Source: `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents`

### Verified-idle free lanes (3) — all with assignedIssueId=null (no live lease)

| Agent | UUID | Pool | Model | laneState | status | assignedIssueId | verifiedAt | lastHeartbeat | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T15:40Z | Technically FREE — but JAC-4187 blocked by JAC-3933 (in_review) + JAC-4494 (unresolved) |
| Plan Runner | 2c6b1cc9 | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T07:35Z | Technically FREE — but JAC-3628 blockedBy JAC-3629→JAC-4388 (board action, Jack approval, still todo) |
| Kimi Code via Ringer | 3f1712eb | independent-review | k3 | verified | idle | null | 2026-07-23T20:03Z | 2026-08-02T03:22Z | Technically FREE — but JAC-3596 blockedBy JAC-3592/3593/3594 (Luna, 3 items in_progress) |

### Candidate issue verification (live fetch by UUID)

**Herald candidate:**
- JAC-4187 (`b203d10f`) — blocked, blockerAttention=needs_attention
  - blockedBy: JAC-4184 (done), JAC-3933 (in_review), JAC-3931 (done), JAC-4491 (done)
  - unresolvedBlockerCount=2, stalledBlockerCount=1
  - sampleBlockerIdentifier: JAC-4494 — status=backlog (not resolved)
  - sampleStalledBlockerIdentifier: JAC-3933 — status=in_review (not done)
  → Still blocked. No dispatch.

**Plan Runner candidate:**
- JAC-3628 (`b29da130`) — todo, blockerAttention=none, BUT has implicit dependency:
  - blockedBy chain: JAC-3629 (blocked → JAC-4388 todo/board-action) → JAC-4388 still todo (requires Jack approval)
  → Implicit dependency per policy "Exclude... dependent... work." No dispatch.

**Kimi candidate:**
- JAC-3596 (`23c04a76`) — todo, blockerAttention=none, BUT:
  - Depends on Luna High Planner completing 4 implementation leaves: JAC-3592/3593/3594/3595
  - JAC-3592 (`46839114`) — in_progress (Luna)
  - JAC-3593 (`8b616780`) — in_progress (Luna, started 2026-08-01T02:54Z)
  - JAC-3594 (`feacb699`) — in_progress (Luna, started 2026-08-01T02:53Z)
  - JAC-3595 — done
  → 3 of 4 Luna leaves still in_progress. Verifies "integrated immutable candidate" — Luna not complete. No dispatch.

### Excluded lanes (NOT routable — unchanged since 23:05Z)

| Agent | UUID | Pool | laneState | status | Reason |
|---|---|---|---|---|---|
| Paperclip Agent Auditor | 5b2bece1 | codex | quota_blocked | error | Quota blocked until Aug 4 11:09 PM CT |
| Hermes Mistral | 1029acc4 | ollama-cloud | paused | paused | Manual pause |
| Flash | b37f4d70 | ollama-cloud | pending_repair | idle | MCPServerTask event-loop-closed defect |
| Wings | 80284e06 | ollama-cloud | reserved | running | Self — strategic reserve |
| Aegis Coder X | da00de99 | local-aegis | verified | error | Process lost, host P89 gate down |
| Aegis Coder Y | 181f381b | local-aegis | error | idle | Timed out after 12000s |
| Klaude | 4d9d8ed5 | — | error | error | openclaw_gateway error |
| Klaw | d216ee6e | — | null | error | Gateway 401 (auth token mismatch) |
| Operator | a5d0eb09 | — | null | error | Gateway error |
| Forge | 0b902be0 | — | null | error | Offline (host 17:36Z) |

### Unassigned todo issues (16 — all policy-excluded)

| Identifier | Title | Priority | Exclusion |
|---|---|---|---|
| JAC-4173 | Coordinator Fleet Coordination Check | medium | Coordinator sibling |
| JAC-4171 | Coordinator Fleet Coordination Check | medium | Coordinator sibling |
| JAC-3437 | Get haircut from Danny in Ardmore | medium | Personal task |
| JAC-3365 | Populate notebook for vista del mar | medium | Personal task |
| JAC-3359 | Book diagnostic at Toyota of Ardmore | medium | Personal task |
| JAC-3361 | I already have the codes / know symptoms | medium | Personal task |
| JAC-3358 | Get free OBD-II scan at AutoZone | medium | Personal task |
| JAC-3360 | Get mobile hybrid battery quote | medium | Personal task |
| JAC-3671 | Restore Talaris anthropic + mistral credentials | critical | Credential-bound |
| JAC-3714 | Install Nix (approval-gated; sudo) | high | Human gate/sudo |
| JAC-3558 | Human gate: refill details + call Oklahoma Integrated Care | high | Human gate |
| JAC-3557 | Human gate: Prius mobile 12V test | high | Human gate |
| JAC-3555 | Human gate: Belmont records + Invisalign | high | Human gate |
| JAC-4501 | Review productivity for JAC-4000 | high | Productivity review |
| JAC-4500 | Review productivity for JAC-4139 | high | Productivity review |
| JAC-3541 | TEST_DELETE | low | Test artifact |

Note: JAC-4388 (board action), JAC-4217, JAC-4216 (Jack decision gates), and JAC-3970 (dispatch for excluded lane) are assigned or board-gated, not independent assignable work.

### Active runs

- JAC-4000 itself (Wings/self, in_progress, runId=7c05c9f4)
- Luna High Planner has 3 in_progress items (JAC-3592/3593/3594) — no active runs, last started 2026-08-01T02:5xZ, lastActivity=null (dormant)
- No active runs on any verified-idle lane

### Key finding: no upstream resolution since 23:05Z cycle

- JAC-3933: still `in_review` (not stalled, but not complete)
- JAC-4494: still `backlog` (not resolved)
- JAC-4388: still `todo` (board action requiring Jack approval)
- Luna items JAC-3592/3593/3594: all still `in_progress`, no new activity since 2026-08-01
- JAC-3629: still `blocked` → JAC-4388 (todo)

## Disposition

0 dispatches — queue exhausted. All 3 verified-idle free lanes (Herald, Plan Runner, Kimi) have assigned work that remains blocked by upstream issues that have not resolved since the prior cycle.

in_progress (restart-ready), awaiting native Paperclip child-completion continuation on upstream resolution of JAC-3933/JAC-4494 (for Herald), JAC-4388 (for Plan Runner via JAC-3629), and Luna items JAC-3592/3593/3594 (for Kimi).