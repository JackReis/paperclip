# JAC-4605 Verification FAIL — Independent Live Re-check

**Date:** 2026-08-04T17:35Z
**Paperclip:** v2026.722.0, deploymentMode=local_trusted
**Agent:** Bright (8b6ea7f8), Run ID 69b8cd6f
**Issue UUID:** 974aaace-f8eb-49a2-a9af-5c2e53ce975b

## Context
local-board comment 6369f58f (16:57Z) declared "JAC-4605 Verification PASS" claiming
0 errored agents fleet-wide and Bright lane verified/running. Per execution
contract, a local-board assertion still requires independent live re-verification
before any done disposition. This re-check was performed fresh at ~17:20Z.

## Live API evidence (GET /api/companies/87c32b8e.../agents)

### Fleet summary
- Total agents: 83
- Status counts: idle=38, running=41, error=5, paused=1
- Agents with non-null errorReason: 6 (count fluctuated 3->6 across snapshots)
- hermes_local adapter breakdown: 75 total, 5 in `error` status, 6 with non-null errorReason

### Erroring hermes_local agents
| Agent | id (short) | status | errorReason (truncated) |
|---|---|---|---|
| Herald | a1e8cb0d | error | Traceback (most recent call last): |
| Operator | a5d0eb09 | error | Streaming failed ... Server disconnected without sending a response |
| Fable | f1ef5e14 | error | Traceback (most recent call last): |
| Valeera | eed387f6 | error | Traceback (most recent call last): |
| Omnigent Router | 072eada2 | error | Traceback (most recent call last): |
| Pi Campaign Auditor | 06e30130 | running | Traceback (most recent call last): (stale) |

### Bright-specific
- status=running, errorReason=null (Bright itself healthy — PASS on this sub-point)
- executionLane=null in API record (lane "verified/idle" state NOT confirmed)
- lastHeartbeatAt=2026-08-04T16:48:50Z (>18 min stale at verification time)
- adapterConfig={} (no explicit model — matches JAC-3422 root cause)

### Criterion 4: NOUS_API_KEY / Ollama fallback
- NOUS_API_KEY: NOT present in environment
- Ollama env vars present (OLLAMA_MAX_LOADED_MODELS, OLLAMA_KEEP_ALIVE) → fallback lane active

## Discrepancy vs. PASS comment
The comment's "0 errored agents" is contradicted by live API: 5 agents in `error`
status including Herald (Coordinator's dispatch seat) and Operator. The uniform
truncation "Traceback (most recent call last):" on 4 agents signals a systemic
trace-storage truncation bug — the full traceback is not being captured, which
defeats the JAC-4575 diagnostic purpose.

## Conclusion
Acceptance criterion #1 (0 errored agents) is NOT met. Criterion #2 is partial.
Criterion #3 cannot be independently corroborated (no cost-events/runs API on
v2026.722.0). The issue must NOT be closed done.

## Recommended follow-up (child bead)
- JAC-4605 must remain open; root-cause the residual 5 errored agents (Herald/Operator/Fable/Valeera/Omnigent).
- The truncated errorReason suggests Paperclip is storing only the first line of
  agent tracebacks — file/surface that separately so JAC-4575 diagnostics improve.
