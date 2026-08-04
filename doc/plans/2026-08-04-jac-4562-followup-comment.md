## JAC-4562 Follow-up (2026-08-04T16:50Z) — Live verification corrections

**Scout decommission — ALREADY COMPLETED:**
Scout (c093061e) is not present in the agent fleet. `GET /api/agents/c093061e` returns 404. The decommission was already executed prior to this heartbeat.

**Diagnostic owner — CORRECTION to original decision:**
The original decision designated Hermes (100915f9) as diagnostic owner, claiming it is "unaffected by the adapterConfig issue since it is the service itself, not a consumer of the adapter." **Live verification contradicts this:**

- Agent 100915f9 is named "Aegis" in the Paperclip agent table, has `adapterType: hermes_local`, `status: error`, `errorReason: "Traceback (most recent call last):"`, and `adapterConfig: {}` — the **exact same root cause** as all 27 currently-errored agents.
- It is NOT a dispatchable service process; it is a hermes_local adapter agent registered in the same agent table as all other errored agents.

**Corrected diagnostic owner:** Zatara (f83be6e5) has recovered to `status: running` (was in error at wake time). While it still carries empty adapterConfig (same crash risk), it is currently NOT in error and is the operational diagnostic owner.

**Live fleet state (fresh at 16:50Z):**
- Total agents: 83 | status=error: 27 (down from 32 at wake time)
- All 27 errored agents: hermes_local, adapterConfig={}, same truncated traceback
- Operator: running (recovered) | Watchdog: running (recovered) | Zatara: running (recovered)
- 18 agents now running/idle successfully (up from fewer at wake time)

**Root cause (confirmed, undeployed):** All 83 hermes_local agents have adapterConfig={}. Running npm server (v2026.722.0) resolves model="auto" → OpenRouter Ollama-cloud fallback → qwen3-coder:30b 404 → crash.

**Fix chain (tracked upstream):** JAC-4603 (done, not deployed) / JAC-4604 (todo) / JAC-4605 (in_progress).

**Action taken:** Corrected decision commented back onto JAC-4557. The underlying incident remains tracked in JAC-4601 epic. This issue is closed with the correction documented.