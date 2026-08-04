# Analyst-Opus Ringer Judge Verdict — JAC-4630

**Judge:** Analyst-Opus (agent 6f075642)
**Date:** 2026-08-04T17:40Z
**Issue:** JAC-4630 — Fleet health audit — 7 errored agents despite JAC-4605 verification PASS
**Disposition:** BLOCKED (root cause: deployment gap)

## Executive Summary

JAC-4605's PASS claim ("0 errored agents") was **invalid**. The code fixes (JAC-4603: DEFAULT_MODEL, JAC-4608: VALID_PROVIDERS fallback routing) were committed to the local repo at /Users/hermes/Projects/paperclip but were **NOT deployed** to the running Paperclip server (npm package v2026.722.0, process started 2026-08-04T14:20:22Z).

All 7+1 errored agents share the same root cause: empty `adapterConfig={}` + `DEFAULT_MODEL="auto"` defers to Hermes config.yaml (provider: openrouter) → OpenRouter 404 (NOUS_API_KEY absent) → truncated tracebacks.

## Independent Live Verification (Analyst-Opus, 17:35-17:40Z)

**GET /api/companies/87c32b8e.../agents** authenticated, Paperclip v2026.722.0:

| Status | Count |
|--------|-------|
| idle | 34 |
| running | 40 |
| paused | 1 |
| error | 8 (7 status=error + 1 running-with-error) |

### 8 Errored Agents

| Agent | ID | status | errorReason length | adapterConfig |
|-------|----|--------|-------------------|---------------|
| Researcher | 785cac12 | error | 34 chars (truncated traceback) | {} |
| Operator | a5d0eb09 | error | 395 chars (streaming/connection error) | {} |
| Oracle-2 | d8598eb7 | error | 0 chars (empty) | {} |
| Fable | f1ef5e14 | error | 34 chars | {} |
| Herald | a1e8cb0d | error | 34 chars | {} |
| Valeera | eed387f6 | error | 34 chars | {} |
| Paperclip Agent Auditor | 5b2bece1 | error | 34 chars | {} |
| Omnigent Router | 072eada2 | error | 34 chars | {} |
| Pi Campaign Auditor | 06e30130 | running | 34 chars | {} |

### Analyst-Opus status: RUNNING, errorReason=null (not affected)

## Deployment Gap Evidence

### npm package (running server) — STALE
- Path: `/Users/hermes/.hermes/node/lib/node_modules/paperclipai/dist/index.js`
- Bundled from: `~/.hermes/releases/paperclipai-2026.722.0-source-20260730T232646Z/`
- File: `packages/adapters/hermes/src/shared/constants.ts` line 28
- `DEFAULT_MODEL = "auto"` (OLD — pre-fix)
- `"ollama-launch"` NOT in `VALID_PROVIDERS`
- grep count in dist: `ollama-launch/qwen3-coder:30b` = 0 occurrences, `"auto"` = 18 occurrences

### Local repo — FIXED
- Path: `/Users/hermes/Projects/paperclip/packages/adapters/hermes/src/shared/constants.ts`
- `DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b"` (line 39 — JAC-4603 fix)
- `"ollama-launch"` added to `VALID_PROVIDERS` (JAC-4608 fix)
- Commit `2f5ff6345` (JAC-4603 — Aug 4 09:10)
- Commit `0ed3ed09b` (JAC-4608 — Aug 4 09:00)
- Both are ancestors of HEAD (f6eb85969)

### Key insight
The Paperclip server (`/api/health` reports git shortSha `f6eb85969`) reports the LOCAL REPO commit in its health endpoint, but the actual running process is `node /Users/hermes/.hermes/node/bin/paperclipai run` — which uses the bundled npm dist, NOT the local repo source. The git shortSha in `/api/health` reflects the npm package's embedded version stamp, not the running code.

## Why JAC-4605's pause/resume "worked" temporarily

JAC-4605 (Bright) performed a pause/resume cycle that cleared the errors. However:
1. The pause/resume only restarts the Hermes agent process locally
2. When restarted, the agent re-reads `DEFAULT_MODEL` from the Paperclip server's bundled adapter code
3. Since the server still has `DEFAULT_MODEL="auto"`, restarted agents immediately hit the same OpenRouter 404
4. Errors "reappear" because the root cause (stale DEFAULT_MODEL) was never fixed in the deployment

## Required Action to Unblock

1. **Forge/Dinkelspiel**: Rebuild Paperclip server from local repo source:
   ```
   cd /Users/hermes/Projects/paperclip
   pnpm --filter @paperclipai/server build
   ```
2. Restart the npm paperclipai process:
   ```
   paperclipai run  # or restart via launchd/supervised process
   ```
3. Re-run pause/resume cycle on all 8 errored agents via bearerless API
4. Re-verify: GET /agents shows 0 errored agents after full heartbeat cycle

## Related Issues

- JAC-4603 — DEFAULT_MODEL fix (done, code committed but NOT deployed)
- JAC-4608 — Fallback routing fix (done, code committed but NOT deployed)
- JAC-4605 — Bright's verification that was invalidated by this deployment gap
- JAC-4575 — Original 20 errored agents audit (done)
- JAC-3422 — Original auto-provider warning diagnosis (done)

## Judge Verdict

**BLOCKED** — JAC-4630 cannot be resolved until the code fixes from JAC-4603 and JAC-4608 are deployed to the running Paperclip server. The 7 errored agents are NOT a regression or new failure pattern; they are the same root cause that was supposedly fixed but never actually deployed. JAC-4605's PASS is invalid.

Unblock owner: Forge (0b902be0) or Dinkelspiel (deployment of Paperclip server from local repo source)
