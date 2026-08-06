# JAC-4772 Dispatch Evidence — Coordinator Fleet Coordination Check

**Cycle:** 2026-08-05T16:42Z
**Run ID:** 31f2c7a3-2d9f-45f3-a588-4b9b56154b78
**Wake reason:** process_lost_retry (JAC-4746 root cause: TS2741 missing folderId in buildConfigSnapshot)

## Fleet Agent Table (live GET /api/companies/{cid}/agents at 16:38Z)

| Agent | Status | Pool | Lane State | allowedWork | maxParallel | Active Runs |
|-------|--------|------|------------|-------------|-------------|-------------|
| Coordinator (dc2ca597) | running | local-aegis | verified | [read-only, implementation] | 2 | 1 (this issue) |
| Plan Runner (2c6b1cc9) | running | local-aegis | verified | [read-only, implementation] | 2 | 0 (JAC-4762 timed out) |
| Aegis Coder X (da00de99) | running | local-aegis | verified | [read-only, implementation, review] | 1 | 0 (JAC-4694 timed out) |
| Zatara (f83be6e5) | running | local-aegis | verified | [read-only, diagnostic, release, review] | 2 | 1 (JAC-4763) |
| Herald (a1e8cb0d) | idle | local-aegis | verified | [read-only] | 2 | 0 |
| Wings (80284e06) | idle | local-aegis | verified | [read-only] | 2 | 0 |
| Aegis Coder Y (181f381b) | idle | local-aegis | error | — | — | — |
| Flash (b37f4d70) | idle | ollama-cloud | pending_repair | — | — | — |
| Hermes Mistral (1029acc4) | paused | ollama-cloud | paused | — | — | — |

## Active In-Progress Issues (5)

1. JAC-4772 — Coordinator Fleet Coordination Check (this issue) — Coordinator
2. JAC-4762 — [dispatch] JAC-3628 → Plan Runner (JAC-3628 source is done) — timed out, no active run
3. JAC-4694 — [dispatch] JAC-3705 → Aegis Coder X — timed out, no active run
4. JAC-4745 — Ollama Cloud API Key Recovery — blocked (human gate, credential-bound)
5. JAC-4763 — Generate workspaces overview summary — Zatara (active run)

## Dispatch Decision: 0 dispatches

**Rationale:**
- Plan Runner lane: 0 active runs but JAC-4762 (timed out) is in_progress — lane occupied by stale dispatch, not available for new work.
- Aegis Coder X lane: 0 active runs but JAC-4694 (timed out) is in_progress — lane occupied by stale dispatch, not available for new work.
- Herald: read-only only — cannot accept implementation work.
- Wings: executive identity — not for routine dispatch.
- All unassigned implementation todos are sub-tasks of JAC-4746 (hierarchical folder structure), which does not exist in Paperclip DB (identifier routing returns JAC-3929 instead — known bug per holographic memory #5071).
- Pre-existing build errors in costs.ts:104 and heartbeat.ts (TS2339/TS2345, from JAC-3929/4532 privacy work) prevent successful server build, blocking any new implementation runs.

## JAC-4746 Root Cause

The Plan Runner's run (264799c8, timed out at 2026-08-05T15:39Z) failed with TS2741 — missing `folderId` property in `buildConfigSnapshot()` return type. Fixed in commit fbc15a2d8 (Aug 5 11:34Z) by adding `folderId` to both CONFIG_REVISION_FIELDS and the buildConfigSnapshot return. Build now passes for JAC-4746 changes; only 3 pre-existing errors remain (costs.ts, heartbeat.ts — unrelated to JAC-4746).

## Evidence files
- `doc/plans/2026-08-04-hierarchical-agent-folder-structure.md` (JAC-4746 plan)
- `doc/plans/2026-08-05-jac-4770-evidence.md` (JAC-4770 evidence)
- Git commit fbc15a2d8 (fix for TS2741 timeout)
- Full output log: ~/.hermes/profiles/aegis/cache/terminal-output/out-1785947668-76703-d810.log

## Disposition
`in_progress` (restart-ready). Awaiting resume of timed-out JAC-4762 and JAC-4694 dispatches. No new dispatches warranted this cycle.
