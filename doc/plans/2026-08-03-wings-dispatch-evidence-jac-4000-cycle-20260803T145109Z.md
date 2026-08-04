# Wings JAC-4000 Dispatch Evidence — Cycle 2026-08-03T14:51:09Z

**Run:** bff69b96-4c98-41a5-a91a-c285d1dfd8d2
**Paperclip API:** v2026.722.0
**Verification time:** 2026-08-03T14:51:09Z
**Method:** Fresh authenticated live verification via GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents

## Dispatch Decision: 0 dispatches — queue exhausted

## Verified-Idle Free Lanes (1 eligible-by-lane, 0 dispatchable)

- **Aegis Coder X** (da00de99): running+verified, local-aegis/qwen3-coder:30b — at capacity (0/1 assigned, but 0/2 maxParallel with 1 live run). JAC-3705 todo (depends on JAC-4093 in_review, unblocking) — dependency-gated, not independent.

## Verified-Lane But Routable State Changed

- **Herald** (a1e8cb0d): lane state=verified, but agent status=error. Fresh authenticated error at 2026-08-03T14:44:31.116Z — "Internal error: Failed to authenticate: OAuth session expired and could not be refreshed". Per policy: fresh authenticated generation failure on verified lane. NOT routable despite verified state.
- **Plan Runner** (2c6b1cc9): lane state=verified, but agent status=error. Same fresh OAuth session expiry at 2026-08-03T14:44:31Z. NOT routable.

## Verified-Idle but No Dispatchable Work

- **Kimi Code via Ringer** (3f1712eb): verified+idle, independent-review/kimi-for-coding/k3. JAC-3596 assigned but depends on Luna JAC-3592/3593/3594 — JAC-3592 still blocked, JAC-3593/3594 still todo. Lane de facto blocked on Luna smoke receipt.

## Excluded Lanes (not capacity)

- Wings (reserved strategic)
- Aegis Coder Y (lane=error, 12000s timeout defect)
- Hermes Mistral (paused/manual)
- Flash (pending_repair MCPServerTask event-loop-closed defect)
- Paperclip Agent Auditor (quota_blocked until Aug 4, codex usage limit)
- Scout (paused)

## Upstream Blocker Status (changes since 14:33Z cycle)

- JAC-4388: DONE at 14:33:21Z (was board action blocking Fable repair) — dependency on JAC-3629 now resolved but blockedBy not yet cleared in Paperclip
- JAC-3933: DONE at 14:33:48Z (was in_review — cross-vendor detector spec)
- JAC-4190: DONE at 2026-08-03T04:40:10Z (was blocked escalation issue)
- JAC-4187: blocked (D3 Fleet dashboard wireframes — Jack approval gate, blockedBy=[])
- JAC-3628: blocked (depends on JAC-3629 todo, JAC-3634 todo to Coordinator; children not yet dispatched/completed)
- JAC-3629: todo, blockedBy JAC-4388 (now done) — dependency resolution pending Paperclip state update
- JAC-3705: todo, blocked by JAC-4093 (in_review, Coordinator)
- JAC-4093: in_review (JAC-3705 canary preconditions, assigned to Coordinator)
- JAC-3592: blocked (Luna, awaiting exact-model smoke receipt)
- JAC-3593/3594: todo (Luna, awaiting JAC-3592 baseline + footer gates)
- JAC-4516: blocked (Wings escalation — Luna stale in_progress, Coordinator 403)
- JAC-3770: todo (Coordinator, implicit dep on JAC-3494 blocked)

## Policy Exclusions

- 4 unassigned todos all policy-excluded: JAC-4500/JAC-4501 (productivity reviews, not dispatchable work), JAC-4503 (Ollama Cloud API key recovery — credential-bound), JAC-4494 (test backlog). No independent plan-backed task found.

## Verification Freshness

- Herald/Plan Runner: lane verifiedAt 2026-07-31T19:56:00Z (WS1 re-probe). Agent status changed to error at 14:44:31Z (fresh authenticated OAuth expiry failure). NOT routable.
- Aegis Coder X: running+verified, lane verifiedAt 2026-07-31T19:56:00Z, WS1 re-probe running+heartbeat fresh.
- Kimi Code via Ringer: verified idle, verifiedAt 2026-07-23T20:03:10Z (K3 lane smoke PASS). Last heartbeat 2026-08-02T03:22:24Z (stale but verified).
- No stale-log inference — all state from fresh authenticated live API GET /api/companies/87c32b8e/agents.

## Key Changes Since 14:33Z Cycle

1. JAC-4388 to DONE (board action complete — Fable executionLane repair)
2. JAC-3933 to DONE (detector spec review complete)
3. JAC-4190 to DONE (Wings escalation closure)
4. Herald and Plan Runner agent status to ERROR (OAuth session expired — fresh failure, NOT routable)

## Disposition

in_progress (restart-ready) — 0 dispatches, queue exhausted.

Liveness paths:
- JAC-4187 to Herald dispatchable upon Jack approval (blocked, blockedBy=[])
- JAC-3628/3629 to Plan Runner dispatchable once blockedBy clears after JAC-4388 done
- JAC-3592/3593/3594 Luna completion + exact-model smoke receipt to Kimi Code via Ringer dispatchable (JAC-3596)
- JAC-4093 in_review to unblock JAC-3705 (Aegis Coder X)
- Herald/Plan Runner OAuth re-authentication to restore Claude Code lanes

Evidence: doc/plans/2026-08-03-wings-dispatch-evidence-jac-4000-cycle-20260803T145109Z.md
