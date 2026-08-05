# Wings Dispatch Evidence — JAC-4000 Cycle

- **Date**: 2026-08-03T01:21:31Z
- **Run ID**: b51677fa-ff94-4045-a303-8e619055457c
- **Issue**: JAC-4000 — Coordinator Fleet Coordination Check
- **Paperclip API**: v2026.722.0, deploymentMode=local_trusted

## Live Agent Table — Fresh Authenticated Verification

### Verified-Idle Free Lanes (3/3)

| Agent | Pool | Model | State | VerifiedAt | maxParallel | Assigned Issue |
|-------|------|-------|-------|------------|-------------|----------------|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | None |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | 2026-07-31T19:56:00Z | 1 | None |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | verified | 2026-07-23T20:03:10Z | 1 | JAC-3596 (todo) |

All agent IDs: Herald=a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708, Plan Runner=2c6b1cc9-aad2-431b-93ea-e31f0612be65, Kimi=3f1712eb-7b43-40fa-b893-f36e92bb9ac3

### Excluded Lanes (all unchanged)

| Agent | Lane State | Reason |
|-------|-----------|--------|
| Aegis Coder X | verified (agent=error) | "Process lost — server may have restarted", host P89 gate down (CTX-SpO2 P:down) |
| Aegis Coder Y | error | 12000s timeout defect |
| Paperclip Agent Auditor | quota_blocked | Codex usage limit until 2026-08-04T23:09 CT |
| Hermes Mistral | paused | manual |
| Flash | pending_repair | MCPServerTask event-loop-closed defect |
| Wings | reserved | strategic |
| Scout | paused | manual |
| Klaw | error | No API key for provider "anthropic" |

### Ollama Cloud Pool: 0/3 (reserved to Wings, paused, pending_repair)

## Dispatch Decision: 0 Dispatches

### Herald (claude-code/Opus-4-8, verified, idle)

All 6 assigned issues remain blocked:
- **JAC-4187** (D3 fleet dashboard wireframes) — blocked by JAC-3933 (in_review), JAC-3931 (done), JAC-4184
- **JAC-4422** (dispatch: implement notes-pc9x1) — attention-blocked (needs_attention), depends on JAC-3629 chain
- **JAC-3876** (Gemini team chat merge approval) — human gate (Jack approval) — excluded by policy. JAC-3577 (its blocker) is now done, but approval still pending
- **JAC-3494** (Bootsie Sally-pattern concierge) — blocked by JAC-3752 (attention blocker, unresolvedBlockerCount=1)
- **JAC-4081** (dispatch: Fable 5 project page) — blocked by JAC-3629 (Coordinator-assigned)
- **JAC-4069** (clear stale breadcrumbs) — blocked by JAC-4073 (attention blocker, unresolvedBlockerCount=1)

### Plan Runner (claude-code/Opus-4-8, verified, idle)

No assigned issue. All 6 Plan Runner candidate issues remain blocked:
- **JAC-3628** — blocked (blockerAttention: unresolvedBlockerCount=2, sampleBlockerIdentifier=JAC-3634, covered=1, attention=1; JAC-3705 is upstream canary)
- **JAC-4190** — blocked (dependency on JAC-3629)
- **JAC-4462** — blocked (dependency on JAC-3629)
- **JAC-3665** — blocked (dependency on JAC-3629/JAC-3628)
- **JAC-4105** — blocked (dependency on JAC-3629)
- **JAC-4093** — blocked (JAC-3705 canary preconditions — DISPUTED, Jack decision gate)

Root blocker: JAC-4388 (todo, Jack board action gate) → JAC-3629 (blocked) → all Plan Runner dispatch children

### Kimi Code via Ringer (independent-review/k3, verified, idle)

- **JAC-3596** (Independent exact-SHA verification of all HOLD gates) — todo, assigned to Kimi. blockerAttention state='none' (no formal blocker registered), but logically blocked on Luna implementation leaves JAC-3592/3593/3594 (all in_progress, assignee=2f92499a). No candidate artifact exists to verify yet.

## Upstream Blocker Status (no change since 2026-08-03T01:07Z cycle)

| Issue | Status | Role |
|-------|--------|------|
| JAC-3933 | in_review | Blocks Herald JAC-4187 |
| JAC-3629 | blocked | Blocks Plan Runner chain (JAC-3628/4190/4462/3665/4105/4093) |
| JAC-4388 | todo | Jack board action gate; root cause of JAC-3629 block |
| JAC-3592/3593/3594 | in_progress | Luna implementation leaves; blocks Kimi JAC-3596 |
| JAC-3752 | unresolved | Blocks Herald JAC-3494 |
| JAC-4073 | unresolved | Blocks Herald JAC-4069 |
| JAC-3577 | done | Unblocked JAC-3876 gate, but JAC-3876 still needs Jack approval (human gate) |
| JAC-3725 | cancelled | Was blocking JAC-3494 (Klaw bootstrap failure) — but JAC-3494 still has JAC-3752 block |
| JAC-3705 | todo | Assigned to da00de99, upstream of Plan Runner JAC-3628/JAC-4093 |
| JAC-3634 | (not found in 1000-issue list) | Sample blocker for JAC-3628 |

## Unassigned Todo Pool (all policy-excluded)

| Issue | Reason for Exclusion |
|-------|----------------------|
| JAC-3671 | credential-bound (Talaris anthropic + mistral credentials) |
| JAC-4501 | self-review (JAC-4000) |
| JAC-4500 | self-review (JAC-4139) |
| JAC-4388 | Jack board action gate (Fable executionLane repair) |
| JAC-4217 | Jack decision gate (self-referential) |
| JAC-4216 | Jack decision gate (self-referential) |
| JAC-3714 | Jack approval gate (interactive sudo for Nix install) |
| JAC-3558/3557/3555 | Human gates |
| JAC-3437 | Personal (haircut) |
| JAC-3365/3359/3358/3360/3361 | Personal/admin |
| JAC-3970/3541 | Low priority / test stubs |
| JAC-4171/4173 | Coordinator Fleet Coordination Checks (parallel to JAC-4000, not dispatchable to lanes) |

## In-Review Issues (not dispatchable to our lanes)

JAC-3584, JAC-3933, JAC-3930, JAC-3935, JAC-3932 — system specs/designs awaiting review, not independent execution work for Herald/Plan Runner/Kimi. JAC-3564 and JAC-3439 assigned to Herald but in_review (waiting on external input).

## Disposition

**in_progress (restart-ready)** — 0 dispatches. Queue exhausted.

Awaiting native Paperclip child-completion wake on upstream resolution:
1. JAC-3933 (in_review → done) — unblocks Herald JAC-4187
2. JAC-3592/3593/3594 (in_progress → done) — unblocks Kimi JAC-3596
3. JAC-4388 (todo → done) — unblocks Plan Runner JAC-3629 chain
4. JAC-3752 (unresolved → resolved) — unblocks Herald JAC-3494
5. JAC-4073 (unresolved → resolved) — unblocks Herald JAC-4069

No stale-log inference — all gates confirmed via authenticated live API GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents with metadata.executionLane state inspection.
