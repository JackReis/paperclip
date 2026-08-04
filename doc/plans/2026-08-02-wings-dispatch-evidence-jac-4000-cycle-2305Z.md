# Dispatch Evidence — JAC-4000 Coordinator Cycle 2026-08-02T23:05Z (run 5395de80)

**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Company:** 87c32b8e-f131-4df8-ad8e-963d01b458e7
**Run ID:** 5395de80-d134-4cae-82cd-2fa1c8dd526c
**API base:** http://127.0.0.1:3101/api (Paperclip API v2026.722.0)
**Timestamp:** 2026-08-02T23:05Z
**Verdict:** 0 dispatches — queue exhausted

## Acknowledged wake

Ack comment 835a0be0 (23:00:52Z) reporting the 22:55Z cycle — 0 dispatches. Per no-stale-log rule, performed fresh authenticated live API verification at 23:05Z via GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06).

## Live agent-table verification (23:05Z)

Source: `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents`

### Verified-idle free lanes (3) — all with assignedIssueId=null (no live lease)

| Agent | UUID | Pool | Model | laneState | status | assignedIssueId | verifiedAt | lastHeartbeat | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T15:40Z | Technically FREE — but JAC-4187 blocked with 2 unresolved blockers + 1 stalled |
| Plan Runner | 2c6b1cc9 | claude-code | opus-4-8 | verified | idle | null | 2026-07-31T19:56Z | 2026-08-02T07:35Z | Technically FREE — but JAC-3628 blockedBy JAC-3629→JAC-4388 (board action, Jack approval) |
| Kimi Code via Ringer | 3f1712eb | independent-review | k3 | verified | idle | null | 2026-07-23T20:03Z | 2026-08-02T03:22Z | Technically FREE — but JAC-3596 blockedBy JAC-3592/3593/3594 (Luna in_progress) |

### Candidate issue verification (live fetch by UUID)

**Herald candidate:**
- JAC-4187 (`b203d10f`) — blocked, blockerAttention=needs_attention, unresolvedBlockerCount=2 (JAC-3933 still in_review, JAC-4494), stalledBlockerCount=1 (JAC-3933). 2 of 4 blockers are done (JAC-4184, JAC-3931, JAC-4491). JAC-3933 remains in_review with no stalled blockers now. JAC-4494 still unresolved. → Still blocked.

**Plan Runner candidate:**
- JAC-3628 (`b29da130`) — todo, blockerAttention=none, BUT blockedBy: [JAC-3629, JAC-3631, JAC-3632, JAC-3633, JAC-3634]
  - JAC-3629 (`f57af738`) — blocked, blockerAttention=covered (active_child), blockedBy: [JAC-4388]
  - JAC-4388 (`4954a59f`) — todo, [board action] requires Jack approval → NOT resolved
  - JAC-3631 — done
  - JAC-3632 — done
  - JAC-3633 — not found in company (likely done per prior evidence, no longer in API)
  - JAC-3634 — done
  → Implicit dependency per policy "Exclude... dependent... work."

**Kimi candidate:**
- JAC-3596 (`23c04a76`) — todo, blockerAttention=none, BUT blockedBy: [JAC-3595, JAC-3592, JAC-3594, JAC-3593]
  - JAC-3592 (`46839114`) — in_progress
  - JAC-3593 — Luna item, in_progress
  - JAC-3594 — Luna item, in_progress (per related work, not yet complete)
  - JAC-3595 — done
  → 3 of 4 Luna items still in_progress. Implicit dependency: verifies "integrated immutable candidate produced by four implementation leaves" — Luna not complete.

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

- JAC-4000 itself (Wings/self, in_progress, runId=5395de80)
- No active runs on any verified-idle lane (all assignedIssueId=null, status=idle)
- Luna High Planner has 3 in_progress items (JAC-3592, JAC-3593, JAC-3594) — these block Kimi's candidate JAC-3596
- Coordinator (dc2ca597) is idle, assignedIssueId=null

### Verification freshness

- Herald/Plan Runner: verified 2026-07-31T19:56Z (~34h), heartbeat within bounds (Herald HB 15:40Z, Plan Runner HB 07:35Z)
- Kimi: verified 2026-07-23T20:03Z (~82h — older but lane is verified and idle; no fresh generation failure recorded to downgrade)
- All gates from live API metadata.executionLane — no stale-log inference

### Upstream blocker status summary (no change since 22:55Z)

| Issue | Status | Blocker resolution |
|---|---|---|
| JAC-4187 | blocked | JAC-3933 still in_review (was stalled, now needs_attention=none for it); JAC-4494 unresolved |
| JAC-3933 | in_review | Not done — still in_review |
| JAC-3629 | blocked | Blocked by JAC-4388 (todo, board action, Jack approval) |
| JAC-4388 | todo | Not resolved — requires Jack approval |
| JAC-3628 | todo | Still blocked by JAC-3629 |
| JAC-4190 | blocked | Blocked by JAC-4186/JAC-4187/JAC-4185 — JAC-4187 still blocked |
| JAC-3596 | todo | Still blocked by Luna items JAC-3592/3593/3594 (in_progress) |
| JAC-3592 | in_progress | Luna not complete |
| JAC-3593 | in_progress | Luna not complete |
| JAC-3594 | in_progress | Luna not complete |
| JAC-3705 | todo | Assigned to Aegis Coder X (da00de99, status=error) — not routable |
| JAC-4093 | blocked | Depends on JAC-3705 preconditions |

## Dispatch decision

0 dispatches — queue exhausted (cycle 23:05Z). State confirms wake comment 835a0be0: all verified-idle lanes have no lease (assignedIssueId=null), but every candidate issue has upstream blockers or implicit dependencies.

**Key finding:** JAC-3933 improved from stalled to needs_attention=none (blockerAttention state), but its overall status remains `in_review` — NOT done. The Luna items (JAC-3592/3593/3594) remain `in_progress`. JAC-4388 remains `todo` (board action requiring Jack approval). No upstream blockers have resolved since the 22:55Z cycle.

**Pool limit check:** Claude Code pool (Herald + Plan Runner) maxParallel=1 each, 2 total — within limit but no eligible work. Independent review pool (Kimi) maxParallel=1 — within limit but no eligible work. External fast lane / ollama-cloud — all excluded (reserved, pending_repair, quota_blocked). Local Aegis — Aegis Coder X in error (P89 gate), Aegis Coder Y in error (timeout).

## Disposition

in_progress (restart-ready), awaiting native Paperclip child-completion continuation on upstream resolution.
