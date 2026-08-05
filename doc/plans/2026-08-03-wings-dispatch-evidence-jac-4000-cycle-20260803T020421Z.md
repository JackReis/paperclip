# Wing Dispatch Evidence — JAC-4000 Cycle 2026-08-03T02:04Z (run 92fdf28d)

## Summary
- **Paperclip API**: v2026.722.0, deploymentMode=local_trusted
- **Paperclip API base**: http://127.0.0.1:3101/api
- **Total agents**: 48 in company 87c32b8e-f131-4df8-ad8e-963d01b458e7
- **Dispatches**: 0
- **Disposition**: in_progress (restart-ready)

## Fresh Authenticated Live Verification
Performed via `GET /api/companies/87c32b8e.../agents` (bearer=Wings 80284e06) and direct UUID fetches of all upstream blocker issues. No stale-log inference.

## Verified-Idle Free Lanes (0 dispatches possible)

### Herald (a1e8cb0d) — claude-code/opus-4-8/verified/idle, maxParallel=1, verifiedAt 2026-07-31T19:56:00Z
- executionLane: `{"pool":"claude-code","model":"claude-opus-4-8","state":"verified"}`
- assignedIssueId: null (agent-level), but relatedWork.outbound on JAC-4000 shows Herald-assigned child issues below
- **Assigned dispatch-child issues (all blocked/in_review upstream)**:
  - JAC-4187 (b203d10f) status=blocked → blockers: JAC-4184/done, JAC-3933/in_review, JAC-3931/done, JAC-4491/done
  - JAC-3494 (c485fbcf) status=blocked → blockers: None (self-blocked/stale ref JAC-3752 = NOT FOUND in issue list)
  - JAC-4081 (b6044613) status=blocked → blockers: JAC-3629/blocked
  - JAC-4069 (77914391) status=blocked → blockers: JAC-4073/blocked (JAC-4073 NOT FOUND in issue list — stale ref correction confirmed)
  - JAC-3564 (9d2ec425) status=in_review → blockers: None (system spec, not dispatchable)
  - JAC-3439 (9d2ec425) status=in_review → system spec, not dispatchable

### Plan Runner (2c6b1cc9) — claude-code/opus-4-8/verified/idle, maxParallel=1, verifiedAt 2026-07-31T19:56:00Z
- executionLane: `{"pool":"claude-code","model":"claude-opus-4-8","state":"verified"}`
- assignedIssueId: null (agent-level), but relatedWork.outbound shows Plan Runner-assigned child issues below
- **Assigned dispatch-child issues (all blocked upstream)**:
  - JAC-3628 (b29da130) status=blocked → blockers: JAC-3629/blocked + JAC-3631/done + JAC-3632/done + JAC-3633/done + JAC-3634/todo
  - JAC-4190 (aaed5fd3) status=blocked → blockers: JAC-4186/done, JAC-4187/blocked, JAC-4185/done
  - JAC-4462 (e915780a) status=blocked → blockers: None
  - JAC-4093 (d27f48db) status=blocked → blockers: None (JAC-3705/j4501 is todo/assignee=da00de99 — stale ref)
  - JAC-3665 (f2ed34c5) status=blocked → blockers: JAC-3660/blocked
  - JAC-4105 (223f6775) status=blocked → blockers: JAC-3629/blocked

### Kimi Code via Ringer (3f1712eb) — independent-review/k3/verified/idle, maxParallel=1, verifiedAt 2026-07-23T20:03:10Z
- executionLane: `{"pool":"independent-review","model":"kimi-for-coding/k3","state":"verified"}`
- assignedIssueId: null (agent-level), but relatedWork.outbound shows Kimi-assigned child issues below
- **Assigned issue**:
  - JAC-3596 (23c04a76) status=todo → blockers: JAC-3595/done, JAC-3592/in_progress, JAC-3594/in_progress, JAC-3593/in_progress (Luna, assignee=2f92499a)

## Upstream Blocker Statuses (fresh UUID fetches)
- JAC-3933 (fc4eb2ca) status=in_review, assignee=None → unblocks Herald JAC-4187
- JAC-3934 (6a950292) status=done → stale ref for Plan Runner JAC-4190 (JAC-4187 still blocked)
- JAC-3629 (f57af738) status=blocked, assignee=dc2ca597 → root blocker for Plan Runner chain
- JAC-4388 (4954a59f) status=todo, assignee=None (Jack approval gate) → unblocks Plan Runner JAC-3629
- JAC-3592 (46839114) status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596
- JAC-3593 (8b616780) status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596
- JAC-3594 (feacb699) status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596

## Excluded Lanes (unchanged)
- Aegis Coder X (da00de99): lane=verified but agent status=error (Process lost -- server may have restarted), host P89 gate down — NOT dispatched
- Aegis Coder Y (181f381b): lane=error (Timed out after 12000s; NOT routable until clean re-probe)
- Paperclip Agent Auditor (5b2bece1): lane=quota_blocked (Codex usage limit until Aug 4 11:09 PM CT) — NOT dispatched
- Hermes Mistral (1029acc4): lane=paused (manual) — excluded
- Flash (b37f4d70): lane=pending_repair (MCPServerTask event-loop-closed defect) — excluded
- Scout (c093061e): lane=paused
- Klaw (d216ee6e): lane=error (FailoverError: No API key found for provider "anthropic") — excluded
- Klaude Pi (bb421461): idle, no executionLane metadata — excluded
- Wings (80284e06): reserved — NOT dispatched (strategic role)
- ollama-cloud pool: 0/3 usable (Hermes Mistral paused, Flash pending_repair, Flash Executor process adapter with no lane)

## Unassigned Todo Pool (all policy-excluded)
- JAC-3671 (3b4fd83f): todo — credential-bound (Restore Talaris anthropic + mistral credentials)
- JAC-4501 (05ec43fa): todo — self-review (Review productivity for JAC-4000)
- JAC-4500 (004f35cd): todo — self-review (Review productivity for JAC-4139)
- JAC-4388 (4954a59f): todo — Jack approval gate (Repair Fable executionLane + authorizationPolicy)
- JAC-4217 (1c3b2728): todo — Jack decision gate
- JAC-4216 (7ed3f97e): todo — Jack decision gate

## In_Review (system specs, not dispatchable)
- JAC-3564 (9d2ec425): in_review — Define MLX-on-OB1 spike contract
- JAC-3439: in_review — continuously improve filesystem organization
- JAC-3933 (fc4eb2ca): in_review — Define cross-vendor long-run, retry-loop, context, and tool-call detection
- JAC-3932 (f42b01a5): in_review — Design fleet-wide privacy-safe session replay and lineage spine
- JAC-3935: in_review — Ringer-reviewed Fleet Spend Observatory specification
- JAC-3930: in_review — Define fleet-wide cross-vendor telemetry and lineage contract

## Stale Blocker Reference Corrections
1. JAC-3752 (Herald JAC-3494 blocker): NOT FOUND in Paperclip issue list — confirmed stale
2. JAC-4073 (Herald JAC-4069 blocker): status=done — was incorrectly referenced as active blocker in earlier cycles; confirmed stale

## Dispatch Decision
0 dispatches. All 3 verified-idle free lanes (Herald, Plan Runner, Kimi) have assigned work blocked upstream. No independent plan-backed unleased task available.

## Continuation
Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-3933 (in_review) → unblocks Herald JAC-4187
- JAC-4388 (todo, Jack approval gate) → unblocks Plan Runner JAC-3629 chain
- JAC-3592/3593/3594 (in_progress, Luna/2f92499a) → unblocks Kimi JAC-3596
