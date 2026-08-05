# JAC-4000 Dispatch Evidence — Cycle 2026-08-03T16:04Z

**Run ID:** (current Wings heartbeat run, continuing JAC-4000)
**Paperclip API:** v2026.722.0 (local_trusted, port 3101)
**Verification time:** 2026-08-03T16:04Z (fresh authenticated GET /agents + /issues)

## Acknowledged Wake Comment

Latest comment `65190b8b` by `local-board` at 2026-08-03T15:52:39Z (from previous run 72a19f56):
- **Dispatch Decision**: 0 dispatches — queue exhausted (re-verified live at 15:38Z)
- 3 verified-idle free lanes (Herald, Plan Runner, Aegis Coder X) — 0 dispatchable
- 6 excluded lanes (Wings reserved, Aegis Coder Y error, Hermes Mistral paused, Flash pending_repair, Paperclip Agent Auditor quota_blocked, Kimi Code via Ringer stale)
- 14 unassigned todos — all policy-excluded
- Disposition: in_progress (restart-ready), awaiting JAC-4190 Jack approval, Luna restoration, JAC-4093 resolution

## Fresh Live Verification (16:04Z)

### Agent Table (fresh GET /companies/.../agents)

| Agent | UUID | Status | Lane State | Pool/Provider | Model | lastHeartbeatAt | maxParallel |
|---|---|---|---|---|---|---|---|
| Herald | a1e8cb0d-9132-... | idle | verified | claude-code/OmniGent | opus-4-8 | 2026-08-03T14:59:28Z | 1 |
| Plan Runner | 2c6b1cc9-aad2-... | idle | verified | claude-code/OmniGent | opus-4-8 | 2026-08-03T15:19:04Z | 1 |
| Aegis Coder X | da00de99-f978-... | running | verified | ollama-local/paperclip-direct | qwen3-coder:30b | 2026-08-03T15:26:39Z | 1 |
| Wings | 80284e06-41ab-... | running | reserved | ollama-cloud | deepseek-v4-pro | 2026-08-03T15:53:40Z | 1 |
| Aegis Coder Y | 181f381b-... | idle | error | ollama-local | qwen3-coder:30b | 2026-08-03T03:31:13Z | 1 |
| Hermes Mistral | 1029acc4-... | paused | paused | ollama-cloud | deepseek-v4-pro | 2026-07-31T04:59:07Z | 1 |
| Flash | b37f4d70-... | idle | pending_repair | ollama-cloud | deepseek-v4-flash | 2026-07-30T22:53:16Z | 1 |
| Paperclip Agent Auditor | 5b2bece1-... | idle | quota_blocked | codex | configured | 2026-07-31T16:31:29Z | 1 |
| Kimi Code via Ringer | 3f1712eb-7b43-... | idle | verified (stale) | kimi/ringer | k3 | 2026-08-02T03:22:24Z | 1 |

### Pool Capacity Assessment

| Pool | Max Parallel | Verified-Idle Free Lanes | Eligible | Dispatchable |
|---|---|---|---|---|
| claude-code (OmniGent) | 2 | Herald, Plan Runner | 2 | 0 (no dispatchable tasks) |
| local-aegis | 2 (only while host health green) | Aegis Coder X | 1 | 0 (no dispatchable tasks) |
| ollama-cloud | 3 | 0 (Wings reserved, Hermes Mistral paused, Flash pending_repair) | 0 | 0 |
| codex | 1 | 0 (Paperclip Agent Auditor quota_blocked until Aug 4) | 0 | 0 |
| independent-review | 1 | Kimi Code via Ringer (stale, 11 days, Luna deps) | 0 (stale+vuln deps) | 0 |
| external/fast-lane | 1 | 0 | 0 | 0 |

### Active Runs

- **Wings (80284e06)**: running JAC-4000 (checkoutRunId=413b545c, execRunId=413b545c, locked at 15:53:40Z)
- **Aegis Coder X (da00de99)**: running, but has no activeRun (executionRunId=null on assigned issues)
- All other lanes: no active runs

### Unassigned Issues (16 total, all policy-excluded)

| Issue | Priority | Reason for Exclusion |
|---|---|---|
| JAC-3671 | critical | Credential-bound (restore Talaris anthropic + mistral credentials) |
| JAC-4501 | high | Self-referential productivity review on JAC-4000 — not independent work |
| JAC-4217 | high | DECISION (Jack) — human authorization gate |
| JAC-4216 | high | DECISION (Jack) — human authorization gate |
| JAC-3714 | high | Approval-gated; requires interactive sudo |
| JAC-3558 | high | Human gate (Oklahoma Integrated Care) |
| JAC-3557 | high | Human gate (Prius mobile 12V test) |
| JAC-3555 | high | Human gate (Belmont records release) |
| JAC-3437 | medium | Human gate (haircut in Ardmore) |
| JAC-3365 | medium | Human gate (notebook population) |
| JAC-3359 | medium | Human gate (Toyota diagnostic) |
| JAC-3361 | medium | Human gate (Prius codes) |
| JAC-3358 | medium | Human gate (AutoZone OBD-II scan) |
| JAC-3360 | medium | Human gate (hybrid battery quote) |
| JAC-3970 | low | Dispatch note for JAC-3705 → local-aegis (dependency-gated on JAC-4093) |
| JAC-3541 | low | TEST_DELETE |

### Assigned Issues on Verified Lanes (non-dispatchable)

| Lane | Assigned Issue | Status | Reason |
|---|---|---|---|
| Herald | (none active) | All done/blocked | JAC-4422 blocked (depends on JAC-4422 child blocked on notes-pc9x1), JAC-3876 in_review (Gemini team chat merge — Jack gate), JAC-3494 blocked |
| Plan Runner | JAC-4190 | in_review | Jack approval gate (D5 fleet dashboard build slice) |
| Aegis Coder X | JAC-3705 | todo | blockedBy JAC-4093 (canary preconditions: verify Hermes parser + freeze compact profile) |
| Aegis Coder X | JAC-4511 | in_progress | MLX embed lane promotion follow-up (active run, not available for new dispatch) |

### Upstream Blockers (live, confirmed fresh)

- **JAC-4190**: in_review — awaits Jack approval to unblock Plan Runner
- **JAC-4093**: blocked — blocks JAC-3705 on Aegis Coder X (needs Hermes parser verification + compact profile freeze)
- **JAC-4422**: blocked — Herald lane, depends on notes-pc9x1 beacon implementation
- **JAC-4462**: blocked — Plan Runner lane, depends on notes-pc9x1 fleet beacon
- **JAC-3592**: blocked — Luna exact-model smoke (auth boundary, tree-hold)
- **JAC-3593/3594**: todo — assigned to Luna (no executionLane), depend on JAC-3592
- **JAC-3596**: todo — assigned to Kimi, blocked by Luna chain
- **JAC-3705**: todo — assigned to Aegis Coder X, blockedBy JAC-4093

### Excluded Lanes (not capacity — 6)

1. **Wings (self)**: reserved (strategic) — allowedWork: fleet-recovery, coordination
2. **Aegis Coder Y (181f381b)**: error — 12000s timeout defect, NOT routable
3. **Hermes Mistral (1029acc4)**: paused (manual) — 15h+ stale heartbeat
4. **Flash (b37f4d70)**: pending_repair — MCPServerTask event-loop-closed defect
5. **Paperclip Agent Auditor (5b2bece1)**: quota_blocked — codex usage limit until 2026-08-04
6. **Kimi Code via Ringer (3f1712eb)**: verified but stale (19 days since verifiedAt 2026-07-23, hb 2026-08-02T03:22) + Luna dependency chain — NOT routable

## Dispatch Decision

**0 dispatches — queue exhausted (re-verified live at 16:04Z).**

All 3 verified-idle free lanes (Herald, Plan Runner, Aegis Coder X) have:
- No active runs/leases occupying them (confirmed fresh)
- But NO dispatchable todo issues assigned to them

All 16 unassigned todo issues are policy-excluded:
- 1 self-referential (JAC-4501 — productivity review on JAC-4000 itself)
- 2 Jack decision gates (JAC-4216, JAC-4217)
- 6 human gates (JAC-3558, JAC-3557, JAC-3555, JAC-3437, JAC-3365, JAC-3359, JAC-3361, JAC-3358, JAC-3360)
- 1 credential-bound (JAC-3671)
- 1 approval-gated sudo (JAC-3714)
- 2 dependency-gated (JAC-3970 → JAC-3705→JAC-4093; JAC-3705 assigned to Aegis Coder X)
- 1 test artifact (JAC-3541)

No verified idle lane has a dispatchable independent, plan-backed task.

## Disposition

**in_progress (restart-ready), 0 dispatches, queue exhausted.**

Awaiting (primary liveness path — native Paperclip child-completion wake):
1. JAC-4190 Jack approval → unblocks Plan Runner lane
2. JAC-4093 resolution → unblocks JAC-3705 on Aegis Coder X
3. JAC-3592/3593/3594 Luna lane restoration → unblocks Luna todo chain
4. JAC-3596 resolution → unblocks Kimi Code via Ringer lane

Fallback: schedule-based wakeup (JAC-4000 has routine_execution harness origin).

---
*Evidence recorded by Wings (80284e06), fresh authenticated GET at 2026-08-03T16:04Z.*
