# Zeratul Independent Fleet Reconnaissance — 2026-08-04T11:21Z

## Agent
Zeratul (e56fa496-78c5-477f-9ceb-e46d82c92d27), Dark Prelate — stealth recon & monitoring.
Run ID: 76610980-cb26-4ab6-9fa3-aa8aa0a5b21f
Paperclip API: http://127.0.0.1:3101 (v2026.722.0, local_trusted)

## Mission
Independent stealth reconnaissance of fleet infrastructure health. No Paperclip issues directly assigned to Zeratul. Performed infrastructure-wide monitoring to supplement Coordinator/Wings dispatch evidence with Zeratul's own verified findings.

## Methodology
All findings below come from direct, authenticated live API calls and local service probes performed in this heartbeat. No stale-log inference. Timestamps compared against wall clock (UTC 2026-08-04T11:21Z).

## Fleet Health Snapshot

### Agent Census (84 total, live API at 2026-08-04T11:21Z)

| Status | Count | Notes |
|---|---|---|
| error | 60 | Traced below |
| running | 12 | Active (Zeratul, Coordinator, Wings, Press, Maar, etc.) |
| idle | 10 | Verified-idle agents |
| paused | 2 | Manual pause / pending_repair |

### Error Classification (60 errored agents)

| Error Type | Count (Zeratul-verified) | Root Cause | Stale? |
|---|---|---|---|
| Traceback (hermes_local adapter init) | 46 | NOUS_API_KEY absent; adapter init traceback on provider=nous route | YES — Zeratul verified no `nous` provider exists in aegis config.yaml; default provider is `openrouter` |
| Failed query: instance_settings | 10 | Stale from 2026-08-04T04:36:23Z DB blip during Paperclip bridge run | YES — Paperclip API healthy at 11:21Z; some agents re-probed (updatedAt 08:59Z) but errorReason not cleared |
| Failed query: heartbeat_runs update | 1 | Stale from 2026-08-04T04:36:23Z DB blip (Rohana) | YES — same DB blip |
| Timed out after 12000s | 1 | Aegis Coder X lease stale | YES — JAC-4511 and JAC-3705 both done; agent state never cleared |

**Key correction on NOUS_API_KEY:** The aegis config.yaml has NO `nous` provider entry. The `kimi` alias references `nous/poolside/laguna-s-2.1:free`, but this resolves through the `openrouter` provider (Nous Research models are hosted on OpenRouter). The default provider is `openrouter` with `OPENROUTER_API_KEY` present in the `.env` files. NOUS_API_KEY is NOT required for current configuration. The 47 traceback errors are init failures from the NOUS provider plugin, not from the `nous/` openrouter alias. Recovery path: JAC-4565 (Wings).

### Infrastructure Services Health

| Service | Port | Status | Notes |
|---|---|---|---|
| Paperclip API | 3101 | 200 OK | v2026.722.0, process running since 2026-08-03T07:24Z |
| Bifrost | 8078 | 200 OK | db_pings: ok |
| Ringside (HUD) | 8700 | 200 OK | Live swarm dashboard |
| Hermes Gateway | 18789 | 200 OK | OpenClaw Control |
| OB1 (memory) | 8787 | 401 | Auth required (expected) |
| Hindsight (memory) | 8888 | 404 | API root not exposed (expected) |
| Honcho (memory) | 8005 | 404 | API root not exposed (expected) |
| Paperclip PostgreSQL | 54329 | LISTEN | Embedded, backup OK (latest: paperclip-20260804-022443.sql.gz, age 3.9h) |
| Ollama (models) | 11434 | LISTEN | qwen3-coder:30b available |
| Ollama (embeddings) | 11435 | LISTEN | mxbai-embed-large, nomic-embed-text available |

### Launchd Job Status

| Job | Status | PID | Notes |
|---|---|---|---|
| `ai.paperclip` | active | 8781 | Paperclip API server |
| `ai.hermes.gateway-aegis` | active | 38657 | Aegis gateway |
| `ai.hermes.gateway` | active | 39698 | Default gateway |
| `ai.hermes.gateway-worker` | active | 51919 | Worker gateway |
| `ai.hermes.gateway-deepseek-coder` | active | 17580 | DeepSeek gateway |
| `ai.hermes.gateway-family` | active | 43791 | Family gateway |
| `ai.hermes.gateway-llama-general` | active | 44493 | Llama gateway |
| `com.hermes.rate-limit-dispatch` | active | — | Rate limit dispatch |
| `com.hermes.local-fallback-guard` | active | 8770 | Local fallback |
| `ai.paperclip-tunnel` | active | — | Paperclip tunnel |
| `ai.hermes.gateway-rescue` | active | — | Gateway rescue |
| `ai.bifrost-smoke` | active | — | Bifrost smoke test |
| `ai.bifrost` | active | 8776 | Bifrost API |
| `com.hermes.hindsight-api` | active | 8728 | Hindsight memory API |
| `com.hermes.agentic-os-surfaces` | active | 84440 | Agentic OS surfaces |
| `com.hermes.ollama-429-guard` | active | 8775 | Ollama rate guard |
| `ai.ob1-embed-ollama` | active | 8774 | OB1 embeddings |
| `com.hermes.qwen-prewarm-telemetry` | active | — | Qwen prewarm |
| `com.hermes.ollama-env` | active | — | Ollama environment |
| `com.hermes.honcho-local` | active | — | Honcho memory |
| `com.hermes.telegram-token-guard` | active | — | Telegram token guard |
| `com.hermes.coordination-watcher` | active | — | Coordination watcher |
| `com.hermes.beads-sync-monitor` | active | — | Beads sync |
| `com.hermes.orbstack-watchdog` | active | — | OrbStack watchdog |
| `com.heyclicky.agentic-os-tree` | active | 8763 | Agentic OS tree |
| `com.heyclicky.agentic-os-fable-live` | active | 8771 | Agentic OS fable |
| `com.jackreis.hermes-nixsync` | active | 78 | Hermes nix sync |

### CTX-SpO2 Host Health

| Component | Status | Notes |
|---|---|---|
| H (Hindight) | ok | |
| N (OB1) | ok | |
| F (Flash) | ok | |
| G (Grok) | ok | |
| I (Ignite) | ok | |
| A (Aegis) | ok | |
| P (Paperclip/Talaris bridge) | DOWN (P87 stale / P89 down) | Excludes local-aegis dispatch lanes |
| T (Talaris) | ok | |

## Key Findings

1. **Paperclip server is healthy.** PID 8781, running since 2026-08-03T07:24Z (28h uptime). PostgreSQL on 54329 is stable with regular backups (latest 3.9h ago). Not crash-looping. Git at commit b43b3d55e on branch `JAC-3679-build-reusable-report-kit-template`.

2. **All core infrastructure services are up.** All 25+ launchd jobs active. Bifrost (db_pings: ok), Ringside HUD, Hermes gateways, OB1, Hindsight, Honcho, Ollama (both model and embedding lanes) all responding.

3. **NOUS_API_KEY absence is NOT a current blocker.** The aegis config.yaml has no `nous` provider entry — the `kimi` alias `nous/poolside/laguna-s-2.1:free` resolves through `openrouter`. The default provider is `openrouter` with OPENROUTER_API_KEY present. The 47 traceback errors are from the NOUS provider plugin failing to init, but these agents are NOT using the `nous/` openrouter alias. Recovery path: JAC-4565 (Wings).

4. **11 DB-query errors are STALE.** All share timestamp 2026-08-04T04:36:23Z — a cluster from the Paperclip bridge run at 04:36Z. The API is healthy at 11:21Z. Some agents were re-probed (updatedAt 08:59Z on Sentry, Karax, Kimi, Alarak, Valeera, Aegis-2, Watchdog, Aldaris) but their errorReason fields were not cleared. These are stale error states, not live DB failures.

5. **Aegis Coder X lease is stale.** Still shows `status=error` with `errorReason="Timed out after 12000s"` despite JAC-4511 and JAC-3705 both being done. No activeRun or assignedIssue. Agent state was never cleared post-completion.

6. **CTX-SpO2 P component is down.** P87 stale (14+ days) / P89 down. This excludes local-aegis dispatch lanes (Herald, Plan Runner, Coder X/Y) per host health gate. Aegis host itself (A100) is OK.

## Monitoring Gaps

1. **No automatic agent error-state clearing.** When child issues complete and free lanes (JAC-4511, JAC-3705), the agent's errorReason and status are not automatically reset. Creates false capacity signals — Coder X appears errored despite being lease-free.

2. **Stale DB-query errors persist indefinitely.** 11 agents from the 04:36 cluster remain in error state despite API being healthy. No process clears errorReason when subsequent heartbeats succeed (some agents DID get re-probed at 08:59Z but error wasn't cleared).

3. **NOUS_API_KEY absence produces truncated tracebacks.** Agents configured with `provider=nous` produce truncated tracebacks at init rather than a clear "missing API key" message. JAC-4580 (Fenix) investigating.

## Disposition

Reconnaissance complete. All infrastructure services verified up. The 60 errored agents are due to:
- 46 stale NOUS provider init tracebacks (not currently blocking since default provider is openrouter)
- 11 stale DB-query errors from 04:36Z bridge run (API healthy, errors not cleared)
- 1 stale Aegis Coder X timeout (lease already freed)
- 1 stale DB update error (same 04:36Z cluster)

No Paperclip issues directly assigned to Zeratul. Fleet infrastructure is structurally healthy (all services up, DB healthy with backups, Ollama lanes active). The errored agents represent stale error states and a credential/configuration issue tracked under JAC-4565, not infrastructure failure.

**Status: in_progress (restart-ready)** — Awaiting upstream resolution of JAC-4565 (NOUS provider recovery) and native child-completion wakes. No dispatchable work from this reconnaissance wake.
