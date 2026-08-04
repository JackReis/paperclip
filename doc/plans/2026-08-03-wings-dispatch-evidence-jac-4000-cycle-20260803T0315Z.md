# Dispatch Evidence — JAC-4000 Cycle 2026-08-03T03:15Z

## Run
- Run ID: 4a11e224-cdce-41dd-a7c6-1a6470e3f7e7
- Agent: Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
- Issue: JAC-4000 Coordinator Fleet Coordination Check
- Timestamp: 2026-08-03T03:15Z

## Live Agent Table (authenticated GET /api/companies/87c32b8e.../agents)

### Eligible Lanes (verified, idle, no lease) — 3/3
| Agent | ID | Pool | Model | State | Provider | Transport | MaxParallel | AssignedIssueId |
|-------|-----|------|-------|-------|----------|-----------|-------------|-----------------|
| Herald | a1e8cb0d | claude-code | claude-opus-4-8 | verified | claude-code | omnigent | 1 | null |
| Plan Runner | 2c6b1cc9 | claude-code | claude-opus-4-8 | verified | claude-code | omnigent | 1 | null |
| Kimi Code via Ringer | 3f1712eb | independent-review | kimi-for-coding/k3 | verified | kimi | ringer | 1 | null |

- claude-code pool: 2/2 slots (within limit)
- independent-review pool: 1/1 slot (within limit)

### Excluded Lanes — 7
| Agent | ID | Reason |
|-------|-----|--------|
| Aegis Coder X | da00de99 | lane=verified BUT agent status=running, errorReason="Process lost -- server may have restarted", lastHeartbeat 2026-08-01 (stale), host P89 gate applies — NOT dispatched |
| Aegis Coder Y | 181f381b | lane state=error (12000s timeout defect) — EXCLUDED |
| Paperclip Agent Auditor | 5b2bece1 | lane state=quota_blocked (Codex, until Aug 4 11:09 PM CT) — EXCLUDED |
| Hermes Mistral | 1029acc4 | lane state=paused (manual) — EXCLUDED |
| Wings (self) | 80284e06 | lane state=reserved (strategic) — EXCLUDED |
| Flash | b37f4d70 | lane state=pending_repair (MCPServerTask event-loop-closed defect) — EXCLUDED |

### Occupied Lanes — 0
All lanes have assignedIssueId=null, checkoutRunId=null, executionRunId=null.

## Independent Tasks Evaluated

### Selected for Dispatch (2)
1. **JAC-4171** — Coordinator Fleet Coordination Check (todo, medium, unassigned, no blockers)
2. **JAC-4173** — Coordinator Fleet Coordination Check (todo, medium, unassigned, no blockers)

### Excluded from Dispatch (14)
| Issue | Reason |
|-------|--------|
| JAC-4508 | Assigned to Wings (self), executionRunId active — already leased |
| JAC-3705 | Assigned to Aegis Coder X — lane error-state (host P89 gate) |
| JAC-3596 | Assigned to Kimi Code via Ringer — already leased |
| JAC-3590 | Assigned to Coordinator (dc2ca597) — already leased |
| JAC-3597 | Assigned to Fable — already leased |
| JAC-3671 | credential-bound (Restore Talaris anthropic + mistral credentials) |
| JAC-3714 | externally destructive (Install Nix, requires interactive sudo, approval-gated) |
| JAC-4388 | board action (Jack approval gate) |
| JAC-4046 | dispatch instruction, not independent work |
| JAC-4058/4059/4060 | dispatch instructions, not independent work |
| JAC-4217/4216 | Jack decision gates |
| JAC-3557/3558/3555/3400/3365/3359/3361/3358/3360 | human gates / personal tasks |
| JAC-3541 | TEST_DELETE |
| JAC-4500 | Review work (productivity review for JAC-4139) |
| JAC-4501 | Review work (productivity review for JAC-4000) — child of current issue |

## Dispatch Decisions
1. **JAC-4171 → Herald** — claude-code pool 1/2, maxParallel 1/1
2. **JAC-4173 → Plan Runner** — claude-code pool 2/2, maxParallel 1/1
3. Kimi Code via Ringer — no independent plan-backed task available (all candidates leased or excluded)

## Upstream Blockers Status
- JAC-3933 (in_review) — unblocks Herald's original assigned work
- JAC-4388 (todo) — unblocks Plan Runner's original assigned work (board action)
- JAC-3592/3593/3594 (in_progress) — unblocks Kimi's original assigned work (Luna in_progress)

## Disposition
**in_progress** — 2 dispatches realized. Awaiting native child-completion wake on upstream resolution of JAC-3933, JAC-4388, and JAC-3592/3593/3594.