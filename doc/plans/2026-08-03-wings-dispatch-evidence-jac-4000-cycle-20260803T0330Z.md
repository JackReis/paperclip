# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T03:15Z (reconciliation)

## Run
- Run ID: 22a8f4aa-a3e7-4348-becd-c57b64cbc43e
- Agent: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Issue: JAC-4000 Coordinator Fleet Coordination Check
- Timestamp: 2026-08-03T03:23Z

## Live Agent Table (authenticated GET /api/companies/87c32b8e.../agents, bearer=Wings)

### Eligible Lanes — 3/3 (verified, idle, no lease)
| Agent | ID | Pool | Model | State | Provider | Transport | MaxParallel | Status | AssignedIssueId |
|-------|-----|------|-------|-------|----------|-----------|-------------|--------|-----------------|
| Herald | a1e8cb0d | claude-code | claude-opus-4-8 | verified | claude-code | omnigent | 1 | idle | null |
| Plan Runner | 2c6b1cc9 | claude-code | claude-opus-4-8 | verified | claude-code | omnigent | 1 | idle | null |
| Kimi Code via Ringer | 3f1712eb | independent-review | kimi-for-coding/k3 | verified | kimi | ringer | 1 | idle | null |

- claude-code pool: 0/2 slots occupied (both Herald and Plan Runner idle)
- independent-review pool: 0/1 slot occupied (Kimi idle)

### Excluded Lanes — 7
| Agent | ID | Reason |
|-------|-----|--------|
| Aegis Coder X | da00de99 | lane=verified BUT agent status=running with active lease on JAC-3705 |
| Aegis Coder Y | 181f381b | lane state=error (12000s timeout) |
| Paperclip Agent Auditor | 5b2bece1 | lane state=quota_blocked (Codex, until Aug 4) |
| Hermes Mistral | 1029acc4 | lane state=paused (manual) |
| Wings (self) | 80284e06 | lane state=reserved (strategic) |
| Flash | b37f4d70 | lane state=pending_repair (MCPServerTask defect) |

## Dispatched Work Re-check (JAC-4171, JAC-4173)
Both dispatches from the 03:15Z cycle have completed:
- JAC-4171 (→ Herald): done
- JAC-4173 (→ Plan Runner): done

No capacity consumed — lanes remain free.

## Current Queue (independent, plan-backed, not leased, not policy-excluded)
All remaining todo tasks are policy-excluded: JAC-4508 (assigned to Wings), JAC-3671 (credential-bound), JAC-4388 (Jack approval gate), JAC-4501/4500 (self-review), JAC-4217/4216 (Jack decision gates), JAC-3714 (approval-gated).

## Upstream Blocker Status (awaiting child-completion wake)
- JAC-3933 (in_review) — unblocks Herald assigned work (JAC-4187)
- JAC-4388 (todo, board action) — unblocks Plan Runner assigned work (JAC-3628)
- JAC-3592 (in_progress, Luna/2f92499a) — unblocks Kimi
- JAC-3593 (in_progress, Luna/2f92499a) — unblocks Kimi
- JAC-3594 (in_progress, Luna/2f92499a) — unblocks Kimi

## Active Runs
- JAC-4508 (Wings, execution lease active, run 1f2f4d3a, queued) — Coordinator-boundary action documented. Coordinator (dc2ca597) cannot POST comments or PATCH JAC-4000 due to authz boundary (Wings lease active via run e7f09d8e). JAC-4508 assigned to Wings for resolution. **RESOLVED**: Wings posted cycle closeout comment to JAC-4000 via bearerless local-board actor (allow_local_board in local_trusted mode). JAC-4508 now marked done at 2026-08-03T03:25Z.

## Disposition
**in_progress** — 2 dispatches from prior cycle completed. 3 verified-idle lanes free but all assigned work blocked upstream. Awaiting native child-completion wake on JAC-3933, JAC-4388, JAC-3592/3593/3594. JAC-4508 escalation acknowledged — Wings acting as recovery owner for the Coordinator boundary issue.