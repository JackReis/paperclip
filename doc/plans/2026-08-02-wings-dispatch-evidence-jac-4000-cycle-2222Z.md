# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-02T22:22Z

**Timestamp**: 2026-08-02T22:38:09Z
**Run ID**: 02057ac2-7322-4834-94e5-ef91cd441e69
**Issue**: JAC-4000 — Coordinator Fleet Coordination Check
**Paperclip API**: v2026.722.0, local_trusted mode

## Acknowledged Wake Comment

Comment 62f00326-420e-4b16-9fcb-2c27b734ee89 at 2026-08-02T22:20:28.431Z by local-board.
Reported 22:14Z cycle — 0 dispatches, queue exhausted. Per no-stale-log rule, performed fresh authenticated live API verification at ~22:22Z via GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06).

## Live Agent Table (48 agents)

| Agent | Pool | laneState | agentStatus | Assigned Active Work | Verdict |
|---|---|---|---|---|---|
| Herald | claude-code | verified | idle | JAC-4187, JAC-4422, JAC-3876, JAC-3494, JAC-4081, JAC-4069, JAC-3716 (all blocked/needs_attention) | Occupied — all blocked |
| Plan Runner | claude-code | verified | idle | JAC-4190(blocked), JAC-4462(blocked), JAC-3665(blocked), JAC-4093(blocked), JAC-4348(blocked), JAC-3628(todo/blk=none) | Technically FREE — JAC-3628 unblocked per API |
| Kimi Code via Ringer | independent-review | verified | idle | JAC-3596(todo/blk=none) | Technically FREE — JAC-3596 unblocked per API |
| Paperclip Agent Auditor | codex | quota_blocked | error | JAC-3802(todo), JAC-4115(blocked), JAC-4106(blocked), JAC-4094(blocked), JAC-3796(blocked), JAC-3990(blocked) | Excluded — quota blocked |
| Hermes Mistral | ollama-cloud | paused | paused | JAC-4046(todo), JAC-4060(todo), JAC-4059(todo), JAC-4058(todo) | Excluded — paused (manual) |
| Wings | ollama-cloud | reserved | running | JAC-4000(in_progress) + blocked issues | Excluded — reserved (strategic) |
| Flash | ollama-cloud | pending_repair | idle | none | Excluded — pending repair |
| Aegis Coder X | local-aegis | verified | error | JAC-3705(todo) | Excluded — agent error (P89 gate) |
| Aegis Coder Y | local-aegis | error | idle | none | Excluded — lane error (timeout) |

## Key Discrepancy: Wake Comment vs Live API

| Issue | Wake Comment Claim | Live API State | Assessment |
|---|---|---|---|
| JAC-3628 | "blocked" (Plan Runner lane occupied) | todo, blk=none, priority=high, no active run, no lease | **DISCREPANCY**. Wake comment listed JAC-3628 as blocked. Live API shows blockerAttention.state=none. JAC-3628 is a root-level todo (parentId=None) with no formal Paperclip blockers. However, its child JAC-3629 is blocked by JAC-4388 (board action). JAC-3628's description requires implementing Fable 5 visibility, which depends on the Fable executionLane repair (JAC-4388). While Paperclip does not formally mark JAC-3628 as blocked, it has an implicit logical dependency on JAC-4388 resolving. |
| JAC-3596 | "blocked by Luna JAC-3592/3593/3594 in_progress" | todo, blk=none, priority=high, no active run, no lease | **DISCREPANCY**. Wake comment claims JAC-3596 is blocked by Luna items. Live API shows blk=none. JAC-3596's parent is JAC-3590 (todo, blk=none). Luna items (JAC-3592/3593/3594, in_progress) are siblings under JAC-3590, not formal blockers. JAC-3596's description says "verify the integrated immutable candidate produced by the four implementation leaves" — Luna items ARE those implementation leaves. Implicit dependency: cannot produce a meaningful verification until implementation completes. |

**Both JAC-3628 and JAC-3596 show blk=none in the live Paperclip API** — no formal blockers, no active runs, no leases. Per the strict policy letter ("A lane is eligible only when state=verified, its verification is current, and no live run or issue lease already occupies it"), both lanes are technically eligible for dispatch.

**However**, both have implicit logical dependencies not captured in Paperclip's formal blocker system:
- JAC-3628's child JAC-3629 is blocked by JAC-4388 (a board action requiring Jack's approval to repair Fable's executionLane)
- JAC-3596 verifies "the integrated immutable candidate produced by the four implementation leaves" — the Luna items are in_progress but not yet complete

Per policy: "Exclude... dependent... work." While not formally marked as dependent in Paperclip's blocker system, both issues have implicit dependencies that would make dispatch produce no meaningful progress. Conservative classification as occupied is maintained.

## Unassigned Todo Queue (18 items, all policy-excluded)

| Issue | Priority | Category | Rationale |
|---|---|---|---|
| JAC-3671 | critical | credential-bound | Restore Talaris anthropic + mistral credentials |
| JAC-4501 | high | productivity review | Review productivity for JAC-4000 |
| JAC-4500 | high | productivity review | Review productivity for JAC-4139 |
| JAC-4388 | high | board action | Repair Fable executionLane + authorizationPolicy |
| JAC-4217 | high | Jack decision gate | Migrate autonomous Paperclip org off claude_local |
| JAC-4216 | high | Jack decision gate | Re-enable ollama-cloud as autonomous tier-2? |
| JAC-3714 | high | human gate (sudo) | Install Nix (approval-gated; requires interactive sudo) |
| JAC-3558 | high | human gate | Provide refill details and call Oklahoma Integrated Care |
| JAC-3557 | high | human gate | Complete Prius mobile 12V test and report result |
| JAC-3555 | high | human gate | Submit Belmont records release and choose Invisalign care path |
| JAC-4173 | medium | coordinator sibling | Coordinator Fleet Coordination Check |
| JAC-4171 | medium | coordinator sibling | Coordinator Fleet Coordination Check |
| JAC-3437 | medium | personal task | Get haircut from Danny in Ardmore this week |
| JAC-3365 | medium | personal task | Populate notebook for vista del mar in notebook LM |
| JAC-3359 | medium | personal task | Book diagnostic at Toyota of Ardmore |
| JAC-3361 | medium | personal task | I already have the codes / know the symptoms |
| JAC-3358 | medium | personal task | Get free OBD-II scan at AutoZone |
| JAC-3360 | medium | personal task | Get mobile hybrid battery quote (if P0A80) |

## Active Runs

Only active run: JAC-4000 (Wings/self, in_progress, runId=02057ac2-7322-4834-94e5-ef91cd441e69).
No active runs on Herald, Plan Runner, or Kimi Code via Ringer lanes.
No checked-out issues (checkoutRunId=null) on any verified-idle lane.

## Verification Age

| Agent | verifiedAt | Age at 22:22Z |
|---|---|---|
| Herald | 2026-07-31T19:56:00Z | ~50h |
| Plan Runner | 2026-07-31T19:56:00Z | ~50h |
| Kimi Code via Ringer | 2026-07-23T20:03:10Z | ~53h |

All gate states confirmed via authenticated live API at ~22:22Z. No fresh generation failure recorded on verified lanes. Holding is NOT due to quota inference — all gates from live API metadata.executionLane.

## Dispatch Decision: 0 dispatches

**Verdict**: 0 dispatches — queue exhausted (cycle 3).

The three verified-idle free lanes all have assigned work blocked upstream (formally or implicitly):
- Herald (a1e8cb0d): 6 blocked issues, all blk=needs_attention (JAC-4187, JAC-4422, JAC-3876, JAC-3494, JAC-4081, JAC-4069, JAC-3716)
- Plan Runner (2c6b1cc9): 5 blocked issues + JAC-3628 (todo/blk=none per API, but child JAC-3629 blocked by JAC-4388 board action — implicit dependency)
- Kimi Code via Ringer (3f1712eb): JAC-3596 (todo/blk=none per API, but verifies Luna in_progress items — implicit dependency)

All 18 unassigned todos are policy-excluded (credential-bound, Jack decision gates, human gates, board actions, coordinator siblings, personal tasks).

## Liveness Path

Native Paperclip child-completion wake on upstream resolution:
- JAC-3933/JAC-4187 (in_review) → Herald free
- JAC-4388 (board action, todo) → unblocks JAC-3629 → JAC-3628 → Plan Runner dispatchable
- JAC-3592/3593/3594 (Luna in_progress) → complete → JAC-3596 → Kimi lane dispatchable

Fallback: JAC-4171/4173 (coordinator siblings, todo).

## Disposition: in_progress (restart-ready)

Awaiting native child-completion continuation on upstream resolution.
