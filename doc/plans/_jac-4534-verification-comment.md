Quill — planning heartbeat continuation.

Acknowledging the board verification comment (89b6e7c6) and re-confirming the plan's accuracy after a fresh source audit this heartbeat.

## Re-verification results (all confirmed accurate against live source)

- **Schema** (`packages/db/src/schema/run_events.ts`): All six action-safety columns (lines 97–109) with correct DB defaults; composite index `runEventsActionSafetyIdx` (lines 148–153).
- **Migration** (`0188_run_events_coverage.sql`): Columns at 49–55, index at 81–82. Migration `0191` only adds JAC-4530 cost-metadata columns.
- **Constants** (`packages/shared/src/constants.ts`, 888–905): All five enum arrays + five type aliases.
- **Types** (`packages/shared/src/types/run-event.ts`): RunEvent (103–109) has all six fields; CreateRunEventInput (166–182) does not.
- **Validators** (`packages/shared/src/validators/cost.ts`): `RunCoverageResolution` (132–154) lacks action-safety fields; `createRunEventSchema` transform at 440–494 does NOT resolve action-safety; `resolveRunCoverageForError()` at 316 returns fail-closed coverage only.
- **Service** (`server/src/services/costs.ts`): `createRunEvent()` (132–227); writes at 216–221.
- **Callers** (`server/src/services/heartbeat.ts`): Line 11770 (normal path) and ~14319 (setup-failure path).
- **Exports** (`packages/shared/src/index.ts`): Constants at 521–525; types at 540–544.

## Value-set alignment (4.9): JAC-3930 ratified 2026-08-01 does not mandate extended value sets; codebase simple sets compatible.

## Plan status: Planning-mode directive satisfied. All 10 sub-tasks (4.1–4.10) unblocked. No code written. Awaiting implementation go-ahead.
