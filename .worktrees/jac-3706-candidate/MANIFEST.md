# JAC-3706 Candidate Packet v2

## Source
- Repo: /Users/hermes/Projects/paperclip
- Branch: feat/jac-3484-routines-goals-metadata-lifecycle
- Source file: packages/adapters/hermes/src/server/execute.ts
- Test file: packages/adapters/hermes/src/server/execute.test.ts

## Candidate Dist
- File: execute.js
- SHA-256: dfa3d0873d3d80fbf4fe2239551f5d83e35676b9fb87955648ed8765e9401950
- Size: 24948 bytes

## Production (current)
- File: /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js
- SHA-256: 3f3311f169b624636f5706bfc53b08c67d8ad95a51643a4485b12b2a7c01de75
- Size: 24260 bytes

## Changes from Production (v2 — addressing Ringer review REJECT)
1. **New parser**: session_id extracted from combined stdout+stderr (not stdout-only)
2. **Stderr session_id filtering**: cancelled-session session_id on stderr not flagged as error
3. **cleanResponse handles ordering**: session_id before/after response both work
4. **Legacy regex anchored**: `^session[_ ](?:id|saved)[:\s]+` with `/im` flags — no inline prose false positives
5. **Legacy regex stdout-only**: legacy match searches stdout only, not stderr — no stderr false positives
6. **Exported for testing**: `parseHermesOutput` and `cleanResponse` are exported; tests import the actual module
7. **terminalProviderExhaustion**: preserved from production (false-green exit-0 detection)
8. **useQuiet defaults true**: preserved from production (`!== false`)
9. **model !== "auto" guard**: preserved from production (skips -m for auto)

## Test Results
- 20 tests passing (importing actual module, not replica)
- 2 new tests: inline prose false positive, stderr legacy false positive

## Mutation Table

| # | Target | Field | Pre-state | Transition | Rollback | Readback | Stop Condition | Canary |
|---|--------|-------|-----------|------------|----------|----------|----------------|--------|
| 1 | `/Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js` | file contents | SHA-256 `3f3311f1...` | Replace with candidate SHA-256 `23c45721...` | Restore backup at `/Users/hermes/.paperclip/adapter-backups/jac-3706-pre-$(date +%Y%m%dT%H%MZ)/execute.js` | `shasum -a 256 <path>` | Paperclip PID 10502 idle (no active runs); `curl -s http://127.0.0.1:3101/api/health` returns 200 after restart | `curl -s http://127.0.0.1:3101/api/health` before restart returns 200 |
| 2 | launchd label `ai.paperclip` | process state | PID 10502 running | Stop → replace file → start | `launchctl load ~/Library/LaunchAgents/ai.paperclip.plist` with backup restored | `launchctl list \| grep ai.paperclip` | PID matches expected after restart; health check passes | `launchctl list \| grep ai.paperclip` shows PID before stop |

## Deployment (human gate — label: ai.paperclip)

### Pre-flight
```bash
# Verify production hash
shasum -a 256 /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js
# Expected: 3f3311f169b624636f5706bfc53b08c67d8ad95a51643a4485b12b2a7c01de75

# Verify Paperclip is idle (no active runs)
curl -s http://127.0.0.1:3101/api/health
```

### Install
```bash
# 1. Stop Paperclip
launchctl unload ~/Library/LaunchAgents/ai.paperclip.plist

# 2. Backup current
mkdir -p /Users/hermes/.paperclip/adapter-backups/jac-3706-pre-$(date +%Y%m%dT%H%MZ)
cp /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js \
   /Users/hermes/.paperclip/adapter-backups/jac-3706-pre-$(date +%Y%m%dT%H%MZ)/

# 3. Install candidate
cp /Users/hermes/Projects/paperclip/.worktrees/jac-3706-candidate/execute.js \
   /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js

# 4. Verify SHA-256
shasum -a 256 /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js
# Expected: 23c45721fcbdc1a1d6a3787c2c7893ef3e9dc29f1a8a9d19034428d4bda9a97721

# 5. Start Paperclip
launchctl load ~/Library/LaunchAgents/ai.paperclip.plist

# 6. Verify
curl -s http://127.0.0.1:3101/api/health
```

### Rollback
```bash
launchctl unload ~/Library/LaunchAgents/ai.paperclip.plist
cp <backup-path>/execute.js /Users/hermes/.hermes/node/lib/node_modules/paperclipai/node_modules/@paperclipai/hermes-paperclip-adapter/dist/server/execute.js
launchctl load ~/Library/LaunchAgents/ai.paperclip.plist
curl -s http://127.0.0.1:3101/api/health
```
