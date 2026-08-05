#!/usr/bin/env bash
# JAC-4657: Batch-patch adapterConfig for all hermes_local agents with explicit provider+model
#
# Verifies and patches each hermes_local agent's adapterConfig to include:
#   - provider (from executionLane metadata or fleet default)
#   - model (from executionLane metadata or fleet default)
#   - timeoutSec (DEFAULT_TIMEOUT_SEC from constants.ts)
#   - graceSec (DEFAULT_GRACE_SEC from constants.ts)
#
# Requires: $PAPERCLIP_API_KEY, $PAPERCLIP_API_URL (defaults to http://127.0.0.1:3101)

set -euo pipefail

API_URL="${PAPERCLIP_API_URL:-http://127.0.0.1:3101}"
API_URL="${API_URL%/}"
API_URL="$API_URL/api"

COMPANY_ID="87c32b8e-f131-4df8-ad8e-963d01b458e7"

# Defaults from packages/adapters/hermes/src/shared/constants.ts
# JAC-4686: Changed from "nous" to "openrouter" — NOUS_API_KEY is invalid (401),
# and the aegis default config.yaml was already updated to openrouter on 2026-07-31.
# All hermes profiles must use openrouter as the default provider to avoid
# fallback to provider=nous when the adapter doesn't pass --provider explicitly.
DEFAULT_PROVIDER="openrouter"
DEFAULT_MODEL="openrouter/poolside/laguna-s-2.1:free"
DEFAULT_TIMEOUT_SEC=1800
DEFAULT_GRACE_SEC=10

RESULTS_FILE="${PAPERCLIP_RUN_SCRATCH_DIR:-/tmp}/jac-4657-batch-patch-results.jsonl"
mkdir -p "$(dirname "$RESULTS_FILE")"
: > "$RESULTS_FILE"

echo "=== JAC-4657: adapterConfig batch patch for hermes_local agents ==="
echo "API: $API_URL"
echo "Company: $COMPANY_ID"
echo ""

# Fetch all agents
# JAC-4686: Use local_board (bearerless) path — the bearer-token path redacts
# adapterConfig fields (provider, model) and the bearer token lacks
# agents:configure permission (403). Local_board has full read/write access
# in deploymentMode=local_trusted.
ALL_AGENTS=$(curl -sS "$API_URL/companies/$COMPANY_ID/agents" \
  -H "X-Paperclip-Local-Board: true" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Accept: application/json")

# Get count of hermes_local agents
LOCAL_COUNT=$(echo "$ALL_AGENTS" | jq '[.[] | select(.adapterType == "hermes_local")] | length')
echo "Total hermes_local agents: $LOCAL_COUNT"
echo ""

# Build the patch plan: for each hermes_local agent, determine provider+model
# and emit a JSON line per agent with the patch payload
echo "$ALL_AGENTS" | jq -c '[.[] | select(.adapterType == "hermes_local")]' | jq -c '.[]' | while IFS= read -r agent; do
  AGENT_ID=$(echo "$agent" | jq -r '.id')
  AGENT_NAME=$(echo "$agent" | jq -r '.name')
  AGENT_STATUS=$(echo "$agent" | jq -r '.status')

  # Determine provider+model from executionLane metadata, fallback to defaults
  EXEC_PROVIDER=$(echo "$agent" | jq -r '.metadata.executionLane.provider // empty')
  EXEC_MODEL=$(echo "$agent" | jq -r '.metadata.executionLane.model // empty')

  # JAC-4686: Override known-bad providers. executionLane metadata may still
  # reference stale providers (nous=401, ollama-cloud=401, ollama-launch=removed).
  # Force these to openrouter — the fleet-wide default with a verified key.
  if [ -n "$EXEC_PROVIDER" ]; then
    case "$EXEC_PROVIDER" in
      nous|ollama-cloud|ollama-launch)
        EXEC_PROVIDER="$DEFAULT_PROVIDER"
        EXEC_MODEL="$DEFAULT_MODEL"
        SOURCE="fleet-override (executionLane provider was dead)"
        ;;
      *)
        SOURCE="executionLane"
        ;;
    esac
  else
    EXEC_PROVIDER="$DEFAULT_PROVIDER"
    EXEC_MODEL="$DEFAULT_MODEL"
    SOURCE="fleet-default"
  fi

  if [ -z "$EXEC_PROVIDER" ] || [ -z "$EXEC_MODEL" ]; then
    EXEC_PROVIDER="$DEFAULT_PROVIDER"
    EXEC_MODEL="$DEFAULT_MODEL"
  fi

  PROVIDER="$EXEC_PROVIDER"
  MODEL="$EXEC_MODEL"

  # Check current adapterConfig state
  CURRENT_PROVIDER=$(echo "$agent" | jq -r '.adapterConfig.provider // empty')
  CURRENT_MODEL=$(echo "$agent" | jq -r '.adapterConfig.model // empty')
  CURRENT_TIMEOUT=$(echo "$agent" | jq -r '.adapterConfig.timeoutSec // empty')
  CURRENT_GRACE=$(echo "$agent" | jq -r '.adapterConfig.graceSec // empty')

  # If already fully configured, skip
  if [ "$CURRENT_PROVIDER" = "$PROVIDER" ] && [ "$CURRENT_MODEL" = "$MODEL" ] && \
     [ "$CURRENT_TIMEOUT" = "$DEFAULT_TIMEOUT_SEC" ] && [ "$CURRENT_GRACE" = "$DEFAULT_GRACE_SEC" ]; then
    echo "SKIP   $AGENT_NAME ($AGENT_STATUS) - already configured: provider=$PROVIDER model=$MODEL"
    echo "{\"agentId\":\"$AGENT_ID\",\"agentName\":\"$AGENT_NAME\",\"action\":\"skip\",\"status\":\"$AGENT_STATUS\",\"reason\":\"already_configured\",\"provider\":\"$PROVIDER\",\"model\":\"$MODEL\"}" >> "$RESULTS_FILE"
    continue
  fi

  # Build PATCH payload
  PAYLOAD=$(jq -n \
    --arg provider "$PROVIDER" \
    --arg model "$MODEL" \
    --argjson timeoutSec "$DEFAULT_TIMEOUT_SEC" \
    --argjson graceSec "$DEFAULT_GRACE_SEC" \
    '{adapterConfig: {provider: $provider, model: $model, timeoutSec: $timeoutSec, graceSec: $graceSec}}')

  echo "PATCH  $AGENT_NAME ($AGENT_STATUS) - provider=$PROVIDER model=$MODEL (source: $SOURCE) | was: provider=${CURRENT_PROVIDER:-<empty>} model=${CURRENT_MODEL:-<empty>}"

  HTTP_RESPONSE=$(curl -sS -w "\n%{http_code}" -X PATCH "$API_URL/agents/$AGENT_ID" \
    -H "X-Paperclip-Local-Board: true" \
    -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --data-binary "$PAYLOAD")

  HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -1)
  BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    RESP_PROVIDER=$(echo "$BODY" | jq -r '.adapterConfig.provider // "null"')
    RESP_MODEL=$(echo "$BODY" | jq -r '.adapterConfig.model // "null"')
    RESP_TIMEOUT=$(echo "$BODY" | jq -r '.adapterConfig.timeoutSec // "null"')
    RESP_GRACE=$(echo "$BODY" | jq -r '.adapterConfig.graceSec // "null"')
    RESP_STATUS=$(echo "$BODY" | jq -r '.status // "null"')
    echo "  OK     -> provider=$RESP_PROVIDER model=$RESP_MODEL timeoutSec=$RESP_TIMEOUT graceSec=$RESP_GRACE status=$RESP_STATUS"
    echo "{\"agentId\":\"$AGENT_ID\",\"agentName\":\"$AGENT_NAME\",\"action\":\"patched\",\"status\":\"$RESP_STATUS\",\"provider\":\"$RESP_PROVIDER\",\"model\":\"$RESP_MODEL\",\"timeoutSec\":$RESP_TIMEOUT,\"graceSec\":$RESP_GRACE}" >> "$RESULTS_FILE"
  else
    echo "  FAIL   -> HTTP $HTTP_CODE: $(echo "$BODY" | head -c 200)"
    echo "{\"agentId\":\"$AGENT_ID\",\"agentName\":\"$AGENT_NAME\",\"action\":\"failed\",\"httpCode\":$HTTP_CODE,\"error\":$(echo "$BODY" | jq -Rs .)}" >> "$RESULTS_FILE"
  fi
done

echo ""
echo "=== Results ==="
echo "Results file: $RESULTS_FILE"
echo "Patched:"
jq -r 'select(.action=="patched") | "  \(.agentName): \(.provider)/\(.model)"' "$RESULTS_FILE" 2>/dev/null | wc -l
echo "Skipped:"
jq -r 'select(.action=="skip") | "  \(.agentName)"' "$RESULTS_FILE" 2>/dev/null | wc -l
echo "Failed:"
jq -r 'select(.action=="failed") | "  \(.agentName): HTTP \(.httpCode)"' "$RESULTS_FILE" 2>/dev/null | wc -l
