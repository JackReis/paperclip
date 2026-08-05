# JAC-4000 Dispatch Evidence — Cycle 2026-08-03T21:51Z

**Cycle run:** `d99910a5-018c-4b62-a393-5658b051f66f` (Wings / hermes_local)
**Wake comment acknowledged:** `bfb4ee2c` (2026-08-03T21:48:58Z) — reported 0 dispatches from prior 21:45Z verification.
**Fresh live verification time:** 2026-08-03T21:51:08Z
**Paperclip API:** v2026.722.0 (local_trusted / board actor)
**Auth:** bearer = Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)

## Disposition: 0 dispatches — queue exhausted (re-verified live at 21:51Z)

Same conclusion as wake comment, independently confirmed via fresh authenticated API calls.

## Lane-by-Lane Verification

Authenticated `GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` at 21:51:08Z.

### Verified-idle lanes (capacity available, no dispatchable work)

| Lane | UUID | Status | LastHB | HB age | Active runs | Assigned | Disposition |
|------|------|--------|--------|--------|-------------|----------|-------------|
| Herald (claude-code/OmniGent) | a1e8cb0d | idle | 14:59Z | ~6.9h | 0 | 16 assigned (all done/cancelled/done-dispat |
| Plan Runner (claude-code/OmniGent) | 2c6b1cc9 | idle | 15:19Z | ~6.5h | 0 | 16 assigned (done/cancelled + 1 self in_review) |
| Kimi Code via Ringer | 3f1712eb | idle | 2026-08-02T03:22Z | ~18.5h STALE | 0 | multiple (all done/cancelled/blocked) |

- **Herald**: heartbeat fresh (<7h). All assigned issues are done/cancelled; no unassigned plan-backed TODO remains. Not dispatched — no work.
- **Plan Runner**: heartbeat fresh (<7h). JAC-4190 is `in_progress` (self-review); no independent unassigned TODO. Not dispatched — no independent work.
- **Kimi Code via Ringer**: heartbeat STALE (~18.5h, exceeds 7h freshness window). Per policy: lane is NOT verified-current. Not dispatched. Upstream JAC-3596 (todo) is blocked by Luna JAC-3592 (blocked by JAC-4516 Wings escalation, blocked). Dependency-gated regardless.

### Non-routable / excluded

| Lane | UUID | Status | Reason |
|------|------|--------|--------|
| Aegis Coder X | da00de99 | running | errorReason="Process lost -- child pid 61985 is no longer running"; host P89 gate. NOT routable. |
| Aegis Coder Y | 181f381b | idle | heartbeat 03:31 Aug 3 (~18h stale). NOT verified-current. |
| Wings | 80284e06 | running | reserved (self). |
| Hermes Mistral | 1029acc4 | paused | manual pause. Excluded. |
| Flash | b37f4d70 | idle | errorReason="Event loop is closed" (MCPServerTask). pending_repair. Not capacity. |
| Paperclip Agent Auditor | 5b2bece1 | idle | heartbeat 2026-07-31T16:31Z (>36h stale). NOT verified-current. |
| Coordinator | dc2ca597 | idle | reserved (strategic). |

### Pool utilization (0 active runs)

- Claude Code / OmniGent pool: 0/2 used (Herald + Plan Runner both idle)
- Local Aegis pool: 0/2 (both stale or errored)
- Codex pool: 0/1 (no Codex agent present in active roster)
- Ollama Cloud pool: 0/3 (Wings reserved, Mistral paused, Flash pending_repair)
- Independent Ringer review: 0/1 (stale)

### Unassigned TODO queue scan (0 dispatchable)

All unassigned `todo` issues are policy-excluded:
- JAC-3671 — credential-bound (Restore Talaris anthropic + mistral credentials)
- JAC-4217 — Jack decision gate (migrate off claude_local)
- JAC-4216 — Jack decision gate (re-enable ollama-cloud)
- JAC-3714 — approval-gated + interactive sudo (Install Nix)
- JAC-3558 — human gate (Oklahoma Integrated Care)
- JAC-3557 — human gate (Prius 12V test)
- JAC-3555 — human gate (Belmont records / Invisalign)
- JAC-4501 — self-review (Review productivity for JAC-4000)
- JAC-3593 / JAC-3594 — assigned to Luna (2f92499a), blocked on JAC-4516 Wings escalation
- JAC-3596 — assigned to Kimi Code via Ringer (3f1712eb), blocked on Luna JAC-3592
- JAC-4046 / JAC-4060 / JAC-4058 / JAC-4059 — assigned to Hermes Mistral (1029acc4, paused)
- JAC-3770 — assigned to Coordinator (dc2ca597), todo but blocked by JAC-4093 (in_plan_review)
- JAC-3590 — assigned to Coordinator, Zatara release gate (Jack approval)
- JAC-3597 — assigned to Luna (f83be6e5), Zatara release judgment gate
- JAC-3437 / JAC-3365 / JAC-3359 / JAC-3361 / JAC-3358 / JAC-3360 — human-personal tasks
- JAC-3541 — TEST_DELETE
- JAC-3929 — re-routed observability initiative (in_review, assigned to Coordinator; NOT the original JAC-3802 auditor task)

### Identifier routing quirk (documented)

The Paperclip identifier-search route (`/api/companies/.../issues?identifier=JAC-3802`) returns a DIFFERENT issue (JAC-3929) — confirmed Paperclip identifier-rerouting behavior documented in holographic memory [fact 4306]. UUID-scoped lookup is authoritative: `GET /api/issues/{uuid}`.

## Fresh authenticated generation failures on verified lanes?

None. No verified lane has a fresh authenticated generation failure. Aegis Coder X (process lost) and Aegis Coder Y (stale) are excluded via error/staleness, not quota inference.

## Conclusion

0 dispatches. All verified-idle lanes (Herald, Plan Runner) have no unassigned plan-backed work. Kimi lane is stale. All other lanes are reserved, paused, erroring, or pending_repair. Unassigned TODO queue is fully policy-excluded.

**Liveness path:** Native Paperclip child-completion → JAC-4000 wakes on upstream resolution of JAC-4190 (Plan Runner, in_review self), JAC-3592/3593/3594 (Luna, via Wings escalation JAC-4516), JAC-3628 (blocked by JAC-4388→done but dependency-gated), JAC-4187 (done). Schedule fallback remains configured as secondary.

**Disposition:** in_progress (restart-ready).
