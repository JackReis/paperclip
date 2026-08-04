# Cycle 2026-08-03T15:32Z — Dispatch Verification (Wings run 64ff5a9c)

**Dispatch Decision: 0 dispatches — queue exhausted (re-verified live).**

Fresh authenticated GET `/companies/87c32b8e.../agents` @ 2026-08-03T15:32:00Z (Paperclip v2026.722.0).
Active run on JAC-4000: 64ff5a9c, running, self-checked-out.

## Verified-Idle Free Lanes (at 15:32Z)

- **Herald (a1e8cb0d)**: claude-code/opus-4-8, verified, idle, hb 14:59Z, maxP=1 — routable, capacity available.
- **Plan Runner (2c6b1cc9)**: claude-code/opus-4-8, verified, idle, hb 15:19Z, maxP=1 — routable, capacity available.
- **Aegis Coder X (da00de99)**: local-aegis/qwen3-coder:30b, verified, running, hb 15:26Z, maxP=1 — at capacity (JAC-4511 in_progress).
- **Kimi Code via Ringer (3f1712eb)**: independent-review/kimi-for-coding/k3, verified, idle, hb Aug 2 03:22Z — NOT routable (stale verification 11 days + Luna dep).

## Excluded Lanes (not capacity)
- **Wings (self)**: reserved (strategic, allowedWork: fleet-recovery/coordination only)
- **Aegis Coder Y (181f381b)**: state=error (12000s timeout defect)
- **Hermes Mistral (1029acc4)**: paused (manual)
- **Flash (b37f4d70)**: pending_repair (MCPServerTask event-loop-closed defect)
- **Paperclip Agent Auditor (5b2bece1)**: quota_blocked (codex) — expires 2026-08-04

## Routable-but-no-independent-work

### Herald
- JAC-4190 (D5 fleet dashboard): in_review — awaiting Jack explicit approval (JAC-4187 gate cleared at 15:22Z).
- JAC-3929: in_review (Fleet-wide AI Token & Run Observatory).
- JAC-4383: in_review (Klaw/OpenClaw lane harden).
- JAC-3930: in_review (cross-vendor telemetry contract).
- JAC-3584: in_review (Fleet Wave candidate).
- JAC-3932: in_review (session replay/lineage).
- JAC-3935: in_review (Spend Observatory spec).
- JAC-3592: blocked (Luna exact-model).
- JAC-3705: todo (blocked by JAC-4093).
- JAC-3628: blocked (dependency on JAC-3629 + JAC-3634).
- JAC-4422: blocked (notes-pc9x1 plan).
- JAC-3596: todo (blocked by Luna chain JAC-3592/3593/3594).
- JAC-3802: todo (Agent audit: Kloud — credential-bound).
- JAC-4217/4216: todo (Jack decision gates).
- JAC-3558/3557/3555: todo (human gates).
- JAC-3400/3437/3365/3359/3361/3358/3360: personal/family tasks.
- JAC-3970: todo (dispatch JAC-3705 to local-aegis — at capacity + upstream blocked).
- JAC-3541: test artifact.

### Plan Runner
Same assigned issues as Herald. JAC-4190 in_review (Jack approval gate). JAC-3628 blocked on JAC-3629 + JAC-3634. No independent plan-backed task with zero upstream dependencies found.

### Unassigned issues (11 total)
All policy-excluded:
1. JAC-3671 — credential-bound (restore Talaris anthropic + mistral)
2. JAC-4501 — review (productivity for JAC-4000)
3. JAC-3714 — approval-gated (Install Nix, requires interactive sudo)
4. JAC-3437 — personal/family (haircut)
5. JAC-3365 — personal/family (notebook)
6. JAC-3359 — personal/family (Toyota diagnostic)
7. JAC-3361 — personal/family (codes/symptoms)
8. JAC-3358 — personal/family (OBD-II scan)
9. JAC-3360 — personal/family (battery quote)
10. JAC-3970 — dispatch todo, blocked (Aegis Coder X at capacity + JAC-3705 upstream blocked)
11. JAC-3541 — test artifact

## Active Runs
- None in any verified-idle free lane.
- Aegis Coder X running JAC-4511 (in_progress) — at capacity.
- Wings (self) running JAC-4000 (in_progress, self-checked-out).

## Upstream Blockers (live, 15:32Z)
- **JAC-4187 done** at 15:22Z. Jack gate cleared.
- **JAC-4190** in_review — awaits Jack explicit approval, not dispatch.
- **JAC-3628** (blocked): depends on JAC-3629 (blocked) + JAC-3634 (todo).
- **JAC-3592** (blocked): Luna executionLane stale (HTTP 400 config mismatch).
- **JAC-3593** (todo): waiting on JAC-3592.
- **JAC-3594** (todo): smoke pending (config restored 2026-08-03).
- **JAC-3596** (todo): blocked by Luna chain (JAC-3592 blocked, JAC-3594 todo, JAC-3593 todo).
- **JAC-4093** (blocked): blocks JAC-3705 canary.
- **JAC-3705** (todo): blocked by JAC-4093.
- **JAC-4516** (blocked, Wings self): self-escalation, resolution pending.

## Disposition
in_progress (restart-ready), 0 dispatches, queue exhausted. Both routable lanes (Herald, Plan Runner) have zero dispatchable independent work. All unassigned todos policy-excluded. Awaiting: (1) JAC-4190 Jack approval to unblock Plan Runner downstream dispatches; (2) Luna lane restoration (JAC-3592/3593/3594) to unblock Kimi Code via Ringer (JAC-3596); (3) JAC-4093 resolution to unblock JAC-3705.

Native Paperclip child-completion continuation remains primary liveness path; schedule is fallback.

Evidence: doc/plans/2026-08-03-wings-dispatch-evidence-jac-4000-cycle-20260803T1532Z.md
