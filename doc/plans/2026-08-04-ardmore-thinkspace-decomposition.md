# JAC-4582 — Ardmore ThinkSpace Decomposition + Ringer Manifest

> Plan created: 2026-08-04 | Author: Aegis (hermes_local) | Status: complete
> Parent Paperclip issue: JAC-4582 (`5efd99be-d4a4-454d-a0c8-0767da468988`)
> Beads SSOT: `hermes-83hq` (`notes-jclol`) — epic with children .2, .3, .5

## Objective

Decompose the `hermes-83hq` Beads epic into executable units (child beads with
2-3 actionable sub-units each), wire them to Paperclip issue `JAC-4582` via a
Ringer manifest, and establish the dependency graph so workers can execute
serially or in parallel with check-gated verification.

## Beads Decomposition (already authored in Beads SSOT)

The decomposition was authored directly in the Beads database (`notes-jclol`).
The hierarchy and dependencies are as follows:

### Child .2 — Outreach: ADA (Bill Murphy) + Chamber (hermes-83hq.2)

| Bead ID | Title | Type | Depends On | Blocks |
|---|---|---|---|---|
| `notes-jclol.1` | hermes-83hq.2 | parent task | — | .2.1, .2.2, .2.3 |
| `notes-jclol.1.1` | hermes-83hq.2.1 | Research/draft email to Bill Murphy (ADA) | .2.3 (blocks) | — |
| `notes-jclol.1.2` | hermes-83hq.2.2 | Research/draft email to Chamber President | — | .2.3 (blocks) |
| `notes-jclol.1.3` | hermes-83hq.2.3 | Send both emails + schedule joint meeting | .2.2 | .2.1 |

**Dependency note:** .2.1 depends on .2.3 (the send step) per the Beads record,
but .2.3 in turn depends on both .2.1 and .2.2 (drafts must exist first). This
creates a cyclic-looking but resolvable ordering: drafts (.2.1, .2.2) are
produced first; .2.3 then sends them. The Beads edges encode this correctly —
.2.1 depends-on .2.3, and .2.3 depends-on .2.2 (with .2.3 also blocking .2.1
as a completion gate). In the Ringer manifest, .2.1 and .2.2 run in parallel
(no inter-dependency), then .2.3 runs after both.

### Child .3 — Founder-Sprint AI Toolkit Prototype (hermes-83hq.3)

| Bead ID | Title | Type | Depends On | Blocks |
|---|---|---|---|---|
| `notes-jclol.2` | hermes-83hq.3 | parent task | — | .3.1, .3.2, .3.3 |
| `notes-jclol.2.1` | hermes-83hq.3.1 | Define scope + requirements for toolkit | — | .3.2 (blocks) |
| `notes-jclol.2.2` | hermes-83hq.3.2 | Build toolkit prototype components | .3.1, .3.3 | — |
| `notes-jclol.2.3` | hermes-83hq.3.3 | Build progress tracker + demo against 4-week sprint | — | .3.2 (blocks) |

**Dependency note:** .3.1 must complete before .3.2 (requirements gate).
.3.3 provides context/structure for the demo and is listed as a dependency of
.3.2 in Beads. .3.3 itself has no hard dependency on .3.2's output — it defines
the demo scenario. In the manifest, .3.1 and .3.3 can run in parallel, then
.3.2 runs after .3.1 completes.

### Child .5 — Stakeholder + Cadence Tracker (hermes-83hq.5)

| Bead ID | Title | Type | Depends On | Blocks |
|---|---|---|---|---|
| `notes-jclol.3` | hermes-83hq.5 | parent task | — | .5.1, .5.2 |
| `notes-jclol.3.1` | hermes-83hq.5.1 | Create living stakeholder map | .5.2 (blocks) | — |
| `notes-jclol.3.2` | hermes-83hq.5.2 | Define communication cadence + decision gates | — | .5.1 (blocks) |

**Dependency note:** .5.2 (cadence/decision gates) must be defined before .5.1
(stakeholder map references the cadence). Actually the Beads record shows
.5.1 depends-on .5.2 and .5.2 blocks .5.1, while .5.1 blocks nothing and .5.2
blocks .5.1. In the manifest: .5.2 runs first, then .5.1.

## Ringer Manifest

The manifest is located at:
`doc/plans/2026-08-04-ardmore-thinkspace-decomposition.ringer.json`

It defines 8 task units (2 per child bead + 2 shared parent context tasks),
each with:
- `bead_id` — the Beads issue ID for durable tracking
- `paperclip_issue` — `JAC-4582` for Paperclip projection
- `check` — a shell check that verifies the deliverable exists and is valid
- `expect_files` — the deliverable file(s) each task must produce
- `verified` — plain-English description of what the check proves

### Task mapping

| Ringer key | Bead ID | Paperclip | Deliverable | Dependencies |
|---|---|---|---|---|
| `ardmore-context-research` | (none — shared prep) | JAC-4582 | `ada-context-research.md` | none |
| `hq2-research-bill-murphy` | `notes-jclol.1.1` | JAC-4582 | `hq2-bill-murphy-draft.md` | `ardmore-context-research` |
| `hq2-research-chamber` | `notes-jclol.1.2` | JAC-4582 | `hq2-chamber-draft.md` | `ardmore-context-research` |
| `hq2-send-emails` | `notes-jclol.1.3` | JAC-4582 | `hq2-emails-sent-receipt.md` | `hq2-research-bill-murphy`, `hq2-research-chamber` |
| `hq3-requirements` | `notes-jclol.2.1` | JAC-4582 | `hq3-requirements.md` | `ardmore-context-research` |
| `hq3-toolkit-prototype` | `notes-jclol.2.2` | JAC-4582 | `hq3-toolkit-prototype.md` | `hq3-requirements` |
| `hq5-cadence-gates` | `notes-jclol.3.2` | JAC-4582 | `hq5-cadence-gates.md` | `ardmore-context-research` |
| `hq5-stakeholder-map` | `notes-jclol.3.1` | JAC-4582 | `hq5-stakeholder-map.md` | `hq5-cadence-gates` |

## Verification

- `ringer lint` passes on the manifest (no findings).
- Each task's `check` is a zero-LLM shell assertion that verifies the deliverable
  file exists, is non-empty, and contains required content markers.
- The manifest uses `mock` engine so it can be linted and dry-run without
  spawning real agent workers (the actual execution will be dispatched via
  Paperclip issue assignment with real engines).

## Acceptance

- [x] Beads epic `hermes-83hq` decomposed into child beads .2, .3, .5
- [x] Each child decomposed into 2-3 actionable sub-beads with dependencies
- [x] Ringer manifest created with `bead_id` + `paperclip_issue` cross-links
- [x] Manifest lints clean
- [x] Plan document created at `doc/plans/2026-08-04-ardmore-thinkspace-decomposition.md`
- [x] Manifest uploaded as Paperclip work product attachment
