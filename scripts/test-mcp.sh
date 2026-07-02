#!/usr/bin/env bash
# Smoke test for the Hub Capture MCP endpoint (docs/hub-capture.md).
#
# Usage:
#   MCP_CAPTURE_TOKEN=<token> ./scripts/test-mcp.sh [base-url]
#
# base-url defaults to http://localhost:3001 (local dev api-server).
set -euo pipefail

BASE="${1:-http://localhost:3001}"
URL="$BASE/api/mcp"

if [ -z "${MCP_CAPTURE_TOKEN:-}" ]; then
  echo "ERROR: set MCP_CAPTURE_TOKEN in the environment first." >&2
  exit 1
fi

echo "== 1. Unauthorized request is rejected =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL" \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":0,"method":"ping"}')
if [ "$CODE" != "401" ]; then
  echo "FAIL: expected 401 without bearer, got $CODE" >&2
  exit 1
fi
echo "   401 as expected"

AUTH=(-H "Authorization: Bearer $MCP_CAPTURE_TOKEN")
JSON=(-H 'content-type: application/json' -H 'accept: application/json, text/event-stream')

echo "== 2. Initialize MCP session =="
curl -s -X POST "$URL" "${AUTH[@]}" "${JSON[@]}" -d '{
  "jsonrpc":"2.0","id":1,"method":"initialize",
  "params":{"protocolVersion":"2025-03-26","capabilities":{},
            "clientInfo":{"name":"test-mcp.sh","version":"1.0"}}
}' | head -c 400
echo

echo "== 3. Call create_action_item =="
RESULT=$(curl -s -X POST "$URL" "${AUTH[@]}" "${JSON[@]}" -d '{
  "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{"name":"create_action_item","arguments":{
    "title":"MCP smoke test — safe to delete",
    "detail":"Created by scripts/test-mcp.sh",
    "priority":"low",
    "business":"other"
  }}
}')
echo "$RESULT" | head -c 600
echo
echo "$RESULT" | grep -q '"id"' || { echo "FAIL: no task id in result" >&2; exit 1; }

echo "== PASS — check the Command view: Ideas > OTHER should show the smoke-test item =="
