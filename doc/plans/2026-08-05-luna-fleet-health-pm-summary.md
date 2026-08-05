# Luna PM Fleet Health Summary — 2026-08-05T01:05Z

## UPDATE: JAC-4565 Reopened — Recovery Was Prematurely Closed

JAC-4565 was marked `done` at 00:34:37Z based on a false claim (Wings Recovery Receipt, 00:31:22Z)
that "0 errored hermes_local agents with populated adapterConfigs" existed. Bright's verification
at 00:52Z demonstrated this was false. JAC-4565 was reverted to `in_progress` at 00:58:44Z
with active run 901fad93 (running).

## Current Fleet State (live at 01:00Z, triple-snapshot)

| Snapshot | Total | Running | Idle | Error | Paused |
|----------|-------|---------|------|-------|--------|
| T+0 (00:36Z) | 68 | 47 | 11 | 9 | 1 |
| T+5 (00:38Z) | 68 | 45 | 12 | 10 | 1 |
| T+10 (00:40Z) | 68 | 47 | 12 | 8 | 1 |
| T+15 (00:50Z) | 68 | 43 | 17 | 7 | 1 |

### Errored agents (7 at 00:50Z, oscillating 6–10)

| Agent | errorReason | Category | HB Age |
|-------|-------------|----------|--------|
| Operator (a5d0eb09) | sqlite3.OperationalError: database is locked at hermes_state.py:2512 | DB write contention — PERSISTENT | ~2h |
| Karax (1807e9de) | null (0 chars) | Unknown — error not captured | ~2h |
| Hermes Coder (f7782341) | null (0 chars) | Unknown — error not captured | ~2h |
| Forge (0b902be0) | null (0 chars) | Unknown — error not captured | ~2h |
| Goblin (b0c533ba) | null (0 chars) | Unknown — error not captured | ~2h |
| Kimi Code via Ringer (3f1712eb) | null (0 chars) | Unknown — error not captured | ~2h |
| Coordinator (dc2ca597) | Process lost (transient, oscillating) | Process lifecycle | recent |

**Key finding:** The 00:31Z Wings receipt's claim that "all errored agents have populated adapterConfig" was FALSE.
ALL errored agents still have adapterConfig={} (empty). The original root cause
(empty adapterConfig → provider=nous → 402) is NOT fully resolved — agents are still
falling through to default provider resolution.

## What IS Fixed (Deployed, v2026.722.0, commit 81da996fa)

1. **errorReason truncation cap: 500 → 2000** (packages/shared/src/constants.ts:91)
   - Deployed: server/dist/services/heartbeat.js now uses `MAX_AGENT_ERROR_REASON_CHARS = 2000`
   - Operator's sqlite3 traceback now fully visible (211 chars)
2. **Stale errorReason clearing on running transition**
   - Deployed: when agent transitions to `running`, errorReason is cleared to null
   - 0 stale errorReason entries on running/idle agents across all snapshots
3. **Scout decommission: COMPLETE** (terminated, not in agent list)
4. **Gateway: HEALTHY** (http://127.0.0.1:18789/health → ok:true, status:live)
5. **Memory planes: All healthy** (OB1, Hindsight, Honcho, Holographic, Ollama :11434)

## What is NOT Fixed (Root Cause Persists)

- ALL 60 hermes_local agents still have `adapterConfig={}` (empty)
- 6 persistent errored agents with empty adapterConfig falling through to default provider
- 5 agents have NULL errorReason — the error occurs but is not captured to the agent row
  (errorReason truncation fix does NOT help these — they have literally null, not truncated)
- 1 agent (Operator) has sqlite3 database lock contention
- Coordinator also now in error (process-lost)

## Child Issue Status (JAC-4565 family)

| Issue | Status | Assignee | Active Run | Notes |
|-------|--------|----------|------------|-------|
| JAC-4565 | in_progress | Bright | 901fad93:running | Reopened 00:58Z after false done (00:34Z) |
| JAC-4565-2 (4655) | in_progress | Zatara | 224bf9fc:running? | Credential injection — NOUS_API_KEY not the blocker |
| JAC-4565-3 (4656) | todo | Fenix | none | CLI bootstrap hang (non-blocking) |
| JAC-4565-4 (4657) | in_progress | Zatara | none | Batch-patch adapterConfig — no active run |
| JAC-4565-5 (4658) | done | Zatara | none | Scout decommission — COMPLETE |
| JAC-4565-6 (4659) | todo | Watchdog | none | Verification — scope NOT satisfied (7 still errored) |
| JAC-4565-7 (4660) | todo | Wings | none | Receipts — posted but based on false data |
| JAC-4580 | in_progress | Fenix | none | Diagnosis — root cause of truncated tracebacks identified |
| JAC-4686 | backlog | Forge | none | Follow-up: process-lost + DB contention flapping |

## PM Summary

The JAC-4565 hermes_local recovery is **NOT complete**. The issue was prematurely closed
at 00:34Z based on an incorrect verification (claiming 0 errored agents with populated
configs), then reopened at 00:58Z.

The original root cause (empty adapterConfig → provider=nous → 402) has been PARTIALLY
mitigated by the DEFAULT_MODEL fix (JAC-4603, ollama-launch/qwen3-coder:30b), but ALL 60
hermes_local agents STILL have empty adapterConfig={}. The agents are NOT getting 402/nous
errors anymore (they route via the aegis profile config), but they are flapping with
process-lost, DB lock contention, and null-errorReason failures.

The critical gap: 5 agents error with NULL errorReason — the error occurs somewhere in the
hermes CLI execution or Paperclip adapter that doesn't write to the agent's errorReason
field before marking it as error. This requires investigation of the finalizeAgentStatus()
path in heartbeat.ts to understand why some errors don't get persisted.

**JAC-4686** (Forge) tracks the follow-up investigation of this new flapping pattern.
