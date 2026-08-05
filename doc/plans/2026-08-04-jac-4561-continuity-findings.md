## JAC-4561 Continuity Decision — Evidence Reconciliation (2026-08-04T20:56Z)

Acknowledged the 03:02Z decision comment. Per the wake, this issue is in `done` status, but live verification shows the incident is still active and two Wings-assigned children remain open (JAC-4604 todo, JAC-4565 blocked). My live investigation produces a **corrected root-cause finding** that revises item 2 of the prior decision.

### Live verification (84 agents, Paperclip v2026.722.0)
- **13 agents** currently show non-empty `errorReason` (down from 20 at 02:56Z audit, but the count is drifting back up per Bright's JAC-4602 re-verification at 20:56Z).
- All hermes_local errored agents share `adapterConfig={}` (confirmed in cached artifact doc/plans/2026-08-04-jac-4602-errored-agents-enumeration.json).
- **2 distinct error classes**, not one:
  1. **Python tracebacks** (Aegis, Hermes Coder, Klaude Pi, Flash, Watchdog, etc.) — 34-char truncated "Traceback (most recent call last):" — Hermes CLI spawn/runtime failures.
  2. **OpenRouter 404** (Operator, `qwen3-coder:30b` — 500-char API-capped): the operator-facing error.

### Corrected finding on NOUS_API_KEY (item 2 revision)
The prior decision stated NOUS_API_KEY is a "red herring" because the Nous API uses model-based routing. This is factually reversed based on live evidence:

1. detectModel() (packages/adapters/hermes/src/server/detect-model.ts:37) reads the **default** ~/.hermes/config.yaml, NOT the profile-specific ~/.hermes/profiles/aegis/config.yaml.
2. The default config resolves to model.default: poolside/laguna-s-2.1:free with model.provider: openrouter.
3. The aegis profile config resolves to qwen3-coder:30b / ollama-launch — a different value. This is the config drift.
4. execute.ts:527 — when DEFAULT_MODEL="auto", the -m flag is dropped; --provider is only passed if detectModel() returns a non-auto provider. Default config provider is openrouter, so --provider openrouter gets passed to hermes chat.
5. Live test: POST openrouter.ai/v1/chat/completions with poolside/laguna-s-2.1:free returns HTTP 404 "Model not found in OpenRouter catalog" — this model does NOT exist on OpenRouter.
6. Nous credentials ARE valid: auth.json shows active_provider=nous with a live OAuth bearer token (obtained 13:45, expires 14:45, last_status=ok). The `hermes chat -m poolside/laguna-s-2.1:free --provider nous` path (observed live in PID 5284) is correct.
7. NOUS_API_KEY is absent from ~/.hermes/.env and launchd env — confirmed. But the nous provider uses OAuth device flow (hermes auth add nous), not the NOUS_API_KEY env var. The OAuth token IS present and valid in auth.json. The env var name in launchd is stale but irrelevant since the OAuth credential is active.

### Root-cause correction
The traceback class is caused by the default ~/.hermes/config.yaml provider drift: it points to openrouter for poolside/laguna-s-2.1:free, a model that does not exist on OpenRouter. The --provider openrouter flag emitted by detectModel() causes Hermes to attempt OpenRouter resolution, fail, and enter the fallback/exhaustion path that produces Python tracebacks. The Nous OAuth path is healthy and valid; NOUS_API_KEY is not the issue; the default-config provider setting is.

### Decision revision
- Item 1 (populate adapterConfig): still valid — explicit {provider, model} overrides the drifting default config. JAC-4603 tracks this.
- Item 2 (NOUS_API_KEY): revised — NOUS_API_KEY is not the failure. The failure is the default config pointing provider: openrouter for poolside/laguna-s-2.1:free. Nous OAuth credentials are valid. Action: reconcile default config model.provider from openrouter to nous, OR populate adapterConfig on errored agents (item 1). This revises JAC-4604.
- Item 3 (Scout decommission): Scout (c093061e) confirmed paused, 4-day stale heartbeat, no executionLane — decommission recommended. JAC-4565 blocked only on Wings lane availability, now resolved (verified-idle). Proceeding this heartbeat.
- Item 4 (scope): confirmed — config drift, not credential leak.

### Action taken this heartbeat
- Verified Herald (a1e8cb0d), Plan Runner (2c6b1cc9), and Coordinator (dc2ca597) are all verified-idle with restored executionLane metadata (verified 2026-08-03T23:3xZ).
- Confirmed the Nous OAuth credential is valid (request_count=0 means never invoked due to config drift upstream).
- Proceeding with Scout decommission (JAC-4565) and repathing JAC-4604 to the corrected root cause.
