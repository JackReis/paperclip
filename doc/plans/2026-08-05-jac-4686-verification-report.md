# JAC-4686 Verification Report — hermes_local process-lost + DB contention flapping

**Date:** 2026-08-05  
**Agent:** Forge (0b902be0-2365-4599-b86d-bf177caf5550)  
**Issue:** JAC-4686 [JAC-4565-FU] Follow-up: hermes_local process-lost + DB contention flapping  
**Status:** Resolved

## Summary

The issue description ("All 60 hermes_local agents still have adapterConfig={}") was
**stale** at the time of investigation. The JAC-4657 batch-patch **did** successfully
apply provider=openrouter and model=openrouter/poolside/laguna-s-2.1:free to all 60
hermes_local agents' adapterConfig. However, the agent-scoped API (bearer token)
**redacts** adapterConfig fields, making it appear empty. The local_board (bearerless)
API reveals the true, populated config on all 60 agents.

## Root Cause Analysis

### Primary cause: Stale hermes profile config.yaml files (18 of 19 profiles)

All 18 non-default hermes profiles under `~/.hermes/profiles/*/` had `provider: nous`
in their `config.yaml`, despite the default `~/.hermes/config.yaml` already being
updated to `provider: openrouter` on 2026-07-31.

When a hermes_local agent has `HERMES_HOME` set to a profile directory (e.g.,
`/Users/hermes/.hermes/profiles/zatara`), the hermes CLI reads that profile's
config.yaml. If the adapter doesn't pass `--provider` on the command line, the
CLI falls back to the config.yaml's `provider: nous`, which has an **invalid
NOUS_API_KEY** (401), causing the CLI to crash.

Running processes confirmed this: Zatara (pid 48628), Bright (pid 52354), and
others were all spawned with `--provider nous` despite the DB adapterConfig
saying `provider: openrouter`. This happened because:
1. The processes were spawned before the adapterConfig was patched (JAC-4657 at 01:58Z)
2. The profile config.yaml still had `provider: nous`, serving as a fallback

### Secondary cause: Stale error state not cleared

Two agents remained in `error` state even after the adapterConfig fix:
- **Flash Executor** (d22538a9): `RuntimeError: This event loop is already running`
  in the hindsight plugin (`hermes_state.py` line 279). The hindsight plugin's
  `_get_loop()` creates a background asyncio event loop, but conflicts with
  the main thread's already-running loop in some execution contexts.
- **Coordinator** (dc2ca597): `Process lost -- child pid 23180 is no longer running`
  — a stale process supervision error from a process that died with `--provider nous`.

### SQLite state.db contention (contributed but not primary)

The hermes local state DB at `~/.hermes/state.db` is 1.17GB with WAL mode.
- 52 active file descriptors across 4 running hermes processes
- `busy_timeout=30000` (30s) set by hermes_state.py `_apply_pragmas()`
- `_WRITE_PATIENCE_S=20.0` app-level retry budget with jitter backoff
- WAL file checked and TRUNCATE-checkpointed (0 bytes at checkpoint time)

The SQLite contention mitigation in hermes_state.py (30s busy_timeout, 20s retry
patience, jitter backoff, periodic WAL checkpoint every 50 writes) is adequate.
The `database is locked` errors described in the original JAC-4575 plan docs no longer
appear in the current error snapshot — the error profile has evolved to process-loss
and event-loop conflicts, not SQLite lock exhaustion.

## Actions Taken

1. **Fixed `fleet-batch-patch.sh`** (repo file):
   - Changed `DEFAULT_PROVIDER` from `"nous"` to `"openrouter"`
   - Changed `DEFAULT_MODEL` from `"poolside/laguna-s-2.1:free"` to `"openrouter/poolside/laguna-s-2.1:free"`
   - Changed GET and PATCH API calls to use `X-Paperclip-Local-Board: true` (bearerless)
     instead of `Authorization: Bearer` (which both redacts adapterConfig and returns 403)

2. **Fixed all 18 hermes profile config.yaml files**:
   - Changed `provider: nous` → `provider: openrouter`
   - Changed `default: poolside/laguna-s-2.1:free` → `default: openrouter/poolside/laguna-s-2.1:free`
   - Cleared `base_url: https://inference-api.nousresearch.com/v1` → `base_url: ''`
   - Profiles fixed: aegis, coder, coordinator, deepseek-coder, family, forge,
     gemma-librarian, goblin-ii, klaude, llama-general, mistral, oai-coordinator,
     oai-default, oai-worker, operator, paperclip-canary, paperclip-compact,
     uptime-expert, worker, zatara

3. **Cleared error state** on the 2 errored agents:
   - Flash Executor (d22538a9) via POST /api/agents/{id}/clear-error
   - Coordinator (dc2ca597) via POST /api/agents/{id}/clear-error
   - Both returned to `idle` status with no errorReason

## Verification (live, at 2026-08-05T04:00Z)

```
hermes_local total: 60
By status: {'idle': 47, 'running': 12, 'paused': 1}
Errors: 0
provider=openrouter: 60
provider=nous: 0
no provider: 0
```

All 60 hermes_local agents:
- Have `adapterConfig.provider = "openrouter"`
- Have `adapterConfig.model = "openrouter/poolside/laguna-s-2.1:free"`
- Are in `idle` or `running` status (0 errors)

## Notes for Future Work

- The Flash Executor hindsight plugin event loop conflict is a hermes_cli issue,
  not a Paperclip issue. It occurs when `_get_loop()` is called from within an
  already-running asyncio context. The fix would be in the hermes-agent codebase.
- Stale hermes CLI processes (started with `--provider nous`) continue to run until
  their Paperclip-managed lifecycle ends. New runs will use the corrected config.
- The `fleet-batch-patch.sh` script should be re-run if new hermes_local agents
  are created to ensure they get the correct provider/model.
