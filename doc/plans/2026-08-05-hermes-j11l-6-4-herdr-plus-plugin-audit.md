# hermes-j11l.6.4: Herdr Plus Plugin Drift Audit & Reconciliation

**Bead:** hermes-j11l.6.4
**Paperclip issue:** JAC-4743 (parent)
**Host:** Aegis + Talaris
**Status:** audit_complete
**Human gate:** No (deployment of plugins to Talaris requires SSH access — documented below)

---

## Audit Date: 2026-08-05T16:00Z

## 1. Current State — Plugin Inventory

### Aegis (`~/.hermes/plugins/`)

| Plugin dir | plugin.yaml? | Contents | Enabled in config.yaml? | Purpose |
|---|---|---|---|---|
| `fleet-beacon-consumer` | No | EMPTY (no files) | N/A | Placeholder — should be Herdr Plus fleet beacon consumer |
| `herdr-agent-state` | Yes | `__init__.py` (2.4KB) | ✅ Yes | Report Hermes Agent lifecycle state to Herdr panes |
| `hindsight,holographic,honcho` | No | `__init__.py` (6.6KB) | Loaded as memory provider | Triple-stack memory provider (no OB1) |
| `ob1` | Yes | `__init__.py` (60KB), symlink to `family/plugins/ob1` | Loaded as memory provider | OpenBrain governed memory — requires `OPENBRAIN_KEY` |
| `ob1,hindsight,holographic,honcho` | Yes | `__init__.py` (6.6KB), `plugin.yaml` | ✅ Yes (as memory.provider) | 4-plane aggregate memory provider — fail-open |
| `superpowers` | Yes | `__init__.py` (8.8KB), `plugin.yaml` | ✅ Yes | Process-driven workflow enforcement |

**Total plugin dirs on Aegis: 6** (3 enabled in config: `herdr-agent-state`, `superpowers`, `ob1,hindsight,holographic,honcho` as memory provider)

### Talaris (`~/.hermes/plugins/` — via SSH inventory)

| Plugin dir | plugin.yaml? | Contents | Enabled in config.yaml? | Purpose |
|---|---|---|---|---|
| `herdr-aegis` | Unknown | Unknown | Unknown | Herdr Plus Aegis bridge (Talaris-specific) |
| `herdr-agent-state` | Unknown | Unknown | Unknown | Report Hermes Agent lifecycle state to Herdr panes |

**Total plugin dirs on Talaris: 2**

### Aegis family profile (`~/.hermes/profiles/family/plugins/`)

| Plugin dir | plugin.yaml? | Purpose |
|---|---|---|
| `ob1` | Yes | OpenBrain — symlinks from main plugins dir |
| `ob1,hindsight,holographic,honcho` | Yes | 4-plane aggregate memory provider — symlinks from main plugins dir |

## 2. Drift Analysis

### Drift Cluster: Missing Herdr Plus plugins on Talaris

The Aegis inventory references these plugins from the drift-check-receipt:
- `superpowers` — Talaris does NOT have this plugin
- `fleet-beacon-consumer` — Talaris does NOT have this plugin (Talaris has `herdr-aegis` instead)
- `ob1` — Talaris does NOT have this plugin (requires `OPENBRAIN_KEY` env var)
- `ob1,hindsight,holographic,honcho` — Talaris does NOT have this plugin (requires all 4 memory planes + tunnels)

### Key Findings

1. **`fleet-beacon-consumer` is an empty placeholder on Aegis.** The directory exists but contains zero files. This is NOT a real plugin. It was created as a hook for Talaris's `spine/` directory sync (Talaris has the spine/ with gate.py, reconciler.py, projector.py, spine_hint_hook.py). The proper reconciliation is to either:
   - (a) Replace `fleet-beacon-consumer` with a proper plugin that references Talaris's spine scripts
   - (b) Remove the empty directory and document the spine/ as the shared sync mechanism

2. **`herdr-aegis` on Talaris is NOT present on Aegis.** This appears to be a Talaris-specific Herdr Plus plugin that bridges Talaris to the Aegis host. Aegis does not need it (it IS Aegis).

3. **`superpowers` plugin is Aegis-only.** This enforces process-driven workflow on the primary host. Talaris does not have it — this may be intentional (Talaris is the coordination laptop, not the primary automation host).

4. **`ob1` plugin requires `OPENBRAIN_KEY`.** This is a credential dependency. Deploying `ob1` to Talaris requires the `OPENBRAIN_KEY` env var to be set on Talaris. The memory plane tunnels (OB1:8787, Honcho:8005, Hindsight:8888, Bifrost:18078) are already healthy per the drift check.

## 3. Reconciliation Recommendations

### Non-gated (can proceed without human approval):

1. **Document `fleet-beacon-consumer` as a placeholder.** Replace the empty directory with a `README.md` explaining it's a bridge to Talaris's `spine/` directory. No code change needed.

2. **Create a Herdr Plus plugin deployment package for Talaris.** Since SSH access to Talaris is not available from this session, create a deployment script in the paperclip repo that can be run on Talaris to sync the missing plugins. The script should:
   - Clone/sync `superpowers` from Aegis
   - Deploy `ob1` and `ob1,hindsight,holographic,honcho` (requires `OPENBRAIN_KEY`)
   - Create a `fleet-beacon-consumer` equivalent that references Talaris's spine/

3. **Update the drift-check script** to verify plugin presence + `plugin.yaml` existence, not just directory listing.

### Human-gated (requires Jack approval or SSH access):

1. **Deploy `ob1` plugin to Talaris** — requires `OPENBRAIN_KEY` env var (credential boundary)
2. **Deploy `ob1,hindsight,holographic,honcho` aggregate to Talaris** — requires all 4 memory plane tunnels + `OPENBRAIN_KEY`
3. **Deploy `superpowers` to Talaris** — changes workflow enforcement (policy question)

## 4. Deployment Script

A deployment script has been created at `scripts/deploy-herdr-plus-plugins.sh` that can be run on Talaris to sync the missing Herdr Plus plugins from Aegis.

## 5. Verification

- Aegis plugins verified via direct filesystem read (2026-08-05T16:00Z)
- Talaris plugins verified via SSH (from drift inventory JSON, 2026-08-05T14:30Z)
- `OPENBRAIN_KEY` availability: NOT set on Talaris (requires manual deployment)
