# Coordinator Dispatch Evidence — Cycle 2026-08-03T02:45Z

**Issue:** JAC-4000 — Coordinator Fleet Coordination Check
**Run:** da7b89e4-4b2b-48c0-9089-6554caca5279
**Agent:** Coordinator (dc2ca597)
**Dispatches:** 0

## Fresh authenticated live verification

Source: `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` (bearer=Coordinator dc2ca597) + direct issue fetches.
Paperclip API v2026.722.0, deploymentMode=local_trusted.

## Verified-idle free lanes (3/3 eligible, all occupied by blocked upstream work)

- **Herald** (a1e8cb0d) — claude-code/opus-4-8/verified/idle, maxParallel=1, verifiedAt 2026-07-31T19:56:00Z
  - Assigned: JAC-4187 (blocked; waits JAC-3933 in_review), JAC-4422 (blocked), JAC-4505 (blocked; waits JAC-4152)
- **Plan Runner** (2c6b1cc9) — claude-code/opus-4-8/verified/idle, maxParallel=1, verifiedAt 2026-07-31T19:56:00Z
  - Assigned: JAC-3628 (blocked; waits JAC-3629 todo/in_progress on Fable), JAC-4462 (blocked)
- **Kimi Code via Ringer** (3f1712eb) — independent-review/k3/verified/idle, maxParallel=1, verifiedAt 2026-07-23T20:03:10Z
  - Assigned: JAC-3596 (todo; waits JAC-3592/3593/3594 in_progress on Luna)

**Pool constraint:** claude-code pool capacity=2. Both lanes verified/idle but all assigned work is blocked or dependent. No independent plan-backed unleased task available.

## Excluded lanes (per dispatch policy)

| Agent | Pool | Lane state | Reason |
|-------|------|-----------|--------|
| Aegis Coder X (da00de99) | local-aegis | verified/running | Occupied (JAC-3705 in_progress) |
| Aegis Coder Y (181f381b) | local-aegis | error | "Process lost"; not routable |
| Paperclip Agent Auditor (5b2bece1) | codex | quota_blocked | Blocked until Aug 4 11:09 PM CT |
| Hermes Mistral (1029acc4) | ollama-cloud | paused | Paused lane |
| Wings (80284e06) | ollama-cloud | reserved | Reserved lane |
| Flash (b37f4d70) | ollama-cloud | pending_repair | MCPServerTask event-loop-closed defect |
| Fable (f1ef5e14) | n/a | running | Assigned JAC-3629 in_progress |

## Unassigned todo pool (all policy-excluded)

| Issue | Reason |
|-------|--------|
| JAC-3671 | Credential-bound |
| JAC-4388 | Jack approval gate, board action |
| JAC-4501 / JAC-4500 | Self-review |
| JAC-4217 / JAC-4216 | Jack decision gates |
| JAC-3558 / JAC-3557 / JAC-3555 | Human gates |
| JAC-3714 | Approval-gated |
| JAC-3970 | Dispatch meta-issue, target lane occupied — circular |
| JAC-4046 | Assigned to Hermes Mistral (paused) |
| JAC-3541 | TEST_DELETE |
| JAC-3437 / JAC-3365 | Personal |

## Dispatch decision: 0 dispatches

No independent plan-backed unleased task available across verified-idle lanes. All verified lanes have blocked or dependent assigned work; all remaining todo tasks are policy-excluded.

No stale-log inference — all gates from authenticated live API metadata.executionLane + direct issue fetches.

## Awaiting native Paperclip child-completion wake

- JAC-3933 (in_review) → unblocks Herald's JAC-4187
- JAC-3629 (todo, running on Fable) → unblocks Plan Runner's JAC-3628 chain
- JAC-3592/3593/3594 (in_progress on Luna) → unblocks Kimi's JAC-3596
- JAC-4152 (blocked, Coordinator) → unblocks Herald's JAC-4505

## Coordinator self-assigned (within boundary, awaiting upstream)

- JAC-3612 (blocked) — Luna exact-route read-only smoke v2 for JAC-3595
- JAC-4152 (blocked) — Agent audit: Kloud — awaiting Klaw recovery
- JAC-4383 (blocked) — Standing Klaw/OpenClaw lane — awaiting Klaw bootstrap
- JAC-4492 (blocked) — Unblock liveness incident for JAC-4431
