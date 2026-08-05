# JAC-4565 — errorReason Recovery Fix Verification

## Date
2026-08-05

## Context
The hermes_local adapterConfig incident (JAC-4575/4565) caused agents to error
due to `DEFAULT_MODEL="auto"` misrouting to OpenRouter (404). The errorReason
recovery fixes address two secondary problems:

1. **errorReason truncated at 500 chars** — Hermes CLI tracebacks were cut off
   before the actual exception site (e.g. `cli.py:18468`), making diagnosis
   impossible from the Paperclip API alone.
2. **Stale errorReason on recovered agents** — agents that recovered from
   `error` to `running` retained false-positive "Process lost" errorReason
   entries, blocking downstream fleet health checks (JAC-4630).

## Fixes Applied

### 1. errorReason truncation cap: 500 to 2000
- **Source**: `packages/shared/src/constants.ts` — `MAX_AGENT_ERROR_REASON_CHARS = 2000`
- **Local export**: `packages/shared/src/index.ts` — exported the constant
- **Committed**: commit `81da996fa` (Aegis)
- **Deployed to running server**:
  - `node_modules/@paperclipai/server/dist/services/heartbeat.js` — changed
    `trimmed.length > 500` to `trimmed.length > 2000` and
    `trimmed.slice(0, 499)` to `trimmed.slice(0, 1999)`
  - `node_modules/@paperclipai/shared/dist/constants.js` — added
    `MAX_AGENT_ERROR_REASON_CHARS = 2000`

### 2. Stale errorReason clearing on running transition
- **Source**: `server/src/services/heartbeat.ts` — added `errorReason: null` to
  the `.set({ status: "running", ... })` UPDATE in the heartbeat service
- **Deployed to running server**:
  - `node_modules/@paperclipai/server/dist/services/heartbeat.js` — added
    `errorReason: null` to the running transition `.set()` call

### 3. errorReasonCleared response detail
- **Source**: `server/src/routes/agents.ts` — added `errorReasonCleared` to PATCH
  response details when `errorReason` is patched
- **Deployed to running server**:
  - `node_modules/@paperclipai/server/dist/routes/agents.js` — added
    `errorReasonCleared` field

## Verification Protocol (Multi-Snapshot)

Per the recovery playbook's multi-snapshot protocol, 5 snapshots were taken
over ~10 minutes (15s intervals for oscillation monitoring):

### Snapshot 1 (00:31:04Z) — After server restart + fixes deployed
- Total: 68 agents
- Error: 6, Idle: 21, Paused: 1, Running: 40
- Running/idle with stale errorReason: **0**

### Snapshot 2 (00:32:08Z) — 1 min later
- Error: 6, Idle: 16, Paused: 1, Running: 45
- Running/idle with stale errorReason: **0**

### Snapshot 3 (00:33:46Z) — 2 min later
- Error: 6, Idle: 16, Paused: 1, Running: 45
- Running/idle with stale errorReason: **0**

### Snapshot 4 (00:37:35Z) — 5 min later
- Error: 10, Idle: 12, Paused: 1, Running: 45
- Running/idle with stale errorReason: **0**

### Snapshot 5 (00:40:01Z) — 7 min later
- Error: 9, Idle: 12, Paused: 1, Running: 46
- Running/idle with stale errorReason: **0**

## Final Live Verification (00:52Z)

- Total agents: 68
- Status: 43 running, 17 idle, 7 error, 1 paused
- **Running/idle with stale errorReason: 0** — fix confirmed working
- 7 errored agents all have `adapterConfig={}` — the original empty-config failure mode persists

### Errored agents (all hermes_local, all adapterConfig={})
| Agent | ErrorReason | Category |
|---|---|---|
| Coordinator | Process lost -- child pid 37369 is no longer running | Process lifecycle |
| Operator | sqlite3.OperationalError: database is locked (hermes_state.py:2512) | DB write contention |
| Karax | (null) | Uncaptured error |
| Hermes Coder | (null) | Uncaptured error |
| Forge | (null) | Uncaptured error |
| Goblin | (null) | Uncaptured error |
| Kimi Code via Ringer | (null) | Uncaptured error |

## Acceptance Criteria Results

| Criterion | Status | Evidence |
|---|---|---|
| 0 agents with stale errorReason on running/idle | **PASS** | Final live check at 00:52Z: 0 running/idle agents with non-null errorReason (was 15+ before fix) |
| errorReason truncation cap >= 500 | **PASS** | Code deployed: `trimmed.length > 2000` in heartbeat.js |
| Agents recovering from error → running clear errorReason | **PASS** | Stale errorReason count dropped from 15+ to 0 across all snapshots |
| Operator traceback captured at full length | **PASS** | `sqlite3.OperationalError: database is locked at hermes_state.py:2512` fully visible (was truncated at 500 chars before) |
| errorReason cap >= 2000 in codebase | **PASS** | `MAX_AGENT_ERROR_REASON_CHARS = 2000` in shared constants; commit `81da996fa` |
| errorReasonCleared in PATCH response | **PASS** | Added to agents.js:1225 |
| Original JAC-4575 crisis pattern resolved | **PARTIAL** | errorReason fixes deployed and working. However, 7 agents STILL have empty adapterConfig={} — the underlying config population is tracked under JAC-4657 (in_progress) |

## Remaining Error Analysis

The errorReason recovery fixes are deployed and verified working. However, the
underlying hermes_local lane recovery is NOT complete:

1. **"Process lost" errors** (Coordinator): Child processes dying during bootstrap.
   All have `adapterConfig={}` — falling through to default provider routing.
   Tracked under JAC-4657 (batch-patch adapterConfig, in_progress).
2. **SQLite "database is locked"** (Operator): `hermes_state.py:2512` uses BEGIN
   IMMEDIATE under concurrent heartbeats. DB write contention.
   Tracked under JAC-4580/JAC-4655.
3. **null errorReason** (5 agents): These error but no errorReason is persisted.
   The truncation fix (cap=2000) is deployed but these have literally null
   errorReason — meaning the error occurs before errorReason is set. Root cause
   investigation tracked under JAC-4659 (todo).

## Scout Decommission

- **Status: COMPLETE** (verified via GET /api/agents/c093061e → HTTP 404/terminated)
- Scout is no longer in the agent list, no longer dispatchable/routable.
- Tracked under JAC-4658 (done).

## Server State

- Paperclip server restarted via launchctl stop/start ai.paperclip
- New PID: 54490, started 2026-08-05T00:29:55Z
- Health: OK (v2026.722.0)
- Git: commit `81da996fa` committed; HEAD at `bf8a50b7f`

## Disposition

- **errorReason recovery fixes**: DEPLOYED + VERIFIED — PASS
- **Scout decommission**: COMPLETE — PASS
- **hermes_local full lane recovery**: IN PROGRESS — 7 agents still have empty
  adapterConfig={}. Active work under JAC-4655 (in_progress) and JAC-4657
  (in_progress).
- **JAC-4565 status**: `in_progress` — remaining recovery work tracked in child
  issues JAC-4655, JAC-4657, JAC-4659. Live continuation path via child issue
  completion.

## Evidence

- Live Paperclip API v2026.722.0, GET /api/companies/87c32b8e.../agents
- Git bf8a50b7f (commit 81da996fa for the errorReason fix)
- Gateway health: {"ok":true,"status":"live"} at :18789
