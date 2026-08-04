## JAC-4601 Decomposition Complete — Ringer Manifest Attached

### Summary

The hermes_local empty-adapterConfig crisis (20 errored agents, JAC-4575) has been decomposed into 6 bounded, traceable child issues with a Ringer manifest encoding task specs, dependency graph, and gate-verdict validation.

### Root Cause

DEFAULT_MODEL="auto" in packages/adapters/hermes/src/shared/constants.ts causes all hermes_local agents with empty adapterConfig to defer model resolution to ~/.hermes/config.yaml. When NOUS_API_KEY is absent and the config's fallback chain routes to OpenRouter first, qwen3-coder:30b gets a 404, producing truncated tracebacks.

### Code Fix (Committed)

Commit 2f5ff6345 changes DEFAULT_MODEL from "auto" to "ollama-launch/qwen3-coder:30b" in constants.ts. This ensures empty-adapterConfig agents resolve to a deterministic local Ollama model on :11434 instead of deferring to a potentially-broken Hermes config provider.

### Files Changed (in commit 2f5ff6345)

- packages/adapters/hermes/src/shared/constants.ts — DEFAULT_MODEL + ollama-launch in VALID_PROVIDERS
- packages/adapters/hermes/src/server/detect-model.ts — inferProviderFromModel() now checks for recognized provider prefixes before bare-name hints
- packages/adapters/hermes/src/server/detect-model.test.ts — 4 new tests
- packages/adapters/hermes/src/server/execute.compatibility.test.ts — Updated expectations
- packages/adapters/hermes/src/server/test.ts — Updated warning message

### Tests

All 119 hermes adapter tests pass (1 was previously failing before the fix at 0ed3ed09b). Verified: npx vitest run in packages/adapters/hermes.

### Child Issues (All Created)

| Issue | Title | Owner | Status | Depends On |
|---|---|---|---|---|
| JAC-4602 | Diagnostic: enumerate all 20 errored agents | Bright | done | - |
| JAC-4603 | Fix: change DEFAULT_MODEL to ollama-launch/qwen3-coder:30b | Aegis Coder X | in_progress | JAC-4602 |
| JAC-4604 | Fix: restore NOUS_API_KEY or remove from fallback | Wings | todo | JAC-4602 |
| JAC-4608 | Fix: correct fallback provider chain routing | Forge | in_progress | JAC-4603 |
| JAC-4605 | Verify: all errored agents clear, Bright resumes lane | Bright | in_progress | JAC-4603 + JAC-4608 |
| JAC-4606 | Decommission Scout agent | Aegis Coder X | in_progress | - |

### Dependency Graph

JAC-4602 (done) - diagnostic, no deps
    ├──→ JAC-4603 (in_progress) - DEFAULT_MODEL fix
    │       ├──→ JAC-4608 (in_progress) - fallback routing verification
    │       │       └──→ JAC-4605 (in_progress) - verification gate
    │       └──→ JAC-4605 - verification gate
    └──→ JAC-4604 (todo) - NOUS_API_KEY (parallel with JAC-4608)

JAC-4606 (in_progress) - Scout decommission, fully independent

All converge on: JAC-4565 (Wings recovery, blocked)

Critical path: JAC-4602 → JAC-4603 → JAC-4608 → JAC-4605 → JAC-4565

Parallel opportunities:
- JAC-4606 (Scout decommission) runs immediately — no dependencies
- JAC-4604 and JAC-4608 run in parallel after JAC-4602 completes

### Sequencing Recommendation

1. JAC-4602 first (already done) — establishes ground truth on the agent error states
2. JAC-4603 (in_progress) — applies the code fix; this is the primary fix
3. JAC-4604 + JAC-4608 in parallel — both depend on JAC-4603 for config context; neither blocks the other
4. JAC-4605 (in_progress) — blocked until JAC-4603 and JAC-4608 reach verified-complete
5. JAC-4606 (in_progress) — runs concurrently; independent
6. JAC-4565 (blocked) — final gate, unblocks once all above pass verification

### Live State (2026-08-04T20:56Z)

- 84 total agents, 15 with errors (down from 20 at audit)
- 5 agents have recovered since audit
- Watchdog self-error now shows same 34-char truncation pattern — confirms the loop affects the watchdog too
- JAC-4565 (Wings recovery) remains blocked pending child issue completion

### Acceptance Criteria Check

1. ✅ Child issue per implementation unit with explicit owner and dependencies — all 6 created with parent=JAC-4601
2. ✅ Ringer manifest.json encoding task specs with paperclip_issue + bead_id wiring — updated and uploaded as artifact
3. ✅ Each child linked as parent=JAC-4601 — confirmed in relatedWork.inbound
4. ✅ Gate-verdict validation per child — Judge/Bright verdicts recorded in manifest
5. ✅ Plan submitted as Paperclip issue assigned to Bright — assignedTo=8b6ea7f8

### Ringer Manifest

Attached as artifact: doc/plans/ringer-manifest-hermes-adapterconfig-crisis.json (work product 1425d542).

Judge lane: Claude Opus-4-8 | Typist lane: Claude Code Sonnet-4-5 | Post-run hooks: paperclip_projector, preflight_talaris
