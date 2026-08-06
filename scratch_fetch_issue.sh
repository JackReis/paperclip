#!/usr/bin/env bash
api="${PAPERCLIP_API_URL%/}"
case "$api" in */api) ;; *) api="$api/api" ;; esac

echo "=== COMMENTS on JAC-4745 (76c58f9d-d56a-4d63-90aa-ae3ba97b990f) ==="
curl -sS -X GET "$api/issues/76c58f9d-d56a-4d63-90aa-ae3ba97b990f/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== INTERACTIONS on JAC-4745 ==="
curl -sS -X GET "$api/issues/76c58f9d-d56a-4d63-90aa-ae3ba97b990f/interactions" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== ISSUE DETAILS ==="
curl -sS -X GET "$api/issues/76c58f9d-d56a-4d63-90aa-ae3ba97b990f" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" | jq '.'
