#!/usr/bin/env bash
# ollama-cloud-key-recovery.sh
# Recovery script for JAC-4503: Ollama Cloud API key rotation.
#
# Usage:
#   export OLLAMA_NEW_KEY="sk-..."
#   bash ollama-cloud-key-recovery.sh "$OLLAMA_NEW_KEY"
#
# Updates OLLAMA_API_KEY in all fleet profiles that use the ollama-cloud provider.
set -euo pipefail

if [ $# -lt 1 ] || [ -z "${1:-}" ]; then
  echo "ERROR: new API key required as arg 1 (or set OLLAMA_NEW_KEY env)"
  echo "Usage: $0 <new-ollama-api-key>"
  exit 1
fi

NEW_KEY="$1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
PROFILES_DIR="/Users/hermes/.hermes/profiles"
SOPS_FILE="/Users/hermes/.secrets/llm-providers.env"
CHANGED=0

# Profiles and config files that need OLLAMA_API_KEY (ollama-cloud consumers)
# Covers all locations where the key was found during JAC-4503 audit,
# plus profiles that route through ollama-cloud but were missing the key.
TARGETS=(
  "$PROFILES_DIR/aegis/.env"
  "$PROFILES_DIR/paperclip-compact/.env"
  "$PROFILES_DIR/luna/.env"
  "$PROFILES_DIR/worker/.env"
  "$PROFILES_DIR/family/.env"
  "$PROFILES_DIR/zatara/.env"
  "$HOME/.hermes/.env"
  "$HOME/.config/ringer/cloud-keys.env"
)

echo "=== Ollama Cloud API Key Recovery — $TS ==="
echo "Profiles to update: ${#TARGETS[@]}"
echo ""

for envfile in "${TARGETS[@]}"; do
  if [ ! -f "$envfile" ]; then
    echo "WARN: $envfile does not exist, creating."
    mkdir -p "$(dirname "$envfile")"
    touch "$envfile"
  fi

  # Backup
  cp "$envfile" "$envfile.bak-$TS"
  echo "Backed up: $envfile -> $envfile.bak-$TS"

  if grep -q '^OLLAMA_API_KEY=' "$envfile"; then
    # Replace existing key
    sed -i '' "s|^OLLAMA_API_KEY=.*|OLLAMA_API_KEY=$NEW_KEY|" "$envfile"
    echo "Updated OLLAMA_API_KEY in: $envfile"
  else
    # Append new key
    printf '\nOLLAMA_API_KEY=%s\n' "$NEW_KEY" >> "$envfile"
    echo "Added OLLAMA_API_KEY to: $envfile (was absent)"
  fi
  CHANGED=$((CHANGED + 1))
done

# Also update the SOPS-encrypted secrets file if it exists and sops is available
if [ -f "$SOPS_FILE" ]; then
  if command -v sops >/dev/null 2>&1; then
    if sops -d "$SOPS_FILE" >/dev/null 2>&1; then
      cp "$SOPS_FILE" "$SOPS_FILE.bak-$TS"
      echo "Backed up: $SOPS_FILE -> $SOPS_FILE.bak-$TS"

      # Decrypt, replace key, re-encrypt
      sops -d "$SOPS_FILE" | sed "s|^OLLAMA_API_KEY=.*|OLLAMA_API_KEY=$NEW_KEY|" | sops -e --input-type=env --output-type=env - "$SOPS_FILE" > "$SOPS_FILE.tmp"
      mv "$SOPS_FILE.tmp" "$SOPS_FILE"
      echo "Updated OLLAMA_API_KEY in SOPS secrets: $SOPS_FILE"
      CHANGED=$((CHANGED + 1))
    else
      echo "WARN: Cannot decrypt $SOPS_FILE (no age/GPG key available)." >&2
      echo "      Manually update OLLAMA_API_KEY in this file with: sops '$SOPS_FILE'" >&2
    fi
  else
    echo "WARN: sops CLI not found — cannot update SOPS file: $SOPS_FILE" >&2
    echo "      Manually update OLLAMA_API_KEY in this file with: sops '$SOPS_FILE'" >&2
  fi
fi

echo ""
echo "=== Verifying new key against ollama.com/v1/chat/completions ==="
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $NEW_KEY" \
  -H "Content-Type: application/json" \
  "https://ollama.com/v1/chat/completions" \
  -d '{"model":"gpt-oss:20b","messages":[{"role":"user","content":"hi"}]}')

if [ "$HTTP_CODE" = "200" ]; then
  echo "VERIFICATION PASSED: HTTP $HTTP_CODE — key is valid."
else
  echo "VERIFICATION WARNING: HTTP $HTTP_CODE — key may not be valid."
  echo "Manually verify at https://ollama.com/settings/keys"
fi

echo ""
echo "=== Summary: $CHANGED location(s) updated ==="
echo "Key prefix: ${NEW_KEY:0:8}..."
echo ""
echo "Next steps:"
echo "  1. Restart Hermes gateway daemons that use these profiles."
echo "  2. Re-run fallback-health-monitor to confirm recovery."
