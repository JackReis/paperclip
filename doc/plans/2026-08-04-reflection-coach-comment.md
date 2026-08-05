## Reflection Coach — JAC-4575/4565 Recovery Retrospective

**Agent:** Reflection Coach (46fb5af2)
**Date:** 2026-08-04T21:30Z
**Scope:** Evidence-backed analysis of the hermes_local adapterConfig incident recovery

### Key Findings

1. **DEFAULT_MODEL fix (JAC-4647) did NOT fully resolve the incident.** Error count fluctuated 7->11->15->33 across verification snapshots. The fix addressed model resolution, but the actual crash is inside the Hermes CLI itself.

2. **Root cause is a Hermes CLI runtime crash, not adapterConfig.** All 7 traceback errors share the same call stack: `hermes_cli/main.py:12532` -> `cmd_chat` -> `cli.py:18468` -> `cli.chat()`. Agents with EXPLICIT models (Aegis with poolside/laguna-s-2.1:free, Dispatcher Worker with qwen3-coder:30b) also crash — proving the issue is not model/provider resolution.

3. **Error tracebacks are truncated at 500 chars** by Paperclip's API, hiding the actual exception. 19 agents have empty `errorReason` (0 chars), creating a blind spot for 60% of the errored cohort.

4. **SQLite write contention** under concurrent heartbeat load — Operator shows `sqlite3.OperationalError: database is locked`.

5. **Single-point verification is unreliable** — error count naturally oscillates every 5-minute heartbeat cycle. Multi-snapshot trend analysis is needed.

### Current Live State (2026-08-04T21:15Z)
- 68 total agents: 24 running, 12 idle, 31 error, 1 paused
- 33 hermes_local agents in error (all with populated adapterConfig, NOT empty {})
- Error types: 7 CLI tracebacks, 8 process-lost, 1 SQLite lock, 19 empty errorReason

### Proposals

**P1 (Immediate):** Elevate JAC-4656 ("Resolve Hermes CLI bootstrap hang") — this is the actual root cause. Currently `todo` with no assignee.

**P2:** Increase Paperclip errorReason capture from 500 chars to 2000+ chars so tracebacks are diagnosable from API data.

**P3:** Add a 5-second `hermes chat -q "ping" -Q` smoke test to the heartbeat coordinator before dispatching hermes_local tasks.

**P4:** Investigate SQLite/PGlite write contention under concurrent heartbeats.

**P5:** Create a `hermes_local-recovery-playbook.md` documenting diagnostic order, error patterns, and verification protocol.

### Verdict on JAC-4605
Do NOT close JAC-4605 as "done" — the incident is in persistent churn, not stable recovery. The 31 current errored agents will continue erroring every 5-minute heartbeat until the CLI crash (JAC-4656) is resolved.

Full report: `doc/plans/2026-08-04-reflection-coach-jac-4575-retrospective.md`