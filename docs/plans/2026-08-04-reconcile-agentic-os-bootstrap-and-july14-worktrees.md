# JAC-4684 — Reconcile Agentic OS bootstrap shell and July 14 Ringer worktrees

**Date:** 2026-08-04
**Author:** Bright (Fleet Planning Agent)
**Status:** In Progress
**Paperclip Issue:** JAC-4684
**Run ID:** 4a2f6a2c-9e64-4961-86b4-0911655a40b8

---

## 1. Inventory

### 1.1 Talaris Home-Root Agentic OS Bootstrap Shell

The bootstrap shell for the Agentic OS consists of three scripts in the `agentic-os` repo:

| File | Path | Purpose |
|------|------|---------|
| `install.sh` | `scripts/install.sh` | Guided installer; calls `launcher-bootstrap.py` for bootstrap repair |
| `centre.sh` | `scripts/centre.sh` | Command Centre launcher; invokes `launcher-bootstrap.py` for bootstrap status |
| `launcher-bootstrap.py` | `scripts/launcher-bootstrap.py` | Bootstrap state management: `bootstrap-status`, `bootstrap-repair`, `state-status` |

**Bootstrap checks** (from `launcher-bootstrap.py`):
- `.env` file exists
- `.claude/skills/_catalog/` directory exists
- `context/USER.md` exists
- `context/learnings.md` exists
- `context/memory/` directory exists
- `.claude/skills/_catalog/installed.json` exists
- `.claude/skills/_catalog/catalog.json` exists (error if missing)

**Talaris connection:**
- Talaris is Jack's primary laptop (`jack.reis` / `/Users/jack.reis`)
- Aegis is the always-on Mac mini (`hermes` / `/Users/hermes`)
- The git remote (`agentic-os.git`) lives on Aegis; Talaris pushes/pulls over `aegis:`
- `=notes` vault is on Talaris only
- The `agentic-os-cloud-reconcile` worktree (branch `jac-3525-human-review-aggregation`) is a Talaris-synced copy

**Commit `ef3dd1e5` (2026-08-04):** "flash-i044-preserve: uncommitted changes before bootstrap shell reconciliation"
- This commit on the `agentic-os` main repo references a "bootstrap shell reconciliation" that was about to happen
- The commit preserved uncommitted changes (package.json modifications) before this reconciliation

### 1.2 July 14 Ringer/Fleet Wave Linked Worktrees

Located in `/Users/hermes/.hermes/worktrees/`:

| Worktree | Branch | SHA | Dirty Files | Status |
|----------|--------|-----|-------------|--------|
| `ringer-fleet-wave-candidate-20260716-v1` | `feat/fleet-wave-protocol-20260714` | `e0948a5` | 244 | Active |
| `ringer-lifecycle-hardening` | `fleet/ringer-lifecycle-hardening-20260712` | `7c20fed` | 232 | Active |
| `ringer-origin-main-baseline-test-v1` | detached HEAD | `4ac3791` | 198 | Active |
| `ringer-wt-dead-run` | `fix/ringside-dead-run-projection-20260714` | `52cc576` | — | **Prunable** (gitdir exists, worktree dir missing) |

**Git remote:** `gitdir: /Users/hermes/ringer/.git/worktrees/<name>`

**Dirty checkout state (all 3 active worktrees):**
- `.github/workflows/tests.yml` — deleted (D)
- `.ringer/ten-streak-oneshots/` — contains canary-recovery run artifacts with AD (added in index, deleted in working tree) status
- Multiple untracked/modified files in `.ringer/ten-streak-oneshots/`

**Preserve/July14 remote branches** (on `fleet` and `jack` remotes):
- `preserve/july14/feat/fleet-wave-protocol-20260714`
- `preserve/july14/fix/ringside-dead-run-projection-20260714`
- `preserve/july14/fleet/ringer-clean-streak-20260714`
- `preserve/july14/feat/byom-context-quick-20260714`

**Additional July 14 Ringer swarms** (in `/Users/hermes/ringer/swarms/`):
- `aegis-ledger-foundation-20260714/` — provider-health-probe, token-usage-aggregation
- `fleet-cycle2-20260714/` — cross-host-tunnel-verify, instruction-consistency-audit, fleet-base-roster-update
- `fleet-instruction-refresh-20260714/` — add_ringer_governance_to_agents, audit_fleet_surfaces_index, verify_fleet_base_roster
- `quota-monitor-components-20260714-201520/`
- `ringer-reliability-tools-20260714-1447/` — clean-streak-auditor, manifest-policy-checker, run-evidence-verifier

**Fleet-wave controller candidate manifests** (in `ringer-fleet-wave-candidate-20260716-v1`):
- `manifests/fleet-wave-controller-candidate-20260716/manifest-v1.json` through `manifest-v5.json`
- `manifests/fleet-wave-controller-candidate-20260716/ringer-manifest-v1.json` through `ringer-manifest-v5.json`
- `manifests/paperclip-fleet-sync.json` (synced 2026-07-11)
- `manifests/fleet-wave-controller-candidate-20260716/checks/` — `fleet_wave_candidate_bundle.py` through `fleet_wave_candidate_bundle_v5.py`

### 1.3 Ringer Worktree Branch State

| Worktree | Branch (intended) | HEAD | Actual State |
|----------|-------------------|------|--------------|
| `ringer-fleet-wave-candidate-20260716-v1` | `feat/fleet-wave-protocol-20260714` | `e0948a5` | Detached (HEAD set to branch SHA, not tracking) |
| `ringer-lifecycle-hardening` | `fleet/ringer-lifecycle-hardening-20260712` | `7c20fed` | Detached |
| `ringer-origin-main-baseline-test-v1` | (none — intended detached) | `4ac3791` | Detached |
| `ringer-wt-dead-run` | `fix/ringside-dead-run-projection-20260714` | `52cc576` | Prunable (dir missing) |

### 1.4 Related Agentic OS Worktrees

| Worktree | Branch | Purpose |
|----------|--------|---------|
| `agentic-os-cloud-reconcile` | `jac-3525-human-review-aggregation` | Cloud reconciliation work, Talaris-synced copy |
| `agentic-os-ringer-runs` | `feature/hermes-9ad.8-ringer-runs-surface` | Ringer runs surface integration |
| `agentic-os-fleet-slug-fix` | `fix/fleet-slug-audit-20260724` | Fleet slug audit |
| `agentic-os-fleet-slug-fix-v2` | `fix/fleet-slug-audit-v2-20260724` | Fleet slug audit v2 |

### 1.5 Ringer Swarms (July 14 runs)

| Swarm | Run | Tasks | Engine |
|-------|-----|-------|--------|
| `aegis-ledger-foundation-20260714` | `aegis-ledger-foundation-20260714` | provider-health-probe, token-usage-aggregation | codex x2 |
| `fleet-cycle2-20260714` | `fleet-cycle2-20260714` | cross-host-tunnel-verify, instruction-consistency-audit, fleet-base-roster-update | codex x3 |
| `fleet-instruction-refresh-20260714` | `fleet-instruction-refresh-20260714` | add_ringer_governance_to_agents, audit_fleet_surfaces_index, verify_fleet_base_roster | codex x3 |
| `quota-monitor-components-20260714-201520` | `quota-monitor-components-20260714-201520` | (3 tasks) | codex, opencode x2 |
| `ringer-reliability-tools-20260714-1447` | `ringer-reliability-tools-20260714-1447` | clean-streak-auditor, manifest-policy-checker, run-evidence-verifier | codex x3 |

---

## 2. Classification

### 2.1 Bootstrap Shell — **Preservation Required**

The bootstrap shell (`install.sh`, `centre.sh`, `launcher-bootstrap.py`) is live production code on the `agentic-os` main repo. Commit `ef3dd1e5` indicates this was being reconciled as of 2026-08-04. The bootstrap shell itself is:

- **Not dirty** — it is clean on `agentic-os` main
- **Referenced by** the `agentic-os-cloud-reconcile` worktree (Talaris-synced copy)
- **Needs reconciliation** between the Aegis main and the Talaris-synced copy

### 2.2 July 14 Worktrees — **Dirty Checkout Safety Concern**

The three active Ringer worktrees are dirty with:
- **Canary-recovery run artifacts** (`.ringer/ten-streak-oneshots/`) — these are Ringer run state, not source code
- **Deleted `.github/workflows/tests.yml`** — this was a legitimate deletion during the lifecycle-hardening process
- **232-244 dirty files per worktree** — mostly run artifacts

**Risk assessment:**
- The canary-recovery artifacts are ephemeral run state, not source code
- The `tests.yml` deletion is intentional (CI workflows are removed during hardening)
- The worktrees are on branches that have been preserved as `preserve/july14/*` remotes
- The worktrees appear to be leftover from the July 14 Ringer swarms, now in a "ten-streak" cleanup phase

### 2.3 Prunable Worktree

`ringer-wt-dead-run` (branch `fix/ringside-dead-run-projection-20260714`):
- Git dir exists at `/Users/hermes/ringer/.git/worktrees/ringer-wt-dead-run/`
- Worktree directory `/Users/hermes/ringer-wt-dead-run/` does not exist
- Git marks it as "prunable"
- **Safe to prune** — `git worktree remove --force` / `git worktree prune`

---

## 3. Preservation Refs/Bundles

### 3.1 Already Preserved

- **Remote branches** `preserve/july14/*` and `jack/preserve/july14/*` exist on the `fleet` and `jack` remotes — these are the canonical preserved copies of the July 14 work
- **Ringer artifacts** in `/Users/hermes/.ringer/artifacts/versions/` contain:
  - `fleet-cycle2-20260714/`
  - `fleet-recovery-readonly-20260714-v1/`
  - `exact-prompt-canary-20260714T194511Z/` and `exact-prompt-canary-20260714T214505Z/`
  - `aegis-ledger-foundation-20260714/`
  - `ringer-reliability-tools-20260714-1447/`
- **Ringer runs** in `/Users/hermes/.ringer/runs/` with July 14 timestamps (30+ run files)
- **Ringer swarms** in `/Users/hermes/ringer/swarms/` with July 14 dates

### 3.2 Fleet-Wave Controller Candidate Evidence

The `/Users/hermes/.ringer/fleet-wave/` directory contains:
- `fleet-wave-controller-candidate-20260716-v1/` — blocked.json, prepared.json, transition-receipts/
- `fleet-wave-controller-candidate-20260716-v2/` — blocked.json, executed.json, executed.json.cas/, prepared.json, transition-receipts/
- `fleet-wave-controller-candidate-20260716-v5/` — accepted.json, evidence/, executed/prepared/accepted receipts, ringside-reconciled.json
- These represent the Fleet Wave protocol implementation attempts from July 16, based on the July 14 fleet-wave-protocol branch

### 3.3 Bundles to Create

Before any pruning, create Git bundles for the three active dirty worktrees:

```bash
# Create bundles from the ringer repo
cd /Users/hermes/ringer
git bundle create /Users/hermes/.ringer/artifacts/versions/ringer-fleet-wave-candidate-20260716-v1-bundle.bundle \
  feat/fleet-wave-protocol-20260714
git bundle create /Users/hermes/.ringer/artifacts/versions/ringer-lifecycle-hardening-bundle.bundle \
  fleet/ringer-lifecycle-hardening-20260712
git bundle create /Users/hermes/.ringer/artifacts/versions/ringer-origin-main-baseline-test-v1-bundle.bundle \
  4ac3791e00276106be962d72ca2b55f4802d8fa2
```

The `.ringer/ten-streak-oneshots/canary-recovery/` directories should be tarred as evidence bundles:

```bash
tar czf /Users/hermes/.ringer/artifacts/versions/ringer-canary-recovery-evidence-20260714.tar.gz \
  -C /Users/hermes/.hermes/worktrees/ringer-fleet-wave-candidate-20260716-v1/.ringer/ten-streak-oneshots/canary-recovery .
```

---

## 4. Dirty-Checkout Safety Protocol

### 4.1 Current State

All three active worktrees have the same pattern of dirtiness:
- `D .github/workflows/tests.yml` — intentional deletion
- `AD .ringer/ten-streak-oneshots/canary-recovery/*` — staged additions that conflict with working tree deletions
- `MM` files — manually merged conflicts
- `UU` files — unmerged paths

### 4.2 Safety Assessment

The dirty state appears to be from Ringer run lifecycle operations:
1. The canary-recovery run created artifacts in `.ringer/ten-streak-oneshots/`
2. The run's `swarm.json` and probe files were staged but then the working tree was partially deleted
3. This is typical of Ringer's "ten-streak" pattern where runs create and clean up artifacts

**Recommendation:** The dirty checkouts should NOT be auto-cleaned without:
1. First creating preservation bundles (Section 3.3)
2. Reviewing the canary-recovery artifacts for any verifiable evidence
3. Getting approval before pruning

### 4.3 Steps to Clean

1. Create bundles (Section 3.3) — **preservation**
2. Review canary-recovery artifacts — **classification**
3. Stash or archive dirty state — **safety**
4. `git checkout .` to restore deleted files — **cleanup**
5. `git worktree remove --force` for prunable worktree — **pruning**

---

## 5. Approval-Gated Pruning Plan

### 5.1 Prunable Items (Low Risk)

| Item | Path | Risk | Approval Needed |
|------|------|------|-----------------|
| `ringer-wt-dead-run` | `/Users/hermes/ringer-wt-dead-run/` | Low | Paperclip approval (already prunable) |
| `.github/workflows/tests.yml` (in worktrees) | in 3 worktrees | Medium | Yes — needs review of CI implications |
| canary-recovery artifacts | `.ringer/ten-streak-oneshots/` | Low | No — ephemeral run state |

### 5.2 Preservation Actions (High Priority)

| Action | Path | Description |
|--------|------|-------------|
| Bundle July 14 branches | `/Users/hermes/.ringer` | Create git bundles of all 3 active worktree branches |
| Archive canary-recovery | `/Users/hermes/.ringer/artifacts/versions/` | Tar the canary-recovery directories as evidence |
| Document bootstrap shell | `agentic-os-cloud-reconcile` | Note the bootstrap shell reconciliation state |

### 5.3 Reconciliation Steps

| Step | Action | Approval Gate |
|------|--------|---------------|
| 1 | Create preservation bundles for all 3 worktree branches | None — read-only |
| 2 | Archive canary-recovery evidence | None — copy only |
| 3 | Review `.github/workflows/tests.yml` deletion impact | Gate 1 — CI impact review |
| 4 | Clean dirty checkouts (`git checkout .`) | Gate 2 — after bundle verification |
| 5 | Prune `ringer-wt-dead-run` worktree | Gate 1 — already prunable |
| 6 | Verify `preserve/july14/*` remotes are complete | Gate 1 — branch integrity check |
| 7 | Update fleet-wave-controller candidate state | Gate 2 — Fleet Wave protocol review |

---

## 6. Next Actions

1. **Immediate:** Create preservation bundles for all 3 active Ringer worktree branches
2. **Immediate:** Archive canary-recovery evidence directories
3. **Short-term:** Submit approval-gated pruning plan via Paperclip issue
4. **Short-term:** Reconcile bootstrapped state between `agentic-os` main and `agentic-os-cloud-reconcile`
5. **Follow-up:** Create child issues for each pruning step
