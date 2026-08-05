# Dispatch Evidence — JAC-4139 Cycle 2026-08-04T04:45Z

**Run ID:** 9fb0e6f4-e8a6-45b2-9427-a08b7dda10cc
**Agent:** Wings (80284e06-41ab-415a-ba1c-6c3121debd0d)
**Time:** 2026-08-04T04:45Z
**Paperclip API:** v2026.722.0 (local_trusted)

## Fresh Live Agent-Table Verification

Authenticated GET `/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` at 04:45Z.

### Verified lanes (metadata.executionLane.state=verified, no active run, no laneAssignedIssueId)

| Agent | Pool | Model | maxParallel | allowedWork |
|-------|------|-------|-------------|-------------|
| Herald (a1e8cb0d) | local-aegis | nous/poolside/laguna-s-2.1:free | 2 | [read-only] |
| Plan Runner (2c6b1cc9) | local-aegis | nous/poolside/laguna-s-2.1:free | 2 | [read-only, implementation] |
| Coordinator (dc2ca597) | local-aegis | nous/poolside/laguna-s-2.1:free | 2 | [read-only] |
| Wings (80284e06) | local-aegis | nous/poolside/laguna-s-2.1:free | 4 | [read-only, implementation] |

### Also verified but occupied:

| Agent | Pool | Model | maxParallel | allowedWork |
|-------|------|-------|-------------|-------------|
| Aegis Coder X (da00de99) | local-aegis | ollama/qwen3-coder:30b | 1 | [read-only, implementation, review] |
| **Status:** running, lane=verified, but has in_progress lease (JAC-4511) — 1/2 local-aegis occupancy |

### Excluded lanes

| Agent | Reason | Pool | Lane State |
|-------|--------|------|------------|
| Aegis Coder Y (181f381b) | state=error (timed out 12000s) | local-aegis | error |
| Hermes Mistral (1029acc4) | paused (manual) | ollama-cloud | paused |
| Flash (b37f4d70) | pending_repair (MCPServerTask event-loop-closed) | ollama-cloud | pending_repair |
| Kimi Code via Ringer (3f1712eb) | state=error | N/A | error |
| Operator (a5d0eb09) | status=error (qwen3-coder:30b 404 from OpenRouter) | N/A | error |
| Forge (0b902be0) | status=error | N/A | error |
| Sentry (faeb5bd1) | status=error | N/A | error |
| G3_1-Analyst (e8958dac) | status=error | N/A | error |
| Klaude Pi (bb421461) | status=error | N/A | error |
| Valeera (8486012b) | status=running (not verified lane) | N/A | N/A |
| Valeera (eed3f335) | status=error | N/A | error |
| Falcon/Xalanti | status=error | N/A | error |

## Host Health Gate

CTX-SpO2 as of 2026-08-03:
```
CTX-SpO2 98% · H100 N100 F100 G100 I100 A100 P87 T100 · H:ok N:ok F:ok G:ok I:ok A:ok P:down T:ok · 📅2026-08-03
```

- **P component: DOWN (P87)** — This corresponds to the Paperclip/Paperclip-direct transport layer.
- **P89: DOWN** — Additional component down (per wake comment).
- Wake comment at 2026-08-04T04:37Z confirms: "CTX-SpO2 shows P87 (down), P89 (down)."
- Per dispatch rules: "local Aegis 2 only while host health is green" — host health is NOT green.
- **ALL local-aegis verified lanes excluded by this gate.**

### Corroborating evidence for P:down:
- 32 hermes_local agents in error (up from 18 at JAC-4552 audit at 01:47Z)
- JAC-4580 (Fenix) in_progress: "Diagnose hermes_local adapter init traceback root cause"
- JAC-4565 (assigned to Wings) todo: "recover hermes_local runtime lane and decommission Scout for JAC-4552"
- Hermes CLI `chat -q 'hello'` hangs past 20s with TTY init errors (per JAC-4565 description)
- NOUS_API_KEY missing from ~/.hermes/.env

### Fresh service health checks (all HTTP 200):
- Paperclip API (:3101): 200
- Bifrost (:8078): 200
- OB1 (:8787): 200
- Hindsight (:8888): 200
- Honcho (:8005): 200

Note: API health endpoints respond 200, but the P component health gate is based on the holist

## Unassigned Todo Issues Review (20 issues)

| JAC | Status | Assignee | workMode | Exclusion Reason |
|-----|--------|----------|----------|-----------------|
| JAC-4532 | todo | none | planning | Child of blocked JAC-3929; planning-mode |
| JAC-4533 | todo | none | planning | Child of blocked JAC-3929; planning-mode |
| JAC-4535 | todo | none | planning | Child of blocked JAC-3929; planning-mode |
| JAC-4536 | todo | none | planning | Child of blocked JAC-3929; planning-mode |
| JAC-4539 | todo | none | planning | Child of blocked JAC-3929; planning-mode |
| JAC-4555 | todo | none | standard | "Test issue - please ignore" |
| JAC-3802 | todo | Paperclip Agent Auditor | standard | Assigned to agent, not dispatch candidate |
| JAC-3705 | todo | Aegis Coder X | standard | Already leased (local-aegis occupancy) |
| JAC-3770 | todo | Coordinator | standard | Already leased (Coordinator's own lane) |
| JAC-4216 | todo | none | standard | Jack decision gate (DECISION) |
| JAC-4217 | todo | none | standard | Jack decision gate (DECISION) |
| JAC-4534 | in_progress | Quill | planning | Not todo; already in_progress |
| JAC-4531 | in_progress | 3c26711a | standard | Not todo; already in_progress |
| JAC-4580 | in_progress | Fenix | standard | Not todo; already in_progress; root-cause of P:down |
| JAC-4565 | todo | Wings | standard | Assigned to Wings; child of blocked JAC-4552 (blocked-by JAC-4565) — dependent/child relationship |
| JAC-3593 | todo | Luna High Planner | planning | Assigned to agent; Luna auth boundary |
| JAC-3594 | todo | Luna High Planner | planning | Assigned to agent; Luna auth boundary |

## Pool Capacity Summary

| Pool | Capacity | Used | Available |
|------|----------|------|-----------|
| local-aegis | 2 (host health gate) | 0 | 0 (EXCLUDED — host health NOT green) |
| ollama-cloud | 3 | 0+1 | -1 (Hermes Mistral paused + Flash pending_repair) |
| Claude Code/OmniGent | 2 | 0 | 0 (no verified lanes) |
| Codex | 1 | 0 | 0 (no verified lanes) |
| External fast lane | 1 | 0 | 0 (no verified lanes) |
| Independent Ringer review | 1 | 0 | 0 (no verified lanes) |

## Dispatch Verdict: 0 dispatches — queue exhausted

1. **Host health gate NOT satisfied**: CTX-SpO2 shows P87 (down), P89 (down). Per dispatch rules "local Aegis 2 only while host health is green" — host health is NOT green. ALL local-aegis verified lanes (Herald, Plan Runner, Coordinator, Wings, Aegis Coder X) excluded by this gate.

2. **Ollama-cloud pool exhausted**: 0/3 capacity (Hermes Mistral paused + Flash pending_repair).

3. **No other pools verified**: No Codex, Kimi, or external fast lane agents with state=verified.

4. **Verified lanes occupied by issue leases**: Only Herald and Plan Runner are lease-free (both excluded by host health gate). Aegis Coder X has JAC-4511 in_progress (leased).

5. **No independent plan-backed tasks found**: All unassigned todo issues excluded as:
   - Children of blocked JAC-3929 (planning mode, dependency-gated)
   - Jack decision gates (JAC-4216, JAC-4217 — require human input)
   - Test issues (JAC-4555)
   - Already leased to agents (JAC-3705, JAC-3770, JAC-3802)
   - In_progress already (JAC-4531, JAC-4534, JAC-4580)
   - JAC-4565 (assigned to Wings) is a child of blocked JAC-4552, which is blocked-by JAC-4565 — dependency-gated

## Disposition

**in_progress (restart-ready).** Awaiting native child-completion continuation on upstream resolution, or fresh host health signal (P component recovery).

### Upstream resolution paths:
- JAC-4580 (Fenix): Diagnose hermes_local adapter init traceback root cause — this is the root cause of P:down
- JAC-4565 (Wings): Recover hermes_local runtime lane + decommission Scout for JAC-4552 — assigned to Wings, child of JAC-4552 (blocked-by JAC-4565)

### Restart triggers:
- Host health P component returns to green (verified fresh signal)
- JAC-4580 completes → enables P:up → local-aegis lanes become eligible
- JAC-4565 completes → unblocks JAC-4552 → may release new dispatchable work
