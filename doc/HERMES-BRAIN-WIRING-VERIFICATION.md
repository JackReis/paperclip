# Hermes Brain Search Wiring — Verification Checklist

This document provides step-by-step verification tests for the Hermes Agent brain search MCP integration.

**Related:** See [HERMES-BRAIN-WIRING.md](./HERMES-BRAIN-WIRING.md) for configuration details.

---

## Pre-Flight Checks

### 1. Configuration File Exists

```bash
# On the Hermes host (Aegis: /Users/hermes)
cat ~/.hermes/profiles/aegis/config.yaml | grep -A 3 "open-brain:"
```

**Expected output:**
```yaml
  open-brain:
    command: /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh
    enabled: true
```

**Status:** ☐ Pass / ☐ Fail

---

### 2. Wrapper Script Exists and is Executable

```bash
ls -la /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh
```

**Expected:** File exists with execute bit set (rwx permission)

```bash
file /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh
```

**Expected:** Shell script or executable file type

**Status:** ☐ Pass / ☐ Fail

---

### 3. Local OB1 Brain is Running

```bash
# Check if the OB1 server is accessible
curl -s http://127.0.0.1:8787/health | jq . || echo "OB1 server unreachable"
```

**Expected:** HTTP 200 with health status JSON

```bash
# Verify the OrbStack compose stack is running
docker ps | grep -E "aegis|ob1|brain"
```

**Expected:** OrbStack container(s) running

**Status:** ☐ Pass / ☐ Fail

---

### 4. Brain Access Key is Available

```bash
# Check that the key is stored at the expected location
cat ~/Projects/Agentic\ OS/brains/aegis-local-brain/.env | grep BRAIN_ACCESS_KEY
```

**Expected:** Output like `BRAIN_ACCESS_KEY=<key-value>`

**Status:** ☐ Pass / ☐ Fail

---

## Integration Tests

### 5. MCP Server Loads in Hermes

Start a Hermes chat session and check for MCP initialization:

```bash
# Start a new session (adjust the profile if not using aegis)
hermes chat --profile aegis 2>&1 &
HERMES_PID=$!
sleep 5

# Check logs for MCP initialization
logs=$(hermes log --tail 50 2>/dev/null)
echo "$logs" | grep -E "mcp|MCP|brain|open-brain" || echo "No MCP logs found"

# Clean up
kill $HERMES_PID 2>/dev/null
```

**Expected:** Logs mentioning MCP server initialization, e.g.:
- `Loading MCP server: open-brain`
- `MCP server open-brain initialized successfully`
- `tools: [list including brain search tools]`

**Status:** ☐ Pass / ☐ Fail

---

### 6. Brain Search API Responds

```bash
# Extract the brain key
BRAIN_KEY=$(cat ~/Projects/Agentic\ OS/brains/aegis-local-brain/.env | grep BRAIN_ACCESS_KEY | cut -d= -f2)

# Test the search endpoint
curl -X POST http://127.0.0.1:8787/functions/v1/search \
  -H "x-brain-key: $BRAIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' 2>/dev/null | jq . || echo "Search failed"
```

**Expected:** JSON response with a `matches` array (may be empty if no results)

```json
{
  "matches": [
    {
      "id": "...",
      "content": "...",
      "similarity": 0.95
    }
  ]
}
```

**Status:** ☐ Pass / ☐ Fail

---

### 7. Brain Has Data

```bash
# Check the thought count from the local brain
BRAIN_KEY=$(cat ~/Projects/Agentic\ OS/brains/aegis-local-brain/.env | grep BRAIN_ACCESS_KEY | cut -d= -f2)

curl -X GET "http://127.0.0.1:8787/stats" \
  -H "x-brain-key: $BRAIN_KEY" 2>/dev/null | jq .total_thoughts || echo "Unable to fetch stats"
```

**Expected:** A number > 0 (Aegis brain should have 25,725+)

**Status:** ☐ Pass / ☐ Fail

---

## Agent Tests

### 8. Test with a Hermes Agent (No enabled_toolsets)

For an agent without `enabled_toolsets` configured:

```bash
# Create a test session or use an existing agent without toolset restrictions
hermes chat --profile aegis 2>&1 << 'EOF'
@user: List the tools you have available. Include any MCP tools (tools with "mcp-" in the name).
EOF
```

**Expected:** Output lists brain-related tools, e.g.:
- `mcp-open-brain:search`
- `mcp-open-brain:query`

**Status:** ☐ Pass / ☐ Fail

---

### 9. Test with a Hermes Agent (With enabled_toolsets Including mcp-open-brain)

In Paperclip, set an agent's adapterConfig:

```json
{
  "enabled_toolsets": [
    "terminal",
    "file",
    "browser",
    "mcp-open-brain"
  ]
}
```

Then:

```bash
hermes chat --profile aegis 2>&1 << 'EOF'
@user: List your MCP tools. Can you search the local brain?
EOF
```

**Expected:** Agent confirms brain tools are available.

**Status:** ☐ Pass / ☐ Fail

---

### 10. Test with a Hermes Agent (With enabled_toolsets Excluding mcp-open-brain)

In Paperclip, set an agent's adapterConfig without the brain toolset:

```json
{
  "enabled_toolsets": [
    "terminal",
    "file",
    "browser"
  ]
}
```

Then:

```bash
hermes chat --profile aegis 2>&1 << 'EOF'
@user: Do you have access to brain search tools?
EOF
```

**Expected:** Agent confirms brain tools are NOT available.

**Status:** ☐ Pass / ☐ Fail

---

## Functional Tests

### 11. Agent Can Search the Brain

In a Hermes session (with brain tools available):

```bash
hermes chat --profile aegis 2>&1 << 'EOF'
@user: Search the brain for recent issues or tasks related to "JAC-3487". What do you find?
EOF
```

**Expected:** Agent uses the brain search tool and returns results based on the local brain contents.

**Status:** ☐ Pass / ☐ Fail

---

### 12. Search Results are Relevant

From test 11, verify that search results make sense:

**Check:**
- Results are not empty (if the query term exists in the brain)
- Results include metadata (id, similarity score, content)
- Similarity scores are reasonable (0.0 to 1.0)

**Status:** ☐ Pass / ☐ Fail

---

## Configuration Gotchas

### 13. Toolsets Allowlist is Enforced

Verify that agents with `enabled_toolsets` correctly filter out brain tools if not explicitly included:

```bash
# Query Paperclip API to inspect an agent with enabled_toolsets set
curl http://127.0.0.1:3101/api/agents/<agent-id> 2>/dev/null | jq .adapterConfig.enabled_toolsets
```

**Expected:** If `"mcp-open-brain"` is NOT in the list, the agent should NOT have brain tools.

**Status:** ☐ Pass / ☐ Fail

---

## Restart & Recovery Tests

### 14. Config Persists After Hermes Restart

Stop and restart Hermes:

```bash
# Stop existing Hermes processes
pkill -f "hermes chat" || true
sleep 2

# Start a fresh session
hermes chat --profile aegis 2>&1 << 'EOF'
@user: Do you still have access to brain search tools?
EOF
```

**Expected:** Brain tools remain available without manual reconfiguration.

**Status:** ☐ Pass / ☐ Fail

---

### 15. Config Survives Local OB1 Restart

Restart the local OB1 brain:

```bash
# Restart the OrbStack compose stack (if you have access)
# Typically: docker restart aegis-local-brain or similar

# Verify it's back online
curl -s http://127.0.0.1:8787/health | jq .

# Test Hermes brain search again
hermes chat --profile aegis 2>&1 << 'EOF'
@user: Can you still search the brain?
EOF
```

**Expected:** Search tools work after brain restart (no config changes needed).

**Status:** ☐ Pass / ☐ Fail

---

## Summary

### Checklist

- ☐ Pre-Flight: Config, wrapper, OB1, key (tests 1-4)
- ☐ Integration: MCP loads, search API, brain data (tests 5-7)
- ☐ Agents: No toolset restrictions, with toolset included, with toolset excluded (tests 8-10)
- ☐ Functional: Search works, results are relevant (tests 11-12)
- ☐ Gotchas: Toolsets filtering is enforced (test 13)
- ☐ Restart: Config persists, OB1 restart handled (tests 14-15)

### Pass/Fail Criteria

- **PASS:** 14+ checks completed successfully
- **WARN:** 12-13 checks passed (minor issues, likely non-blocking)
- **FAIL:** < 12 checks passed (integration incomplete or broken)

### Next Steps on Failure

1. **Check logs:** `hermes log --tail 100` for detailed error messages
2. **Verify OB1:** Ensure local brain is running and healthy
3. **Test wrapper:** Try running the wrapper script directly with debug output
4. **Check Paperclip:** Verify agents have correct `adapterConfig` if using toolsets
5. **Consult docs:** Review [HERMES-BRAIN-WIRING.md](./HERMES-BRAIN-WIRING.md) troubleshooting section

---

## Reference

- **Configuration Guide:** [HERMES-BRAIN-WIRING.md](./HERMES-BRAIN-WIRING.md)
- **Config Template:** [hermes-mcp-brain-config-template.yaml](./hermes-mcp-brain-config-template.yaml)
- **MCP Documentation:** https://modelcontextprotocol.io/
- **Hermes Agent:** https://github.com/NousResearch/hermes-agent
