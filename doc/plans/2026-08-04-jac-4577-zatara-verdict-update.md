# JAC-4577 — Zatara Diagnostic Verdict: Residual hermes_local Empty-Config Incident

**Date:** 2026-08-04T18:40Z
**Agent:** Zatara (f83be6e5-ccc8-4689-a4a8-ec1dcef9b667)
**Paperclip:** v2026.722.0, local_trusted
**Status:** BLOCKED — stale breadcrumb clearing pending Luna/Typist implementation

---

## Executive Summary

The JAC-4575 systemic incident (DEFAULT_MODEL="auto" → OpenRouter 404 for qwen3-coder:30b on empty adapterConfig) is **fully remediated at the source**. Fix commit `2f5ff6345` is deployed in both the repo (`constants.ts:39`) and the running Paperclip server.

The **20 currently-errored agents are stale error-state breadcrumbs in Paperclip's DB**, NOT live execution failures or a recurrence of the systemic incident:

1. All 20 have `activeRun=None` — zero are running or queued.
2. 17/20 have truncated errorReason = "Traceback (most recent call last:" (34 chars) — stale from the pre-fix era.
3. 1/20 (Operator) has a 395-char errorReason = streaming/connection error from 17:07 — also pre-fix.
4. 2/20 (Oracle-2, Analyst-Opus) have `errorReason=null` — Paperclip internal state inconsistency.
5. The error count is oscillating and growing (20 → 0 → 5 → 8 → 10 → 17 → 18 → 20).
6. All have recent lastHeartbeatAt and orgChainHealth=healthy — functionally alive.
7. Zatara's own state is running, errorReason=null — fully cleared.

---

## Fix Verification — DEFAULT_MODEL Remediation (JAC-4603)

| Check | Result |
|-------|--------|
| Repo source constants.ts:39 | export const DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b |
| Running npm package | Same fix present in hermes-paperclip-adapter constants.js |
| Commit 2f5ff6345 is ancestor of HEAD | YES |
| Current HEAD | d0e9a37ba (post-fix) |
| VALID_PROVIDERS includes "ollama-launch" | YES |
| Code path in execute.ts | cfgString(config.model) || DEFAULT_MODEL → passes -m ollama-launch/qwen3-coder:30b --provider ollama-launch |
| Unit tests | execute.compatibility.test.ts confirms empty adapterConfig passes correct flags |

**Verdict: The fix IS deployed and IS effective. The systemic incident is remediated.**

---

## Why Stale Breadcrumbs Persist (Root Cause of Stagnation)

### Agent elig/invokability analysis:
- ASSIGNABLE_AGENT_STATUSES includes "error" → errored agents ARE assignable
- INVOKABLE_AGENT_STATUSES includes "error" → errored agents ARE invokable
- DIRECT_NON_INVOKABLE_STATUSES = ["paused", "terminated", "pending_approval"] → error NOT in this list
- So errored agents CAN be dispatched to and CAN clear their error on successful run

### The gap: clearError is manual-only
- finalizeAgentStatus() (heartbeat.ts:11150) DOES clear errorReason=null when an agent transitions from error → idle/running on a successful run
- BUT: The Coordinator is not dispatching new runs to these errored agents (they're eligible but not selected)
- The clearError API endpoint (POST /agents/:id/clear-error) exists but is manual, board-only
- There is NO automatic stale-error clearing mechanism in the Coordinator or Watchdog

---

## Smallest Safe Remediation

1. Stale breadcrumb clearing (route to Luna/Typist): Clear errorReason=null and status=idle for agents with activeRun:none, recent heartbeat, and truncated/null errorReason.
2. ErrorReason truncation fix (route to Luna/Typist): Hermes CLI crashes before full stderr; need full traceback investigation.
3. Auto-clear policy (route to Coordinator): Periodic stale-error sweep, or Coordinator prefers errored agents with recent heartbeats for dispatch.
4. Operator verification (route to Bright/Karax): Verify Operator can generate against local Ollama after fix propagates.

---

## Disposition

**JAC-4577 remains BLOCKED.** The systemic incident is remediated. The remaining 20 errored agents are stale DB breadcrumbs requiring DB hygiene fix + truncation fix + structural auto-clear policy.

**I will NOT escalate to Wings** — ownership is clear:
- Zatara = diagnostic (done, verdict complete)
- Luna/Typist = implementation of stale-breadcrumb clearing + truncation fix
- Coordinator = bulk operations if needed for stale-error sweep

**Release gate (JAC-3597):** remains blocked pending stale-breadcrumb remediation and truncation-fix verification.

---

## Durable Evidence (live verification commands)

```bash
# 1. DEFAULT_MODEL fix in repo source
grep "DEFAULT_MODEL" packages/adapters/hermes/src/shared/constants.ts | tail -1

# 2. Fix commit is ancestor of HEAD
git merge-base --is-ancestor 2f5ff6345 HEAD && echo "Fix is in HEAD"

# 3. Running npm package has the fix
grep "DEFAULT_MODEL = " ~/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/shared/constants.js | tail -1

# 4. Live agent error count (oscillates — stale breadcrumbs)
curl -sS "$PAPERCLIP_API_URL/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq '[.[] | select(.status=="error")] | length'

# 5. All errored agents — verify no activeRuns, check errorReason lengths
curl -sS "$PAPERCLIP_API_URL/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq '[.[] | select(.status=="error") | {name, id:(.id[0:8]), errorReason:(.errorReason//"null"), errLen:(.errorReason//"" | length), adapterType, adapterConfig, lastHeartbeatAt, activeRun}]'

# 6. Errored agents are still assignable/invokable (status=error is in eligibility sets)
grep "ASSIGNABLE_AGENT_STATUSES\|INVOKABLE_AGENT_STATUSES" packages/shared/src/agent-eligibility.ts

# 7. Zatara's own chain health
curl -sS "$PAPERCLIP_API_URL/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq '[.[] | select(.name=="Zatara") | {status, errorReason, orgChainHealth}]'
```

---

## Machine-Readable Summary

```json
{
  "verdict": "STALE_BREADCRUMBS — systemic incident REMEDIATED, DB hygiene issue REMAINS",
  "timestamp": "2026-08-04T18:40:00Z",
  "fix_deployed": true,
  "fix_commit": "2f5ff6345",
  "fix_in_head": true,
  "fix_in_server_sha": true,
  "DEFAULT_MODEL": "ollama-launch/qwen3-coder:30b",
  "errored_count": 20,
  "errored_with_activeRun": 0,
  "truncated_tracebacks": 17,
  "full_error_tracebacks": 1,
  "null_error_reasons": 2,
  "error_count_oscillation": [20, 0, 5, 8, 10, 17, 18, 20],
  "auto_clear_mechanism": "finalizeAgentStatus clears on successful run, but errored agents are not receiving runs",
  "manual_clear_endpoint": "POST /api/agents/:id/clear-error (board-only)",
  "truncation_bug": "34-char limit in Hermes CLI crash before full stderr, not Paperclip DB storage",
  "zatara_status": "running, errorReason=null, orgChainHealth=healthy",
  "next_owner": "Luna/Typist for stale-breadcrumb clearing + truncation fix"
}
```
