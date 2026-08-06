---
type: plan
title: "hermes-j11l.6: Dual-Host Drift Reconciliation — Plan & Workflow Packet"
description: "Plan, inventory, and Ringer manifest for reconciling desktop customization and memory-workflow drift between Aegis and Talari hosts."
tags: [fleet, drift-reconciliation, dual-host, workflow-packet]
timestamp: 2026-08-05T14:20:00Z
status: in_progress
resource: workspace_file
path: paperclip/doc/plans/2026-08-05-hermes-j11l-6-dual-host-drift-reconciliation.md
---

# hermes-j11l.6: Dual-Host Drift Reconciliation

**Plan date:** 2026-08-05
**Bead:** hermes-j11l.6
**Paperclip issue:** JAC-4743
## Status: in_progress

## Child Beads

| Bead | Priority | Depends | Human Gate | Description | Karax Status |
|---|---|---|---|---|---|
| hermes-j11l.6.6 | P1 | — | No | Establish drift checker script + workflow packet | ✅ Done (script at scripts/drift-check-dual-host.sh) |
| hermes-j11l.6.1 | P1 | 6.6 | YES (provider/credential) | Fix Talari provider=nous → openrouter | ⏳ Blocked — human gate |
| hermes-j11l.6.2 | P2 | 6.6 | YES (memory stack change) | Reconcile Talari memory-provider to 4-plane composite | ⏳ Blocked — requires OPENBRAIN_KEY + SSH |
| hermes-j11l.6.3 | P2 | 6.6 | Yes (CLAUDE.md review) | Sync Talari CLAUDE.md to Aegis revision | ⏳ Blocked — human review |
| hermes-j11l.6.4 | P2 | 6.6 | No | Audit and reconcile Herdr Plus plugin drift | ✅ Done (audit + deployment script) |
| hermes-j11l.6.5 | P2 | 6.6 | No | Reconcile Ringer config.toml on Talari | ✅ Done (restored Aegis config, created Talari artifact) |

## Ringer Manifest

```json
{
  "run_name": "hermes-j11l.6-dual-host-drift-reconciliation",
  "bead_id": "hermes-j11l.6",
  "paperclip_issue": "JAC-4743",
  "judge": { "engine": "agy_iterm2", "model": "Gemini 3.1 Pro (High)" },
  "typist": { "engine": "opencode", "model": "openrouter/poolside/laguna-s-2.1:free" },
  "gates": { "pre_exec_approval": true, "human_gate_for_credentials": true, "no_secret_scraping": true, "read_only_audit": true },
  "tasks": [
    { "id": "6.6", "description": "Create drift checker script", "depends_on": [], "full_access": false },
    { "id": "6.1", "description": "Fix Talari provider=nous -> openrouter (HUMAN-GATED)", "depends_on": ["6.6"], "full_access": false },
    { "id": "6.2", "description": "Reconcile Talari memory-provider to 4-plane composite", "depends_on": ["6.6"], "full_access": false },
    { "id": "6.3", "description": "Sync Talari CLAUDE.md to Aegis revision", "depends_on": ["6.6"], "full_access": false },
    { "id": "6.4", "description": "Audit and reconcile Herdr Plus plugin drift", "depends_on": ["6.6"], "full_access": false },
    { "id": "6.5", "description": "Reconcile Ringer config.toml on Talari", "depends_on": ["6.6"], "full_access": false }
  ]
}
```

## Full Inventory & Analysis

See the full document at `doc/plans/2026-08-05-hermes-j11l-6-dual-host-drift-reconciliation.md` for the complete dual-host inventory, drift analysis, and acceptance criteria.

## Key Drift Findings

1. **CRITICAL:** Talari `provider=nous` (stale, should be `openrouter` per JAC-4686) — human-gated
2. **CRITICAL:** Talari `memory.provider=holographic` (single plane, should be `ob1,hindsight,holographic,honcho`) — requires plugin deployment + human review
3. **MEDIUM:** Talari CLAUDE.md 21-day stale (Jul 9 vs Aegis Jul 30)
4. **MEDIUM:** Ringer config.toml missing on Talari
5. **MEDIUM:** Herdr Plus plugin drift (Aegis has superpowers, fleet-beacon-consumer, ob1, ob1,hindsight,holographic,honcho; Talari only has herdr-agent-state, herdr-aegis)

## Human Approval Required

- **hermes-j11l.6.1**: Changing `provider=nous` to `provider=openrouter` in Talari config (provider/credential boundary)
- **hermes-j11l.6.2**: Changing Talari memory provider to 4-plane composite requires deploying the `ob1` and `ob1,hindsight,holographic,honcho` plugins to Talari, plus verifying tunnel config for all 4 planes. The OB1 plugin needs `OPENBRAIN_KEY` env var.
