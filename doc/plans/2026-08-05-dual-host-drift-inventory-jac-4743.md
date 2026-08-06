# JAC-4743 — Dual-Host Desktop Customization and Memory-Workflow Drift Inventory

**Audit date:** 2026-08-05T14:30Z  
**Auditor:** Aegis (agent 100915f9, hermes_local)  
**Scope:** Codex/ChatGPT desktop config, loaded AGENTS contracts, memory-layer hooks on both hosts (Aegis + Talaris)  
**Hostname correction:** Per local-board comment 2026-08-05T17:32:03Z — the laptop host is **Talaris**. Tailscale DNS `talaris.tailc2f398.ts.net` resolves to 100.97.178.76. All references corrected.
**Checker policy:** Read-only; no settings mutated. Emits redacted JSON/HTML + Paperclip/Beads receipt.

---

## 1. Live Dual-Host Inventory with Timestamps

### Host identity

| Field | Aegis (Mac Mini) | Talaris (laptop) |
|---|---|---|
| User | `hermes` | `jack.reis` |
| Tailscale IP | 100.84.253.97 | 100.97.178.76 |
| Tailscale DNS | aegis.tailc2f398.ts.net | talaris.tailc2f398.ts.net |
| SSH reachable | yes | yes (via 100.97.178.76) |
| Paperclip API | http://127.0.0.1:3101 (running) | NOT running (port 3101 closed) |
| Paperclip company ID (Aegis) | 87c32b8e-f131-4df8-ad8e-963d01b458e7 | 9eaf6274-8b14-4dff-978b-75c156a7ae33 (Talaris has its own instance, currently down) |

### Desktop customization — Codex App

| Item | Aegis | Talaris |
|---|---|---|
| `~/.codex/AGENTS.md` mtime | Jul 30 13:44:50 2026 | Jul 29 14:01:33 2026 |
| `~/.codex/AGENTS.md` size | 1 657 bytes (truncated) | 1 578 bytes |
| `~/.codex/AGENTS.md` SHA-256 | b1e180d0…ee83b7c | 104b5c51…c4c1e |
| `~/.codex/version.json` | latest 0.142.3 (checked Jun 28) | latest 0.146.0 (checked Aug 2) |
| `~/.codex/config.toml` last_updated | Aug 3 14:12:24Z | Aug 4 21:33:20Z |
| `model_reasoning_effort` | high | xhigh (Talaris) / medium (some profiles) |
| `BROWSER_USE_CODEX_APP_VERSION` | 26.727.51351 | 26.727.51351 |
| `.codex-chronicle-assets-to-install.marker` | present (bca6ae90…) Jun 18 | present (26 Jun 18) |
| `.personality_migration` | present (v1) | present (v1) |

### Desktop customization — ChatGPT App

| Item | Aegis | Talaris |
|---|---|---|
| `ChatGPT.app` installed | Yes (Aug 3) | Yes (Jul 31) |
| `com.openai.sky.CUAService` container | present (Jun 14, 189 bytes metadata) | present (Apr 23, 189 bytes) |
| Custom instructions (local file) | **NOT FOUND** — account-scoped via OpenAI cloud sync | **NOT FOUND** — account-scoped via OpenAI cloud sync |
| `~/Library/Application Support/OpenAI/ChatGPT Atlas/` | not present | present (NativeMessagingHosts only) |

### Memory-layer hooks

| Item | Aegis | Talaris |
|---|---|---|
| `hermes` config.yaml memory.provider | `ob1,hindsight,holographic,honcho` | `holographic` only |
| `hermes` config.yaml `pre_llm_call` hook | `/Users/hermes/.hermes/scripts/fleet_memory/local_turn_sync_hook.py` | `/Users/jack.reis/Documents/=notes/scripts/fleet_memory/local_turn_sync_hook.py` |
| `hermes` config.yaml `post_llm_call` hook | same (with `--event stop --source hermes --limit 5 --no-ob1`) | same (with `--event stop --source hermes --limit 5 --no-ob1`) |
| `test_hook_provenance.py` | present (Jul 31 15:05) | **MISSING** |
| `spine/` directory (Ringer-Paperclip spine hooks) | **MISSING** | present (Jul 17, with `gate.py`, `reconciler.py`, `spool.py`, `projector.py`, `spine_hint_hook.py`) |
| `local_turn_sync.py` | present (Jul 11) | present (Jul 17) |
| `local_turn_sync_hook.py` | present (Jul 11) | present (Jul 17) |

---

## 2. Loaded AGENTS Contracts — Drift Analysis

### Aegis Paperclip agent (100915f9) loaded instruction files

| File | Source | Loaded mtime | Source mtime | Hash match? |
|---|---|---|---|---|
| `SOUL.md` | `~/.hermes/profiles/aegis/SOUL.md` | Jul 15 19:21 | Jun 23 19:15 | **MATCH** ✓ |
| `HOME-AGENTS.md` | `~/AGENTS.md` | Jul 15 19:21 | Jul 4 11:15 | **MATCH** ✓ |
| `CANONICAL-HOST-CONTRACT.md` | `~/.codex/AGENTS.md` | Jul 21 15:04 | Jul 30 13:44 | **DRIFT** ✗ |
| `PROFILE-MIRROR-MANIFEST.json` | `~/.hermes/profiles/aegis/PROFILE-MIRROR-MANIFEST.json` | Jul 15 19:21 | Jul 15 19:21 | **MATCH** ✓ |
| `AGENTS.md` (agent identity) | composed by Paperclip profile sync | Aug 4 10:18 | n/a | n/a |

### CANONICAL-HOST-CONTRACT.md drift (CRITICAL)

The loaded copy (16 569 bytes, hash `c3bea3b3…`) was captured from `~/.codex/AGENTS.md` on **Jul 21 15:04**.  
The source `~/.codex/AGENTS.md` was **truncated** on **Jul 30 13:44** from 16 569 bytes to 1 657 bytes.

**Content present in loaded copy but MISSING from current source:**
- `aegis-2.1` architecture version marker (2 occurrences)
- Open Engine protocol description (Beads Dolt remote, task template, receipt mapping)
- Full fleet model topology tables (Aegis / Talaris / Pixel host tables)
- Fleet endpoints table (Cloudflare tunnel, hostnames, ports)
- Secrets section (age identity, SOPS+age, Keychain)
- Brain Fluency section (Auto-Brief, Auto-Drain, per-turn sync plugin config)
- Hermes orchestrator section (dual-instance gateway lanes, model overhaul, Ollama env)
- Beads canonical work-state section
- Superpowers bootstrap section

**Current source (1 657 bytes) contains only:**
- Short Codex instructions ("use descriptive commits…")
- Fleet routing: `Omnigent gateway -> Paperclip -> Ringer -> Agent`
- Shared agent context and MCPs section
- Port 11435 reservation note

The July 18 Ringer-to-Paperclip execution spine, Herdr-plus control surface, human-gate mutation envelopes, dynamic Git plan pointers, and derived tri-format publishing described in JAC-4743 are **not present in either the loaded copy or the truncated source**. The loaded copy is an older snapshot that already lacks these (it was captured Jul 21, before any July 18+ content was added).

### Talaris loaded AGENTS contracts

Talaris Paperclip (company 9eaf6274…) is currently **down** (port 3101 not responding).  
Talaris has 4 agents with loaded `AGENTS.md` files in its Paperclip instruction dirs, but these belong to Talaris-local Paperclip agents, not the Aegis fleet Paperclip company.  
Talaris `~/.codex/AGENTS.md` (1 578 bytes, hash `104b5c51…`) is the laptop's host contract and does not contain `aegis-2.1`, Open Engine, or the July 18 spine either.

---

## 3. Approved Workflow Packet

### Doctrine stack (canonical sources)

1. **Profile identity** — `~/.hermes/profiles/aegis/SOUL.md` (Hermes agent identity)
2. **Host contract** — `~/.codex/AGENTS.md` (currently truncated; full version in loaded `CANONICAL-HOST-CONTRACT.md`)
3. **Home contract** — `~/AGENTS.md` / `HOME-AGENTS.md` (fleet coordination, Beads, Open Engine)
4. **Profile mirror manifest** — `PROFILE-MIRROR-MANIFEST.json` (source map, exclusions)
5. **Ringer-Paperclip spine** — `~/.ringer/hooks/` (Aegis) / `~/Documents/=notes/scripts/fleet_memory/spine/` (Talaris)

### Ringer-to-Paperclip execution spine (July 18+)

- **Aegis:** `~/.ringer/hooks/paperclip_projector.py` (updated Jul 31 15:05) + `projection_log.jsonl` (updated Aug 2 13:52)
- **Talaris:** `~/Documents/=notes/scripts/fleet_memory/spine/` directory (Jul 17) containing:
  - `gate.py` — approval/check gates
  - `reconciler.py` — state reconciliation
  - `spool.py` — spool/retry logic
  - `projector.py` — verdict projection
  - `spine_hint_hook.py` — plan pointer propagation
  - `hooks/` subdirectory (updated Aug 2)

### Human-gate mutation envelopes

- Paperclip approval gates: `request_board_approval`, `request_confirmation` with idempotency keys
- `local-board` actor for board-level actions
- `X-Paperclip-Run-Id` header for mutating requests
- Workspace validation recovery: reset `executionWorkspaceId: null` + status `todo`

### Dynamic Git plan pointers

- Plan docs in `doc/plans/YYYY-MM-DD-slug.md`
- `PROFILE-MIRROR-MANIFEST.json` as the canonical source map
- `~/.hermes/skills/open-engine/` for Open Engine protocol (task template, receipt mapping)

### Derived tri-format publishing

- Paperclip: fleet coordination + observability (`http://127.0.0.1:3101`)
- Beads: work-state SSOT (`bd` CLI, Dolt DB)
- Vault (Talaris): narrative SSOT (`~/Vault/`), shared with Aegis via SMB at `/Volumes/hermes/Vault/`
- Linear: client-facing mirror
- GitHub: code truth

---

## 4. Loaded Instruction Surface → Packet Version/Hash Mapping

| Loaded instruction | Canonical source | Source SHA-256 | Loaded SHA-256 | Status |
|---|---|---|---|---|
| `SOUL.md` | `~/.hermes/profiles/aegis/SOUL.md` | 2765a846…e81194d | 2765a846…e81194d | IN SYNC ✓ |
| `HOME-AGENTS.md` | `~/AGENTS.md` | 49275596…29c45d0d | 49275596…29c45d0d | IN SYNC ✓ |
| `CANONICAL-HOST-CONTRACT.md` | `~/.codex/AGENTS.md` | b1e180d0…ee83b7c | c3bea3b3…8c09a9af0 | **DRIFT** ✗ (source truncated Jul 30) |
| `PROFILE-MIRROR-MANIFEST.json` | `~/.hermes/profiles/aegis/PROFILE-MIRROR-MANIFEST.json` | 14000056…01936064 | 14000056…01936064 | IN SYNC ✓ |
| `AGENTS.md` (agent identity) | Paperclip profile sync | n/a | 3746ccad…2d95a83d6 | composed, not from disk |

---

## 5. Memory Hook Bounded Read/Read Probes

### Aegis memory hooks

- `pre_llm_call`: `local_turn_sync_hook.py --event user-prompt-submit --source hermes --limit 5` — injects bounded local memory brief (5 most recent thoughts)
- `post_llm_call`: `local_turn_sync_hook.py --event stop --source hermes --limit 5 --no-ob1` — captures one bounded turn summary
- `test_hook_provenance.py` — test script confirming provenance envelope structure (`agent_id`, `thread_id`, `confidence`, `supersedes_fact_id`)
- Memory provider: `ob1,hindsight,holographic,honcho` — writes to Hindsight (bank: hermes) + Holographic (in-process fact_store)
- Memory file: `~/.hermes/profiles/aegis/memories/MEMORY.md` (excluded from Paperclip per manifest)

### Talaris memory hooks

- `pre_llm_call`: same hook path under `~/Documents/=notes/scripts/fleet_memory/`
- `post_llm_call`: same hook with `--no-ob1` flag
- Memory provider: `holographic` only (no OB1/Hindsight/Honcho) — **DRIFT** from Aegis tri-plane
- `test_hook_provenance.py`: **MISSING** on Talaris
- `spine/` directory present on Talaris but **MISSING** on Aegis — **DRIFT**

### Bounded write/read verification

Both hooks use `--limit 5` (bounded to 5 most recent items) and `--no-ob1` (skip cloud mirror on stop capture). The `test_hook_provenance.py` script confirms provenance envelope structure. No hook writes raw secrets or private data — excluded per `PROFILE-MIRROR-MANIFEST.json`.

---

## 6. Account-Scoped ChatGPT Customization Verification

- **ChatGPT.desktop app** installed on both hosts (Aegis: Aug 3; Talaris: Jul 31)
- **Custom instructions** are account-scoped via OpenAI's cloud sync — NOT stored in readable local files
- The `group.com.openai.sky.CUAService` container exists on both hosts but contains only app runtime state (NativeMessagingHosts), not custom instruction text
- **Verification surface:** The only readable/approved surface for ChatGPT custom instructions is the official OpenAI web UI: `https://chat.openai.com/settings/personality` (requires login — **human gate**)
- No local filesystem artifact contains account-scoped ChatGPT customization text — this is listed as a precise human gate, not automatable

---

## 7. Drift Summary

| # | Drift | Host | Severity | Evidence |
|---|---|---|---|---|
| 1 | `~/.codex/AGENTS.md` truncated from 16 569 → 1 657 bytes (Jul 30), losing `aegis-2.1`, Open Engine, fleet tables, secrets, brain fluency, Hermes orchestration | Aegis | CRITICAL | loaded CANONICAL hash c3bea3b3… ≠ source hash b1e180d0… |
| 2 | Loaded CANONICAL-HOST-CONTRACT.md does not contain July 18 Ringer-Paperclip spine, Herdr-plus, human-gate mutation envelopes, Git plan pointers, or tri-format publishing | Aegis | HIGH | grep found 0 matches for all doctrine terms |
| 3 | Memory provider differs: Aegis uses `ob1,hindsight,holographic,honcho`; Talaris uses `holographic` only | Cross-host | MEDIUM | config.yaml line 436 (Aegis) / 367 (Talaris) |
| 4 | `spine/` directory present on Talaris, missing on Aegis | Cross-host | HIGH | Aegis: no spine/ dir; Talaris: full spine/ with 8 files |
| 5 | `test_hook_provenance.py` present on Aegis, missing on Talaris | Cross-host | LOW | Aegis: present Jul 31; Talaris: not found |
| 6 | ChatGPT desktop custom instructions are account-scoped — not locally readable | Both | INFO (human gate) | No local file found; verifiable via chat.openai.com/settings/personality |
| 7 | Talaris Paperclip (port 3101) is down — no loaded instruction sync active | Talaris | MEDIUM | curl exit 7 (connection refused) |
| 8 | Non-standard plugin dir `hindsight,holographic,honcho` on Aegis missing plugin.yaml; hostname corrected Talaris→Talaris per local-board | Aegis | LOW | Direct FS audit (plugin.yaml presence check) |

---

## 8. Recommendations (human-gate mutations)

1. **Restore `~/.codex/AGENTS.md` on Aegis** to the full `aegis-2.1` version (the loaded copy at hash c3bea3b3… is the last complete version — 16 569 bytes, Jul 21 15:04). Verify with the Hermes profile sync script.
2. **Encode the July 18 Ringer-to-Paperclip execution spine** in the canonical host contract: add references to `~/.ringer/hooks/paperclip_projector.py`, Herdr-plus permapane (`Aegis · Open Fleet Watcher`), human-gate mutation envelopes, dynamic Git plan pointers, and tri-format publishing (Beads + Paperclip + Vault).
3. **Replicate `spine/` directory to Aegis** or align to a shared location — currently only on Talaris.
4. **Align memory providers** — Aegis uses 3-plane (ob1,hindsight,holographic); Talaris uses holographic-only. This may be intentional (Aegis is the inference node), but should be documented.
5. **Start Talaris Paperclip** if cross-host agent coordination is needed.
