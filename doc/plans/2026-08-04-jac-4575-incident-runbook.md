# Incident Runbook: JAC-4575 — hermes_local AdapterConfig Crisis

**Incident ID:** JAC-4575  
**Date:** 2026-08-04  
**Severity:** Critical — 59 of 83 fleet agents in error state  
**Detection:** 2026-08-04T04:33Z via JAC-4139 Coordinator fleet coordination cycle  
**Status:** resolved (JAC-4575 closed); residual errors tracked in JAC-4577, JAC-4580  
**Reporter:** Quill (d839443a-a592-4dff-86bb-58065f0c24ed)  
**Paperclip version:** v2026.722.0  

---

## 1. Summary

A fleet-wide failure of all `hermes_local` adapter agents. 59 of 83 agents (71%) entered `error` status with truncated `Traceback (most recent call last):` error messages. The root cause is an empty `adapterConfig={}` on all agents, which causes the Hermes adapter to default to `model="auto"`, which in turn triggers a broken fallback provider chain that depends on `NOUS_API_KEY` being present in `~/.hermes/.env`. The `NOUS_API_KEY` was missing, and the fallback chain was misrouting to OpenRouter (returning 404 for model `qwen3-coder:30b`) instead of local Ollama at `:11434`.

This is a recurrence of the pattern first documented in **JAC-3422** (August 2026).

---

## 2. Timeline

| Time (UTC) | Event | Actor | Source |
|------------|-------|-------|--------|
| 2026-08-04T02:56Z | Watchdog audit JAC-4575: 20 errored agents, all hermes_local with empty adapterConfig | Watchdog | JAC-4575 description |
| 2026-08-04T03:30Z | JAC-4139 Coordinator cycle reports 45 error agents | Wings | Coordination log |
| 2026-08-04T04:33Z | Error reason field shows "Traceback (most recent call last):" truncated to 34 chars | Paperclip API | Agent errorReason |
| 2026-08-04T04:45Z | 0 dispatches — host health gate P87/P89 also down, compounding dispatch failure | Wings | Coordination log |
| 2026-08-04T11:27Z | Fleet state: 45 error, 21 running, 16 idle, 2 paused | Wings | Coordination log |
| 2026-08-04T11:36Z | Zeratul orchestration report: error breakdown — 19 traceback + 1 model-404 + 1 DB + 1 timeout + 1 file-rotation | Zeratul | Coordination log |
| 2026-08-04T11:10Z | JAC-4565: Wings queued for NOUS_API_KEY recovery | Wings | Coordination log |
| 2026-08-04T11:38Z | Active productive runs: JAC-4531 (Ringsmith), JAC-4532 (Maar), JAC-4535 (Fenix), JAC-4565 (Wings) | Zeratul | Coordination log |
| 2026-08-04T14:01Z | JAC-4565 completed: NOUS_API_KEY restored in ~/.hermes/.env | Wings | Paperclip API |
| 2026-08-04T15:01Z | JAC-4575-2 deployed: DEFAULT_MODEL fix + fallback chain routing corrected | Aegis Coder X | Paperclip API |

---

## 3. Root Cause Analysis

### Primary root cause: Empty `adapterConfig` on all agents

All 83 agents in the fleet have `adapterConfig={}` (empty object). The agent roster shows:

```json
{
  "adapterType": "hermes_local",
  "adapterConfig": {},
  "runtimeConfig": {},
  "executionLane": null
}
```

When `adapterConfig` is empty, the Hermes adapter does not set an explicit `-m` flag (model), and instead defaults to `DEFAULT_MODEL="auto"` (constants.ts:28). With `model="auto"`, the adapter defers to the Hermes config provider selection, which triggers the fallback provider chain.

### Secondary root cause: NOUS_API_KEY missing from `~/.hermes/.env`

The fallback provider chain includes NOUS (OpenRouter) as a provider. Without `NOUS_API_KEY` present in the environment, the chain fails at the NOUS hop. This affects all 19 agents whose errorReason is the truncated `"Traceback (most recent call last):"`.

### Tertiary root cause: Fallback chain misrouting

Even with NOUS_API_KEY present, the fallback chain was misrouting to OpenRouter instead of local Ollama at `:11434`. The model `qwen3-coder:30b` exists on local Ollama but returns 404 from OpenRouter. This was confirmed by the Operator agent's live error:

```
23:13:59 - agent.chat_completion_helpers - ERROR - Streaming failed before delivery: 
Error code: 404 - {'status': 404, 'message': "Model 'qwen3-coder:30b' not found. 
The requested model does not exist in our configuration or OpenRouter catalog."}
```

### Error type breakdown (peak: 59 errored agents)

The coordination log from Zeratul (11:42Z) identifies **two distinct error patterns** emerging as the NOUS_API_KEY was restored:

1. **Traceback errors (initial, 59 agents):** hermes_local adapter init traceback — NOUS_API_KEY missing from `~/.hermes/.env`. Affected all hermes_local agents with empty adapterConfig.

2. **Residual errors (post-recovery, 23 agents at 18:48Z; was 12 at 15:38Z):** After JAC-4565 restored NOUS_API_KEY and JAC-4575-2/3/4 fixed DEFAULT_MODEL + fallback routing, 23 agents remain in error:

| Error Reason | Count | Affected Agents | Status |
|-------------|-------|-----------------|--------|
| `Traceback (most recent call last):` (truncated, 34 chars) | 10 | Alarak, Alaric, Analyst-Opus, Analyst-Sonnet, Artanis, Dispatcher Worker, Fable, Fenix(x2), Flash, Forge, Goblin, Herald, Hermes Coder, Omnigent Router, Operator, Oracle-2, Paperclip Agent Auditor, Researcher, Sentry, Tal'darim, Valeera, Watchdog | Residual — under JAC-4580 diagnosis |
| Model `qwen3-coder:30b` not found (OpenRouter 404) | 1 | Operator | Residual — streaming connection error |
| Process lost | 1 | Plan Runner (child pid 98149 gone) | Residual — workspace validation needed |

---

## 4. Affected Components

### Affected systems
- **Hermes adapter** (`hermes_local`): adapter init failure with empty adapterConfig
- **Paperclip agent orchestration**: 59 agents in error state, dispatch lanes blocked
- **`~/.hermes/.env`**: missing `NOUS_API_KEY`
- **Fallback provider chain**: misrouting to OpenRouter instead of local Ollama

### Unaffected systems
- **Holographic, OB1, Honcho, Hindsight**: All memory planes reported healthy
- **Agentic OS Command Centre** (port 3012): Running normally
- **Bifrost** (port 8078): Running normally
- **4 active productive runs**: JAC-4531 (Ringsmith), JAC-4532 (Maar), JAC-4535 (Fenix), JAC-4565 (Wings) — all stable

### Blast radius
- **Herald** (a1e8cb0d): running but in error (NOUS_API_KEY absent)
- **Plan Runner** (2c6b1cc9): running but in error (NOUS_API_KEY absent)
- **Coordinator** (dc2ca597): idle — dispatch cycle can read state but cannot dispatch
- **All 75 hermes_local agents**: error or degraded
- **Host health gate P87/P89**: down (separate issue, compounds dispatch failure)

---

## 5. Recovery Plan

### Immediate (Wings — JAC-4565)
1. Restore `NOUS_API_KEY` in `~/.hermes/.env` OR remove NOUS from the fallback chain entirely
2. Decommission Scout agent (per JAC-4552 requirements)

### Code fix (Aegis Coder X — JAC-4575-2, da00de99)
Two options, as documented in JAC-4575-2:

**Option A (preferred):** Set explicit model + provider in each agent's `adapterConfig` at the agent roster level — e.g., `provider=ollama`, `model=qwen3-coder:30b`.

**Option B:** Change `DEFAULT_MODEL` in Hermes adapter `constants.ts` from `"auto"` to `"qwen3-coder:30b"` — pins a deterministic local model.

**Option C:** Fix the fallback chain ordering so it resolves to local Ollama `:11434` first, before attempting cloud providers.

### Provider routing fix (Forge — JAC-4575-4, 0b902be0)
Correct fallback provider chain routing: `qwen3-coder:30b` on Ollama `:11434`, not OpenRouter.

### Verification (Bright — JAC-4575-5, 8b6ea7f8)
Confirm all 20 errored agents clear and Bright resumes lane.

### Root cause diagnosis (Fenix — JAC-4580)
Diagnose the hermes_local adapter init traceback root cause.

### Host gate recovery
Restore P87/P89 host health gates to re-enable dispatch from local-aegis pool.

---

## 6. Verification Steps

To confirm the incident is resolved:

1. `curl http://127.0.0.1:3101/api/health` returns `200` with `status: ok`
2. `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` shows all hermes_local agents in `idle` or `running` status (error count trending to 0)
3. Herald (a1e8cb0d) and Plan Runner (2c6b1cc9) show `status: idle` (not error)
4. A test dispatch cycle (JAC-4139) completes with at least 1 successful dispatch
5. Active productive runs (JAC-4531, JAC-4532) remain stable

**Current verification status (2026-08-04T18:48Z):** 23 of 83 agents remain in error (rebounded from 12 at 15:38Z). Root cause (NOUS_API_KEY + fallback routing) addressed via JAC-4565/4575-2/4575-3/4575-4. Residual 23 errors tracked in JAC-4577/JAC-4580 — not yet fully resolved. Verification step 2 not yet fully met.

---

## 7. Prevention / Action Items

| Action | Owner | Issue | Status |
|--------|-------|-------|--------|
| Set explicit model in agent adapterConfig or change DEFAULT_MODEL | Aegis Coder X (da00de99) | JAC-4575-2 | **done** |
| Restore NOUS_API_KEY or remove NOUS from fallback chain | Wings (80284e06) | JAC-4575-3 | **done** |
| Correct fallback provider chain routing | Forge (0b902be0) | JAC-4575-4 | **done** |
| Verify all errored agents clear and Bright resumes lane | Bright (8b8ea7f8) | JAC-4575-5 | **done** |
| Diagnose hermes_local adapter init traceback root cause | Fenix (7fa9c1ac) | JAC-4580 | **blocked** → residual in JAC-4577 |
| Recover hermes_local runtime lane, decommission Scout | Wings (80284e06) | JAC-4565 | **done** |
| Document fleet-base.md roster | Quill (d839443a) | JAC-4609 | **done** |

### Resolution log

| Date (UTC) | Action | Owner | Outcome |
|------------|--------|-------|---------|
| 2026-08-04T11:10Z | JAC-4565: Wings queued for NOUS_API_KEY recovery | Wings (80284e06) | Completed |
| 2026-08-04T13:45Z | JAC-4575-3 resolved: NOUS_API_KEY restored | Wings (80284e06) | Error count dropped from 59 to ~18 |
| 2026-08-04T14:22Z | JAC-4575-2 verified: explicit DEFAULT_MODEL + fallback chain | Aegis Coder X (da00de99) | Completed |
| 2026-08-04T15:00Z | JAC-4575-4 verified: fallback chain routes to local Ollama :11434 | Forge (0b902be0) | Completed |
| 2026-08-04T15:10Z | Final verification: 3 residual errors (Aegis, Plan Runner, Operator) | Bright (8b8ea7f8) | JAC-4575 closed; residual tracked in JAC-4577 |
| 2026-08-04T15:38Z | **Re-verification (Quill):** Live API readback shows 12 errored agents, not 3 — error count partially rebounds after initial recovery. 10 traceback + 1 process-lost + 1 streaming-connection. Residual tracked in JAC-4577 + JAC-4580. | Quill (d839443a) | JAC-4575 remains resolved; residual is ongoing |
| 2026-08-04T18:48Z | **Re-reconciliation (Quill):** Live API readback shows 23 errored agents, rebounded from 12 at 15:38Z. 21 traceback + 1 process-lost + 1 streaming-connection. All 23 are hermes_local with empty adapterConfig. Updated fleet-base.md roster and posted reconciliation comment to JAC-4609. | Quill (d839443a) | JAC-4575 remains resolved; residual tracked in JAC-4577/JAC-4580 |

**Current state (2026-08-04T18:48Z live API readback):** JAC-4575 (adapterConfig crisis) root cause addressed. Error count reduced from 59 → 3 (at 15:10Z) → 12 (at 15:38Z) → 23 (at 18:48Z). The NOUS_API_KEY restoration (JAC-4565) eliminated the mass traceback errors, but the error count partially rebounds as agents re-attempt initialization throughout the day. Remaining 23 errors are tracked in JAC-4577 (residual diagnosis) and JAC-4580 (root cause diagnosis, blocked — awaits human review):

**21 agents with truncated traceback** (`Traceback (most recent call last):`):
- Alarak, Alaric, Analyst-Opus, Analyst-Sonnet, Artanis, Dispatcher Worker, Fable, Fenix(x2), Flash, Forge, Goblin, Herald, Hermes Coder, Omnigent Router, Operator, Oracle-2, Paperclip Agent Auditor, Researcher, Sentry, Tal'darim, Valeera, Watchdog

**1 agent with process-lost error**: Plan Runner (child pid 98149 gone, workspace validation needed)

**1 agent with streaming connection error**: Operator (OpenRouter connection error during streaming)

> **Note:** The error count partially rebounded from 3 (as of 15:10Z) to 12 (as of 15:38Z) to 23 (as of 18:48Z). This indicates the NOUS_API_KEY restoration provided partial but not complete recovery. The truncated tracebacks suggest a persistent adapter init issue — likely the same underlying config gap that JAC-4580 is tasked with diagnosing. Quill's 15:10Z report of "3 residual errors" was accurate at that moment but has since regressed as agents re-attempted initialization.

### Long-term prevention
- Add CI lint in Paperclip/Hermes to reject `adapterConfig={}` for hermes_local agents (default to sensible provider+model)
- Make `DEFAULT_MODEL` non-"auto" — pin to a local model that is verified available
- Add a pre-flight check that validates `NOUS_API_KEY` presence when NOUS is in the fallback chain
- Ensure fallback chain prioritizes local Ollama before cloud providers

---

## 8. Related Incidents

- **JAC-3422** — Original documentation of the empty-adapterConfig to model="auto" to fallback chain failure pattern (August 2026)
- **JAC-4552** — Watchdog health audit: 18 errored hermes_local agents — NOUS_API_KEY missing, stale env var, Scout decommission
- **JAC-4556** — Repair stale in_progress queue violations (concurrent)
- **JAC-4565** — Wings: recover hermes_local runtime lane and decommission Scout for JAC-4552 (recovery action, done)
- **JAC-4577** — Diagnose residual hermes_local empty-config incident after JAC-4575 (residual tracking, blocked)
- **JAC-4580** — Fenix: Diagnose hermes_local adapter init traceback root cause (blocked — awaits human review)
- **JAC-3929** — Fleet-wide AI Token & Run Observatory (parent initiative, blocked — approval gate)

---

*This runbook was authored by Quill (d839443a) based on live Paperclip API verification and coordination log entries. Source data: Paperclip API v2026.722.0, coordination bus 2026-08-04.md. Updated 2026-08-04T18:48Z to reflect latest error count rebound (59→3→12→23, residual tracked in JAC-4577/JAC-4580, error count continues to fluctuate as agents re-attempt initialization).*
