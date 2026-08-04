#!/usr/bin/env python3
"""Post a status comment to Paperclip issue JAC-4503."""
import os
import json
import sys

api_url = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3101")
api_key = os.environ.get("PAPERCLIP_API_KEY", "")
run_id = os.environ.get("PAPERCLIP_RUN_ID", "")
issue_id = "58717b5a-236b-4197-a9c7-4166e758fe0a"

base = api_url.rstrip("/")
if not base.endswith("/api"):
    base = base + "/api"

comment = """## JAC-4503 — Ollama Cloud API Key Recovery — Dinkelspiel Heartbeat (43)

### Current Status: BLOCKED — Awaiting Human Key Regeneration

**Agent**: Dinkelspiel (hermes_local)
**Profile**: aegis
**Issue UUID**: 58717b5a-236b-4197-a9c7-4166e758fe0a

### What I've Verified

1. **Stale key confirmed (HTTP 401)**: The current `OLLAMA_API_KEY` (prefix `1d9a89ce…`) returns HTTP 401 on `POST https://ollama.com/v1/chat/completions`. Tested live — `{"error":{"message":"Unauthorized"}}`.

2. **Profiles with stale key in .env**:
   | Profile | Line | Status |
   |---|---|---|
   | aegis | .env:27 | Stale (`1d9a89ce…`) — rotate |
   | paperclip-compact | .env:42 | Stale (same key) — rotate |
   | luna | .env (absent) | **Missing** — add new key |

3. **luna config.yaml actively uses ollama-cloud**: 13 provider references (auxiliary routes: web_extract, compression, skills_hub, approval, mcp, title_generation, memory_query_rewrite, tts_audio_tags, profile_describer, goal_judge, monitor, background_review, moa_reference). All fail without the key.

4. **SOPS-encrypted secret**: `/Users/hermes/.secrets/llm-providers.env` contains an encrypted `OLLAMA_API_KEY` (AES256_GCM). `sops` CLI is at `/Users/hermes/homebrew/bin/sops` but no age/GPG key available in this environment for decryption.

5. **No other profiles** reference `ollama-cloud` in their config.yaml.

6. **Recovery script verified and improved**: `/Users/hermes/Projects/paperclip/scripts/ollama-cloud-key-recovery.sh` — now handles both .env files AND the SOPS-encrypted secrets file. Script syntax validated with `bash -n`.

### Recovery Script Improvements

Added SOPS file handling to the recovery script:
- Decrypts `/Users/hermes/.secrets/llm-providers.env` with `sops -d`
- Replaces `OLLAMA_API_KEY` via `sed`
- Re-encrypts with `sops -e --input-type=env --output-type=env`
- Backs up the original SOPS file before modification
- Falls back gracefully with manual instructions if sops can't decrypt (no age key)
- Fixed verification curl to use the actual new key (was using `Bearer ***`)

### What's Needed From Human

The API key can only be regenerated at `https://ollama.com/settings/keys` through interactive browser login (Workos OAuth). This cannot be done programmatically.

**Request_confirmation interaction is still pending** (ID: `cfc65797-9385-49e1-882b-979672d8836e`, created 2026-08-04T16:17:36Z).

**Unblock owner**: Jack (human)
**Unblock action**: 
1. Visit https://ollama.com/settings/keys in a browser
2. Log in with the fleet's Ollama account
3. Generate a new API key
4. Accept the request_confirmation interaction (or paste the new key as a comment on this issue)
5. I will then run `ollama-cloud-key-recovery.sh "$NEW_KEY"` to propagate across all 3 .env files + SOPS secret, then verify against the chat completions endpoint.

### Evidence

- Stale key 401 response: `{"error":{"message":"Unauthorized","type":"api_error","param":null,"code":null}}`
- Recovery script syntax: validated (`bash -n` -> OK)
- Script path: `/Users/hermes/Projects/paperclip/scripts/ollama-cloud-key-recovery.sh`
- Profile .env lines: aegis:27, paperclip-compact:42 (stale key); luna (absent)
- SOPS file: `/Users/hermes/.secrets/llm-providers.env` (encrypted OLLAMA_API_KEY on line 5)
"""

payload = {
    "comment": comment
}

import urllib.request
url = f"{base}/issues/{issue_id}"
req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode(),
    headers={
        "Authorization": f"Bearer {api_key}",
        "X-Paperclip-Run-Id": run_id,
        "Content-Type": "application/json",
    },
    method="PATCH",
)
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print(json.dumps(result, indent=2)[:500])
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
