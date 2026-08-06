# JAC-4745 Verification Evidence — 2026-08-05T17:45Z

## Summary
Independent verification of JAC-4745 wake comment claims. All findings confirmed accurate.

## 1. Recovery Script (line 91) — FIXED and COMMITTED

**File:** `/Users/hermes/Projects/paperclip/scripts/ollama-cloud-key-recovery.sh` line 91

**Verification method:** Raw byte inspection via `xxd` and `od -c`, plus Python byte-level string check.

**Finding:** Line 91 contains `$NEW_KEY` (bytes: `24 4e 45 57 5f 4b 45 59`), NOT the literal `***`.
- The terminal display renders `$NEW_KEY` as `***` due to shell expansion in the display pipeline — this is a **display artifact**, not a file content issue.
- Raw byte inspection confirms the file is correct.

**Git state:** Fix committed at `06520263f` ("Dinkelspiel JAC-4503: Expand ollama-cloud key recovery to all 8 locations").
- `git diff` shows no uncommitted changes.
- `git show HEAD:scripts/ollama-cloud-key-recovery.sh` line 91 also contains `$NEW_KEY`.
- `bash -n` syntax check: OK.

**Python verification:**
```
assert '$NEW_KEY' in line91  # PASS
assert '***' not in line91   # PASS
```

## 2. Stale Key Confirmed Dead — VERIFIED (live POST)

**Test:** POST to `https://ollama.com/v1/chat/completions` with stale key from `~/.hermes/.env`

**Result:** HTTP 401 — stale key confirmed dead.

Stale key prefix: `1d9a89ce3a91...`

## 3. Fleet Key Distribution Inventory — VERIFIED (8 locations)

Script targets these paths via `PROFILES_DIR="/Users/hermes/.hermes/profiles"`:

**Stale key (`1d9a89ce3a...`) in 5 locations:**
- `~/.hermes/profiles/aegis/.env`
- `~/.hermes/profiles/paperclip-compact/.env`
- `~/.hermes/profiles/luna/.env`
- `~/.hermes/.env`
- `~/.config/ringer/cloud-keys.env` (SOPS-encrypted)

**Truncated placeholder (`sk-tes...2345`) in 3 locations:**
- `~/.hermes/profiles/worker/.env`
- `~/.hermes/profiles/family/.env`
- `~/.hermes/profiles/zatara/.env`

## 4. Recovery Script — READY

Tested sed replacement logic with a dummy key — replacement operation works correctly (verified via Python byte check). The script is ready to run.

## Status: BLOCKED

**Blocking owner:** Jack (human operator)
**Blocking action:** Visit https://ollama.com/settings/api-keys, log in, generate a new API key, and paste the value as a comment on JAC-4503.

**Verification path (ready):**
```bash
NEW_KEY=<paste_key_here> bash scripts/ollama-cloud-key-recovery.sh
```
This will propagate the key to all 8 fleet profile locations and verify with a live POST to https://ollama.com/v1/chat/completions.
