## JAC-4685 Follow-up Audit — Stale In-Progress Queue Violations (2026-08-05T01:30Z)

### Re-audit result (stale-in-progress-audit.sh --no-route)

**staleViolationCount: 2** (JAC-4503, JAC-4657)

#### Current stale violations:

1. **JAC-4503** — Ollama Cloud API Key Recovery
   - Assignee: Dinkelspiel (6ed1dfdd-1183-440c-88ed-b9cd44bff3b7)
   - State: in_progress, activeRun=null, checkoutRunId=null
   - Last activity: 2026-08-05T01:30:05Z (assignee Dinkelspiel is idle, lastHeartbeat 01:30:05Z)
   - The run that was previously live has ended; the issue lost its activeRun.

2. **JAC-4657** — [JAC-4565-4] Batch-patch adapterConfig for 32 errored hermes_local agents
   - Assignee: Zatara (f83be6e5-ccc8-4689-a4a8-ec1dcef9b667)
   - State: in_progress, activeRun=null, checkoutRunId=null, executionRunId=null
   - Last activity: 2026-08-04T21:09:03Z (4+ hours stale)
   - Child of JAC-4565 (Phase 2.3). Depends on JAC-4580 (Fenix).

#### Violations resolved during this heartbeat:

- **JAC-4580 (Fenix):** Was stale at 01:10Z. Now has a live activeRun (run e376091b, status=running, started 01:22:08Z). No remediation needed.
- **JAC-4139 (Coordinator):** Was stale at 01:10Z. Now has a live activeRun (run 48d76979, status=running, started 01:20:05Z). No remediation needed.

#### Action needed:

- **JAC-4503:** Assignee Dinkelspiel is idle. The previous run completed. The coordinator should re-dispatch or move to todo if Dinkelspiel is unavailable.
- **JAC-4657:** Zatara (f83be6e5) is running but occupied with JAC-4655. JAC-4565 is the parent and is currently live (run e97fcb9f, status=running). Once JAC-4655 completes and JAC-4580 (Fenix) finishes the adapter init diagnosis, Zatara can proceed with the adapterConfig batch patch. Watchdog cannot patch this issue (assigned to Zatara). The assignee or Coordinator should move JAC-4657 to todo until dependencies clear, or leave it in_progress pending the next Zatara cycle.

### Fleet health summary (2026-08-05T01:30Z)

- **Total agents:** 75
- **Running:** 28 | **Idle:** 36 | **Error:** 3 | **Paused:** 1
- **Errored agents (3):**
  - Zatara (f83be6e5): KeyboardInterrupt traceback at hermes cli.py:18468 — the hermes_local adapter init traceback that JAC-4580 (Fenix) is diagnosing. Last heartbeat: 01:20:23Z.
  - Researcher: errorReason=null (no error string)
  - Analyst-Sonnet: errorReason=null (no error string)
- **Live in_progress runs:** 9 (JAC-3929, JAC-4565, JAC-4580, JAC-4684, JAC-4691, JAC-4690, JAC-4139, JAC-4689, JAC-4688)
- **Stale violations:** 2 (JAC-4503, JAC-4657)

### Queue invariant status

After this audit:
- 10 total in_progress issues
- 6 have live activeRuns (invariant satisfied)
- 2 have stale violations (no activeRun, no monitor continuation)
- 2 were resolved by re-dispatch during this heartbeat window (JAC-4580, JAC-4139)