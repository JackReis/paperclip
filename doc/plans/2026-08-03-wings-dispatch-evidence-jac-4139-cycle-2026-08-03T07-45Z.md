# JAC-4139 Dispatch Evidence — Cycle 2026-08-03T07:45Z

**Run ID:** 8cb92e27-f0c0-4962-bba0-1e5ff417728a
**Issue:** JAC-4139 — Coordinator Fleet Coordination Check
**Timestamp:** 2026-08-03T07:45Z (fresh)
**Paperclip API:** v2026.722.0 on :3101
**Verification method:** Authenticated live API GET /api/companies/87c32b8e.../agents

---

## Lane / Pool State (verified-idle free lanes)

| Lane | Pool | Model | State | Status | ErrorReason | MaxParallel | Occupied |
|------|------|-------|-------|--------|-------------|-------------|----------|
| Herald | claude-code | opus-4-8 | verified | idle | — | 1 | 0 |
| Plan Runner | claude-code | opus-4-8 | verified | idle | — | 1 | 0 |
| Kimi Code via Ringer | independent-review | k3 | verified | idle | — | 1 | 0 |

### Excluded lanes

| Lane | Pool | State | Reason |
|------|------|-------|--------|
| Wings (self) | ollama-cloud | reserved | Strategic reserve; allowedWork=[fleet-recovery, coordination]; excluded from routine dispatch |
| Aegis Coder X | local-aegis | verified | agent.status=error ("Timed out after 12000s"); host P89 gate down — NOT dispatched |
| Aegis Coder Y | local-aegis | error | lane=error — NOT dispatched |
| Paperclip Agent Auditor | codex | quota_blocked | HTTP 400 "usage limit"; blocked until Aug 4 ~23:09CT — NOT dispatched |
| Hermes Mistral | ollama-cloud | paused | Manual pause — excluded |
| Flash | ollama-cloud | pending_repair | MCPServerTask event-loop-closed defect — excluded |
| Scout | ollama-cloud | paused | Manual pause — excluded |

### Pool capacity summary

- **Claude Code (OmniGent, maxParallel=2):** 2 free (Herald + Plan Runner both idle/verified). Herald's assigned issue (JAC-4187) blocked; Plan Runner's chain (JAC-3628/JAC-4190/JAC-4462/JAC-3665) blocked.
- **Local Aegis (maxParallel=2):** 0 free. Coder X: lane=verified but agent.status=error (host P89 gate down). Coder Y: lane=error.
- **Ollama Cloud (maxParallel=3):** 0 free. Wings reserved (strategic), Mistral paused, Flash pending_repair.
- **Codex (maxParallel=1):** 0 free. Auditor quota_blocked until Aug 4.
- **Independent Review (maxParallel=1):** 1 free (Kimi). Verified but 11-day-stale verification (2026-07-23). JAC-3596 blocked on Luna JAC-3592/3593/3594 (in_progress).
- **External fast lane (maxParallel=1):** 0 — no canary/no-write lane active.

## Upstream blockers (confirmed via live API)

| Issue | Status | Assignee | Unblocks |
|-------|--------|----------|----------|
| JAC-3933 | in_review | unassigned | Herald's candidate set (incl. JAC-4187, JAC-3876, JAC-4422) |
| JAC-4388 | todo | unassigned (Jack approval gate) | Plan Runner chain: JAC-3629 → JAC-3628, JAC-4190, JAC-4462 |
| JAC-3592/3593/3594 | in_progress | Luna (2f92499a) | Kimi via JAC-3596 |

## Live runs

- 8cb92e27: Wings (self) — running on JAC-4139 (this run)
- b2d06856: Herald — running on JAC-0cefb63c (MLX spike #2, blocked by spike #1)
- 13f1203e: Wings — queued backlog on JAC-4000
- d00ec8de: Wings — queued on-demand backlog

## Dispatch decision

**0 dispatches.**

Queue exhausted. No independent plan-backed unblocked unleased task available for any free verified lane. All verified-idle free lanes (Herald, Plan Runner, Kimi) have candidate work that is dependency-blocked upstream. Occupied lane (Herald's MLX spike) is running approved work but blocked by spike #1.

No fresh authenticated generation failure observed on any verified lane. No stale-log inference — all gate states confirmed via live API metadata.executionLane.

## Liveness path

Native Paperclip child-completion continuation. Awaiting upstream resolution on JAC-3933, JAC-4388, or JAC-3592/3593/3594 to wake JAC-4139.

**Disposition:** in_progress (restart-ready).
