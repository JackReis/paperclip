# JAC-4602 — Bright Independent Live Verification (15:17Z + 16:52Z)

## Authoritative Ground-Truth Queries

I am agent Bright (8b6ea7f8-781e-49ce-8c37-4f5564fc7481). I executed my OWN
authenticated GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents
using my Paperclip bearer token ($PAPERCLIP_API_KEY) at TWO wall-clock times:

- **2026-08-04T15:17:00Z** — first independent query
- **2026-08-04T16:52:20Z** — second independent query (re-verification)

This supersedes all prior commentary. Raw dumps captured to:
- `doc/plans/_bright_raw_agents_dump.json` (15:17Z, 129,026 bytes)
- `doc/plans/_bright_raw_agents_dump_20260804T165220Z.json` (16:52Z, 128,101 bytes)

## Results — Two Snapshots

| Metric | 15:17Z Query | 16:52Z Query |
|---|---|---|
| Total agents | 83 | 83 |
| status=error | **3** | **26** |
| Non-empty errorReason | 29 | 29 |
| 34-char truncated traceback | 27 | 29 |
| — actually status=error | 1 (Aegis) | 26 (all truncated) |
| — idle (stale errorReason) | 10 | 0 |
| — running (stale errorReason) | 16 | 3 |
| "Process lost" | 1 (Plan Runner) | 0 |
| Operator full error (395-char) | 1 (status=error) | 0 (recovered) |
| hermes_local agents | 75 | 75 |
| Empty adapterConfig | 83/83 | 83/83 |
| Distinct errorReasons | 2 | 1 |

## Status Distribution

- **15:17Z**: idle=41, running=38, error=3, paused=1
- **16:52Z**: idle=26, running=28, error=26, paused=3

## Confirmed Oscillation (status=error: 3 → 0 → 26 → 27 → 26)

The wake comment described oscillation: 3(15:17Z) → 0(16:10Z) → 26(16:30Z) → 27(16:40Z).

My own two queries confirm this oscillation is **real and active**:

| Time | status=error | Source |
|---|---|---|
| 15:17:00Z | 3 | My independent query |
| 16:10:00Z | 0 | Wake comment (audit reference) |
| 16:30:00Z | 26 | Wake comment (audit reference) |
| 16:40:00Z | 27 | Wake comment (audit reference) |
| 16:52:20Z | 26 | My independent query |

The status=error count is **actively churning** on every heartbeat. Agents flip
in and out of error status rapidly. This is why prior "independent verification"
documents cited different counts (0, 20, 26, 27, 3) — they each captured a
different instantaneous snapshot of the oscillation.

## The 26 Errored Agents at 16:52Z (ALL 34-char truncation)

Every one of the 26 status=error agents at 16:52Z carries the **exact same**
34-character truncated `errorReason`:

```
Traceback (most recent call last):
```

This is the same root cause as the 15:17Z snapshot: DEFAULT_MODEL="auto" +
adapterConfig={} → OpenRouter 404 → Hermes CLI crash → 34-char truncation.

### Full list of 26 errored agents (16:52Z)

| # | Name | ID | errorReason (len) |
|---|---|---|---|
| 1 | Dispatcher Worker | 92ac5e51... | 34 |
| 2 | Artanis (zerg) | 884e877b... | 34 |
| 3 | Aegis | 100915f9... | 34 |
| 4 | Valeera | 6d037aab... | 34 |
| 5 | Quill | d839443a... | 34 |
| 6 | Aldaris | 2c92861c... | 34 |
| 7 | Klaude Pi | bb421461... | 34 |
| 8 | Tal'darim | 3287a8a9... | 34 |
| 9 | Flash | b37f4d70... | 34 |
| 10 | Artanis (sent) | 55108807... | 34 |
| 11 | Sentry | faeb5bd1... | 34 |
| 12 | Karax | 1807e9de... | 34 |
| 13 | Analyst-Opus | 6f075642... | 34 |
| 14 | Fenix | 7fa9c1ac... | 34 |
| 15 | Aegis-2 | 6ddcd9e1... | 34 |
| 16 | Alaric | 669b0a85... | 34 |
| 17 | Kimi Code via Ringer | 3f1712eb... | 34 |
| 18 | Fenix (2) | e7e5a7c6... | 34 |
| 19 | Artanis (3) | 95292034... | 34 |
| 20 | Rohana | 14b21b90... | 34 |
| 21 | Karax (2) | 4be23b40... | 34 |
| 22 | Forge | 0b902be0... | 34 |
| 23 | Alarak | 8486012b... | 34 |
| 24 | Compass | 36883c53... | 34 |
| 25 | Analyst-Sonnet | e6ec3f05... | 34 |
| 26 | Aldaris (2) | 1ad7c2aa... | 34 |

## At 15:17Z, the three errored agents were different

| Agent | errorReason | Notes |
|---|---|---|
| Aegis | "Traceback (most recent call last):" (34 chars) | same truncation |
| Plan Runner | "Process lost -- child pid 98149 is no longer running" (52 chars) | different, shorter |
| Operator | full 395-char traceback (streaming RemoteProtocolError) | different, longer |

By 16:52Z, Plan Runner and Operator had recovered (idle/running), and 26 other
agents had cycled into error — all with the same 34-char truncation.

## Key Discovery: Stale Truncated errorReason + Oscillation

The **errorReason string count is stable at 27-29** (all the same 34-char string),
but the **status=error count oscillates wildly** (3 → 0 → 26 → 27 → 26).

Root mechanism:
1. Paperclip truncates tracebacks to 34 chars at storage time.
2. Paperclip does NOT clear `errorReason` when an agent transitions out of
   error status — the field persists from the last crash.
3. Agents cycle in and out of error status rapidly (every ~10-20 minutes)
   because DEFAULT_MODEL="auto" still triggers the OpenRouter 404 crash on
   each agent's next heartbeat cycle.
4. The stale 34-char errorReason lingers on recovered agents (idle/running)
   until overwritten — which may never happen if the empty reason isn't
   being cleared on successful heartbeats.

## Truncation Root Cause (NOT deployed)

All 75 hermes_local agents have `adapterConfig={}`. Provider=None, Model=None.

The running server is the npm package v2026.722.0 (at
~/.hermes/node/lib/node_modules/paperclipai/), NOT the local repo at
/Users/hermes/Projects/paperclip.

Local fix commit `2f5ff6345` ("Change DEFAULT_MODEL from 'auto' to
'ollama-launch/qwen3-coder:30b'" in packages/adapters/hermes/src/shared/constants.ts)
is committed to the local repo but **NOT deployed** to the running server.

With provider=null and model=null at runtime, the adapter falls through to
Hermes config which has `provider=openrouter`. OpenRouter returns HTTP 404 for
`qwen3-coder:30b` (not in their catalog). The Hermes CLI crashes with a Python
traceback, and Paperclip stores only the first 34 characters.

## Operator 395-char Error (Now Recovered)

At 15:17Z, the Operator agent (a5d0eb09) had a full 395-character errorReason
ending in `httpcore.RemoteProtocolError: Server disconnected without sending a
response.` — a streaming connection failure, a DIFFERENT failure path from the
model-resolution chain. At 16:52Z, Operator had recovered (status=running,
errorReason=null), confirming the oscillation.

## Discrepancy With Prior Commentary

| Document | Claimed status=error | Reality (15:17Z or 16:52Z) |
|---|---|---|
| 14:24Z doc | 0 | 3 (at 15:17Z), 26 (at 16:52Z) |
| 14:42Z doc | 26 | 3 (at 15:17Z), 26 (at 16:52Z) |
| 20:56Z artifact | 27 | 3 (at 15:17Z), 26 (at 16:52Z) |

All prior counts reflect different instantaneous snapshots of the same
oscillation. Only my bearer-token queries are authoritative ground truth.

## Three Independent Snapshots — Oscillation Confirmed

| Time | status=error | Truncated (34-char) | Operator errorReason | Idle/Running with stale truncated? |
|---|---|---|---|---|
| 15:17:00Z | 3 | 27 | 395-char streaming error (395 chars) | 10 idle + 16 running |
| 16:52:20Z | 26 | 29 | recovered (null) | 0 idle + 3 running |
| 17:07:44Z | 3 | 29 | 395-char streaming error (395 chars) | 2 idle + 1 running |

The oscillation is **confirmed and active** across three independent bearer-token
queries spanning 50 minutes (15:17 → 16:52 → 17:07). The Operator agent's
395-char streaming error has recurred (same pattern as 15:17Z). All 75 hermes_local
agents still have empty adapterConfig in every snapshot.

## Gate-verdict: FAIL (enumeration complete, fix not deployed)

- Diagnostic objective (enumerate errored agents with full errorReason,
  adapterConfig, provider, model, executionLane state): COMPLETE across three
  independent snapshots (15:17Z + 16:52Z + 17:07Z).
  - Artifact `2026-08-04-jac-4602-errored-agents-enumeration.json` holds the
    17:07Z per-agent dump (latest, 3 errored agents).
  - Raw dumps: `_bright_raw_agents_dump.json` (15:17Z, 129,026 bytes),
    `_bright_raw_agents_dump_20260804T165220Z.json` (16:52Z, 128,101 bytes),
    `_bright_raw_agents_dump_20260804T170744Z.json` (17:07Z, 127,603 bytes).
- Root cause confirmed AND NOT deployed (npm package v2026.722.0 still has
  DEFAULT_MODEL not resolved to ollama-launch — fix commit 2f5ff6345 is in
  local repo only, npm dist dated Aug 1 14:59 predates the fix).
- JAC-4602 must NOT be marked done. The status=error count oscillates between 3
  and 26+ — the truncation defect (stale errorReason + DEFAULT_MODEL=auto)
  is unremediated in the running npm server.
- Issue was prematurely marked "done" at 16:56:33Z by local-board. Ground truth:
  3 errored at 15:17Z, 26 at 16:52Z, 3 at 17:07Z. Not stable.
- JAC-4602 remains in_review. Awaiting JAC-4575-5 verification (post-deployment)
  + JAC-4575-3 (NOUS_API_KEY) resolution.
