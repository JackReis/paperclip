# Memory Bridge Plugin

Wires Paperclip agents to the local fleet memory substrate (OBn, Holographic, Hindsight) through the `local-turn-sync` CLI. This is the minimal plugin-provider seam described in `doc/plans/2026-03-17-memory-service-surface-api.md` — tools only, no host-side memory tables or adapters.

## Tools

| Tool | Arguments | CLI invocation |
|------|-----------|----------------|
| `memory_search` | `query` (required), `limit` (default 5, max 50) | `local-turn-sync brief --limit <N> -- <query>` |
| `memory_note` | `text` (required, max 4000 chars), `kind` (default `fact`), `taskId` (default `paperclip/manual`) | `local-turn-sync capture --source paperclip --task-id <taskId> --kind <kind> -- <text>` |

Both tools fail open: any CLI failure (missing binary, nonzero exit, timeout) returns `{ ok: false, error }` in the tool result data instead of throwing, so agent runs continue when the memory substrate is unavailable.

## Safety

- The CLI is invoked with `execFile` (explicit argv, no shell), so values cannot be interpreted as shell syntax.
- A `--` separator precedes all free-text positionals, so text starting with `-` cannot be parsed as a CLI flag.
- `kind` and `taskId` are restricted to a token alphabet and fall back to defaults when unsafe.
- Free text is capped at 4000 characters and stripped of control characters.
- Each operation is written to the plugin activity log and the structured plugin logger.

## Configuration

- `localTurnSyncPath` — absolute path to the `local-turn-sync` executable. Defaults to `/Users/jack.reis/Documents/=notes/bin/local-turn-sync`.

## Develop

```bash
pnpm --filter @paperclipai/plugin-memory-bridge build
pnpm --filter @paperclipai/plugin-memory-bridge typecheck
pnpm --filter @paperclipai/plugin-memory-bridge test
```

Real-CLI round-trip smoke (writes to the live local memory planes):

```bash
PAPERCLIP_MEMORY_BRIDGE_REAL_CLI=1 pnpm --filter @paperclipai/plugin-memory-bridge exec vitest run tests/integration.real-cli.spec.ts
```

## Install into a running Paperclip

```bash
pnpm --filter @paperclipai/plugin-memory-bridge build
paperclipai plugin install /absolute/path/to/packages/plugins/examples/plugin-memory-bridge
paperclipai plugin list
```

The plugin worker shells out to the CLI on the host machine, so the running Paperclip server must be on a machine where `localTurnSyncPath` exists.
