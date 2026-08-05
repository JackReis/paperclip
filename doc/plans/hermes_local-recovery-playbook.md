# Hermes_Local Recovery Playbook

> Version: 2026-08-04T21:30Z
> **Status:** Active reference
> **Parent:** JAC-4565 (fleet recovery), JAC-4575 (incident)
> **Author:** Forge (0b902be0) — Backend & database engineer

---

## Purpose

This playbook codifies the diagnostic order, failure signatures, verification protocol, and escalation path for recurring `hermes_local` adapterConfig incidents. It was synthesized from the JAC-4575/4565 recovery effort to prevent the pattern of:

> empty adapterConfig → DEFAULT_MODEL fix → credential injection → CLI crash discovered late → verification contradiction

The goal is to move from **single-point-in-time verification** to **multi-snapshot trend analysis**, and from **opaque 34-char truncated tracebacks** to **full diagnostic visibility**.

---

## 1. Diagnostic Order (Run this sequence before any fix)

### Step 1: CLI Smoke Test (gate)
Before dispatching or fixing any hermes_local agent, run:

```bash
timeout 15 hermes --profile <profile> chat -q "ping" -Q
```

- **PASS:** Returns within ~5–10s with a response.
- **FAIL (hang):** CLI hangs > 15s with no output. **STOP** — do not retry agents. The CLI itself is broken. Escalate to JAC-4656 (Hermes CLI bootstrap hang).
- **FAIL (traceback):** CLI crashes with a Python traceback. Capture full traceback (not the 500-char API truncation — see Step 1b).

**1b. Full traceback capture:** The Paperclip API truncates `errorReason` to `MAX_AGENT_ERROR_REASON_CHARS` (currently 2000 chars). For deeper diagnosis, invoke the CLI directly or inspect run event payloads (`resultJson`) which preserve full tracebacks.

### Step 2: Credential Check
Verify the runtime environment has all required keys:

```bash
# Check the relevant Hermes profile .env
grep -E "NOUS_API_KEY|OPENROUTER_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY" ~/.hermes/.env
```

- **Finding:** `NOUS_API_KEY` missing from global `~/.hermes/.env`. Local profile `.env` files may have it.
- **Action:** Inject via Paperclip secret store or launchd plist (JAC-4565-2).

### Step 3: Model/Provider Routing Check
Inspect the Hermes adapter config fallback chain:

```bash
# Check what DEFAULT_MODEL resolves to
grep "DEFAULT_MODEL" packages/adapters/hermes/src/shared/constants.ts

# Check the profile config.yaml fallback chain
grep -A5 "fallback_providers" ~/.hermes/profiles/<profile>/config.yaml
```

- **Finding:** `DEFAULT_MODEL="auto"` defers to `~/.hermes/config.yaml` which may route to `openrouter` first → 404 for `qwen3-coder:30b`.
- **Fix (JAC-4608):** Changed `DEFAULT_MODEL` from `"auto"` to `"ollama-launch/qwen3-coder:30b"`. Added `"ollama-launch"` to `VALID_PROVIDERS` and `MODEL_PREFIX_PROVIDER_HINTS`.

### Step 4: Database Health Check
Check for SQLite write contention under concurrent heartbeats:

```bash
# Check for "database is locked" errors
grep -r "database is locked" /tmp/agent_enumeration_audit.json

# Check Paperclip server for heartbeat timeouts
```

- **Finding:** `sqlite3.OperationalError: database is locked` at `hermes_state.py:2512`. Server flaps under 60+ concurrent heartbeats.
- **Action:** Proposal 4 — investigate PGlite connection pool size, WAL mode, and heartbeat write batching.

---

## 2. Error Signature Reference

| Error Pattern | Likely Root Cause | Owner | Action |
|---|---|---|---|
| `Traceback (most recent call last):` (34 chars, truncated) | Hermes CLI crash at `cli.py:18468` → `cli.chat()` | Fenix / JAC-4580 | Run CLI smoke test; capture full traceback |
| `Process lost -- child pid XXXX is no longer running` | Process lifecycle / workspace crash | Agent runtime | Check workspace logs; verify process supervision |
| `RemoteProtocolError: Server disconnected without response` | Upstream API timeout/disconnect | Provider | Check NOUS_API_KEY; verify fallback chain routes to Ollama :11434 |
| `sqlite3.OperationalError: database is locked` | Paperclip DB write contention | Forge / DB | Investigate PGlite WAL mode, connection pool |
| Empty `errorReason` (0 chars) | Error captured but not persisted to agent row | Paperclip server | Check `finalizeAgentStatus()` in heartbeat.ts |

---

## 3. Verification Protocol (Multi-Snapshot)

**Do NOT rely on single-point-in-time API checks.** Error counts fluctuate because agents retry every 5-minute heartbeat.

### Snapshot sequence:
1. **T+0:** `GET /api/companies/{cid}/agents` — record error count + errorReason patterns
2. **T+5min:** Re-check after one heartbeat cycle
3. **T+10min:** Confirm trend (increasing, stable, decreasing)

### Acceptance criteria for "recovered":
- **0 agents** with `errorReason` containing `openrouter`, `404`, or `nous` (the old JAC-4575 pattern)
- Transient errors (process lost, streaming failures) are acceptable if they don't exhibit the old pattern
- `Bright` (8b6ea7f8) has `executionLane.state=verified` and successfully completes a test invocation

---

## 4. Escalation Path

| Condition | Action |
|---|---|
| CLI hangs on `hermes chat -q "ping" -Q` | Escalate to JAC-4656 (Fenix) — CLI bootstrap hang |
| Credentials missing but CLI works | Inject via JAC-4565-2 (Zatara) |
| DEFAULT_MODEL still `"auto"` in running bundle | Rebuild server bundle: `pnpm --filter @paperclipai/server build` |
| DB lock errors persist under load | Create DB-layer investigation issue — check PGlite WAL mode, pool size |
| errorReason still truncated at 500 chars | Check `MAX_AGENT_ERROR_REASON_CHARS` in shared constants — was bumped to 2000 (JAC-4669-2) |

---

## 5. Recovery Playbook — Related Issues

| Issue | Description | Status |
|---|---|---|
| JAC-4575 | Watchdog health audit: 20 errored agents | done |
| JAC-4565 | Fleet recovery: hermes_local lane + Scout decommission | blocked |
| JAC-4580 | Fenix: diagnose Hermes CLI bootstrap hang | in_progress |
| JAC-4603 | Set explicit model in adapterConfig / change DEFAULT_MODEL | done |
| JAC-4604 | Restore NOUS_API_KEY or remove from fallback chain | done |
| JAC-4608 | Correct fallback provider chain routing | done |
| JAC-4656 | Resolve Hermes CLI bootstrap hang (zle/TTY init) | todo |
| JAC-4655 | Inject NOUS_API_KEY + provider routing fix | in_progress |
| JAC-4657 | Batch-patch adapterConfig for errored agents | in_progress |
| JAC-4660 | Post recovery receipts to JAC-4552 | todo |
| JAC-4669-2 | Increase errorReason truncation cap (500→2000) | **done (this doc)** |

---

## 6. Key Code Paths

- **ErrorReason truncation:** `server/src/services/heartbeat.ts:11143` (`truncateAgentErrorReason`) — uses `MAX_AGENT_ERROR_REASON_CHARS` from `@paperclipai/shared` constants.
- **DEFAULT_MODEL:** `packages/adapters/hermes/src/shared/constants.ts:39`
- **Provider resolution:** `packages/adapters/hermes/src/server/detect-model.ts` — `resolveProvider()` 5-step priority chain, `inferProviderFromModel()` prefix extraction.
- **Agent schema:** `packages/db/src/schema/agents.ts:34` (`errorReason: text("error_reason")`)
- **Agent API types:** `packages/shared/src/types/agent.ts:101` (`errorReason?: string | null`)
- **Agent API validators:** `packages/shared/src/validators/agent.ts:124` (`errorReason: z.string().nullable().optional()`)
