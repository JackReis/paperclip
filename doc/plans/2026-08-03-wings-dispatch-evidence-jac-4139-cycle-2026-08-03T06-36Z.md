# 2026-08-03T06:36Z — JAC-4139 Coordinator Dispatch Evidence

## Cycle Summary
- **Run ID:** 7be0b24c-bb85-45e0-9527-c2843528361f
- **Time:** 2026-08-03T06:36:45Z
- **Paperclip API:** v2026.722.0 (local_trusted)
- **Dispatches:** 0
- **Disposition:** in_progress (restart-ready), awaiting native child-completion wake on upstream resolution

## Live Agent-Table Verification (authenticated GET /api/companies/87c32b8e/agents)

### Verified-Idle Free Lanes (eligible for dispatch)

| Agent | Pool | Model | maxParallel | allowedWork | Notes |
|-------|------|-------|-------------|-------------|-------|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | 1 | read-only, impl, review | Verified. Reports to Coordinator. No assigned issue. |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | 1 | impl, review | Verified. Reports to Coordinator. No assigned issue. |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | 1 | review, impl | Verified. Reports to Coordinator. No assigned issue (assignedIssueId=null). |

All three verified-idle lanes are free (no live run or issue lease). Each is within
its pool maxParallel limit (claude-code pool: 2 max; independent-review: 1 max).

### Excluded Lanes (not routable)

| Agent | Pool | Reason |
|-------|------|--------|
| Aegis Coder X (da00de99) | local-aegis | Agent status=error ("Timed out after 12000s"). Lane=verified but agent error — NOT dispatched per policy. |
| Aegis Coder Y (181f381b) | local-aegis | Lane state=error ("Timed out after 12000s"). NOT routable. |
| Paperclip Agent Auditor (5b2bece1) | codex | Agent status=error (codex quota block). Lane=quota_blocked. NOT routable. |
| Hermes Mistral (1029acc4) | ollama-cloud | Paused (manual). NOT routable. |
| Flash (b37f4d70) | ollama-cloud | Lane= pending_repair (MCPServerTask event-loop-closed defect). NOT routable. |
| Wings (80284e06) | ollama-cloud | Lane=reserved (strategic). Excluded from routine dispatch. |

### Pool Capacity Check
- **claude-code**: 0/2 in use (maxParallel=2). Herald + Plan Runner are both free.
- **local-aegis**: 0/2 in use but both agents in error state. Pool effectively at 0 capacity (host health gate P89 — see CTX-SpO2 P:down).
- **codex**: 0/1 in use but quota_blocked. Not capacity.
- **ollama-cloud**: 0/3 used (Wings reserved, Hermes Mistral paused, Flash pending_repair). Wings reserved is NOT capacity. Pool at 0 routable.
- **independent-review**: 0/1 in use (Kimi Code via Ringer free).
- **external fast lane**: no agent present.

## Candidate Task Pool Analysis

### Todo issues (31 total) — all policy-excluded or dependency-blocked

| JAC | Status | Assignee | Exclusion Reason |
|-----|--------|----------|-----------------|
| JAC-3671 | todo | unassigned | Credential-bound (restore anthropic + mistral credentials) |
| JAC-3714 | todo | unassigned | Human gate (Nix install, approval-gated) |
| JAC-3558 | todo | unassigned | Human gate (Oklahoma Integrated Care) |
| JAC-3557 | todo | unassigned | Human gate (Prius mobile test) |
| JAC-3555 | todo | unassigned | Human gate (Belmont records / Invisalign) |
| JAC-3437 | todo | unassigned | Personal task (haircut) — not plan-backed |
| JAC-3365 | todo | unassigned | Personal task (NotebookLM) — not plan-backed |
| JAC-3359 | todo | unassigned | Personal task (Toyota diagnostic) — not plan-backed |
| JAC-3361 | todo | unassigned | Personal task (car codes) — not plan-backed |
| JAC-3358 | todo | unassigned | Personal task (OBD-II scan) — not plan-backed |
| JAC-3360 | todo | unassigned | Personal task (hybrid battery quote) — not plan-backed |
| JAC-3541 | todo | unassigned | TEST_DELETE marker — not real work |
| JAC-4217 | todo | unassigned | DECISION gate (Jack approval) |
| JAC-4216 | todo | unassigned | DECISION gate (Jack approval) |
| JAC-4388 | todo | unassigned | Board action (Jack approval) |
| JAC-4501 | todo | unassigned | Self-review (JAC-4000) — policy-excluded |
| JAC-4500 | todo | unassigned | Self-review (JAC-4139) — policy-excluded |
| JAC-3970 | todo | unassigned | Dispatch planning note — not a task |
| JAC-3900 | todo | unassigned | (credential-bound / dispatch coordination) |

### In-progress issues assigned to verified-idle lanes

| JAC | Assignee | Status | Upstream Blocker |
|-----|----------|--------|-----------------|
| JAC-3596 | Kimi (3f1712eb) | todo (assigned) | blockedBy: JAC-3592 (in_progress, Luna), JAC-3593 (in_progress, Luna), JAC-3594 (in_progress, Luna) |
| JAC-3592 | Luna (2f92499a) | in_progress | — (Luna working) |
| JAC-3593 | Luna (2f92499a) | in_progress | — (Luna working) |
| JAC-3594 | Luna (2f92499a) | in_progress | — (Luna working) |
| JAC-3628 | Plan Runner (2c6b1cc9) | blocked | depends on JAC-3629 (assigned to Fable, status=error) + JAC-3634 |
| JAC-3629 | Fable (f1ef5e14) | todo (assigned) | Fable is in error state — blocked |
| JAC-4093 | Plan Runner (2c6b1cc9) | blocked | depends on JAC-3705 canary (assigned to Flash, pending_repair) |
| JAC-4094 | Paperclip Agent Auditor (5b2bece1) | blocked | codex quota_blocked |
| JAC-4187 | Herald (a1e8cb0d) | blocked | in_review state — awaiting review |
| JAC-4190 | Plan Runner (2c6b1cc9) | blocked | depends on JAC-3933 in_review |
| JAC-4222 | Herald (a1e8cb0d) | blocked | depends on JAC-4187 in_review |
| JAC-4476 | Plan Runner (2c6b1cc9) | done | (previously dispatched, now complete) |
| JAC-4462 | Plan Runner (2c6b1cc9) | blocked | depends on JAC-3628 (blocked) + JAC-3634 |

### Verified-idle lanes with assigned work
- Herald (a1e8cb0d): no todo assigned (assignedIssueId=null on agent). JAC-4187 is blocked/in_review but NOT directly assigned to Herald — it's listed as assigned to Herald in prior cycles but current agent table shows assignedIssueId=null. JAC-4222 is assigned to Herald but blocked.
- Plan Runner (2c6b1cc9): JAC-3628 (blocked), JAC-4190 (blocked), JAC-4462 (blocked), JAC-4093 (blocked)
- Kimi Code via Ringer (3f1712eb): JAC-3596 (todo but blockedBy Luna issues in_progress)

## Decision: 0 Dispatches

### Rationale
1. **All three verified-idle lanes** (Herald, Plan Runner, Kimi Code via Ringer) have their
   assigned todo issues blocked upstream — no independent, plan-backed, unleased task
   was found in the candidate pool.
2. **JAC-3596** (assigned to Kimi) is blocked on JAC-3592/3593/3594 (all in_progress under Luna).
   Per policy: "Exclude blocked, credential-bound, externally destructive, review,
   dependent, or already leased work." JAC-3596 is dependent work — NOT dispatched.
3. **JAC-3628** (assigned to Plan Runner) is blocked on JAC-3629 (Fable in error state).
4. **JAC-4187** (assigned to Herald) is in_review — blocked, NOT dispatched.
5. **JAC-4190, JAC-4222** (assigned to Plan Runner/Herald) are blocked on JAC-3933 (in_review).
6. All 31 unassigned todo issues are either:
   - Credential-bound (JAC-3671)
   - Human gates (JAC-3714, JAC-3558, JAC-3557, JAC-3555)
   - Jack decision gates (JAC-4217, JAC-4216, JAC-4388)
   - Self-review (JAC-4501, JAC-4500)
   - Personal tasks (JAC-3437, JAC-3365, etc.)
   - Test markers (JAC-3541)
   - Not plan-backed
7. No stale-log inference: all lane states confirmed via authenticated live API
   GET /api/companies/87c32b8e/agents — no fresh generation failure on any verified lane.

### Upstream Blockers to Clear
- JAC-3933 (in_review) → unblocks Herald + Plan Runner (JAC-4187, JAC-4190, JAC-4222)
- JAC-4388 (Jack approval gate) → unblocks Plan Runner chain (JAC-3628, JAC-4462)
- JAC-3592/3593/3594 (in_progress under Luna) → unblocks Kimi Code (JAC-3596)
- JAC-3629 (Fable in error) → unblocks Plan Runner (JAC-3705, JAC-4093)

## Liveness Path
Native Paperclip child-completion continuation remains the liveness path.
On upstream resolution, the blocked parent issues (JAC-3628, JAC-4187, JAC-3596, JAC-4190, JAC-4222)
will be woken by Paperclip's native completion mechanism, which in turn wakes JAC-4139
to immediately refill newly free verified lanes.

The fallback schedule (every 2 hours) will trigger the next coordinator wake
if no native child-completion fires first.

## Evidence Sources
- Live API: GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents (authenticated, bearer=Wings 80284e06)
- Live API: GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues (filtered by status=todo, in_progress, blocked)
- Live API: GET /api/issues/JAC-3596 (detail fetch for upstream blocker chain)
- CTX-SpO2: H100 N99 F100 G100 I100 A100 P88 T100 (P=down for local-aegis host health gate)
