# JAC-4000 Dispatch Evidence — Cycle 2026-08-03T22:30Z

## Cycle Timestamp
2026-08-03T22:30:00Z (heartbeat run 997b6fe3-082a-4b7a-97f4-44d1b3279028)

## Issue Context
- Issue: JAC-4000 — Coordinator Fleet Coordination Check
- Status: in_progress
- Priority: medium
- Assignee: Wings (80284e06-41ab-415a-ba1c-6f21debd0d)
- Wake: issue_commented, 1 pending comment acknowledged

## Live Verification Method
Authenticated `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents`
via bearer API key to Paperclip API v2026.722.0 at http://127.0.0.1:3101.
All gates derived from `metadata.executionLane` — no stale-log inference.

## Live Agent Table — Relevant Lanes (48 agents total)

### Free / Idle Verified Lanes

| Lane | Agent | status | lane.state | verifiedAt | age | Status Detail |
|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | idle | *(cleared)* | — | — | lane={} |
| Plan Runner | 2c6b1cc9 | idle | *(cleared)* | — | — | lane={} |
| Kimi Code via Ringer | 3f1712eb | idle | *(cleared)* | — | — | lane={} |

### Excluded Lanes (NOT capacity)

| Lane | Agent | status | lane.state | errorReason / verification |
|---|---|---|---|---|
| Aegis Coder X | (run) | running | verified | "Process lost -- child pid 61985 is no longer running" (pid 61985 confirmed dead via ps); verifiedAt=2026-07-31T19:56:00Z (75h stale); verification string claims "heartbeat fresh" but is stale — NOT re-probed |
| Aegis Coder Y | | idle | error | "Timed out after 12000s; NOT routable until clean re-probe"; verifiedAt=2026-07-31 (75h stale) |
| Hermes Mistral | | paused | paused | Manual pause; verifiedAt=2026-07-31 (75h stale) |
| Flash | | idle | pending_repair | MCPServerTask event-loop-closed defect; verifiedAt=2026-07-31 (75h stale) |
| Wings | | running | *(cleared)* | lane={} (reserved by issue context) |
| Coordinator | | running | *(cleared)* | lane={} (reserved, this run) |

## Pool Limit Utilization

| Pool | Limit | Active | Used |
|---|---|---|---|
| Ollama Cloud | 3 | 0 | 3 free |
| Claude Code (OmniGent) | 2 | 0 | 2 free |
| Local Aegis | 2 | 0* | 2 free (but P89 gate down) |
| Codex | 1 | 0 | 1 free |
| Ringer | 1 | 0 | 1 free |

*P89 gate status per CTX-SpO2: P:down (host health not green)

## Assigned Work on Free Lanes

### Herald (a1e8cb0d)
- JAC-4422: blocked — [dispatch] Implement notes-pc9x1 pull-first fleet beacon
- JAC-3876: blocked — JAC-3577 owner preview card (Gemini team chat merge)
- JAC-3494: blocked — Bootsie Sally-pattern concierge
- JAC-4081: blocked — Fable 5 project page + SOP tracking

### Plan Runner (2c6b1cc9)
- JAC-3628: blocked — Pull-first fleet beacon (blocked by JAC-4388)
- JAC-4462: blocked — Execute notes-pc9x1
- JAC-3665: blocked — Wave 4-5 rebuilds
- JAC-4093: blocked — JAC-3705 canary preconditions (blocks JAC-3705)

### Kimi Code via Ringer (3f1712eb)
- JAC-3596: todo — Independent exact-SHA verification (blocked by Luna JAC-3592/3593/3594)

## Upstream Blocker States (live API)

| Issue | Was | Now | Note |
|---|---|---|---|
| JAC-4187 | in_review | **done** | Herald lane metadata NOT restored — config drift |
| JAC-3629 | blocked | **done** | Plan Runner lane metadata NOT restored — config drift |
| JAC-4388 | — | **done** | Resolved; was blocker on JAC-3628 |
| JAC-3592 | — | **done** | Luna issue |
| JAC-3593 | todo | todo | Luna — still in progress |
| JAC-3594 | todo | todo | Luna — still in progress |
| JAC-3596 | todo | todo | Blocked on Luna 3593/3594 |

## Configuration Drift Detected

**JAC-4187 (Herald)**: Issue is `done` (re-verify completed) but Herald's
`metadata.executionLane` was NOT restored from `{}` to the verified lane
configuration. Per dispatch policy, a lane is eligible only when state=verified
AND verification is current. `lane={}` fails this gate.

**JAC-3629 (Plan Runner)**: Issue is `done` (unblocked at dependency level) but
Plan Runner's `metadata.executionLane` was NOT restored from `{}`. Same
config-drift exclusion.

These are not stale-log artifacts — both the issue resolution and the lane
metadata were confirmed via live authenticated API at 22:30Z.

## Exclusion Summary

- **Herald**: lane metadata cleared `{}` despite JAC-4187 done → not eligible
- **Plan Runner**: lane metadata cleared `{}` despite JAC-3629 done → not eligible
- **Kimi Code via Ringer**: lane metadata cleared `{}` → not eligible
- **Aegis Coder X**: lane=verified but pid 61985 dead + stale verification (75h) + P89 gate down → TREAT AS NOT ROUTABLE
- **Aegis Coder Y**: lane.state=error (12000s timeout) → not eligible
- **Hermes Mistral**: lane.state=paused → not eligible
- **Flash**: lane.state=pending_repair (MCPServerTask defect) → not eligible
- **Wings**: reserved (strategic)
- **Coordinator**: reserved (this run, running itself)
- **All 16 unassigned todos**: policy-excluded (credential-bound, human-gate,
  Jack decision gate, personal, dependency-gated, self-review)

## Dispatches
**0 dispatches realized.**

Rationale: No verified lane has current verification AND non-empty assigned work
that is dispatchable. The three previously-idle free lanes (Herald, Plan Runner,
Kimi) have all assigned issues blocked or dependency-gated. Aegis Coder X has
agent-level errorReason (process lost) overriding its stale verified lane state.
P89 host gate is down, blocking local-Aegis pool regardless.

## Disposition
in_progress (restart-ready). Awaiting native child-completion wake:
- JAC-4187 (done) → restore Herald lane metadata to verified state
- JAC-3629 (done) → restore Plan Runner lane metadata to verified state
- JAC-3592/3593/3594 (Luna) → unblock JAC-3596 (Kimi Code via Ringer)

Liveness path: native Paperclip child-completion continuation. Schedule
fallback retained for JAC-4462/JAC-4093 if upstream resolution does not wake.

## Evidence
- Live API: GET /api/companies/87c32b8e.../agents (48 agents, full output at /tmp/agents.json)
- Live API: GET /api/companies/87c32b8e.../issues?limit=500 (bulk issue states)
- pid 61985: `ps -p 61985` → not found (confirmed dead)
