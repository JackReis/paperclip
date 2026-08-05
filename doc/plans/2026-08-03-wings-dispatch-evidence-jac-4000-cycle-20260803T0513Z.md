# Wings Dispatch Evidence — JAC-4000 Cycle 2026-08-03T05:13Z

**Run ID:** 61a19c54-0661-4dc2-86ce-cdb5f4184b21
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Issue:** JAC-4000 Coordinator Fleet Coordination Check
**Method:** Live authenticated GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents + bulk GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/issues?limit=2000

## Dispatch Decision

**0 dispatches — queue exhausted.**

All three verified-idle free lanes have assigned work that is dependency-blocked upstream. No independent plan-backed unleased work was found.

## Verified-Idle Free Lanes (3 of 3)

| Lane | Agent ID | Pool/Model | State | maxParallel | Last Heartbeat | Assigned Issue |
|---|---|---|---|---|---|---|
| Herald | a1e8cb0d | claude-code/opus-4-8 | verified/idle | 1 | 2026-08-03T03:12:37Z | JAC-4187 (blocked) |
| Plan Runner | 2c6b1cc9 | claude-code/opus-4-8 | verified/idle | 1 | 2026-08-03T03:13:50Z | JAC-3628 (blocked) |
| Kimi Code via Ringer | 3f1712eb | independent-review/k3 | verified/idle | 1 | 2026-08-02T03:22:24Z (~26h) | JAC-3596 (todo, parentId set) |

### Upstream Blockers

- **Herald** → JAC-4187 (blocked) → JAC-3933 (in_review). JAC-4187 has 2 unresolved blockers; sample stalled blocker JAC-3933.
- **Plan Runner** → JAC-3628 (blocked) → JAC-4093 (blocked) → JAC-3705 (todo, assignable to Aegis Coder X). JAC-3628 has 2 unresolved blockers; sample blocker JAC-3634.
- **Kimi** → JAC-3596 (todo, parentId=bd78b074) → Luna JAC-3592/3593/3594 (in_progress).

## Excluded / Non-Routable Lanes

| Lane | Agent ID | State | Reason |
|---|---|---|---|
| Aegis Coder X | da00de99 | verified lane but agent status=running with errorReason | "Process lost -- server may have restarted"; lastHeartbeatAt 2026-08-01T17:30:58Z (36h stale); host P89 gate down (CTX-SpO2 P:down). NOT dispatched. |
| Aegis Coder Y | 181f381b | error | 12000s timeout defect. NOT routable. |
| Paperclip Agent Auditor | 5b2bece1 | quota_blocked | Codex usage limit until 2026-08-04T23:09CT. NOT routable. |
| Hermes Mistral | 1029acc4 | paused | Manual pause. NOT routable. |
| Flash | b37f4d70 | pending_repair | MCPServerTask event-loop-closed defect post-run. NOT routable. |
| Wings | 80284e06 | reserved | Strategic reserved. Excluded per policy. |

## Unassigned Todo Pool

18 unassigned todo issues identified; all policy-excluded:

- JAC-3671 (credential-bound — Restore Talaris anthropic + mistral credentials)
- JAC-4388 (board action — Jack approval gate: Repair Fable executionLane)
- JAC-4500 (self-review — Review productivity for JAC-4139)
- JAC-4501 (self-review — Review productivity for JAC-4000)
- JAC-4217 (DECISION Jack: migrate off claude_local)
- JAC-4216 (DECISION Jack: re-enable ollama-cloud)
- JAC-3714 (approval-gated sudo — Install Nix)
- JAC-3557 (Human gate — Prius mobile 12V test)
- JAC-3558 (Human gate — Oklahoma Integrated Care refill)
- JAC-3555 (Human gate — Belmont records release)
- JAC-3597 (Jack approval gate — Zatara release judgment)
- JAC-3590 (dependent — Restore/designate Zatara diagnostic-release lane)
- JAC-3802 (dependent — Agent audit: Kloud)
- JAC-3705 (dependent + assigned to errored Aegis Coder X)
- JAC-3629 (dependent — Fable owns, but Fable status=error, no heartbeat)
- JAC-3770 (dependent — Deploy to production + final acceptance)
- JAC-4046 (credential-adjacent — Telegram-token thrash)
- JAC-3596 is assigned to Kimi — not unassigned.

## Active Runs

0 active runs across the company. JAC-3705 (previously reported with activeRun on Aegis Coder X) now shows `activeRunId=null`, `status=todo`. The active run reported in the prior cycle was stale — no live run exists.

## Verification Notes

- No stale-log inference. All lane states confirmed via live authenticated API GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents (Paperclip v2026.722.0, bearer=Wings 80284e06).
- Aegis Coder X: lane `state=verified` but `agent.status=running` with `errorReason` set and heartbeat 36h stale. The verification string "running, heartbeat fresh, no errorReason" is contradicted by live metadata — this is a stale verification. Host P89 gate (CTX-SpO2) is DOWN, preventing Aegis Coder X from being routed even if its lane were re-verified.
- No fresh authenticated generation failure was needed to record since the agent is already in error state with a stale heartbeat.

## Blockers (Awaiting Native Wake)

1. **JAC-3933** (in_review) — unblocks Herald lane (JAC-4187 depends on it).
2. **JAC-4388** (todo, Jack approval gate) — unblocks Plan Runner chain (repairs Fable executionLane).
3. **JAC-3592/3593/3594** (in_progress, Luna-owned) — unblocks Kimi lane (JAC-3596 depends on Luna completion).

All three are outside Wings's dispatch authority. Awaiting native Paperclip child-completion continuation wake on upstream resolution.

## Disposition

**in_progress (restart-ready)** — Dispatched 0 tasks this cycle. Queue exhausted, all free lanes blocked upstream. No independent plan-backed task available for dispatch. Awaiting native child-completion wake on blocker resolution.
