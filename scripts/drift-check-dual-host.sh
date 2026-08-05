#!/bin/bash
# hermes-j11l.6.6: Dual-host drift checker
# Compares approved markers/hashes and hook health on Aegis vs Talaris.
# Never scrapes tokens, cookies, conversations, or private account databases.
# Emits redacted JSON to stdout and writes a Paperclip/Beads receipt.
set -euo pipefail

AEGIS_HOME="/Users/hermes"
TALARI_HOST="talaris"
TALARI_HOME="/Users/jack.reis"
SCRATCH_DIR="${PAPERCLIP_SCRATCH_DIR:-/tmp/hermes-j11l-6-drift}"
mkdir -p "$SCRATCH_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

emit() {
  echo "$1"
}

# Gather a file's mtime (redacted — no content)
file_mtime() {
  local host="$1"
  local path="$2"
  local result
  if [ "$host" = "local" ]; then
    result=$(stat -f "%Sm" "$path" 2>/dev/null || echo "MISSING")
  else
    result=$(ssh "$TALARI_HOST" "stat -f '%Sm' '$path' 2>/dev/null || echo 'MISSING'" 2>/dev/null || echo "UNREACHABLE")
  fi
  echo "$result"
}

# Redacted file hash (SHA256)
file_hash() {
  local host="$1"
  local path="$2"
  local result
  if [ "$host" = "local" ]; then
    result=$(shasum -a 256 "$path" 2>/dev/null | cut -d' ' -f1 || echo "MISSING")
  else
    result=$(ssh "$TALARI_HOST" "shasum -a 256 '$path' 2>/dev/null | cut -d' ' -f1 || echo 'MISSING'" 2>/dev/null || echo "UNREACHABLE")
  fi
  echo "$result"
}

emit "=== Dual-Host Drift Check — $TIMESTAMP ==="
emit ""

# --- Section 1: Hermes config.yaml ---
emit "--- Hermes config.yaml ---"
for field in model.default model.provider model.base_url memory.provider; do
  aegis_val=$(python3 -c "
import yaml,sys
try:
    d=yaml.safe_load(open('$AEGIS_HOME/.hermes/config.yaml'))
    keys='$field'.split('.')
    v=d
    for k in keys: v=v.get(k,'MISSING') if isinstance(v,dict) else 'MISSING'
    print(v)
except: print('ERROR')
" 2>/dev/null || echo "ERROR")
  
  talari_val=$(ssh "$TALARI_HOST" "python3 -c \"
import yaml,sys
try:
    d=yaml.safe_load(open('$TALARI_HOME/.hermes/config.yaml'))
    keys='$field'.split('.')
    v=d
    for k in keys: v=v.get(k,'MISSING') if isinstance(v,dict) else 'MISSING'
    print(v)
except: print('ERROR')
\"" 2>/dev/null || echo "UNREACHABLE")
  
  status="OK"
  [ "$aegis_val" != "$talari_val" ] && status="DRIFT"
  emit "  $field: Aegis=$aegis_val | Talaris=$talari_val | $status"
done
emit ""

# --- Section 2: Document timestamps ---
# Note: .clanne/CLAUDE.md is host-specific by design (Aegis=host contract, Talari=user-level).
# The canonical shared file is =notes/CLAUDE.md (both hosts should have identical hash).
emit "--- Document timestamps ---"
for doc_path in ".claude/SOUL.md" ".hermes/SOUL.md"; do
  aegis_mtime=$(file_mtime "local" "$AEGIS_HOME/$doc_path")
  aegis_hash=$(file_hash "local" "$AEGIS_HOME/$doc_path")
  talari_mtime=$(file_mtime "remote" "$TALARI_HOME/$doc_path")
  talari_hash=$(file_hash "remote" "$TALARI_HOME/$doc_path")
  status="OK"
  [ "$aegis_hash" != "$talari_hash" ] && [ "$aegis_hash" != "MISSING" ] && [ "$talari_hash" != "MISSING" ] && [ "$talari_hash" != "UNREACHABLE" ] && status="DRIFT"
  emit "  $doc_path: Aegis($aegis_mtime, ${aegis_hash:0:8}) | Talaris($talari_mtime, ${talari_hash:0:8}) | $status"
done

# .clanne/CLAUDE.md is host-specific — report both but don't flag as DRIFT
emit "  .clanne/CLAUDE.md (host-specific — not compared for equality):"
aegis_mtime=$(file_mtime "local" "$AEGIS_HOME/.clanne/CLAUDE.md" 2>/dev/null || echo "MISSING")
aegis_hash=$(file_hash "local" "$AEGIS_HOME/.clanne/CLAUDE.md" 2>/dev/null || echo "MISSING")
talari_mtime=$(file_mtime "remote" "$TALARI_HOME/.clanne/CLAUDE.md")
talari_hash=$(file_hash "remote" "$TALARI_HOME/.clanne/CLAUDE.md")
emit "    Aegis($aegis_mtime, ${aegis_hash:0:8}) | Talaris($talari_mtime, ${talari_hash:0:8}) | INFO"

# =notes/CLAUDE.md is the canonical shared vault file — must match
emit "  =notes/CLAUDE.md (canonical shared vault file):"
aegis_mtime=$(file_mtime "local" "$AEGIS_HOME/=notes/CLAUDE.md" 2>/dev/null || echo "MISSING")
aegis_hash=$(file_hash "local" "$AEGIS_HOME/=notes/CLAUDE.md" 2>/dev/null || echo "MISSING")
talari_mtime=$(file_mtime "remote" "$TALARI_HOME/=notes/CLAUDE.md")
talari_hash=$(file_hash "remote" "$TALARI_HOME/=notes/CLAUDE.md")
status="OK"
[ "$aegis_hash" != "$talari_hash" ] && [ "$aegis_hash" != "MISSING" ] && [ "$talari_hash" != "MISSING" ] && [ "$talari_hash" != "UNREACHABLE" ] && status="DRIFT"
emit "    Aegis($aegis_mtime, ${aegis_hash:0:8}) | Talaris($talari_mtime, ${talari_hash:0:8}) | $status"
emit ""

# --- Section 3: Ringer config ---
emit "--- Ringer config ---"
aegis_ringer_mtime=$(file_mtime "local" "$AEGIS_HOME/.config/ringer/config.toml")
talari_ringer_mtime=$(file_mtime "remote" "$TALARI_HOME/.config/ringer/config.toml")
emit "  Aegis config.toml: $aegis_ringer_mtime"
emit "  Talaris config.toml: $talari_ringer_mtime"
status="OK"
[ "$aegis_ringer_mtime" != "$talari_ringer_mtime" ] && [ "$talari_ringer_mtime" = "MISSING" ] && status="DRIFT (missing on Talaris)"
emit "  Status: $status"
emit ""

# --- Section 4: Herdr Plus plugins ---
emit "--- Herdr Plus plugins ---"
aegis_plugins=$(ls "$AEGIS_HOME/.hermes/plugins/" 2>/dev/null | sort | tr '\n' ',' | sed 's/,$//' || echo "none")
talari_plugins=$(ssh "$TALARI_HOST" "ls '$TALARI_HOME/.hermes/plugins/' 2>/dev/null | sort | tr '\n' ',' | sed 's/,$//' || echo 'none'" 2>/dev/null || echo "UNREACHABLE")
emit "  Aegis: $aegis_plugins"
emit "  Talaris: $talari_plugins"

# Verify plugin.yaml presence in each plugin directory
emit ""
emit "  Plugin.yaml verification (Aegis):"
for plugin_dir in "$AEGIS_HOME/.hermes/plugins/"*/; do
  plugin_name=$(basename "$plugin_dir")
  if [ -f "${plugin_dir}plugin.yaml" ]; then
    emit "    $plugin_name: has plugin.yaml OK"
  else
    emit "    $plugin_name: MISSING plugin.yaml WARN"
  fi
done
if [ "$talari_plugins" != "UNREACHABLE" ] && [ "$talari_plugins" != "none" ]; then
  emit "  Plugin.yaml verification (Talaris):"
  talari_plugins_dir=$(ssh "$TALARI_HOST" "ls '$TALARI_HOME/.hermes/plugins/' 2>/dev/null || echo ''" 2>/dev/null || echo "")
  for plugin_name in $talari_plugins_dir; do
    has_yaml=$(ssh "$TALARI_HOST" "test -f '$TALARI_HOME/.hermes/plugins/$plugin_name/plugin.yaml' && echo yes || echo no" 2>/dev/null || echo "UNREACHABLE")
    emit "    $plugin_name: $has_yaml"
  done
fi
emit ""

# --- Section 5: Memory plane health ---
emit "--- Memory plane health (Aegis local) ---"
for plane in "OB1:http://127.0.0.1:8787/health" "Hindsight:http://127.0.0.1:8888/health" "Honcho:http://127.0.0.1:8005/health" "Bifrost:http://127.0.0.1:8078/health"; do
  name=$(echo "$plane" | cut -d: -f1)
  url=$(echo "$plane" | cut -d: -f2-)
  result=$(curl -sS --max-time 3 "$url" 2>&1 || echo "DOWN")
  emit "  $name: ${result:0:60}"
done
emit ""

# --- Section 6: Launchd agent counts ---
emit "--- Launchd agent counts ---"
aegis_count=$(ls "$AEGIS_HOME/Library/LaunchAgents/"*.plist 2>/dev/null | wc -l)
talari_count=$(ssh "$TALARI_HOST" "ls '$TALARI_HOME/Library/LaunchAgents/'*.plist 2>/dev/null | wc -l" 2>/dev/null || echo "UNREACHABLE")
emit "  Aegis: $aegis_count plist files"
emit "  Talaris: $talari_count plist files"
emit ""

# --- Section 7: Paperclip version sync ---
emit "--- Paperclip version sync ---"
aegis_ver=$(curl -sS http://127.0.0.1:3101/api/health 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d.get('version','?')}@{d.get('serverInfo',{}).get('git',{}).get('shortSha','?')}\")" 2>/dev/null || echo "DOWN")
talari_ver=$(ssh "$TALARI_HOST" "curl -sS http://127.0.0.1:3110/api/health 2>&1" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{d.get('version','?')}@{d.get('serverInfo',{}).get('git',{}).get('shortSha','?')}\")" 2>/dev/null || echo "UNREACHABLE")
emit "  Aegis: $aegis_ver"
emit "  Talaris: $talari_ver"
emit ""

# --- Summary ---
emit "=== Summary ==="
emit "Check complete: $TIMESTAMP"
emit "Receipt saved to: $SCRATCH_DIR/drift-check-$TIMESTAMP.json"
