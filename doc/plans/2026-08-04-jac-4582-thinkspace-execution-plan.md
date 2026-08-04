# JAC-4582 — Ardmore ThinkSpace Execution Plan & Ringer Manifest

## Overview

Decomposition of the `hermes-83hq` Beads epic (Ardmore ThinkSpace — AI-powered entrepreneurship hub, ADA 24-month strategy) into executable child units with a Ringer manifest for bounded execution.

**Parent epic (Bead):** `hermes-83hq` — Ardmore ThinkSpace
**Parent Paperclip issue:** JAC-4582 (this issue)
**Reference brief:** `projects/briefs/ardmore-thinkspace/brief.md`
**Reference article:** `src/lib/references/ada-entrepreneur-pivot.html` (The Ardmoreite, 2026-07-26)
**Ringer manifest:** `riner-manifest/jac-83hq-execution-plan.json`

## Epic Scope

Position an AI services business inside the Ardmore Development Authority's 24-month, $1M entrepreneurship pivot (Center on Rural Innovation strategy) and productize an **AI-powered ThinkSpace** offering that can be sold to other rural communities.

Three deliverable tracks, each mapped to ADA budget lines:

| Track | Budget line | Bead | Status |
|---|---|---|---|
| Outreach & storytelling | $120k | hermes-83hq.2 | open |
| Founder-sprint AI toolkit | $180k | hermes-83hq.3 | open |
| ThinkSpace-in-a-box playbook | $100k | hermes-83hq.4 | **closed** |
| Stakeholder + cadence | — | hermes-83hq.5 | open |
| Positioning one-pager | — | hermes-83hq.1 | **closed** |

Closed bead 83hq.1 (positioning one-pager) and 83hq.4 (playbook skeleton) are complete — their deliverables were produced in the `agentic-os-cloud-reconcile` repo and committed to branch `jac-3525-human-review-aggregation`. The remaining 6 child beads are decomposed below.

## Budget Mapping

From the reference article (`ada-entrepreneur-pivot.html`):

| Allocation | Amount | Track |
|---|---|---|
| Operating lead compensation (2 yrs) | $320,000 | Staffing (not vendor-facing) |
| Programming (equipment, test stages, founder sprint) | $180,000 | 83hq.3 toolkit |
| Implementation grants (sprint graduates) | $180,000 | Program delivery |
| Outreach & storytelling | $120,000 | 83hq.2 outreach |
| Tools & playbooks (reusable by Commerce) | $100,000 | 83hq.4 playbook |

Our vendor-facing lines are **outreach ($120k)** and **toolkit/playbooks ($200k)**. The positioning one-pager (83hq.1) already maps our four AI service offerings to these.

## Committee Roster (from reference article)

The advisory committee structure:

| Seat | Org | Voting |
|---|---|---|
| Chamber President | Ardmore Chamber | Non-voting |
| ADA Sr. VP | Ardmore Development Authority | Voting |
| Rep | SouthernTech | Voting |
| Rep | City of Ardmore | Voting |
| Rep | Murray State College | Voting |
| 2-3 local entrepreneurs | — | Voting |
| Rep | Ardmore Young Professionals | Voting |
| Rep | Main Street Ardmore | Non-voting |
| At-large | Economic dev / tech sector | Non-voting |

Key people: Bill Murphy (ADA President & CEO), Amanda Dion (ADA COO), CORI (strategy author, contract extended through Aug 30 2026).

## Decomposition: 6 Open Child Beads → Executable Units

### 1. hermes-83hq.2.1 — Finalize outreach email

**Paperclip issue:** JAC-83hq.2.1
**Priority:** P1
**Agent:** Bright (100915f9-41ab-478b-b2f5-ac30afa7ef89) via hermes_local
**Deliverable:** `outreach/email-finalized.md`
**Depends on:** None (prerequisite for 83hq.2.2)

Finalize the outreach email draft at `outreach/email-draft-ada-chamber.md`. Fill in:
1. Sender name, phone, email
2. Chamber President name (from reference materials)
3. Two concrete date options for the week of Aug 11-15, 2026 (before Aug 30 CORI expiry)
Verify jspace.jkre.is link and password (`ThinkSpace-2028-Ardmore`). Write finalized email preserving pre-send checklist. Do NOT send.

**Gate-verdict:** pass if all bracketed placeholders replaced and Chamber contact is named.

### 2. hermes-83hq.2.2 — Track meeting scheduling

**Paperclip issue:** JAC-83hq.2.2
**Priority:** P2
**Agent:** Bright via hermes_local
**Deliverable:** `outreach/meeting-tracker.md`
**Depends on:** 83hq.2.1

Track meeting scheduling with Bill Murphy and/or Chamber President. Record: contact method, send date, response date, meeting status, attendees, outcomes. Include follow-up protocol: gentle reminder if no response within 5 business days.

**Gate-verdict:** pass if tracker captures contact info, date fields, meeting status, outcomes, and 5-business-day follow-up protocol.

### 3. hermes-83hq.3.1 — Toolkit spec

**Paperclip issue:** JAC-83hq.3.1
**Priority:** P2
**Agent:** Bright via hermes_local
**Deliverable:** `toolkit-spec.md`
**Depends on:** None (prerequisite for 83hq.3.2)

Define the AI toolkit for a 4-week founder sprint with three components:
1. Idea-validation workflows (AI questions founders through hypothesis framing + evidence gathering)
2. Participant AI-skills onboarding (quick-start for non-technical founders)
3. Sprint artifact generation (lean canvas, pitch deck, customer-discovery summaries)

Specify tool components, demo scenario, zero-infrastructure deployment path, and budget alignment to the $180k programming line.

**Gate-verdict:** pass if spec defines all 3 components + demo scenario + zero-infra deployment and maps to ADA budget lines.

### 4. hermes-83hq.3.2 — Toolkit prototype

**Paperclip issue:** JAC-83hq.3.2
**Priority:** P2
**Agent:** Bright via hermes_local
**Deliverable:** `toolkit-prototype.md`
**Depends on:** 83hq.3.1

Build a demo-able prototype of the founder-sprint AI toolkit covering all 3 components. Must work with zero local infrastructure. Document prototype design, demo script, and run instructions.

**Gate-verdict:** pass if prototype doc has a concrete demo scenario, clear run instructions, and maps to all 3 toolkit components.

### 5. hermes-83hq.5.1 — Stakeholder tracker

**Paperclip issue:** JAC-83hq.5.1
**Priority:** P2
**Agent:** Bright via hermes_local
**Deliverable:** `stakeholder-tracker.md`
**Depends on:** None (prerequisite for 83hq.5.2)

Build the advisory committee tracker from the reference article. Extract all 9 committee seats with voting status, partner orgs (Commerce, REI Oklahoma, SBDCs), and key people (Bill Murphy, Amanda Dion).

**Gate-verdict:** pass if tracker covers all 9 seats + partner orgs with voting status and is grounded in the reference article.

### 6. hermes-83hq.5.2 — Cadence + milestone doc

**Paperclip issue:** JAC-83hq.5.2
**Priority:** P2
**Agent:** Bright via hermes_local
**Deliverable:** `cadence-milestone.md`
**Depends on:** 83hq.5.1

Document trust meeting cadence, 4 key milestones (Commerce amendment, operating lead hire, Spring 2028 decision, building decision), partner touchpoints, and evidence requirements for each milestone.

**Gate-verdict:** pass if document covers all 3 cadences, 4 milestones, 3 partner touchpoints, and evidence alignment.

## Dependency Graph (Ringer Manifest)

```
83hq.2.1 → 83hq.2.2
83hq.3.1 → 83hq.3.2
83hq.5.1 → 83hq.5.2
83hq.1  (completed)
83hq.4  (completed)
```

Max parallelism: 3 (three independent chains: outreach, toolkit, stakeholders)

## Ringer Manifest

The manifest is at `riner-manifest/jac-83hq-execution-plan.json` with 6 tasks covering all open child beads. All tasks use `hermes_local` engine with `model: auto`, assigned to agent `100915f9` (Bright). Each task includes:
- `paperclip_issue` and `bead_id` for fleet wiring
- `expect_files` for deliverable verification
- `depends_on` for dependency chains
- `check` with grep-based gate verdict
- `verified` with human-readable acceptance confirmation

## Acceptance Criteria

- All 6 open child beads have Beads-created Paperclip issues (JAC-83hq.X)
- Ringer manifest has all 6 tasks with correct dependencies
- Each task has a spec, expected files, check gate, and verified statement
- Dependency graph is acyclic with max_parallel=3
- Plan document is committed to Paperclip issue JAC-4582

## Status

**Complete** — decomposition and Ringer manifest produced. The manifest at `riner-manifest/jac-83hq-execution-plan.json` covers all 6 open child beads with proper dependency chains and gate-verdict checks.
