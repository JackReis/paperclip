# JAC-4605 — Live Verification Results

Timestamp: 2026-08-04T20:19Z
Paperclip server: v2026.722.0 (deployed npm package at ~/.hermes/node/lib/node_modules/paperclipai), deploymentMode=local_trusted
API: http://127.0.0.1:3101/api
Bearer key scope: agent Aegis (100915f9), NOT Bright (8b6ea7f8). Runtime-state for Bright fetched via board-default bearerless path.

## Acceptance criteria results

### 1. 0 errored agents in fleet summary — FAIL
- Live fleet-wide error count: 11 (UP from 7 observed at the start of this heartbeat ~15 min ago; still far above the "cleared" claim).
- All 11 are `adapter=hermes_local` and all show the SAME 34-char truncated traceback: errorReason = "Traceback (most recent call last):"
- Errored agents (fresh heartbeats during this heartbeat, 20:xx):
  Summarizer, Press, Herald, Hermes Coder, Forge, Operator (+ secondary sqlite3.OperationalError: database is locked), Kimm Code via Ringer, plus 4 that errored at 20:18Z: Rohana, Tal'darim, Flash, Valeera.
- The wake comment's "0 errored agents" (claimed 2026-08-04T19:35Z) is CONTRADICTED by live API data at 20:19Z. The situation has regressed, not cleared.

### 2. Bright agent executionLane.state = verified/idle, no errorReason — NOT MET
- Agent summary (GET /agents/8b6ea7f8): status=running, errorReason=null, orgChainHealth.status=healthy. (Bright's agent row is not in an error state.)
- BUT runtime state (GET /agents/8b6ea7f8/runtime-state), board-default bearerless fetch:
  - lastRunId = 19d10072-1658-47eb-93f3-aec43c52c64d
  - lastRunStatus = "timed_out"  (the same timeout the wake flagged)
  - lastError = "Traceback (most recent call last):"  (truncated traceback — the JAC-4575 symptom, STILL present on Bright)
  - sessionId = null, sessionDisplayId = null, stateJson = {}  -> no executionLane.state object; nothing verified/idle as a lane state
  - totalCostCents = 0
- Bright's adapterConfig (on deployed npm server) = {} with no DEFAULT_MODEL override.

### 3. Test invocation succeeds with cost event recorded — PARTIAL
- Bright IS actively executing: lastHeartbeat 2026-08-04T20:08:28Z; historical subscriptionRunCount=134; 104,975,657 input / 427,425 output tokens accumulated. This heartbeat's own execution routes through hermes_local on the active lane and is token-succeeding — proving model resolution + lane execution work for the active (Aegis) context.
- Active context (Aegis) adapterConfig model = "poolside/laguna-s-2.1:free", access.NOUS_API_KEY = secret_ref. Provider = Nous free pool. NOUS_API_KEY is NOT present in the shell environment, but is resolved via secret projection from Paperclip's secret store. Fallback does NOT route to Ollama at :11434 — it stays on the Nous free tier. Model resolution succeeds.
- COULD NOT post/attribute a cost event to Bright: POST /companies/{cid}/cost-events returns "Agent can only report its own costs" — the bearer key resolves to Aegis (100915f9), not Bright (8b6ea7f8), so a cost event cannot be attributed to Bright's lane from this key. totalCostCents remains 0 (also consistent with free-tier provider pricing).

## Verdict: NOT VERIFIED — regressed
The DEFAULT_MODEL fix (per JAC-4647 evidence) is NOT reflected in Bright's live runtime: Bright's adapterConfig is empty `{}` and its last run still ended in `timed_out` with a truncated traceback. Error count is RISING (7 -> 11 during this heartbeat) rather than zero. The wake comment materially overstated the recovery.

## Recommended next actions
1. Do NOT close JAC-4605 as done. The "all errored agents cleared" assertion is false against the live API.
2. Investigate why errors are RECURRING — new agents errored at 20:18Z, DURING this verification run, despite the v2026.722.0 DEFAULT_MODEL fix. Candidate root cause: the fix targets the npm server, but Bright's adapterConfig is `{}` with no DEFAULT_MODEL override; under concurrent multi-agent heartbeat load the adapter may still emit model="auto" (the original JAC-4575 defect) for agents without an explicit model.
3. Operator now shows a secondary `sqlite3.OperationalError: database is locked` — suggests DB write contention under parallel heartbeats, compounding the adapterConfig incident. Worth checking the PGlite/PostgreSQL instance is not in a locked state.
4. Re-verify only when: (a) error count is stable at 0, and (b) Bright runtime-state shows lastRunStatus=="success" (not timed_out) with a non-null executionLane state and no lastError.
