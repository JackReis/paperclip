## JAC-4530 Disposition — Plan Complete, Blocked on JAC-3930

**Work mode:** Planning only (no code changes in this issue)

### What was produced
- Full specification document: `doc/plans/2026-08-04-jac-4530-token-cost-field-semantics.md` (445 lines)
- Complete gap analysis: JAC-4529 already implemented nullable-column approach (null = not_reported, 0 = explicitly zero) covering most of the coverage states. Remaining gaps documented: `price_basis`, `cost_confidence`, `pricing_version_ref` on run_events, native/recomputed total distinction, `is_subscription_included`.
- Two implementation paths analyzed: Path A (full QuantifiedQuantity envelope) and Path B (flat nullable + new metadata columns — preferred for V1). Decision: Path B.
- Fail-closed invariants table with 6 condition rows mapping to `price_basis`/`cost_confidence`/`coverageState`/`sourceStatus`/`safeStatus`/`confidence` values.
- Ordered 11-step implementation plan (constants → schema → migrations → Zod schemas → types → service → heartbeat → tests → API routes).
- Acceptance criteria checklist (all 11 items documented).
- Backward compatibility analysis (all new columns additive with defaults).
- Relationship mapping to JAC-3930 (telemetry contract), JAC-3933 (detectors), JAC-4529 (parent design), JAC-4532 (idempotency), JAC-4533 (privacy/retention).

### Dependencies
- **Blocked on:** JAC-3930 (Define fleet-wide cross-vendor telemetry and lineage contract — `in_review`). JAC-3930 ratifies the canonical QuantifiedQuantity envelope `{value, unit, reported_state, source_field, observed_at, confidence}` that JAC-4530's Path B implements as flat nullable columns.
- JAC-3929 (parent: Fleet-wide AI Token & Run Observatory — `blocked`).

### Verification
- Plan document created at `doc/plans/2026-08-04-jac-4530-token-cost-field-semantics.md`.
- Codebase state assessment verified against live repo at 2026-08-04:
  - `packages/shared/src/constants.ts` — USAGE_REPORTED_STATES, CONFIDENCE_LEVELS, COVERAGE_STATES, BILLING_TYPES all present.
  - `packages/db/src/schema/cost_events.ts` — reasoning_tokens, tool_call_tokens, currency, pricing_version_ref, coverage fields all present.
  - `packages/db/src/schema/run_events.ts` — nullable token columns, usageReportedState present, pricing_version_ref absent.
  - `packages/shared/src/validators/cost.ts` — resolveLedgerCoverageForRun, resolveRunCoverageForError, computeCoverageWarning, createRunEventSchema, createCostEventSchema all present with fail-closed transforms.
  - `server/src/services/costs.ts` — createEvent, createRunEvent, coverageSummary, coverageByAgent all present.
  - `server/src/services/heartbeat.ts` — resolveLedgerCoverageForRun + costs.createRunEvent calls in both normal and error paths.
  - `server/src/routes/costs.ts` — POST /cost-events, POST /run-events, GET /coverage/warnings, GET /coverage/by-agent all present.
  - `packages/shared/src/validators/cost.test.ts` and `server/src/__tests__/costs-service.test.ts` — fail-closed tests present.

### Disposition
This is a planning-only issue. The specification is complete and the implementation plan is documented. Code implementation will proceed once JAC-3930 (the telemetry contract) is approved. Marking this issue `in_review` pending review of the plan document and approval of JAC-3930 to unblock implementation.