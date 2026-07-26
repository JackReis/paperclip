# Hermes Brain Search Wiring Configuration

This document describes the configuration required to integrate Hermes Agent with local brain search (Open Brain) via MCP servers, particularly for the Aegis host setup.

## Overview

Hermes Agent can connect to local or cloud-based brain systems via Model Context Protocol (MCP) servers. The primary integration is with the **Open Brain** system, which provides semantic search and memory capabilities.

### Current Setup (Aegis Host)

The Aegis Mac Mini (host: `hermes`, home: `/Users/hermes`) runs:
- **Local OB1 Server** at `http://127.0.0.1:8787` (OrbStack compose)
- **OB1 Replacement** with semantic embeddings (mxbai-embed-large, 1024 dim)
- **25,725+ thoughts** actively captured
- **Compose directory**: `~/Projects/Agentic OS/brains/aegis-local-brain`

## Configuration

### MCP Server Entry

In Hermes' `~/.hermes/profiles/aegis/config.yaml`, the Open Brain MCP server is configured:

```yaml
mcp_servers:
  open-brain:
    command: /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh
    enabled: true
```

**Key points:**
- The `open-brain` entry enables the MCP server for all Hermes agents
- The `enabled: true` flag is explicit (though true by default for entries without `enabled: false`)
- The wrapper script handles the local OB1 server connection and tool exposure

### Wrapper Script

The wrapper script (`/Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh`) is responsible for:
1. Connecting to the local OB1 server at `http://127.0.0.1:8787`
2. Exposing OB1 search and query tools via MCP
3. Handling BRAIN_ACCESS_KEY authentication (from `~/Projects/Agentic OS/brains/aegis-local-brain/.env`)
4. Graceful fallback if the local brain is unavailable

## Toolsets Allowlist — Important Gotcha

**CRITICAL:** Agents with `enabled_toolsets` set will NOT see brain tools unless they explicitly add `"mcp-open-brain"` to their toolsets.

### Context

When a Hermes agent has `enabled_toolsets` configured (usually in Paperclip's `adapterConfig`), it acts as an allowlist:
- Only explicitly listed toolsets are available to the agent
- MCP servers are treated as toolsets (named `mcp-<server-name>`)
- The Open Brain MCP server is named `mcp-open-brain`

### Solution

For agents that need brain search access, ensure `enabled_toolsets` includes `"mcp-open-brain"`:

```json
{
  "adapterConfig": {
    "enabled_toolsets": [
      "terminal",
      "file",
      "browser",
      "mcp-open-brain"
    ]
  }
}
```

**Agents affected (if using `enabled_toolsets`):**
- `Bright` (hermes_local)
- `Ringsmith` (hermes_local)
- `Wings` (hermes_local)

These agents require manual update in Paperclip's adapterConfig to include the `"mcp-open-brain"` toolset. This is a human/Paperclip responsibility, not handled by this configuration commit.

### Default Behavior

Agents **without** `enabled_toolsets` configured automatically see all available MCP servers, including brain tools.

## MCP Search API

Once configured, the Open Brain MCP server exposes these primary operations:

### Search

**POST** `/functions/v1/search`

```bash
curl -X POST http://127.0.0.1:8787/functions/v1/search \
  -H "x-brain-key: $BRAIN_ACCESS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search query"}'
```

**Response field:** `matches` (array of matching thoughts with similarity scores)

### Additional OB1 Endpoints

The local brain supports standard OB1 operations for querying, storing, and managing thoughts.

## Testing & Verification

### 1. Verify Local OB1 is Running

```bash
curl http://127.0.0.1:8787/health 2>/dev/null | jq .
```

Expected: HTTP 200 with health status.

### 2. Verify Brain Key

Check that the key is available:

```bash
cat ~/Projects/Agentic OS/brains/aegis-local-brain/.env | grep BRAIN_ACCESS_KEY
```

### 3. Test Search

```bash
BRAIN_ACCESS_KEY=$(cat ~/Projects/Agentic OS/brains/aegis-local-brain/.env | grep BRAIN_ACCESS_KEY | cut -d= -f2)
curl -X POST http://127.0.0.1:8787/functions/v1/search \
  -H "x-brain-key: $BRAIN_ACCESS_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

### 4. Verify MCP Server is Loaded in Hermes

When starting a Hermes agent, check logs for MCP initialization:

```bash
hermes chat 2>&1 | grep -i "mcp\|brain\|open-brain"
```

Look for messages like:
- `Loading MCP server: open-brain`
- `MCP server open-brain initialized successfully`

### 5. Test Agent Brain Search

In a Hermes session, directly test brain search:

```
@user: search the brain for "JAC-3487"
```

The agent should use the `mcp-open-brain` tools to query the local brain.

## Restart Behavior

**No restart required.** When the Hermes configuration changes:
- Next `hermes_local` heartbeat run picks up the updated config
- Gateway agents (hermes_gateway) pick up changes on next session initialization
- Existing active sessions retain their MCP server list (they don't reload mid-session)

## Troubleshooting

### Brain Search Tools Not Showing

1. **Check enabled_toolsets:** If the agent has `enabled_toolsets` set, verify `"mcp-open-brain"` is in the list
2. **Check local OB1 is running:** `curl http://127.0.0.1:8787/health`
3. **Check wrapper script permissions:** `ls -la /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh`
4. **Check BRAIN_ACCESS_KEY:** `cat ~/Projects/Agentic OS/brains/aegis-local-brain/.env`

### Search Returns No Results

1. **Verify brain has data:** The Aegis brain should have 25,725+ thoughts (as of 2026-07-10)
2. **Check query syntax:** OB1 search uses semantic matching, not keyword matching
3. **Check brain is actively capturing:** Verify the OrbStack compose stack is running

### MCP Server Fails to Load

1. **Check wrapper script is executable:** `chmod +x /Users/hermes/.hermes/bin/openbrain-mcp-wrapper.sh`
2. **Check script dependencies:** The wrapper may depend on Python or other tools
3. **Check local OB1 connectivity:** Ensure `http://127.0.0.1:8787` is reachable

## Configuration Template

For new Hermes profiles or hosts, use this template in `~/.hermes/profiles/<profile>/config.yaml`:

```yaml
mcp_servers:
  open-brain:
    command: /path/to/openbrain-mcp-wrapper.sh
    enabled: true
```

Replace `/path/to/openbrain-mcp-wrapper.sh` with the actual path to the wrapper on the host.

## Related Documentation

- **CLAUDE.md** (Aegis host contract): `/Users/hermes/.claude/CLAUDE.md`
- **OB1 Local Brain**: `~/Projects/Agentic OS/brains/aegis-local-brain/`
- **Hermes Agent MCP Guide**: https://github.com/NousResearch/hermes-agent/docs/mcp.md
- **Model Context Protocol**: https://modelcontextprotocol.io/

## Implementation Date

- **Configuration finalized**: 2026-07-26
- **Prior attempt**: 2026-07-21 (manual, untracked)
- **Blockers resolved**: Toolsets allowlist gotcha identified and documented
