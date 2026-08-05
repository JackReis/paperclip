#!/usr/bin/env bash
set -euo pipefail

api="${PAPERCLIP_API_URL%/}"
case "$api" in */api) ;; *) api="$api/api" ;; esac

# Agent IDs with stale "Process lost" errorReason, running or idle (excluding Zeratul)
# From live API GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents
agent_ids=(
  "6ddcd9e1-3b0f-4870-a5be-7b387d424a4a"  # Aegis Medium
  "f83be6e5-ccc8-4689-a4a8-ec1dcef9b667"  # Zatara
  "d8598eb7-6447-41f2-84b7-2cf25348779e"  # Oracle-2
  "717f29e6-3656-436d-bdad-4e8851dddd0d"  # Press
  "1807e9de-ac0b-4b27-83cb-f5eb0af7ef7b"  # Karax
  "bb421461-48f3-4152-bc9a-12d17aa41e74"  # Klaude Pi
  "2f92499a-9b6b-48f3-8319-8657e8fe48de"  # Luna High Planner
  "1ad7c2aa-fc0d-4624-a848-bc645259a25c"  # Aldaris
  "46fb5af2-e16d-497a-83bf-ae808d2a556d"  # Reflection Coach
  "5056439a-ff75-46aa-95ca-57bc507eb9e8"  # Fenix
  "c3aba1ed-46c5-4e84-9bbb-10e7515f8ddf"  # Bixby
  "55108807-64b1-4f46-9a2ca-074bf9a56d13"  # Artanis
  "d22538a9-fd04-4113-b686-7a2e2ca81309"  # Flash Executor
  "e6ec3f05-8ac0-4770-960f-0bb01113324f"  # Analyst-Sonnet
)

cleared=0
failed=0

for id in "${agent_ids[@]}"; do
  result=$(curl -sS -X PATCH "$api/agents/$id" \
    -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
    -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
    -H "Content-Type: application/json" \
    -d '{"errorReason": null}' 2>&1)
  
  if echo "$result" | jq -e '.errorReason == null' >/dev/null 2>&1; then
    name=$(echo "$result" | jq -r '.name')
    echo "CLEARED: $name ($id)"
    ((cleared++))
  else
    echo "FAILED: $id - $result"
    ((failed++))
  fi
done

echo "---"
echo "Cleared: $cleared, Failed: $failed"
