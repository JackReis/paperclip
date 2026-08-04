# Wings Dispatch Evidence — JAC-4139 Cycle 2026-08-03T23:52Z

- **Run ID:** 518bfd3f-e26d-4e06-8aa8-4ad9ae3b0375
- **Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- **Issue:** JAC-4139 — Coordinator Fleet Coordination Check
- **Status:** in_progress
- **Liveness reason:** run_liveness_continuation

---

## LIVE AGENT TABLE (GET /api/companies/87c32b8e.../agents, bearer=Wings, this run)

Paperclip v2026.722.0, deploymentMode=local_trusted. 48 agents returned. executionLane metadata read from agent.metadata.executionLane field.

### Lanes with executionLane metadata

| Agent | Status | Pool | Lane State | Model | maxParallel | verifiedAt | Notes |
|-------|--------|------|-----------|-------|-------------|------------|-------|
| Herald (a1e8cb0d) | idle | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:37Z | Clean re-probe. 0 active runs. All assigned issues done/blocked. |
| Plan Runner (2c6b1cc9) | idle | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:15Z | 0 active runs. JAC-3628 blocked (sampleBlockerIdentifier=JAC-3634). |
| Aegis Coder X (da00de99) | running | local-aegis | verified | ollama/qwen3-coder:30b | 1 | 2026-07-31T19:56Z | Running, occupied 1/1 by JAC-4511 (in_progress, activeRun since 22:33:55Z). |
| Aegis Coder Y (181f381b) | idle | local-aegis | error | ollama/qwen3-coder:30b | 1 | 2026-07-31T19:56Z | Timed out 12000s. NOT routable. |
| Hermes Mistral (1029acc4) | paused | ollama-cloud | paused | deepseek-v4-pro | 1 | 2026-07-31T19:56Z | Manually paused. NOT routable. |
| Flash (b37f4d70) | idle | ollama-cloud | pending_repair | deepseek-v4-flash | 1 | 2026-07-31T19:56Z | MCPServerTask event-loop-closed defect. NOT routable. |
| Coordinator (dc2ca597) | running | local-aegis | verified | nous/laguna-s-2.1:free | 2 | 2026-08-03T23:38Z | This IS the coordinator, not a dispatch lane. |
| Wings (80284e06) | running | local-aegis | verified | nous/laguna-s-2.1:free | 4 | 2026-08-03T23:38Z | Executing this cycle. Not a dispatch lane. |

### Agents without executionLane metadata

| Agent | Status | adapterType | Notes |
|-------|--------|-------------|-------|
| Kimi Code via Ringer (3f1712eb) | idle | hermes_local | No executionLane metadata. NOT routable. |
| Paperclip Agent Auditor (5b2bece1) | idle | hermes_local | No executionLane metadata. NOT routable. |
| Flash Executor (d22538a9) | idle | hermes_local | Profile-and-receipts-only. NOT routable. |
| Omnigent Router | idle | hermes_local | On-demand router. NOT routable. |

---

## ISSUE LANDSCAPE (live API, this run)

### Issues assigned to dispatchable lanes

**Herald (a1e8cb0d):** 15 issues fetched via assigneeAgentId filter
- Done: JAC-4500, JAC-4505, JAC-4504, JAC-3564, JAC-4303, JAC-4491, JAC-4478, JAC-3955
- Blocked: JAC-4422, JAC-3876 (no recent movement)
- Backlog: JAC-4081
- No active in-progress runs.

**Plan Runner (2c6b1cc9):** 4 issues fetched
- Done: JAC-4190, JAC-3669, JAC-4490
- Blocked: JAC-3628 (blockerAttention: needs_attention, sampleBlockerIdentifier=JAC-3634)
- No active in-progress runs.

**Aegis Coder X (da00de99):** 2 issues fetched
- in_progress: JAC-4511 (activeRun running since 2026-08-03T22:33:55Z)
- todo: JAC-3705 (blocked upstream by JAC-4093, which is itself blocked and assigned to Plan Runner)
- Lane occupied 1/1 by JAC-4511.

**Aegis Coder Y (181f381b):** 6 issues — all done/cancelled. Lane error. NOT routable.

### Unassigned todo issues (policy-excluded scan)

30 issues fetched via GET /api/companies/.../issues?status=todo&assignee=unassigned. All policy-excluded:

| Issue | Priority | Exclusion Reason |
|-------|----------|-----------------|
| JAC-4217 | high | Jack decision gate (assigneeUserId=local-board) |
| JAC-4216 | high | Jack decision gate (assigneeUserId=local-board) |
| JAC-3558 | high | Human gate (assigneeUserId=local-board) |
| JAC-3557 | high | Human gate (assigneeUserId=local-board) |
| JAC-3555 | high | Human gate (assigneeUserId=local-board) |
| JAC-3671 | critical | Credential-bound (Talaris anthropic+mistral creds) |
| JAC-3714 | high | Approval-gated, requires interactive sudo (Nix install) |
| JAC-3437 | medium | No plan backing, personal task |
| JAC-3358-3361 | medium | Dependency chain (Prius repair, parent=5f502d93) |
| JAC-3365 | medium | No plan backing, personal task |
| JAC-3970 | low | No plan backing, dispatch meta-issue |
| JAC-3541 | low | TEST_DELETE — no-op |
| JAC-4501 | high | issue_productivity_review origin — auto-generated, not dispatchable work |
| JAC-3593 | high | Already leased to 2f92499a |
| JAC-3594 | high | Already leased to 2f92499a |
| JAC-3596 | high | Already leased to 3f1712eb (Kimi), no lane metadata |
| JAC-3705 | high | Already leased to da00de99 (Aegis Coder X), blocked by JAC-4093 |
| JAC-3802 | high | Already leased to 5b2bece1 (Paperclip Agent Auditor) |
| JAC-4046/4058/4059/4060 | high/med | Already leased to 1029acc4 (Hermes Mistral, paused) |
| JAC-3770 | high | Already leased to dc2ca597 (Coordinator) |
| JAC-3590 | high | Already leased to dc2ca597 (Coordinator) |
| JAC-3597 | high | Already leased to f83be6e5 (Zatara) |
| JAC-3400 | medium | Already leased to dc2ca597 (Coordinator) |
| JAC-3634 | medium | Already leased to dc2ca597 (Coordinator) |

### Key blocked issues

- JAC-3705 (Aegis Coder X): todo, blocked upstream by JAC-4093 (blocked, assigned to Plan Runner)
- JAC-3628 (Plan Runner): blocked, sampleBlockerIdentifier=JAC-3634

---

## HOST HEALTH

- Paperclip API: ok, v2026.722.0, local_trusted mode
- CTX-SpO2: 98% (H100 N100 F100 G100 I100 A100 P87 T100) — P=aegis host at 87, within green threshold for local-Aegis dispatch
- Database: ok, backup recent (23h old)

---

## DISPATCH DECISION

**0 dispatches — queue exhausted.**

Verified-idle free lanes:
1. **Herald** (local-aegis, verified, idle) — 0 active runs, but all assigned issues are done/blocked/backlog. No new dispatchable work.
2. **Plan Runner** (local-aegis, verified, idle) — 0 active runs, but assigned issue JAC-3628 is blocked (blocker JAC-3634). No dispatchable work.
3. **Wings (self)** (local-aegis, verified, running) — executing this coordination cycle. Not a dispatch lane.

Excluded lanes:
- Aegis Coder X: verified+running but occupied 1/1 by JAC-4511. JAC-3705 blocked by JAC-4093.
- Aegis Coder Y: lane=error (12000s timeout). NOT routable.
- Hermes Mistral: paused. NOT routable.
- Flash: pending_repair (MCPServerTask defect). NOT routable.
- Kimi Code via Ringer: no verified lane metadata. NOT routable.
- Paperclip Agent Auditor: no verified lane metadata. NOT routable.
- Flash Executor: profile-and-receipts-only. NOT routable.
- Omnigent Router: on-demand router, not a direct lane.

All 30 fetched todo issues are policy-excluded (blocked by upstream, Jack decision gates, credential-bound, no plan backing, already leased, or test/no-op).

No fresh authenticated generation failure on verified lanes — exclusion is based on live metadata, not stale logs.

---

## DISPOSITION

**in_progress (restart-ready)**

Native Paperclip child-completion continuation is the liveness path. Expected wake triggers:
- JAC-4187 (in_review → Herald dispatchable on completion)
- JAC-4388 (board action → unblocks Plan Runner JAC-3628→JAC-3629)
- JAC-4511 completion → frees Aegis Coder X 1/1 for JAC-3705 (if JAC-4093 also clears)
- JAC-3592/3593/3594 (Luna in_progress → unblocks Kimi JAC-3596)

Evidence written to: doc/plans/2026-08-03-wings-dispatch-evidence-jac-4139-cycle-2026-08-03T23-52Z.md
