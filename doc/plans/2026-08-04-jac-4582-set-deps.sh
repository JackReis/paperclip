#!/bin/bash
set -e

api="${PAPERCLIP_API_URL%/}/api"

# Child issue UUIDs (from the creation output)
A_ID="04440c5b-569e-4281-9701-c3e517ea5d16"
A1_ID="9fe5b24d-a341-447f-ae70-d15d8161281e"
A2_ID="dead53f5-6c8b-4e64-af6f-881aa5b6e97e"
A3_ID="6036cbc6-71fa-4065-9830-e988f2a1e737"
B_ID="452a929b-9a2a-4fc8-b9c8-a1f1a06b8628"
B1_ID="834b4aaf-daf9-4ab0-bf9b-c62fbd5b3254"
B2_ID="616c1dcd-9af1-4808-a869-46cfcb590c1f"
B3_ID="9dd96bb4-ae63-45aa-99f2-2c0b01c0f18e"
C_ID="a6f7a0e1-e457-40ac-ab6b-861da522819c"
C1_ID="f7025018-2d95-4f84-9178-1c5d118a94fe"
C2_ID="033d627d-5eaa-4b79-9988-96f1798c454c"

patch_deps() {
  local issue_id="$1"
  local blocked_by="$2"
  curl -sS -X PATCH "$api/issues/$issue_id" \
    -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
    -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
    -H "Content-Type: application/json" \
    -d "{\"blockedBy\": $blocked_by}" | jq -c '.identifier, (.blockedBy | length)'
}

echo "Setting A.3 blockedBy A.1 + A.2"
patch_deps "$A3_ID" "[{\"id\": \"$A1_ID\"}, {\"id\": \"$A2_ID\"}]"

echo "Setting A.1 blockedBy A"
patch_deps "$A1_ID" "[{\"id\": \"$A_ID\"}]"

echo "Setting A.2 blockedBy A"
patch_deps "$A2_ID" "[{\"id\": \"$A_ID\"}]"

echo "Setting B.1 blockedBy B"
patch_deps "$B1_ID" "[{\"id\": \"$B_ID\"}]"

echo "Setting B.2 blockedBy B.1"
patch_deps "$B2_ID" "[{\"id\": \"$B1_ID\"}]"

echo "Setting B.3 blockedBy B.2"
patch_deps "$B3_ID" "[{\"id\": \"$B2_ID\"}]"

echo "Setting C.1 blockedBy C"
patch_deps "$C1_ID" "[{\"id\": \"$C_ID\"}]"

echo "Setting C.2 blockedBy C.1"
patch_deps "$C2_ID" "[{\"id\": \"$C1_ID\"}]"

echo "=== Dependencies established ==="
