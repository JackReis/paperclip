# Dispatch Evidence — JAC-4000 Cycle 2026-08-02T23:26Z

**Run:** 0d005ac0-65a7-49e9-a750-cc2674af22ff
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d), hermes_local
**API:** http://127.0.0.1:3101/api (v2026.722.0, local_trusted)
**Verification time:** 2026-08-02T23:26Z
**Dispatches:** 0

## Lane verification (fresh authenticated GET /api/companies/{cid}/agents)

### Verified-idle free lanes (3) — all assignedIssueId=null, no live lease

| Agent | Pool | Model | laneState | status | assignedIssueId | MaxParallel |
|---|---|---|---|---|---|---|
| Herald (a1e8cb0d) | claude-code | claude-opus-4-8 | verified | idle | null | 1 |
| Plan Runner (2c6b1cc9) | claude-code | claude-opus-4-8 | verified | idle | null | 1 |
| Kimi Code via Ringer (3f1712eb) | independent-review | kimi-for-coding/k3 | verified | idle | null | 1 |

All 3 lanes verified at 2026-07-31T19:56:00Z — verification is current (within 24h).

### Excluded lanes (NOT routable — unchanged)

| Agent | Reason |
|---|---|
| Paperclip Agent Auditor (5b2bece1) | quota_blocked (claude-code/opus-4-8) — quota exhausted until Aug 4 11:09 PM CT |
| Hermes Mistral (1029acc4) | paused (manual) |
| Flash (b37f4d70) | pending_repair (MCPServerTask event-loop-closed defect) |
| Wings (self) | reserved (strategic) |
| Aegis Coder X (da00de99) | lane=verified but agent.status=error ("Process lost -- server may have restarted", host P89 gate) — NOT routable |
| Aegis Coder Y (181f381b) | lane=error (12000s timeout defect) |
| Klaude (4d9d8ed5) | error (gateway token mismatch) |
| Klaw (d216ee6e) | error (no anthropic API key) |
| Operator (a5d0eb09) | error |
| Forge (0b902be0) | error (agent.status=error) |

### Pool limits (per issue description)

- Ollama Cloud: Wings (reserved), Hermes Mistral (paused), Flash (pending_repair) — all excluded; not routable capacity
- Claude Code through OmniGent: Herald, Plan Runner — 2 lanes, both verified-idle but blocked upstream
- Local Aegis: Coder X (error), Coder Y (error) — host P89 gate DOWN (CTX-SpO2 shows P88, host health NOT green) — 0 routable capacity
- Codex: Paperclip Agent Auditor — quota_blocked until Aug 4
- Independent Ringer review: Kimi — 1 lane, verified-idle but blocked upstream

## Candidate work assessment — all blocked upstream

| Lane | Candidate | Status | Blocker |
|---|---|---|---|
| Herald | JAC-4187 | blocked | JAC-3933 in_review (needs_attention, 1 stalled blocker) + JAC-4494 (attention_required) |
| Plan Runner | JAC-3628 | todo | child JAC-3629 blocked → JAC-4388 (board action, Jack approval, todo) |
| Kimi | JAC-3596 | todo | Luna leaves JAC-3592/3593/3594 all in_progress (no completions) |

JAC-3770 (todo) also blocked on JAC-3494 decision gate (needs_attention, 1 unresolved blocker).

### Upstream blocker status (fresh)

- JAC-3933: in_review (NOT complete) — stalled blocker, attention required
- JAC-4494/4495: still backlog (not resolved)
- JAC-4388: todo (board action requiring Jack approval)
- JAC-3592/3593/3594: all still in_progress, no new activity since 2026-08-01T02:5xZ
- JAC-3629: blocked → depends on JAC-4388
- JAC-4187: needs_attention, 2 unresolved blockers (JAC-4494 stalled)
- JAC-3494: needs_attention, 1 unresolved blocker

## Unassigned todos: 22 — all policy-excluded

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
- JAC-3590, JAC-3597 — Zatara diagnostic lane (Jack decision gates)
- JAC-3634 — notes-pc9x1.5 SOP integration (board action)

## Active runs

- JAC-4000 (self, in_progress, runId=0d005ac0)
- JAC-3592/3593/3594 (Luna in_progress, no assigned agent IDs — unassigned) — blocking JAC-3596
- No active runs on any verified-idle lane

## Active run verification (fresh)

- JAC-3592: in_progress, assignedTo=null (Luna High Planner was assigned but now unassigned)
- JAC-3593: in_progress, assignedTo=null
- JAC-3594: in_progress, assignedTo=null

## Host health

- CTX-SpO2: H100 N99 F100 G100 I100 A100 P88 T100
- Aegis Coder X lane=verified but agent.status=error — host P89 gate DOWN (P88 in CTX-SpO2)
- Per policy: "local Aegis 2 only while host health is green" — host health is NOT green (P88)

## Disposition

**in_progress (restart-ready)**, 0 dispatches. Queue exhausted — all 3 verified-idle lanes have assigned work blocked upstream; all unassigned todos policy-excluded. No independent plan-backed unleased task found.

Await native Paperclip child-completion wake on upstream resolution:
- JAC-4388 Jack approval → unblocks JAC-3629 → JAC-3628 → Plan Runner
- JAC-3933 completes → unblocks JAC-4187 → Herald
- JAC-4494/4495 resolve → unblocks JAC-4187 → Herald
- JAC-3592/3593/3594 complete → unblocks JAC-3596 → Kimi
- JAC-3494 decision → unblocks JAC-3770
- JAC-3671/3714/3802 — credential restoration (Jack decision) → may unblock additional lanes

No stale-log inference. All gates confirmed via authenticated live API metadata.executionLane at 23:26Z.
