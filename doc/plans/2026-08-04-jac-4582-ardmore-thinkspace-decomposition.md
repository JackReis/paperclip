# JAC-4582 — Ardmore ThinkSpace Decomposition + Execution Plan

**Date:** 2026-08-04
**Work mode:** Planning — decomposition + Paperclip child-issue creation + Ringer manifest
**Author:** Alaric (agent 100915f9, Aegis host, hermes_local)
**Parent Paperclip issue:** JAC-4582 (`5efd99be-d4a4-454d-a0c8-0767da468988`)
**Beads epic:** hermes-83hq (`notes-jclol`)
**Beads workspace:** `BEADS_DIR=/Users/hermes/=notes/.beads`

---

## 0. Purpose and scope

Decompose the hermes-83hq Beads epic into executable units, create Paperclip
child issues for each unit, and produce a Ringer manifest that can drive the
first founder-sprint cycle.

**Non-goals:**
- No code implementation or product delivery in this issue — this is a planning
  decomposition.
- The Commerce amendment is still pending; nothing is spendable until it clears.
- Outreach emails require Jack's review before sending (outbound human comms).

---

## 1. Beads epic summary

The hermes-83hq epic positions an AI services business inside the Ardmore
Development Authority's $1M, 24-month entrepreneurship pivot (CORI strategy,
approved 2026-07, pending OK Dept. of Commerce funding amendment).

**Current Beads children (8 open, 0 done):**

| Bead ID | Title | Parent | Type | Owner |
|---|---|---|---|---|
| notes-jclol | hermes-83hq (epic) | — | epic | Jack Reis |
| notes-jclol.1 | hermes-83hq.2 — Outreach email (ADA + Chamber) | notes-jclol | task | Jack Reis |
| notes-jclol.1.1 | hermes-83hq.2.1 — Draft email to Bill Murphy (ADA) | notes-jclol.1 | task | Jack Reis |
| notes-jclol.1.2 | hermes-83hq.2.2 — Draft email to Chamber President | notes-jclol.1 | task | Jack Reis |
| notes-jclol.1.3 | hermes-83hq.2.3 — Send emails + schedule meeting | notes-jclol.1 | task | Jack Reis |
| notes-jclol.2 | hermes-83hq.3 — Founder-sprint AI toolkit prototype | notes-jclol | task | Jack Reis |
| notes-jclol.2.1 | hermes-83hq.3.1 — Define toolkit scope/requirements | notes-jclol.2 | task | Jack Reis |
| notes-jclol.2.2 | hermes-83hq.3.2 — Build toolkit components | notes-jclol.2 | task | Jack Reis |
| notes-jclol.2.3 | hermes-83hq.3.3 — Build progress tracker + demo | notes-jclol.2 | task | Jack Reis |
| notes-jclol.3 | hermes-83hq.5 — Stakeholder + cadence tracker | notes-jclol | task | Jack Reis |
| notes-jclol.3.1 | hermes-83hq.5.1 — Stakeholder map | notes-jclol.3 | task | Jack Reis |
| notes-jclol.3.2 | hermes-83hq.5.2 — Communication cadence + decision gates | notes-jclol.3 | task | Jack Reis |

---

## 2. Decomposition map: Beads → Paperclip child issues

Each Beads child task maps to a Paperclip child issue. Dependencies are derived
from the Beads `DEPENDS ON` / `BLOCKS` relationships.

### Epic-level (JAC-4582 parent)

The parent issue JAC-4582 itself is the orchestration container. It tracks the
overall decomposition and Ringer manifest.

### Sub-epic: Outreach (hermes-83hq.2 → JAC-4582.A)

| Paperclip child | Beads child | Description | Dependencies |
|---|---|---|---|
| JAC-4582.A (hermes-83hq.2) | notes-jclol.1 | Outreach: ADA + Chamber email | — |
| JAC-4582.A.1 (hermes-83hq.2.1) | notes-jclol.1.1 | Draft email to Bill Murphy (ADA) | JAC-4582.A |
| JAC-4582.A.2 (hermes-83hq.2.2) | notes-jclol.1.2 | Draft email to Chamber President | JAC-4582.A |
| JAC-4582.A.3 (hermes-83hq.2.3) | notes-jclol.1.3 | Send emails + schedule meeting | JAC-4582.A.1, JAC-4582.A.2 |

**Dependency chain:** A.1 and A.2 are independent drafts → both must complete
before A.3 can send. Per Beads: A.2 blocks A.3; A.3 depends on A.1 and A.2.

### Sub-epic: Founder-sprint toolkit (hermes-83hq.3 → JAC-4582.B)

| Paperclip child | Beads child | Description | Dependencies |
|---|---|---|---|
| JAC-4582.B (hermes-83hq.3) | notes-jclol.2 | Founder-sprint AI toolkit prototype | — |
| JAC-4582.B.1 (hermes-83hq.3.1) | notes-jclol.2.1 | Define toolkit scope/requirements | JAC-4582.B |
| JAC-4582.B.2 (hermes-83hq.3.2) | notes-jclol.2.2 | Build toolkit components (market research + BMC generator) | JAC-4582.B.1 |
| JAC-4582.B.3 (hermes-83hq.3.3) | notes-jclol.2.3 | Build progress tracker + demo toolkit | JAC-4582.B.2 |

**Dependency chain:** B.1 → B.2 → B.3 (sequential).

### Sub-epic: Stakeholder tracking (hermes-83hq.5 → JAC-4582.C)

| Paperclip child | Beads child | Description | Dependencies |
|---|---|---|---|
| JAC-4582.C (hermes-83hq.5) | notes-jclol.3 | Stakeholder + cadence tracker | — |
| JAC-4582.C.1 (hermes-83hq.5.1) | notes-jclol.3.1 | Stakeholder map | JAC-4582.C |
| JAC-4582.C.2 (hermes-83hq.5.2) | notes-jclol.3.2 | Communication cadence + decision gates | JAC-4582.C.1 |

**Dependency chain:** C.1 blocks C.2 (stakeholder map must exist first).

---

## 3. Execution lanes

Based on agent availability and task nature:

| Task | Lane | Notes |
|---|---|---|
| JAC-4582.A, A.1, A.2 | claude-code / Herald | Research + drafting; human-gated send |
| JAC-4582.A.3 | claude-code / Herald (write-blocked) | Requires Jack's sign-off before sending emails |
| JAC-4582.B → B.1 | ollama-cloud / Coder X | Requirements definition |
| JAC-4582.B.2, B.3 | local-aegis / Coder X or Luna | Toolkit build + demo |
| JAC-4582.C.1, C.2 | claude-code / Plan Runner | Tracker creation |

**Human gates:**
- Email send (A.3): Jack must review drafts before sending.
- Outreach to ADA/Chamber: evidence-gated, pre-procurement.
- Toolkit demo (B.3): requires a realistic 4-week founder sprint scenario.

---

## 4. Ringer manifest

The Ringer manifest below encodes the decomposition as a task graph with
per-task evidence gates. Each task carries a `paperclip_issue` and `bead_id`
cross-link.

```json
{
  "run_name": "ardmore-thinkspace-jac-4582-20260804",
  "workdir": "/Users/hermes/Projects/paperclip",
  "max_parallel": 3,
  "tasks": [
    {
      "key": "hq.2-3-outreach-email",
      "engine": "claude-code",
      "model": "auto",
      "task_type": "research",
      "spec": "Draft outreach email introducing the AI-powered ThinkSpace pilot to Bill Murphy (ADA President & CEO). Intro Jack Reis + AI services business; reference $1M ADA entrepreneurship pivot (CORI strategy, approved 2026-07, pending OK Commerce amendment); position ThinkSpace as complementary, evidence-gated pilot; highlight $120k outreach & storytelling budget line; request 30-min introductory meeting.",
      "check": "test -f doc/plans/2026-08-04-jac-4582-ada-outreach-draft.md && grep -q '30-min' doc/plans/2026-08-04-jac-4582-ada-outreach-draft.md",
      "expect_files": ["doc/plans/2026-08-04-jac-4582-ada-outreach-draft.md"],
      "verified": "Outreach email draft to Bill Murphy exists and covers all brief constraints.",
      "paperclip_issue": "JAC-4582.A.1",
      "bead_id": "notes-jclol.1.1"
    },
    {
      "key": "hq.2-3-chamber-email",
      "engine": "claude-code",
      "model": "auto",
      "task_type": "research",
      "spec": "Draft outreach email to Chamber President (program coordination lead). Position Chamber as coordination partner (not competing with ADA fiscal lead); reference $180k programming/founder sprint budget line as collaboration angle; request joint meeting with ADA to align on AI pilot scope; respect light-structure and handoff-able constraint.",
      "check": "test -f doc/plans/2026-08-04-jac-4582-chamber-outreach-draft.md && grep -q 'joint meeting' doc/plans/2026-08-04-jac-4582-chamber-outreach-draft.md",
      "expect_files": ["doc/plans/2026-08-04-jac-4582-chamber-outreach-draft.md"],
      "verified": "Chamber outreach email draft exists and covers all brief constraints.",
      "paperclip_issue": "JAC-4582.A.2",
      "bead_id": "notes-jclol.1.2"
    },
    {
      "key": "hq.3-1-toolkit-scope",
      "engine": "claude-code",
      "model": "auto",
      "task_type": "design",
      "spec": "Define scope and requirements for the founder-sprint AI toolkit prototype. Map to ADA three-phase model (ideation/validation, customer discovery, early traction); specify laptop-only, no server setup; usable by non-technical founders; productizable as replicable ThinkSpace-in-a-box component; reference $180k programming/founder sprint budget line.",
      "check": "test -f doc/plans/2026-08-04-jac-4582-toolkit-requirements.md && grep -q 'ideation' doc/plans/2026-08-04-jac-4582-toolkit-requirements.md",
      "expect_files": ["doc/plans/2026-08-04-jac-4582-toolkit-requirements.md"],
      "verified": "Toolkit requirements doc maps to all three ADA phases and all constraints.",
      "paperclip_issue": "JAC-4582.B.1",
      "bead_id": "notes-jclol.2.1"
    },
    {
      "key": "hq.5-1-stakeholder-map",
      "engine": "claude-code",
      "model": "auto",
      "task_type": "research",
      "spec": "Create living stakeholder map for Ardmore ThinkSpace initiative. Capture: Bill Murphy (ADA), Chamber President, CORI, OK Dept. of Commerce, REI Oklahoma, SBDCs. For each: role, public contact info, influence level, current status (engaged/pending/not-contacted). Use only public sources; no secrets.",
      "check": "test -f doc/plans/2026-08-04-jac-4582-stakeholder-map.md && grep -q 'Bill Murphy' doc/plans/2026-08-04-jac-4582-stakeholder-map.md && grep -q 'Chamber' doc/plans/2026-08-04-jac-4582-stakeholder-map.md",
      "expect_files": ["doc/plans/2026-08-04-jac-4582-stakeholder-map.md"],
      "verified": "Stakeholder map captures all named stakeholders with role and status.",
      "paperclip_issue": "JAC-4582.C.1",
      "bead_id": "notes-jclol.3.1"
    }
  ]
}
```

**Manifest notes:**
- `max_parallel: 3` — four research/design tasks can run concurrently (A.1, A.2, B.1, C.1).
- The manifest only covers the first independent batch (4 leaf tasks with no
  upstream dependencies). Follow-up manifests will encode the dependent chains
  (A.3, B.2→B.3, C.2).
- Each task is planning/research only — no production code changes.
- `expect_files` and `check` are the evidence gate.
- Human-gated tasks (email send, toolkit demo) are explicitly excluded from this
  manifest and will be routed through Paperclip interactions for human sign-off.

---

## 5. Acceptance criteria

- [x] Beads epic hermes-83hq (`notes-jclol`) read and decomposed into 8 child tasks
- [x] Dependency chains identified from Beads `DEPENDS ON` / `BLOCKS` metadata
- [x] Execution lanes mapped based on agent availability and task type
- [x] Ringer manifest encoding the first independent batch created
- [x] Human gates identified (email send, toolkit demo)
- [ ] Paperclip child issues created for each unit (JAC-4582.A–C and sub-IDs)
- [ ] Each child issue linked to its Beads child via `bead_id`

---

## 6. Blocking conditions

- Commerce amendment pending: nothing is spendable until OK Dept. of Commerce
  funding amendment clears.
- Outreach emails to ADA/Chamber require Jack's review before sending.
- Toolkit demo (B.3) requires a realistic 4-week founder sprint scenario to be
  defined.
- JAC-4530 (token/cost semantics) is `in_review` — blocked on JAC-3930
  (telemetry contract ratification), which is also `in_review`.
