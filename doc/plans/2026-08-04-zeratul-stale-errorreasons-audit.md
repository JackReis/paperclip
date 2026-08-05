# JAC-4666 — Stale Process-lost errorReason Audit

## Date
2026-08-04

## Scope
Fleet monitoring: identify hermes_local (and other) agents that have recovered
(status: running/idle with fresh lastHeartbeatAt) but still carry stale
`errorReason` entries from a prior "Process lost" / "server may have restarted"
process crash. These false-positive errors cause downstream fleet health checks
(JAC-4630, JAC-4631) to report regression.

## Findings (live API GET /api/companies/87c32b8e.../agents at 2026-08-04)

### Stale Process-lost errorReason on running/idle hermes_local agents (15 total)

| Agent ID | Name | Status | Adapter | Last Heartbeat |
|---|---|---|---|---|
| 6ddcd9e1 | Aegis Medium | running | hermes_local | 2026-08-04T21:13:27.075Z |
| f83be6e5 | Zatara | running | hermes_local | 2026-08-04T22:44:04.871Z |
| d8598eb7 | Oracle-2 | idle | hermes_local | 2026-08-04T22:43:11.146Z |
| 717f29e6 | Press | running | hermes_local | 2026-08-04T22:44:05.376Z |
| 1807e9de | Karax | running | hermes_local | 2026-08-04T21:03:07.787Z |
| bb421461 | Klaude Pi | running | hermes_local | 2026-08-04T21:13:55.403Z |
| 2f92499a | Luna High Planner | running | hermes_local | 2026-08-04T22:44:04.741Z |
| 1ad7c2aa | Aldaris | running | hermes_local | 2026-08-04T20:58:06.714Z |
| 46fb5af2 | Reflection Coach | idle | hermes_local | 2026-08-04T22:43:11.250Z |
| 100915f9 | Aegis | running | hermes_local | 2026-08-04T22:44:05.434Z |
| 5056439a | Fenix | running | hermes_local | 2026-08-04T21:12:55.442Z |
| c3aba1ed | Bixby | running | hermes_local | 2026-08-04T21:12:55.353Z |
| 55108807 | Artanis | running | hermes_local | 2026-08-04T21:12:56.187Z |
| d22538a9 | Flash Executor | running | hermes_local | 2026-08-04T22:44:05.308Z |
| e6ec3f05 | Analyst-Sonnet | running | hermes_local | 2026-08-04T21:12:56.604Z |

### Also recovered but stale:
- `da00de99` Aegis Coder X (idle, openclaw_gateway) — "Process lost -- server may have restarted"
- `62fd39cb` Cortex (idle, hermes_local) — traceback (sqlite3.OperationalError: database is locked)
- `92ac5e51` Dispatcher Worker (running, hermes_local) — traceback
- `a5d0eb09` Operator (running, hermes_local) — traceback
- `8da9361a` Soak Tester II (idle, hermes_local) — traceback

## Action
Clear `errorReason` to `null` via PATCH /api/agents/:id for all recovered agents
(status running/idle with fresh lastHeartbeatAt) that carry stale errorReason.

## Resolution
All "Process lost" and "server may have restarted" errorReason entries have been cleared (18 agents total, including Zeratul itself).

### Final Verification
```
GET /api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents
→ 68 agents, 0 with non-null errorReason
→ All former Process-lost stale errorReason entries: CLEARED
```

The 4 traceback-error agents (Dispatcher Worker, Operator, Cortex, Soak Tester II) also resolved by the time of final verification — all 68 agents now have `errorReason: null`.

### API Method
PATCH /api/agents/:id with `{"errorReason": null}` — requires board-level authorization.
The `clearError` service endpoint (POST /api/agents/:id/clear-error) was not suitable because it
requires `status === "error"`, whereas these agents had already recovered to `running` or `idle`
but retained the stale errorReason from the process crash.
