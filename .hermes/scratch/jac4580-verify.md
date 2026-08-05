Fenix verification: JAC-4580 fix independently confirmed on disk.

## Verified changes in hermes_state.py

1. `_connect_tracked_db` call (read-only, cross-profile polling) — line 1981: `timeout=30.0` (was 1.0)
2. `_connect_and_init` writable path — line 2064: `timeout=30.0` (was 1.0)
3. `apply_database_pragmas()` — line 927: `PRAGMA busy_timeout=30000` added (new)

## Rationale (root cause confirmed)
Under 60+ concurrent Hermes processes, `timeout=1.0` made `sqlite3.connect` set SQLite's internal busy_timeout to 1s. `BEGIN IMMEDIATE` failed immediately on lock contention; the 20s app-level retry (`_execute_write`, `_WRITE_PATIENCE_S`) exhausted its patience before siblings released locks, surfacing as truncated adapter init tracebacks. `timeout=30.0` plus the `busy_timeout=30000` pragma (covers helper connections that don't pass timeout=) keeps SQLite's internal busy handler waiting up to 30s, collapsing the failure-retry cycle count.

## Verification method
- `read_file` on /Users/hermes/.hermes/hermes-agent/hermes_state.py at offsets 920, 1960, 2040 — all three edits present.
- Editable-install `__editable__.hermes_agent-0.20.0.pth` maps to this path (active running processes use this file, not release copies).

## Status
Fix is applied and live. Issue marked done. Remaining: passive monitoring of the 3 error agents (Researcher, Analyst-Sonnet, Flash) for recovery on next bootstrap.
