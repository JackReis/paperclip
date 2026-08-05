# JAC-4503 — Ollama Cloud API Key Recovery Audit (2026-08-05)

## Status
**blocked** — human input required. No new API key value was ever provided despite 4 accepted
`request_confirmation` interactions. The stale key (prefix `1d9a89ce`, 57 chars) remains in all
locations and returns HTTP 401 against `https://ollama.com/v1/chat/completions`.

## Evidence

### Key locations (stale key `1d9a89ce…` present)
| Location | Line | Key present |
|---|---|---|
| `~/.hermes/.env` | 31 | Yes (prefix `1d9a89ce`) |
| `~/.hermes/profiles/aegis/.env` | 27 | Yes |
| `~/.hermes/profiles/luna/.env` | 30 | Yes (also routes 13 auxiliary providers through ollama-cloud in config.yaml) |
| `~/.hermes/profiles/paperclip-compact/.env` | 42 | Yes |
| `~/.config/ringer/cloud-keys.env` | 7 | Yes |

### Key locations (MISSING the key entirely)
| Location | Status |
|---|---|
| `~/.hermes/profiles/family/.env` | Missing |
| `~/.hermes/profiles/worker/.env` | Missing |
| `~/.hermes/profiles/zatara/.env` | Missing |

### SOPS file
- `~/.secrets/llm-providers.env` — encrypted with 2 age recipients, but the age
  identities are missing from `~/.config/sops/age/keys.txt`. Cannot be decrypted
  with the current SSH key either. **Manual sops edit required** when the key
  is eventually provided:
  ```bash
  SOPS_AGE_KEY_FILE=~/.ssh/id_ed25519 sops -d ~/.secrets/llm-providers.env  # will fail
  ```

### Live API verification (2026-08-05T03:48Z)
```bash
$ curl -X POST -H "Authorization: Bearer <old-key-1d9a89ce>" \
    "https://ollama.com/v1/chat/completions" \
    -d '{"model":"gpt-oss:20b","messages":[{"role":"user","content":"hi"}]}'
{"error":{"message":"Unauthorized","type":"api_error","param":null,"code":null}}
HTTP 401
```

**False-positive note:** `GET https://ollama.com/v1/models` returns HTTP 200 — this endpoint is
**not** auth-protected and does not indicate key validity. Do not treat it as recovery evidence.

### Interactions history
| ID | Status | Resolved by | Note |
|---|---|---|---|
| cfc65797 | expired | local-board | "Key generated — proceed" → superseded by comment fd1c17c5 |
| c5c6e03d | expired | local-board | Superseded |
| aca4f145 | expired | local-board | Superseded |
| 94aa418a | **accepted** | local-board | "Key generated — proceed with propagation" — no key pasted |
| 832dd7ea | **accepted** | local-board | "Key provided" — no key value supplied |
| 76c8e3d3 | **accepted** | local-board | "Key generated — proceed" — no key value supplied |
| 05e6ad9f | expired | local-board | Superseded |
| 3f3b3330 | expired | local-board | Superseded |
| be142573 | **accepted** | local-board | "Key generated — proceed" at 23:57Z — no key pasted |
| 18aacefe | **pending** | — | Created by dead agent Dinkelspiel at 01:28Z; awaiting "Key pasted in comment" |

## Root cause
The human operator accepted the confirmation interactions (clicked "Key generated — proceed")
but never pasted the actual key value in any comment. Recovery is blocked until a human
provides the key.

## What was done
1. Confirmed the issue is already marked `blocked` in Paperclip.
2. Verified no new key exists anywhere on the filesystem, keychain, or SOPS secrets.
3. Confirmed `GET /v1/models` returns 200 without auth (false-positive indicator).
4. Confirmed `POST /v1/chat/completions` returns 401 with the old key.
5. Verified the recovery script `scripts/ollama-cloud-key-recovery.sh` exists and has syntax
   checked OK (covers all 8 locations).
6. Verified the previously committed workaround in `packages/adapters/hermes/src/shared/constants.ts`
   (DEFAULT_MODEL → `openrouter/poolside/laguna-s-2.1:free`, commit e219cfbc1) is in place and
   tests pass (126/126). This unblocks agents with empty adapterConfig but does NOT fix ollama-cloud.

## Unblock
**Unblock owner:** Human operator (Jack)
**Unblock action:** Paste the new Ollama Cloud API key from https://ollama.com/settings/api-keys
as a comment on this Paperclip issue, then accept interaction 18aacefe.

Once the key is provided, run:
```bash
bash scripts/ollama-cloud-key-recovery.sh "$NEW_KEY"
```
