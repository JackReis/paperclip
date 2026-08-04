# Wings Dispatch Evidence — JAC-4139 — Cycle 2026-08-04T15:25Z — 0 Dispatches (Queue Exhausted, Live Re-verified)

## Acknowledged Wake
Comment 7797e948 (local-board, 2026-08-04T10:39:49Z) — 13:00Z coordinator cycle reporting 0 dispatches, queue exhausted.

## Independent Fresh Live Verification
Authenticated GET `/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` at **2026-08-04T15:10Z**.
Paperclip API v2026.722.0 on :3101. 84 agents total, 8 with executionLane metadata.

### Verified Execution Lanes — 0 Dispatchable
| Agent | Status | Adapter | Pool | Lane | MaxPar | VerifiedAt | Eligible? | Reason |
|-------|--------|---------|------|------|--------|------------|-----------|--------|
| Wings (self) | running | hermes_local | local-aegis | verified | 4 | 2026-08-03T23:38Z | NO | Reserved (strategic) |
| Coordinator | idle | hermes_local | local-aegis | verified | 2 | 2026-08-03T23:15Z | NO | Reserved (strategic) |
| Herald | **error** | hermes_local | local-aegis | verified | 2 | 2026-08-03T23:37Z | NO | errorReason=Traceback; NOUS_API_KEY fix (JAC-4565) did NOT clear — fresh hb 09:28; NOT routable |
| Plan Runner | **error** | hermes_local | local-aegis | verified | 2 | 2026-08-03T23:15Z | NO | errorReason=Traceback; NOUS_API_KEY fix did NOT clear — fresh hb 05:36; NOT routable |
| Aegis Coder X | **error** | opencode_local | local-aegis | verified | 1 | 2026-07-31T19:56Z | NO | Timed out 12000s; P87 host gate down |
| Aegis Coder Y | idle | opencode_local | local-aegis | **error** | 1 | 2026-07-31T19:56Z | NO | Lane=error (stale 72h) |
| Hermes Mistral | paused | hermes_local | ollama-cloud | paused | 1 | 2026-07-31T14:56Z | NO | Manual pause |
| Flash | error | hermes_local | ollama-cloud | pending_repair | 1 | 2026-07-31T14:56Z | NO | MCPServerTask defect |
| Kimi Code via Ringer | error | hermes_local | — | **null** | — | — | NO | No executionLane metadata |

**CTX-SpO2:** P87 (Talaris) = **down**. The local-aegis pool is excluded per host health gate — even though Herald/Plan Runner retain lane=verified, they are agent-error AND their pool is excluded. ollama-cloud: 0/3 (paused + pending_repair). independent-review: 0/1 (Kimi error, no lane metadata). Codex & external fast lanes: not present in agent table (0 capacity).

### Credential Recovery (JAC-4565) — Fix Applied, NOT Cleared
- Fix applied at 2026-08-04T08:59Z: NOUS_API_KEY secret ref (c15bfd53) added to all 59 hermes_local agents via Coordinator's adapterConfig sync.
- Result: Herald and Plan Runner **still** `status=error` with `errorReason=Traceback (most recent call last):`. The secret ref is present but the agents' runtime adapter init still fails on DB query (`Failed query: select ... singleton_key ... default_environment_id`). This is a DB/connection defect, not a missing credential — requires DB restart or connection pool fix, not re-probe alone.
- JAC-4565 remains the recovery track for this root cause.

### Unassigned TODOs — All Excluded (14)
| Issue | Title | Reason excluded |
|-------|-------|-----------------|
| JAC-4217 | DECISION (Jack): migrate autonomous Paperclip | Jack decision gate |
| JAC-4216 | DECISION (Jack): re-enable ollama-cloud | Jack decision gate |
| JAC-4214 | [Aegis] Install Nix | Approval-gated / externally destructive |
| JAC-3558 | [Human gate] Provide refill details | Human gate |
| JAC-3557 | [Human gate] Complete Prius mobile 12V | Human gate |
| JAC-4539 | [JAC-3929] P3: Rollback acceptance tests | Parent-blocked (JAC-3929 needs independent-review lane — unavailable) |
| JAC-3437 | Get haircut from Danny in Ardmore | Personal / non-work |
| JAC-3365 | populate notebook for vista del mar | Personal |
| JAC-3359 | Book diagnostic at Toyota of Ardmore | Personal |
| JAC-3361 | I already have the codes / know symptoms | Personal |
| JAC-3358 | Get free OBD-II scan at AutoZone | Personal |
| JAC-3360 | Get mobile hybrid battery quote | Personal |
| JAC-3555 | Submit Belmont records release | Human gate |
| JAC-3970 | Dispatch JAC-3705 (Canary) | Parent-blocked; requires excluded local-aegis + Codex (in error/quota) |

No independent plan-backed task found among unassigned TODOs — all carry policy exclusions.

### Active Runs: 4 in_progress (none on dispatchable verified lanes)
| Issue | Assignee | Lane |
|-------|----------|------|
| JAC-4139 | Wings (self) | local-aegis (reserved) |
| JAC-4531 | Forge (3c26711a) | laneless |
| JAC-4532 | Forge (8551a68a) | laneless |
| JAC-4535 | Forge (e56fa496) | laneless |

### Pool Capacity Snapshot (maxParallel vs active)
| Pool | maxParallel | Active | Available |
|------|-------------|--------|-----------|
| local-aegis | 2+4+2+1+1 = 10 | Wings(self) running | 0 (all error/stale/reserved or pool excluded by P87) |
| ollama-cloud | 1+1 = 2 | 0 | 0 (paused + pending_repair) |
| independent-review | 1 (Kimi) | 0 | 0 (agent error, no lane metadata) |
| codex | — | 0 | 0 (not present) |
| external-fast-lane | 1 | 0 | 0 (not present) |

### Dispatch: 0 — queue exhausted
All verified lanes are either reserved (Wings, Coordinator), in agent-error with stale/fresh tracebacks that the credential fix did not clear (Herald, Plan Runner, Aegis Coder X), lane-in-error (Aegis Coder Y), paused (Hermes Mistral), pending_repair (Flash), or have no lane metadata (Kimi). No fresh authenticated generation failure on a verified lane NOT in error. No independent plan-backed task with an available verified lane.

### Upstream Blocker Resolution (since 08:59Z wake)
- JAC-4187 — DONE (unblocked Herald's downstream JAC-3494, still blocked)
- JAC-3629 — DONE (unblocked Plan Runner's downstream JAC-4093, still blocked)
- JAC-3933 — DONE
- JAC-4388 — DONE
- JAC-3592 — DONE (unblocked Kimi's downstream JAC-3596, still blocked)

Dependents of resolved upstreams REMAIN BLOCKED: JAC-3494 (Herald), JAC-3628/JAC-4093 (Plan Runner), JAC-3596 (Kimi) — because the resolving agent's own lane is in error or its dependent requires a lane that doesn't exist yet.

## Disposition
**in_progress (restart-ready).** Confirmed independently live at 15:10Z.
Awaiting:
1. DB connection recovery to clear Herald/Plan Runner Traceback (JAC-4565 recovery track — credential fix alone insufficient; defect is the DB query, not the missing secret)
2. P87 host gate recovery (Talaris down) to re-enable local-aegis pool
3. Unblock downstream dependents (JAC-3494, JAC-3628/JAC-4093, JAC-3596) once their owning lanes clear error
4. Native Paperclip child-completion wake from active runs (JAC-4531/4532/4535 on Forge lanes; JAC-4187/3629/3933/4388/3592 resolutions may unlock Herald/Plan Runner/Kimi dispatchability)

No stale-log inference. All gates from authenticated live API GET /agents + /issues. No dispatches made. No credentials altered. No external messages sent.
