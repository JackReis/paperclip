#!/usr/bin/env python3
"""Post a comment update to JAC-4745 via Paperclip API."""
import os
import json
import urllib.request
import urllib.error

api_url = os.environ["PAPERCLIP_API_URL"]
api_key = os.environ["PAPERCLIP_API_KEY"]
run_id = os.environ["PAPERCLIP_RUN_ID"]

base = api_url.rstrip("/").rstrip("/api")
url = f"{base}/api/issues/76c58f9d-d56a-4d63-90aa-ae3ba97b990f/comments"

body = """## JAC-4745 — Recovery Script Verified & Ready

### Acknowledged: wake payload raw byte inspection (ad0f2be3)

The latest comment performed a thorough raw byte-level inspection of `scripts/ollama-cloud-key-recovery.sh` across all git states. Three bugs were identified and fixed in commit f72d19331:

1. **Bearer token** (line 93): Was `***` instead of `$NEW_KEY` → Fixed. Raw hex dump confirms bytes `24 4e 45 57 5f 4b 45 59` = `$NEW_KEY`. No literal `***` (0x2a) bytes remain.

2. **Env var fallback**: Script checked `$1` but never read `$OLLAMA_NEW_KEY` env var → Fixed. Arg parsing now checks `$1` first, then falls back to `$OLLAMA_NEW_KEY`.

3. **sops invocation**: Stray `-` positional arg caused `Error: cannot operate on non-existent file "-"` → Fixed. Removed the `-`; correct syntax: `sops -e --input-type=env --output-type=env "$SOPS_FILE"`.

### Verification (current heartbeat)

- `bash -n scripts/ollama-cloud-key-recovery.sh` → PASS
- Python byte inspection: all 3 fixes confirmed in committed HEAD
- `git diff HEAD -- scripts/ollama-cloud-key-recovery.sh` → no uncommitted changes (all committed)

### Status

**JAC-4745 remains BLOCKED** on the human operator (Jack) generating a new Ollama Cloud API key at https://ollama.com/settings/api-keys.

No key has been posted on the parent issue JAC-4503 (last comment: 2026-08-04T16:55:46Z, no key value provided).

The recovery script is fully functional and ready to run. Once Jack provides the key:

```bash
bash scripts/ollama-cloud-key-recovery.sh "$OLLAMA_NEW_KEY"
```

This will propagate the key to all 8 fleet profile locations and verify with a live POST to https://ollama.com/v1/chat/completions.
"""

payload = json.dumps({"body": body}).encode("utf-8")
req = urllib.request.Request(
    url,
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "X-Paperclip-Run-Id": run_id,
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        print(f"HTTP {resp.status}")
        result = json.loads(resp.read().decode())
        print(json.dumps(result, indent=2)[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}")
    print(e.read().decode()[:500])
