# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T15:38Z

**Run ID:** 72a19f56-5242-4571-b85a-473ee5c6b3d4
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Timestamp:** 2026-08-03T15:38:00Z
**Paperclip Version:** v2026.722.0

## Dispatch Decision: 0 dispatches — queue exhausted (re-verified live)

Fresh authenticated GET `/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` and `/api/companies/87c32b8e.../issues` at 2026-08-03T15:38:00Z.

## Verified-Idle Free Lanes (at 15:38Z)

| Agent | Pool | Model | Lane State | Status | Assigned Issues | Capacity |
|-------|------|-------|------------|--------|-----------------|----------|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | idle | 6 (all blocked/backlog) | AVAILABLE |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | idle | 5 (all blocked/in_review) | AVAILABLE |
| Aegis Coder X (da00de99) | local-aegis | qwen3-coder:30b | **verified (recovered)** | running | 1 (JAC-3705, blocked) | AVAILABLE |

### Aegis Coder X Recovery Note
- Wake comment at 15:32Z reported: `lane=verified, status=error, agent=error "Process lost -- server may have restarted", host P89 gate`
- Live re-probe at 15:38Z: `lane=verified, status=running, verification="WS1 re-probe: running, heartbeat fresh, no errorReason"`
- Agent has recovered from error state. No activeRun on the agent.
- **However**: JAC-3705 (assigned todo) is blockedBy JAC-4093 (blocked), so no dispatchable work exists for this lane.
- Per policy: never infer quota outage from stale logs; this is a fresh authenticated re-probe confirming recovery.

## Excluded Lanes (not capacity)

| Agent | Pool | Lane State | Status | Reason |
|-------|------|------------|--------|--------|
| Wings (self, 80284e06) | ollama-cloud | reserved | running | reserved (strategic) |
| Aegis Coder Y | local-aegis | error | idle | 12000s timeout defect — NOT routable |
| Hermes Mistral | ollama-cloud | paused | paused | manual pause — NOT routable |
| Flash | ollama-cloud | pending_repair | idle | MCPServerTask event-loop-closed defect — NOT routable |
| Paperclip Agent Auditor | codex | quota_blocked | idle | Quota blocked until 2026-08-04 — NOT routable |
| Kimi Code via Ringer (3f1712eb) | independent-review | verified | idle | Verification 2026-07-23 (11 days stale) + Luna dependency chain — NOT routable |

## Unassigned Issues (14 todo, all policy-excluded or self-referential)

| Issue | Priority | Status | Exclusion Reason |
|-------|----------|--------|-----------------|
| JAC-3671 | critical | todo | Credential-bound (Restore Talaris anthropic + mistral credentials) |
| JAC-3593 | high | todo | Assigned to Luna (2f92499a), Luna has no executionLane — NOT routable |
| JAC-3594 | high | todo | Assigned to Luna (2f92499a), Luna has no executionLane — NOT routable |
| JAC-3596 | high | todo | Assigned to Kimi (3f1712eb), terminalBlockers on JAC-3592 (blocked)+JAC-3593/3594 (Luna) — NOT routable |
| JAC-3705 | high | todo | Assigned to Aegis Coder X, blockedBy JAC-4093 (blocked) |
| JAC-3770 | high | todo | Depends on JAC-3494 (blocked) — implicit dependency excluded |
| JAC-3802 | high | todo | blockedBy JAC-3918 (blocked, Wings-owned) — excluded |
| JAC-4046 | high | todo | [dispatch] tag but routes to Ollama Cloud — all 3 ollama-cloud lanes non-capacity |
| JAC-4216 | high | todo | DECISION (Jack) — human gate |
| JAC-4217 | high | todo | DECISION (Jack) — human gate |
| JAC-3590 | high | todo | Assigned to Coordinator (dc2ca597) — not unassigned |
| JAC-3597 | high | todo | Assigned to Zatara (f83be6e5) — not unassigned |
| JAC-4501 | high | todo | Self-referential: productivity review on JAC-4000 (Wings's own issue) — meta, not independent plan-backed work |
| JAC-3770 | high | todo | [JAC-3494] deploy — depends on blocked JAC-3494 |

## Upstream Blockers (live, 15:38Z)

| Issue | Status | Notes |
|-------|--------|-------|
| JAC-4187 | done | Jack gate cleared (completed 2026-08-03T15:22Z) |
| JAC-4190 | in_review | Awaits Jack explicit approval — not dispatchable |
| JAC-3933 | done | Cross-vendor telemetry detectors — resolved |
| JAC-3628 | blocked | Pull-first fleet beacon — blocked, deps done |
| JAC-3629 | done | Fable 5 project page — completed |
| JAC-3592 | blocked | Luna: exact model-catalog + footer gates — has activeRecoveryAction (missing_disposition, waking Luna) |
| JAC-3593 | todo | Luna: working-transition + deadline gates — assigned to Luna, not routable |
| JAC-3594 | todo | Luna: initial-modal cleanup — assigned to Luna, not routable |
| JAC-3596 | todo | Independent exact-SHA verification — assigned to Kimi, terminalBlockers on JAC-3592/3593/3594 |
| JAC-4093 | blocked | JAC-3705 canary preconditions — blocks JAC-3705 |
| JAC-4516 | blocked | Wings escalation: JAC-3592 Luna stale in_progress — Coordinator 403 boundary |

## Active Runs

None in verified-idle free lanes. Aegis Coder X (da00de99) has no activeRun (recovered from error). Wings self running JAC-4000 (current run 72a19f56).

## Disposition

**in_progress (restart-ready), 0 dispatches, queue exhausted.**

Awaiting:
1. JAC-4190 Jack approval to unblock Plan Runner from review
2. Luna lane restoration (JAC-3592 resolution + JAC-3593/3594 completion) to unblock Kimi (JAC-3596)
3. JAC-4093 resolution to unblock JAC-3705 on Aegis Coder X

Native Paperclip child-completion continuation is primary liveness path; schedule is fallback.
