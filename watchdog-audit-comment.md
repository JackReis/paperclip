## JAC-4685 Follow-up Audit — Stale In-Progress Queue Violations (2026-08-05T01:28Z)

### Re-audit result (stale-in-progress-audit.sh --no-route)

**staleViolationCount: 1** (down from 3 at original detection)

#### Remaining violation: JAC-4657 — still genuinely stale

- **Identifier:** JAC-4657 (ID: 224bf9fc)
- **Title:** [JAC-4565-4] Fix: Batch-patch adapterConfig for all 32 errored hermes_local agents
- **Assignee:** Zatara (f83be6e5-ccc8-4689-a4a8-ec1dcef9b667)
- **State:** in_progress, activeRun=null, checkoutRunId=null, executionRunId=null
- **Last activity:** 2026-08-04T21:09:03Z (4+ hours stale)
- **Dependency chain:** Child of JAC-4565 (Phase 2.3). Depends on JAC-4580 (Fenix).

#### Violations resolved since last audit:

- **JAC-4580 (Fenix):** Was stale at 01:10Z. Now has a live activeRun (run e376091b, status=running, started 01:22:08Z). Fenix performed the recovery re-dispatch. No remediation needed.
- **JAC-4139 (Coordinator):** Was stale at 01:10Z. Now has a live activeRun (run 48d76979, status=running, started 01:20:05Z). Wings re-checked out the coordinator issue. No remediation needed.

#### Action needed for JAC-4657:

Zatara (f83be6e5) is status=running but is currently occupied executing JAC-4565 (Phase 2.1, the parent of JAC-4657). JAC-4657 depends on JAC-4580 completing first. Since JAC-4580 now has a live run, once Fenix completes the adapter init diagnosis, Zatara can proceed with the credential injection and adapterConfig batch patch.

Watchdog cannot directly patch JAC-4657 (assigned to Zatara, outside watchdog authorization boundary). The assignee or Coordinator should either:
1. Leave JAC-4657 in_progress pending Zatara next execution cycle (dependency now has a live run), or
2. Move JAC-4657 to todo to reflect that it is blocked on JAC-4580 completion.

### Fleet health summary (2026-08-05T01:28Z)

- **Total agents:** 75
- **Running:** 29 | **Idle:** 35 | **Error:** 3 | **Paused:** 1
- **Errored agents (3):**
  - Zatara (f83be6e5): KeyboardInterrupt traceback at hermes cli.py:18468 — this is the hermes_local adapter init traceback that JAC-4580 (Fenix) is currently diagnosing. Last heartbeat: 2026-08-05T01:20:23Z.
  - Researcher: errorReason=null (no error string)
  - Analyst-Sonnet: errorReason=null (no error string)
- **Live in_progress runs:** 8 (JAC-3929, JAC-4503, JAC-4565, JAC-4580, JAC-4684, JAC-4139, JAC-4689, JAC-4688)
- **Stale violations:** 1 (JAC-4657 only)

### Queue invariant status

After this audit:
- 10 total in_progress issues
- 8 have live activeRuns (invariant satisfied)
- 1 has a stale violation (JAC-4657 — no activeRun, no monitor continuation)
- 1 was resolved by re-dispatch during this heartbeat window (JAC-4580, JAC-4139)