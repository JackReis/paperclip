# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T02:08Z (run 3b38a913)

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
- executionLane: `{"pool":"claude-code","model":"claude-opus-4-8","state":"verified","provider":"claude-code","transport":"omnigent","verifiedAt":"2026-07-31T19:56:00Z","maxParallel":1,"verification":"WS1 re-probe: running, heartbeat <15m, no errorReason"}`
- agent.status: idle
- **Assigned issues (all blocked/in_review upstream)**:
  - JAC-4187 (b203d10f) status=blocked → unblocks on JAC-3933 (in_review)
  - JAC-3494 (c485fbcf) status=blocked → JAC-3752 NOT FOUND (stale ref)
  - JAC-4081 (b6044613) status=blocked → blockers: JAC-3629/blocked
  - JAC-4069 (77914391) status=blocked → JAC-4073 NOT FOUND (stale ref)
  - JAC-3564 (9d2ec425) status=in_review → system spec, not dispatchable
  - JAC-3439 (9d2ec425) status=in_review → system spec, not dispatchable

### Plan Runner (2c6b1cc9) — claude-code/opus-4-8/verified/idle, maxParallel=1, verifiedAt 2026-07-31T19:56:00Z
- executionLane: `{"pool":"claude-code","model":"claude-opus-4-8","state":"verified","provider":"claude-code","transport":"omnigent","verifiedAt":"2026-07-31T19:56:00Z","maxParallel":1,"verification":"WS1 re-probe: running, heartbeat <20m, no errorReason"}`
- agent.status: idle
- **Assigned issues (all blocked upstream)**:
  - JAC-3628 (b29da130) status=blocked → blockers: JAC-3629/blocked
  - JAC-4190 (aaed5fd3) status=blocked → blockers: JAC-4187/blocked
  - JAC-4462 (e915780a) status=blocked → no upstream listed
  - JAC-4093 (d27f48db) status=blocked → JAC-3705 stale ref
  - JAC-3665 (f2ed34c5) status=blocked → blockers: JAC-3660/blocked
  - JAC-4105 (223f6775) status=blocked → blockers: JAC-3629/blocked

### Kimi Code via Ringer (3f1712eb) — independent-review/k3/verified/idle, maxParallel=1, verifiedAt 2026-07-23T20:03:10Z
- executionLane: `{"pool":"independent-review","model":"kimi-for-coding/k3","state":"verified","provider":"kimi","transport":"ringer","verifiedAt":"2026-07-23T20:03:10Z","maxParallel":1,"verification":"K3 lane smoke PASS 2026-07-23"}`
- agent.status: idle
- **Assigned issue**:
  - JAC-3596 (23c04a76) status=todo → blockers: JAC-3592/in_progress, JAC-3593/in_progress, JAC-3594/in_progress (Luna, assignee=2f92499a)

## Upstream Blocker Statuses (fresh UUID fetches)
- JAC-3933 (fc4eb2ca): status=in_review, assignee=None → unblocks Herald JAC-4187
- JAC-3629 (f57af738): status=blocked, assignee=dc2ca597 → root blocker for Plan Runner chain
- JAC-4388 (4954a59f): status=todo, assignee=None → Jack approval gate, unblocks Plan Runner JAC-3629
- JAC-3592 (46839114): status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596
- JAC-3593 (8b616780): status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596
- JAC-3594 (feacb699): status=in_progress, assignee=2f92499a → unblocks Kimi JAC-3596

## Excluded Lanes (unchanged from 02:04Z cycle)
- Aegis Coder X (da00de99): lane.state=verified but agent.status=error (Process lost -- server may have restarted), host P89 gate down — NOT dispatched
- Aegis Coder Y (181f381b): lane.state=error (12000s timeout defect) — NOT routable
- Paperclip Agent Auditor (5b2bece1): lane.state=quota_blocked (Codex usage limit until Aug 4 11:09 PM CT) — NOT dispatched
- Hermes Mistral (1029acc4): lane.state=paused (manual) — excluded
- Flash (b37f4d70): lane.state=pending_repair (MCPServerTask event-loop-closed defect) — excluded
- Scout (c093061e): lane.state=paused
- Klaw (d216ee6e): lane.state=error (FailoverError: No API key found for provider "anthropic") — excluded
- Klaude Pi (bb421461): idle, metadata=null (no executionLane) — excluded
- Wings (80284e06): lane.state=reserved — NOT dispatched (strategic role)
- ollama-cloud pool: 0/3 usable (Hermes Mistral paused, Flash pending_repair, Flash Executor no lane)

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
- JAC-3935 (dd1123e3): in_review — Ringer-reviewed Fleet Spend Observatory specification
- JAC-3930 (ac15a19c): in_review — Define fleet-wide cross-vendor telemetry and lineage contract
- JAC-3584 (7a354fb8): in_review — Define fleet-wide cross-vendor telemetry and lineage contract

## Stale Blocker Reference Corrections
1. JAC-3752 (Herald JAC-3494 blocker): NOT FOUND in Paperclip issue list — confirmed stale
2. JAC-4073 (Herald JAC-4069 blocker): does not exist in Paperclip issue list — confirmed stale

## Dispatch Decision
0 dispatches. All 3 verified-idle free lanes (Herald, Plan Runner, Kimi) have assigned work blocked upstream. No independent plan-backed unleased task available. No stale-log inference — all gates from authenticated live API metadata.executionLane + direct UUID issue fetches.

## Continuation
Awaiting native Paperclip child-completion wake on upstream resolution:
- JAC-3933 (in_review) → unblocks Herald JAC-4187
- JAC-4388 (todo, Jack approval gate) → unblocks Plan Runner JAC-3629 chain
- JAC-3592/3593/3594 (in_progress, Luna/2f92499a) → unblocks Kimi JAC-3596
