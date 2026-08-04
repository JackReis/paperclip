# Luna PM Fleet Health Summary — 2026-08-04T19:24Z

## Scope
PM triage snapshot from Luna High Planner (agent 2f92499a). Covers the hermes_local
adapterConfig incident (JAC-4575/JAC-4552) cascade, liveness incidents, and queue state.

## Current Fleet State (live at 19:24Z)
- **68 total agents**: 19 idle, 23 running, **25 errored**, 1 paused
- All errored agents: `hermes_local`, `adapterConfig={}`, `provider=null`, `model=null`
- Errored count oscillating: 21→24→25 across recent snapshots (still growing)
- Fix NOT yet deployed to npm dist (confirmed: neither `ollama-launch` nor `qwen3-coder`
  found in dist; mtime unchanged at Aug 4 13:43Z)

## Root Cause (confirmed by Bright, 4 independent snapshots)
- `DEFAULT_MODEL="auto"` in the running npm server (`~/.hermes/node/lib/node_modules/paperclipai/dist/index.js`,
  v2026.722.0, mtime 2026-08-01T14:59Z)
- Fix commit `2f5ff6345` (JAC-4603) is committed to local repo
  (`packages/adapters/hermes/src/shared/constants.ts:39` → `DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b"`)
- Fix is NOT deployed to the running npm dist (confirmed: neither `ollama-launch` nor `qwen3-coder`
  found in dist)
- Empty `adapterConfig={}` agents resolve `model=auto` → Hermes config `provider=openrouter` →
  OpenRouter returns 404 for `qwen3-coder:30b` → Hermes CLI crashes → Paperclip truncates traceback

## Recovery Track
1. **JAC-4603** (done) — Fix committed in local repo
2. **JAC-4602** (done) — Diagnostic complete with 4 independent snapshots
3. **JAC-4646** (done) — Liveness incident resolved, recovery path made explicit
4. **JAC-4647** (in_progress, Bright) — Deploy fix to npm server, restart on :3101, verify
5. **JAC-4605** (blocked) — Verify 0 errored agents + Bright lane resumes, pending JAC-4647
6. **JAC-4630** (blocked, Coordinator) — Fleet health regression audit (7→24 errored agents)

## Additional Findings

### Honcho Workspace Seeding (JAC-4563)
- `hermes` workspace: exists on Honcho dev API (:8005)
- `family` and `worker` workspaces: created by watchdog at 2026-08-04T02:38:10Z
- Honcho aegis API (:8006): returns empty workspace list (different instance, different auth scope)
- **Status**: All 3 required workspaces now exist on the dev instance

### Stale Port Drift (JAC-4563)
- Fleet documentation files contained stale `3100` references (fork runs on `3101`)
- Fixed in two files:
  - `fleet-surfaces-index.md`: 4 locations updated (port registry, service URL, curl example, tunnel column)
  - `fleet-base.md`: 5 locations updated (curl examples + runtime section)

### Liveness Incidents
- JAC-4645 (source: JAC-3930): blocked — telemetry contract in review without action path
- JAC-4646 (source: JAC-4602): done — diagnostic complete, recovery in JAC-4647
- JAC-4625 (source: JAC-4081→JAC-3628): blocked — assignee paused
- JAC-4550 (source: JAC-3597→cancelled JAC-3596): blocked — blocked by cancelled issue

## PM Summary
The entire fleet health incident cascade has a single root cause: the DEFAULT_MODEL fix
(commit 2f5ff6345) is committed but not deployed. Bright is actively working on JAC-4647
(deployment, run started 18:49:51Z, Bright heartbeat fresh at 19:24Z). The liveness escalation
chain is resolved — next action is explicitly owned by Bright on JAC-4647. The queue is blocked
on hermes_local agents until deployment completes. Monitoring JAC-4647 for completion;
JAC-4605 should be closed with verification evidence once deployment succeeds.

## JAC-4563 Disposition (DONE)
- Honcho family/worker workspaces: confirmed exist (created 2026-08-04T02:38:10Z)
- Stale 3100→3101 port drift: fixed in fleet-surfaces-index.md (3 locations) and fleet-base.md (5 locations)
- Issue marked done with recovery action cleared
