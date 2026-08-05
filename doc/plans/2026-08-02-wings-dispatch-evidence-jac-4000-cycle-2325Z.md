# Dispatch Evidence — JAC-4000 Cycle 2026-08-02T23:25Z

**Run:** 8c7870a1-62b9-4d77-93f3-dd05e1f5c1c3
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d), hermes_local
**API:** http://127.0.0.1:3101/api (v2026.722.0, local_trusted)
**Verification time:** 2026-08-02T23:25Z
**Dispatches:** 0

## Lane verification (fresh authenticated GET /api/companies/{cid}/agents)

### Verified-idle free lanes (3)

| Agent | Pool | Model | state | status | assignedIssueId |
|---|---|---|---|---|---|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | idle | null |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | idle | null |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | verified | idle | null |

### Excluded lanes (not routable)

| Agent | Reason |
|---|---|
| Paperclip Agent Auditor (5b2bece1) | quota_blocked until Aug 4 11:09 PM CT |
| Hermes Mistral (1029acc4) | paused (manual) |
| Flash (b37f4d70) | pending_repair (MCPServerTask event-loop-closed) |
| Wings (self) | reserved (strategic) |
| Aegis Coder X (da00de99) | lane=verified but agent.status=error (Process lost — host P89 gate) |
| Aegis Coder Y (181f381b) | lane=error (12000s timeout) |
| Klaude (4d9d8ed5) | error (gateway token mismatch) |
| Klaw (d216ee6e) | error (no anthropic API key) |
| Operator (a5d0eb09) | error |
| Forge (0b902be0) | error |

## Candidate work assessment — all blocked upstream

| Lane | Candidate | Status | Blocker |
|---|---|---|---|
| Herald | JAC-4187 | blocked | JAC-3933 in_review + JAC-4494/4495 backlog |
| Plan Runner | JAC-3628 | todo, assigned | child JAC-3629 blocked → JAC-4388 (board action, Jack approval, todo) |
| Kimi | JAC-3596 | todo, assigned | Luna leaves JAC-3592/3593/3594 in_progress |

JAC-3770 (todo) is also blocked on JAC-3494 decision gate.

## Unassigned todos: 33 — all policy-excluded

- JAC-4173, JAC-4171 — Coordinator siblings (not independent)
- JAC-3671, JAC-3714, JAC-3802 — credential-bound / Jack decision
- JAC-4217, JAC-4216 — Jack decision gates
- JAC-3558, JAC-3557, JAC-3555, JAC-3400, JAC-3437, JAC-3365, JAC-3359, JAC-3361, JAC-3358, JAC-3360 — personal / human gates
- JAC-3541 — test artifact (TEST_DELETE)
- JAC-4501, JAC-4500 — productivity reviews
- JAC-4388 — board action requiring Jack approval
- JAC-4046, JAC-4060, JAC-4059, JAC-4058 — dispatches blocking other gates
- JAC-3705, JAC-3970 — canary (excluded per policy)
- JAC-3770 — blocked on JAC-3494

## Active runs

- JAC-4000 (self, in_progress, this run)
- Luna leaves JAC-3592/3593/3594 in_progress — blocking JAC-3596

## Disposition

**in_progress (restart-ready)**, 0 dispatches. Queue exhausted — all verified-idle lanes have assigned work blocked upstream; no independent plan-backed unleased task found. Await native Paperclip child-completion wake on upstream resolution:

- JAC-4388 Jack approval → unblocks JAC-3629 → JAC-3628 → Plan Runner
- JAC-3933 completes → unblocks JAC-4187 → Herald
- JAC-3592/3593/3594 complete → unblocks JAC-3596 → Kimi
- JAC-3494 decision → unblocks JAC-3770

No stale-log inference. All gates confirmed via live authenticated API metadata.executionLane.
