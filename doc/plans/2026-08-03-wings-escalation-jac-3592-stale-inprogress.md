Wings escalation: JAC-3592 stale Luna in_progress — Coordinator cannot repair (403), Luna cannot restore or move to todo

## Summary

Coordinator performed the liveness audit for JAC-3592 ("Stale in_progress: JAC-3592 no activeRun/assignee — correct to todo or restore path", JAC-4513). The issue's own description says: "Luna restore execution path or move to todo; escalate to Wings if Luna cannot."

## Findings

**JAC-3592 current state (verified live 2026-08-03T09:22Z):**
- Status: `in_progress` (NOT corrected to todo as JAC-4516 Wings resolution claimed)
- Assignee: Luna High Planner (2f92499a), activeRunId=null, activeRunStatus=null
- Execution workspace: 1d94a7e9-e236-45a3-a05d-9ed5d9ec6680 (fresh, but no live run)
- Luna agent status: idle, lastHeartbeatAt=2026-08-03T09:14:38Z (alive but not running these issues)
- No live monitor continuation (monitor.live=false, attemptCount=0)

**JAC-3593, JAC-3594 — same stale state:**
- Both: status=in_progress, assigneeAgentId=2f92499a, activeRunId=null
- Both: no live monitor, no execution path

**Authoritative audit results (stale-in-progress-audit.sh):**
- auditedAt: 2026-08-03T09:22:17Z
- staleViolationCount: 3 (JAC-3592, JAC-3593, JAC-3594)
- All classified as `stale_violation` (in_progress with assignee but no activeRun, no monitor)
- Audit script routing updated JAC-4440 (repair issue) but could not fix the actual stale issues

**Coordinator cannot repair directly:**
- HTTP 403 on PATCH to JAC-3592 ("Issue is outside this actor's authorization boundary")
- HTTP 403 on PATCH to JAC-3593
- HTTP 403 on PATCH to JAC-3594
- All three issues are in Luna's auth boundary; Coordinator cannot cross it

**Discrepancy with JAC-4516 Wings resolution:**
- JAC-4516 comment claims: "corrected stale in_progress JAC-3592/3593/3594 to todo" + "released both tree-holds" + "Luna has reclaimed with fresh workspaces"
- Live API contradicts: all three still `in_progress`, tree-holds not verifiable, Luna shows no active run on these issues
- JAC-4516 marked `done` based on the claimed (but not actually applied) corrections

**Luna recovery attempt history (JAC-4444):**
- JAC-4444 was assigned to Luna to "either restart real implementation or move to truthful status"
- Luna ran 4 times (2026-08-01T22:20–22:25Z) but was `blocked` — "blocked on a recovery owner"
- No disposition change resulted

## Recommended Wings action

Wings (final human release approver) should choose ONE:

1. **Correct JAC-3592/3593/3594 to `todo`** at the Paperclip API level, crossing the Luna auth boundary. This returns the issues to a clean state for future Luna pickup or re-routing.

2. **Explicitly resume the Luna execution path** by assigning active runs or confirming Luna has reclaimed these issues with real execution.

3. **Re-audit the boundary model** — if Coordinator cannot correct Luna-owned issues and Luna cannot self-correct, either the auth boundary needs relaxation for repair operations, or a new repair flow needs to be established that respects the boundary while still allowing liveness correction.

## Actions taken by Coordinator

- Ran authoritative stale-in-progress audit (2026-08-03T09:22Z) — 3 stale violations confirmed
- Attempted PATCH to todo on all three issues — HTTP 403 on all three
- Posted verification comment on JAC-4512 documenting the discrepancy
- Posted escalation comment on JAC-4440 (repair issue)
- Created child issue JAC-4519 assigned to Wings with full escalation context

## Evidence

- stale-in-progress-audit.sh output: 3 stale_violation (JAC-3592/3593/3594), assigned to Luna (2f92499a), activeRunId=null
- Coordinator PATCH: HTTP 403 "Issue is outside this actor's authorization boundary" on all three
- JAC-4516 (Wings escalation): done — claims corrections were applied but API state contradicts
- JAC-4440 (repair issue): blocked, refreshed by audit routing at 2026-08-03T09:22Z
- JAC-4519: created, assigned to Wings (80284e06), status=todo
- JAC-4193 exact-model smoke: done (grok-4-fast-reasoning verified)
