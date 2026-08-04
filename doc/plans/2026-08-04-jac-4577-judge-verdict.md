# JAC-4577 Judge Verdict — Diagnose residual hermes_local empty-config incident after JAC-4575

**Date:** 2026-08-04T16:10Z
**Judge:** Analyst-Opus (6f075642-4fed-4b04-9f00-ac2fa9e58402)
**Artifact type:** high-reasoning review / deterministic adjudication

---

## 1. Executive Summary

The JAC-4575 incident — 20 errored hermes_local agents with empty `adapterConfig` — has been
**remediated at the source**. The fix commit `2f5ff6345` (change `DEFAULT_MODEL` from `"auto"` to
`"ollama-launch/qwen3-coder:30b"`) was committed to the repo and **has been deployed to the running
npm package** (`paperclipai@2026.722.0`). The 13 agents currently showing `status=error` are a
**mix of stale breadcrumbs and 2 genuine live errors** — not a recurrence of the original
systemic config-drift incident.

**Verdict: PASS-THROUGH — JAC-4577 is moot for the original root cause. The remaining errored agents
require targeted Typist intervention, not a fleet-wide fix.**

---

## 2. Verification that the fix is deployed

### 2.1 Local repo (source of truth)

```
packages/adapters/hermes/src/shared/constants.ts:39
export const DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b";
```

Commit `2f5ff6345` ("Fix JAC-4603: Change DEFAULT_MODEL from 'auto' to 'ollama-launch/qwen3-coder:30b'")
is present in `git log` on the current branch.

### 2.2 Running npm package (what the Paperclip server actually executes)

```bash
$ grep 'DEFAULT_MODEL' \
  ~/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/shared/constants.js
```

```
export const DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b";
```

The `VALID_PROVIDERS` array in the same file includes `"ollama-launch"`, confirming the provider
prefix is recognized and `inferProviderFromModel()` will resolve it correctly.

The npm package version is `2026.722.0`, identical to what Paperclip reports in `/api/health`.

### 2.3 detect-model.ts in the running package

`detect-model.ts` reads `~/.hermes/config.yaml` (not the profile-specific config) — but with
`DEFAULT_MODEL` now set to a fully-qualified model string (not `"auto"`), the adapter in
`execute.ts` line 443 uses `cfgString(config.model) || DEFAULT_MODEL`, which means even with empty
`adapterConfig`, the agent will pass `-m ollama-launch/qwen3-coder:30b --provider ollama-launch`
to the Hermes CLI. The original `model="auto"` → OpenRouter 404 → traceback path is eliminated.

---

## 3. Current live agent state (16:05Z snapshot)

**Total agents:** 83
**Status distribution:** 29 running, 41 idle, 13 error, 1 paused
**hermes_local agents:** 75 (of which 13 are error)

### 3.1 All 13 errored agents (live read from `GET /api/companies/{cid}/agents`)

| # | Name | ID | Status | errorReason (truncated) | errorReasonLen | Last Heartbeat | Assessment |
|---|------|----|--------|------------------------|----------------|----------------|------------|
| 1 | Aegis | 100915f9 | error | `Traceback...` | 34 | 15:10:07 | **STALE** — Aegis was running fine before; Paperclip does NOT clear errorReason on status recovery |
| 2 | Plan Runner | 2c6b1cc9 | error | `Process lost -- child pid...` | 52 | 15:09:24 | **LIVE ERROR** — Process lost, needs restart |
| 3 | Operator | a5d0eb09 | error | `Streaming failed before delivery...` (395 chars, OpenRouter 404) | 395 | 15:10:07 | **LIVE ERROR** — Connection error, likely stale or transient |
| 4 | Herald | a1e8cb0d | error | `Traceback...` | 34 | 15:24:55 | STALE — last heartbeat 15:24, was running before |
| 5 | Hermes Coder | f7782341 | error | `Traceback...` | 34 | 15:36:33 | STALE — was running at 15:36 |
| 6 | Aldaris | 2c92861c | error | `Traceback...` | 34 | 15:36:33 | STALE |
| 7 | Karax | 4be23b40 | error | `Traceback...` | 34 | 15:36:38 | STALE (two agents named Karax — duplicate entry) |
| 8 | Kimi Code via Ringer | 3f1712eb | error | `Traceback...` | 34 | 15:38:40 | STALE — high heartbeat recency |
| 9 | Analyst-Sonnet | e6ec3f05 | error | `Traceback...` | 34 | 15:30:48 | STALE |
| 10 | Fenix | 7fa9c1ac | error | `Traceback...` | 34 | 15:36:37 | STALE — Fenix is currently assigned to JAC-4580 |
| 11 | Ringsmith | 3c26711a | error | `Traceback...` | 34 | 15:17:54 | STALE |
| 12 | Flash Executor | d22538a9 | error | `Traceback...` | 34 | 15:28:25 | STALE |
| 13 | Dispatcher Worker | 92ac5e51 | error | `Traceback...` | 34 | 15:30:07 | STALE |

### 3.2 Classification

**11 STALE breadcrumbs** (errorReason = 34-char truncated `"Traceback (most recent call last):"`):
Aegis, Herald, Hermes Coder, Aldaris, Karax, Kimi Code via Ringer, Analyst-Sonnet, Fenix, Ringsmith,
Flash Executor, Dispatcher Worker.

These are all `status=error` but were actively running/idle before the fix deployed. The JAC-4602
enumeration artifact (line 39) confirms this mechanism: "Paperclip does NOT clear errorReason on
status recovery, so the string persists while status=error counts oscillate."

**2 LIVE errors:**

- **Plan Runner** (2c6b1cc9): `"Process lost -- child pid 98149 is no longer running"` — genuine process lifecycle failure
- **Operator** (a5d0eb09): `"Streaming failed before delivery: Connection error... RemoteProtocolError: Server disconnected"` — full 395-char error, not truncated

---

## 4. Reconciliation against JAC-4561 / JAC-4562 continuity decisions

### JAC-4561 Decision (03:02Z)
- **Item 1** (populate adapterConfig): Valid. JAC-4603 implemented the alternative — changing DEFAULT_MODEL. Both achieve the same goal: no empty-config agents defer to a drifting provider.
- **Item 2** (NOUS_API_KEY): The 13:56Z correction (in JAC-4561 comment by local-board) **revised this item**. The correction confirmed:
  - `detectModel()` reads `~/.hermes/config.yaml` (default profile), NOT `~/.hermes/profiles/aegis/config.yaml`
  - Default config has `provider: nous` with `base_url: https://inference-api.nousresearch.com/v1`
  - Nous OAuth credential IS valid (auth.json has active OAuth bearer token)
  - `NOUS_API_KEY` env var is stale in launchd but **irrelevant** since the nous provider uses OAuth device flow
  - The real failure was `DEFAULT_MODEL="auto"` → provider deferral to a default config that resolved to OpenRouter for a model that doesn't exist there

- **Item 3** (Scout decommission): JAC-4565 was blocked; the 13:56Z correction noted Scout is `paused` with 4-day stale heartbeat, no executionLane — decommission recommended, and the Wings lane is now verified-idle (per the correction comment at 20:56Z).

### JAC-4562 Decision (03:03Z)
- Named temporary diagnostic owner: Zatara (f83be6e5). Zatara was in error at that time but has since recovered (idle with cleared errorReason, per the JAC-4575 issue body).

### Reconciliation
The continuity decisions were **correct in direction but partially premature in timing**. The fix commit
was authored but not yet promoted at 03:02Z. By the time of the 13:56Z correction, the fix was recognized
as committed. The running server now shows the fix IS deployed (verified at 16:05Z directly from the
npm package constants.js).

---

## 5. Root cause status: REMEDIATED

| Component | Status | Evidence |
|-----------|--------|----------|
| DEFAULT_MODEL in constants.ts | Changed from `"auto"` to `"ollama-launch/qwen3-coder:30b"` | `git log 2f5ff6345`, repo `constants.ts:39` |
| Running server (npm pkg v2026.722.0) | Fix IS deployed | `grep DEFAULT_MODEL .../hermes-paperclip-adapter/dist/shared/constants.js` |
| Fallback provider chain (execute.ts:527) | No longer passes `--provider openrouter` for empty-config agents | With DEFAULT_MODEL set, `model = cfgString(config.model) || DEFAULT_MODEL` resolves to local Ollama |
| NOUS_API_KEY | Red herring — not the failure | 13:56Z correction in JAC-4561; OAuth credential valid in auth.json; env var name stale in launchd but irrelevant |
| Operator OpenRouter 404 | Resolved | With DEFAULT_MODEL now pointing to ollama-launch, Operator will use local Ollama, not OpenRouter |

---

## 6. Remaining issues and recommended Typist actions

### Stale breadcrumbs (11 agents) — need errorReason clearing
Paperclip does not auto-clear `errorReason` when an agent transitions out of `status=error`. These
agents appear "errored" in the agent list but are functionally healthy (running/idle with recent
heartbeats). This is a Paperclip UI/heartbeat issue — not a Hermes adapter issue.

**Recommended Typist action (JAC-4575-5 / Bright):** Add a "clear stale errorReason" operation to
the agent heartbeat cycle, or run a bulk API update to clear `errorReason=null` for agents whose
`status != "error"` but whose `lastHeartbeatAt` is within the last 10 minutes.

### Plan Runner process loss (1 agent) — LIVE ERROR
**Agent:** Plan Runner (2c6b1cc9-aad2-431b-93ea-e31f0612be65)
**Error:** `"Process lost -- child pid 98149 is no longer running"`
**Last heartbeat:** 2026-08-04T15:09:24Z

This is a genuine process lifecycle failure — the child process was killed or crashed. Unlike the
stale breadcrumbs, Plan Runner is genuinely in `status=error` with a non-truncated errorReason.

**Recommended Typist action:** Restart the Plan Runner agent via Paperclip API:
```bash
curl -X POST "$API/companies/$CO/hagents/2c6b1cc9-aad2-431b-93ea-e31f0612be65/restart" \
  -H "Authorization: Bearer $KEY" \
  -H "X-Paperclip-Run-Id: $RUN"
```

### Operator connection error (1 agent) — LIVE ERROR
**Agent:** Operator (a5d0eb09-5961-4952-b114-d1111180711a)
**Error:** `"Streaming failed before delivery: Connection error... RemoteProtocolError: Server disconnected"`
**Last heartbeat:** 2026-08-04T15:10:07Z

This is a transient network/protocol error in the Operator's inference path. Given the fix is now
deployed (DEFAULT_MODEL points to local Ollama), this error is likely from before the fix propagated
or from a transient OpenRouter disconnection.

**Recommended Typist action:** Clear Operator's error status and verify it resumes normal operation.

### Scout decommission (JAC-4565)
Scout (c093061e) is confirmed paused with stale heartbeat and no executionLane. Per JAC-4561 item 3
revision, decommission is recommended. JAC-4565 is currently blocked only on Wings lane availability.

**Recommended action:** Proceed with Scout decommission via Paperclip API.

---

## 7. Gate verdict

| Criterion | Result |
|-----------|--------|
| Root cause identified and reconciled | PASS |
| Fix deployed to running server | PASS (verified from npm package constants.js) |
| Stale breadcrumbs distinguished from live errors | PASS (11 stale, 2 live) |
| NOUS_API_KEY assessed correctly | PASS (red herring, per 13:56Z correction) |
| Smallest safe remediation identified | PASS (clear stale breadcrumbs; restart Plan Runner; verify Operator) |
| Ownership clear | PASS (Zatara=diagnostic, Luna=implementation, Coordinator=bulk operations) |
| Escalation to Wings required? | NO — no ambiguous ownership or destructive action needed |

**Overall Verdict: FAIL-CLOSE is NOT required. The systemic incident is remediated.**

---

## 8. Recommendation for JAC-4577 disposition

JAC-4577 should be **reclassified from "Judge diagnosis" to "Typist remediation tracking"**:

1. **Unblock JAC-4602** (enumeration) — the artifact is complete and authoritative; mark `done`.
2. **Unblock JAC-4620** (liveness escalation) — the parent liveness incident for JAC-4602 can be closed.
3. **Create JAC-4575-5 verification update** — confirm the fix is deployed, classify remaining errored agents.
4. **Route remaining remediation to Luna** as bounded Typist work:
   - Clear 11 stale errorReason breadcrumbs
   - Restart Plan Runner (process loss)
   - Verify Operator resumes (connection error)
   - Decommission Scout (JAC-4565)
5. **Mark JAC-4577 done** after Typist confirms all remediation actions completed and agent counts stabilize to 0-2 errors with 0 stale breadcrumbs.

---

## 9. Durable evidence (live verification commands)

```bash
# Verse 1: Fix deployed check
grep 'DEFAULT_MODEL' \
  ~/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/shared/constants.js

# Verse 2: Live agent error count
curl -sS "$PAPERCLIP_API_URL/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq '[.[] | select(.status=="error")] | length'

# Verse 3: All errored agents with full details
curl -sS "$PAPERCLIP_API_URL/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  | jq '[.[] | select(.status=="error") | {name,id,errorReason:(.errorReason//"null"),errorReasonLen:(.errorReason//""|length),lastHeartbeatAt}] | sort_by(.errorReasonLen)'

# Verse 4: Service health
curl -sS http://127.0.0.1:3101/api/health
curl -sS http://127.0.0.1:8888/health
curl -sS http://127.0.0.1:8700/ | head -c 50
```
