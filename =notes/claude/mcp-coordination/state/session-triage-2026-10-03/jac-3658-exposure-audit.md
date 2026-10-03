# JAC-3658 Telegram Token Exposure Audit
**Date:** 2026-10-03  
**Status:** READ-ONLY AUDIT COMPLETE  
**Findings:** Multiple token exposures identified

---

## Location 1: kimi-telegram-sync env/launch config

### Files Scanned
- `~/Library/LaunchAgents/com.jackreis.kimi-telegram-sync.plist.disabled-20260824-travel`
- `~/Library/LaunchAgents/com.jackreis.claude-telegram-inbox.plist.disabled-20260824-travel`
- `~/.config/herdr/` env files

### Findings — EXPOSED
✗ **CRITICAL:** `~/.config/herdr/tg-bridge.env` contains plaintext `HERDR_TG_TOKEN` (Telegram bot token)
✗ **CRITICAL:** `~/.config/herdr/tg-bridge.env.bak-20260726-132741` — backup with plaintext token
✗ **CRITICAL:** `~/.config/herdr/tg-bridge.env.bak-20260805` — backup with plaintext token

**Token Injection Method:** Inline plaintext (NOT SOPS-wrapped)  
**Exposure Level:** HIGH — file is readable by any process running as jack.reis user

### File Permissions
```
-rw-r--r-- @ — world-readable
```

---

## Location 2: ~/.zshrc decryption lines

### Findings — COMPLIANT
✓ SOPS+age decryption loop found (lines 158–171)
✓ Pattern: `eval "$(sops -d ..."` — correct pattern (sourced to current shell only)
✓ **No plaintext Telegram exports** in ~/.zshrc

### SOPS Files Involved
- `~/.secrets/hermes-runtime.env` — ENCRYPTED (contains Telegram bot tokens, injected into tmux)
- `~/.secrets/openclaw-runtime.env` — ENCRYPTED (contains Telegram bot tokens, injected into tmux)
- Other provider env files — ENCRYPTED

**Var Names Exported (names only):**
- `HERMES_TELEGRAM_BOT_TOKEN` — via hermes-runtime.env
- `OPENCLAW_TELEGRAM_BOT_TOKEN` — via openclaw-runtime.env
- Other bot tokens (16 total discovered in tmux, sourced from SOPS at login)

**Export Scope:** SOPS vars exported to every interactive shell that sources ~/.zshrc

---

## Location 3: tmux server global environment

### Findings — EXPOSED VIA INHERITANCE
✗ **18 Telegram bot token vars** present in tmux global env:
  - `ANTIGRAVITY_TELEGRAM_BOT_TOKEN`
  - `BLUE_TELEGRAM_BOT_TOKEN`
  - `CLAUDE_CODE_BRIDGE_TELEGRAM_BOT_TOKEN`
  - `CLAUDE_CODE_BRIDGE_TELEGRAM_CHAT_ID`
  - `HERMES_TELEGRAM_BOT_TOKEN`
  - `KIMI_TELEGRAM_BOT_TOKEN` ← **kimi-telegram-sync uses this**
  - `KLAUDE_TELEGRAM_BOT_TOKEN`
  - `MARIA_TELEGRAM_BOT_TOKEN`
  - `NEMOCLAW_TELEGRAM_BOT_TOKEN`
  - `NEO_TELEGRAM_BOT_TOKEN`
  - `OPENCLAW_TELEGRAM_BOT_TOKEN`
  - `OPENCODE_TELEGRAM_BOT_TOKEN`
  - `PI_TELEGRAM_BOT_TOKEN`
  - `TAG_TELEGRAM_BOT_TOKEN`
  - `TAG_TELEGRAM_CHAT_ID`
  - `TELEGRAM_BOT_TOKEN` ← generic, context unclear
  - `WINGARDIA_TELEGRAM_BOT_TOKEN`
  - `ZATARA_TELEGRAM_BOT_TOKEN`

**Source:** SOPS-encrypted files, injected at shell login → inherited by tmux server on first attach  
**Exposure Level:** HIGH — tokens inherit into every pane/window spawned from that tmux session  
**Not from tmux.conf:** No plaintext tokens in `~/.tmux*` or `~/.config/tmux*`

### Exposure Mechanism
1. ~/.zshrc sources SOPS-encrypted runtime env files via `eval "$(sops -d ...)"`
2. All vars become available to current shell
3. When tmux attaches, inherited shell env → tmux global env via `show-environment -g`
4. Every pane/window gets these tokens automatically

---

## Location 4: ~/.claude/channels/telegram/.env

### Findings — NOT FOUND
✓ File does not exist — no exposure here

---

## Summary by Exposure Type

| Type | Count | Severity | Notes |
|------|-------|----------|-------|
| Plaintext tokens in ~/.config/*.env | 3 files (1 active, 2 backups) | CRITICAL | HERDR_TG_TOKEN exposed |
| Tokens in tmux global env | 18 bot tokens | HIGH | Inherited from SOPS via shell login; design issue, not storage issue |
| Tokens in ~/.zshrc | 0 plaintext | SAFE | All via SOPS+age (encrypted at rest) |
| Tokens in launchd plist | 0 bot tokens | SAFE | Only contains non-secret chat IDs |

---

## Remediation Checklist

**Step 1: Rotate the exposed token**
- Use BotFather to regenerate the @herdr_talaris_bot token
- Note the new token (will paste in Step 2)

**Step 2: Move token to SOPS (encrypted storage)**
- Determine which SOPS file should own this token (likely `~/.secrets/hermes-runtime.env` since it's agent-related)
- Update that SOPS file with the new token value:
  ```bash
  sops ~/.secrets/hermes-runtime.env
  # Add or update: HERDR_TG_TOKEN=<new_token_from_BotFather>
  # Save and close
  ```

**Step 3: Remove plaintext copies**
- Delete the plaintext env file:
  ```bash
  rm ~/.config/herdr/tg-bridge.env
  ```
- Delete backup copies:
  ```bash
  rm ~/.config/herdr/tg-bridge.env.bak-20260726-132741
  rm ~/.config/herdr/tg-bridge.env.bak-20260805
  ```

**Step 4: Lock file permissions (temporary mitigation for any missed copies)**
- Find any remaining copies:
  ```bash
  find ~/.config -name "tg-bridge.env*" -type f
  ```
- If any remain, chmod to 600 (owner read/write only):
  ```bash
  chmod 600 ~/.config/herdr/tg-bridge.env*
  ```

**Step 5: Update agent configuration**
- Update launchd plist or agent config to source from SOPS instead of plaintext env file
- For ai.rbitr.dramatis.plist: add decryption before launch (use `sops exec-env` pattern)
- Example pattern:
  ```bash
  sops exec-env ~/.secrets/hermes-runtime.env 'launchctl load <plist>'
  ```

**Step 6: Restart affected services**
- Hermes agent (uses HERDR_TG_TOKEN):
  ```bash
  launchctl unload ~/Library/LaunchAgents/ai.hermes.plist
  launchctl load ~/Library/LaunchAgents/ai.hermes.plist
  ```
- tmux server (clears inherited env):
  ```bash
  tmux kill-server  # if safe; otherwise manual session restart
  ```

**Step 7: Verify exposure is closed**
- Confirm plaintext files are gone:
  ```bash
  ls -la ~/.config/herdr/tg-bridge.env* 2>&1 | grep -c "No such file"  # should be 1+ matches
  ```
- Confirm token is SOPS-wrapped:
  ```bash
  sops ~/.secrets/hermes-runtime.env | grep HERDR_TG_TOKEN  # should show encrypted marker, not token
  ```
- Verify tmux env after restart:
  ```bash
  tmux show-environment -g | grep HERDR_TG_TOKEN  # verify it's there (from SOPS now)
  ```

---

## Design Notes (not for immediate action)

**Tmux token inheritance issue:** Currently, all bot tokens from SOPS are injected into the tmux global environment. This means every pane/window spawned from tmux gets all tokens, violating least-privilege. Future fix:
- Load only the tokens needed by the primary tmux session
- Use tmux `source-file` with conditional loads per session/pane purpose

**Backup retention:** The two .bak files contain old tokens. If they're old tokens (already rotated), they're lower risk, but should still be removed to reduce blast radius.

---

## Audit Metadata

- **Auditor:** claude-code (session:f231ebd9)
- **Audit Date:** 2026-10-03
- **Worktree:** `~/Documents/worktrees/ws3-jac3658`
- **Commit:** pending
