# Ollama Cloud API Key Recovery — Diagnosis & Runbook

## Issue: JAC-4503 — Ollama Cloud API Key Recovery — 401/429 Resolution (2026-08-02)

## Symptom
Hermes `ollama-cloud` provider calls to `https://ollama.com/v1/chat/completions`
return HTTP 401 Unauthorized across all fleet profiles that route through Ollama Cloud.

## Root Cause (verified)
The `OLLAMA_API_KEY` used by the `ollama-cloud` provider (Hermes `auth.py:434`
reads `api_key_env_vars=("OLLAMA_API_KEY",)`) is stale/revoked.

Evidence:
- Key prefix (`1d9a89ce…`) is identical across aegis and paperclip-compact profiles.
- `GET https://ollama.com/v1/models` returns HTTP 200 (no-auth endpoint — does not validate the key).
- `POST https://ollama.com/v1/chat/completions` returns HTTP 401 with `{"error":{"message":"Unauthorized"}}`.
- Key was revoked after July 12 quota exhaustion (429 → key invalidated).

The Hermes `ollama-cloud` ProviderConfig (auth.py:429-436) uses:
  - api_key_env_vars = ("OLLAMA_API_KEY",)
  - base_url = https://ollama.com/v1

## Profiles Affected
Profiles that reference `ollama-cloud` provider in config.yaml:
  - luna (primary — auxiliary web_extract, compression, skills_hub, approval, mcp,
    title_generation, profile_describer, goal_judge, monitor, background_review, moa_reference)

Profiles with `OLLAMA_API_KEY` in `.env` (the env var consumed by ollama-cloud):
  - aegis
  - paperclip-compact

Additional profiles that may route through ollama-cloud via Hermes fallback chains:
  - Check any profile whose config.yaml references `provider: ollama-cloud`.

## Action Required (HUMAN — interactive browser login)

The API key cannot be regenerated programmatically. Someone with access to the
ollama.com account must:

1. Visit https://ollama.com/settings/keys in a browser (303 redirect from login).
2. Log in with the fleet's ollama.com account.
3. Create a new API key (or delete the stale one and regenerate).
4. Copy the new key value.

## Action Required (AGENT — key propagation)

Once the new key is available, update it in the following `.env` files (or the
secrets store they pull from):

```
/Users/hermes/.hermes/profiles/aegis/.env            → OLLAMA_API_KEY=<new>
/Users/hermes/.hermes/profiles/luna/.env             → OLLAMA_API_KEY=<new>  (missing — needs adding)
/Users/hermes/.hermes/profiles/paperclip-compact/.env → OLLAMA_API_KEY=<new>
```

For luna, OLLAMA_API_KEY must be ADDED to the .env (it is currently absent even
though config.yaml routes auxiliary providers through ollama-cloud).

## Recovery Script
See `ollama-cloud-key-recovery.sh` in this scratch dir — run after obtaining
the new key:

```bash
export OLLAMA_NEW_KEY="<paste-new-key-here>"
bash ollama-cloud-key-recovery.sh "$OLLAMA_NEW_KEY"
```

The script:
1. Backs up each .env to .env.bak-<timestamp>
2. Updates OLLAMA_API_KEY in aegis, paperclip-compact
3. Adds OLLAMA_API_KEY=<new> to luna/.env if absent
4. Verifies the key works against https://ollama.com/v1/chat/completions
