# JAC-4000 Dispatch Evidence — Cycle 2026-08-03T21:57Z

**Wings heartbeat run:** `dca949f8-251c-414f-bd62-ec8e24b31066` (Wings / hermes_local)
**Wake comment acknowledged:** `75890bac` (2026-08-03T21:57:52Z, local-board) — reported 0 dispatches from 21:51Z verification.
**My fresh live verification:** 2026-08-03T21:58Z — authenticated GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents + bulk TODO scan.
**Paperclip API:** v2026.722.0 (local_trusted / board actor)
**Auth:** bearer = Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)

## Disposition: 0 dispatches — queue exhausted (independently confirmed live at 21:58Z)

My verification independently confirms the wake comment's findings. No dispatchable work in any verified lane.

## Lane-by-Lane Verification

Authenticated `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` at 21:58Z.

### Verified-idle lanes (capacity available, no dispatchable work)

| Lane | UUID | Status | HB freshness | Assigned | Disposition |
|------|------|--------|-------------|----------|-------------|
| Herald (claude-code/OmniGent) | a1e8cb0d | idle | ~7h (14:59Z) | 16 assigned (all done/cancelled) | Verified-idle, 0/1, no TODO |
| Plan Runner (claude-code/OmniGent) | 2c6b1cc9 | idle | ~6.5h (15:19Z) | JAC-4190 in_review (self) | Verified-idle, 0/1, self-review only |
| Kimi Code via Ringer | 3f1712eb | idle | ~18.5h STALE | JAC-3596 (blocked by Luna JAC-3592) | NOT verified-current — stale HB |

- **Herald**: heartbeat fresh (<7h). All assigned issues are done/cancelled; no unassigned plan-backed TODO remains. Not dispatched — no work.
- **Plan Runner**: heartbeat fresh (<7h). JAC-4190 is `in_progress` (self-review); no independent unassigned TODO. Not dispatched — no independent work.
- **Kimi Code via Ringer**: heartbeat STALE (~18.5h, exceeds 7h freshness window). Per policy: lane is NOT verified-current. Not dispatched. Upstream JAC-3596 (todo) is blocked by Luna JAC-3592 (blocked by JAC-4516 Wings escalation). Dependency-gated regardless.

### Non-routable / excluded

| Lane | UUID | Status | Reason |
|------|------|--------|--------|
| Aegis Coder X | da00de99 | running | errorReason="Process lost -- child pid 61985"; host P89 gate down. NOT routable. |
| Aegis Coder Y | 181f381b | idle | heartbeat stale (~18h), lane state=error. NOT verified-current. |
| Wings | 80284e06 | running | reserved (self). |
| Hermes Mistral | 1029acc4 | paused | manual pause. Excluded. |
| Flash | b37f4d70 | idle | errorReason="Event loop is closed" (MCPServerTask). pending_repair. Not capacity. |
| Paperclip Agent Auditor | 5b2bece1 | idle | idle but assigned JAC-3802 (audit) — not dispatch candidate. |
| Coordinator | dc2ca597 | idle | reserved (strategic). |

### Pool utilization (0 active runs)

- Claude Code / OmniGent pool: 0/2 used (Herald + Plan Runner both idle, no work)
- Local Aegis pool: 0/2 (both stale or errored)
- Codex pool: 0/1 (no Codex agent in active roster)
- Ollama Cloud pool: 0/3 (Wings reserved, Mistral paused, Flash pending_repair)
- Independent Ringer review: 0/1 (stale)

### Unassigned TODO queue scan (0 dispatchable)

All unassigned `todo` issues are policy-excluded:
- JAC-3671 — credential-bound (Restore Talaris anthropic + mistral credentials)
- JAC-4501 — self-review (Review productivity for JAC-4000)
- JAC-4217 — Jack decision gate (migrate off claude_local)
- JAC-4216 — Jack decision gate (re-enable ollama-cloud)
- JAC-3714 — approval-gated + interactive sudo (Install Nix)
- JAC-3558 — human gate (Oklahoma Integrated Care refill)
- JAC-3557 — human gate (Prius 12V test)
- JAC-3555 — human gate (Belmont records / Invisalign)
- JAC-3541 — TEST_DELETE

Assigned TODOs (not Wings' to dispatch):
- JAC-3593, JAC-3594 — Luna (blocked on JAC-4516 Wings escalation)
- JAC-3705 — Aegis Coder X (assigned but agent has process-lost error, JAC-4511 in_progress)
- JAC-3596 — Kimi Code via Ringer (stale lane, blocked on Luna JAC-3592)
- JAC-4046, 4060, 4059, 4058 — Hermes Mistral (paused)
- JAC-3770 — Coordinator (assigned, blocked by JAC-4093)
- JAC-3590 — Coordinator (Zatara release gate, Jack approval)
- JAC-3597 — Luna/Zatara (release judgment gate)
- JAC-3437, 3365, 3359, 3361, 3358, 3360 — human-personal tasks

### Fresh authenticated generation failures on verified lanes?

None. No verified lane has a fresh authenticated generation failure. Aegis Coder X (process lost) and Aegis Coder Y (stale + lane error) are excluded via error/staleness, not quota inference.

## Conclusion

0 dispatches. All verified-idle lanes (Herald, Plan Runner) have no unassigned plan-backed work. Kimi lane is stale. All other lanes are reserved, paused, erroring, or pending_repair. Unassigned TODO queue is fully policy-excluded.

**Liveness path:** Native Paperclip child-completion → JAC-4000 wakes on upstream resolution of:
- JAC-4190 (Plan Runner, in_review self)
- JAC-3592/3593/3594 (Luna, via Wings escalation JAC-4516)
- JAC-3628 (blocked by JAC-4388→done but dependency-gated)
- JAC-4187 (done)

Schedule fallback remains configured as secondary.

**Disposition:** in_progress (restart-ready).
