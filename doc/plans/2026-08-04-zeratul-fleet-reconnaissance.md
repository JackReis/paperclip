# Zeratul Fleet Reconnaissance — 2026-08-04T12:00Z

## Agent
Zeratul (8b8640e8-cbd8-42e4-a9ec-b5bb3e9ec397), Dark Prelate — stealth recon & monitoring, reports to Coordinator (dc2ca597).

## Recon Mission
Independent stealth reconnaissance of fleet infrastructure health during JAC-4139 dispatch cycle. No issues directly assigned. Performed infrastructure-wide monitoring to supplement Coordinator/Wings dispatch evidence.

## Fleet Health Snapshot

### Agent Census (84 total, live API at 2026-08-04T11:55Z)
- error: 59
- running: 13
- idle: 10
- paused: 2
- Provider config: all 84 agents show `adapterConfig={}` (empty) — provider resolves from executionLane metadata at runtime

### Error Classification (59 errored agents)
| Error Type | Count | Root Cause |
|---|---|---|
| Truncated Traceback | 47 | hermes_local adapter init failure — NOUS_API_KEY absent from `~/.hermes/.env` and `~/.hermes/profiles/aegis/.env`. Providers `nous` in lane metadata fail at init. Recovery path: JAC-4565. |
| DB query error (instance_settings) | 11 | Stale error from 2026-08-04T04:36:23Z cluster of heartbeat failures. All affected agents (Flash, Sentry, Karax, Kimi Code via Ringer, Compass, Alarak, Valeera, Aegis-2, Watchdog, Aldaris, Rohana) share identical timestamp. Paperclip API confirmed healthy at 11:55Z — these are stale error states, not live failures. |
| Timeout (12000s) | 1 | Aegis Coder X (opencode_local) — lease was freed (JAC-4511 + JAC-3705 both done) but state not cleared. |

### Infrastructure Services Health
| Service | Port | Status | Notes |
|---|---|---|---|
| Paperclip API | 3101 | 200 OK | v2026.722.0, process up since 2026-08-03T07:24Z |
| Bifrost | 8078 | 200 OK | db_pings: ok |
| Ringside (HUD) | 8700 | 200 OK | Live swarm dashboard |
| Hermes Gateway | 18789 | 200 OK | Active |
| OB1 (memory) | 8787 | 401 | Auth required (expected) |
| Hindsight (memory) | 8888 | 404 | API root not exposed (expected for API service) |
| Honcho (memory) | 8005 | 404 | API root not exposed (expected for API service) |
| Paperclip PostgreSQL | 54329 | LISTEN | Embedded, backup OK (last backup 2.3h ago) |
| Ollama (models) | 11434 | LISTEN | qwen3-coder:30b available |
| Ollama (embeddings) | 11435 | LISTEN | Dedicated embedding lane |

### Launchd Job Status
- `ai.paperclip-tunnel` — active (0, meaning running)
- `com.hermes.rate-limit-dispatch` — active
- `com.hermes.local-fallback-guard` — active
- `ai.hermes.gateway-aegis` — active (PID 38657)
- `com.hermes.hindsight-api` — active
- `ai.bifrost-smoke` — active
- `ai.hermes.gateway-rescue` — active
- `com.hermes.agentic-os-surfaces` — active

### CTX-SpO2 Host Health
- P component: DOWN (P87 stale 14+ days, P89 down)
- All other components: OK (H100, N100, F100, G100, I100, A100, T100)
- Impact: local-aegis pool (2 lanes) excluded from dispatch per host health gate

## Key Findings

1. **NOUS_API_KEY is the primary blocker.** Confirmed absent from all three env files:
   - `/Users/hermes/.hermes/.env` — MISSING
   - `/Users/hermes/.hermes/profiles/aegis/.env` — MISSING
   - `/Users/hermes/.paperclip/instances/default/.env` — MISSING
   
   The aegis config.yaml default provider is `openrouter` (with OPENROUTER_API_KEY present), but 47 hermes_local agents have `provider=nous` in their executionLane metadata. These agents cannot initialize without NOUS_API_KEY. Recovery assigned to JAC-4565 (Wings).

2. **11 DB-query errors are STALE.** All share timestamp 2026-08-04T04:36:23Z — a cluster from when the Paperclip server was briefly unavailable during the 04:36:00 bridge run. The Paperclip API is healthy at 11:55Z and these agents' errorReason fields have not been cleared because they require an agent re-probe. No live DB failure is occurring.

3. **Paperclip server process is healthy.** PID 8781, running since Mon 02AM, 131 minutes CPU time. Not crash-looping. PostgreSQL on 54329 is stable with regular backups.

4. **No infrastructure process gaps detected.** All launchd jobs for Paperclip, Hermes gateways, Bifrost, Hindsight, and OB1 are active. The watchdog process (`com.hermes.rate-limit-dispatch`) is running.

5. **Aegis Coder X lease is stale.** Both JAC-4511 (MLX embed promotion) and JAC-3705 (canary preconditions) are marked done, but Coder X still shows `status=error` with `errorReason="Timed out after 12000s"` despite having no activeRun or assignedIssue. The agent state was never cleared post-completion.

## Monitoring Gaps

1. **No automatic agent error-state clearing.** When a child issue completes and frees a lane (JAC-4511, JAC-3705), the agent's errorReason and status are not automatically reset. This creates false capacity signals — Coder X appears errored despite being lease-free. A monitoring rule should clear stale error states on agents with no activeRun after issue completion.

2. **Stale DB-query errors persist indefinitely.** 11 agents from the 04:36 cluster remain in error state despite the API being healthy. No monitoring process clears errorReason when subsequent heartbeats succeed.

3. **NOUS_API_KEY absence is not detected at config time.** Agents are configured with `provider=nous` in their executionLane metadata, but the env validation at agent init doesn't fail fast with a clear "missing API key" message — instead it produces a truncated traceback. JAC-4580 (Fenix) is investigating this.

## Disposition
Monitoring work complete. Findings documented. No Paperclip issues directly assigned to Zeratul. Fleet infrastructure is structurally healthy (all services up, DB healthy); the 59 errored agents are due to a missing credential (NOUS_API_KEY) and stale error states, not infrastructure failure. These are tracked under JAC-4552 (watchdog audit), JAC-4565 (NOUS_API_KEY recovery), and JAC-4580 (adapter init traceback diagnosis).
