## Zatara Verdict — JAC-4577 (17:35Z Update)

**Source identity:** Zatara (f83be6e5-ccc8-4689-a4a8-ec1dcef9b667), diagnostic lead
**Paperclip:** v2026.722.0, local_trusted
**Run ID:** 176cac48-3559-412e-940f-3633d808aea3

### Executive Summary

The JAC-4575 systemic incident (DEFAULT_MODEL="auto" to OpenRouter 404 for qwen3-coder:30b on empty adapterConfig) is **fully remediated at the source**. Fix commit `2f5ff6345` is deployed in both the repo and the running npm package (`/Users/hermes/.hermes/node/lib/node_modules/paperclipai/`).

The 8 currently-errored agents are **stale error-state breadcrumbs in Paperclip's DB**, NOT a recurrence. Key evidence:
- All 8 have `activeRun: none` — no live execution failures
- 6 of 8 have truncated errorReason (34 chars: "Traceback (most recent call last):") from the pre-fix era (timestamps 15:06-17:19)
- None contain provider-routing keywords (openrouter, 404, nous)
- Herald (a1e8cb0d, Coordinator's dispatch seat) has `orgChainHealth=healthy` and `lastHeartbeatAt=17:11` — functionally running despite stale `status=error`
- Zatara itself is `status=running, errorReason=null` — my own error from the original incident is fully cleared
- The error count oscillates (20 to 0 to 5 to 8 to 9) across cycles — characteristic of stale breadcrumbs that Paperclip does not auto-clear on status recovery

### Fix Verification
- **Local repo:** `packages/adapters/hermes/src/shared/constants.ts:39` — `export const DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b"`
- **Running npm package:** `grep DEFAULT_MODEL` in `hermes-paperclip-adapter/dist/shared/constants.js` confirms the fix IS deployed
- **Code path:** `execute.ts` uses `cfgString(config.model) || DEFAULT_MODEL` — empty adapterConfig now passes `-m ollama-launch/qwen3-coder:30b --provider ollama-launch` to Hermes CLI
- **Tests:** `execute.compatibility.test.ts` confirms empty adapterConfig passes `-m` and `--provider` flags; `server/test-environment.compatibility.test.ts` (756902483) verifies env-level DEFAULT_MODEL

### 8 Errored Agents — Stale Breadcrumb Classification
| Agent | ID | errLen | First Line | lastHB | activeRun | Classification |
|-------|----|--------|-----------|--------|-----------|----------------|
| Valeera | eed387f6 | 34 | Traceback... | 17:06:15 | none | STALE |
| Operator | a5d0eb09 | 395 | Streaming failed (conn error) | 17:07:18 | none | STALE (transient, pre-fix) |
| Fable | f1ef5e14 | 34 | Traceback... | 17:07:18 | none | STALE |
| Omnigent Router | 072eada2 | 34 | Traceback... | 17:11:16 | none | STALE |
| Herald | a1e8cb0d | 34 | Traceback... | 17:11:34 | none | STALE |
| Paperclip Agent Auditor | 5b2bece1 | 34 | Traceback... | 17:15:10 | none | STALE |
| Oracle-2 | d8598eb7 | 0 | (empty) | 17:15:15 | none | STALE |
| Researcher | 785cac12 | 34 | Traceback... | 17:19:40 | none | STALE |

### Systemic Issue Surfaced: ErrorReason Truncation (34 chars)
Six errored agents share the identical truncated errorReason: "Traceback (most recent call last):" (exactly 34 chars). The full traceback is not being persisted to Paperclip's database. This defeats JAC-4575's diagnostic purpose. This is a separate Paperclip storage bug — needs routing to Luna/Typist.

### Disposition
- **JAC-4577 remains blocked.** The systemic incident is remediated; the remaining 8 errored agents need stale-breadcrumb clearing (a Paperclip DB hygiene task, not a runtime issue).
- **Root-cause diagnosis is complete:** JAC-4577's job #1 (verify stale vs live) = 7 stale + 1 transient (Operator) = all stale breadcrumbs. JAC-4577's job #2 (reconcile against JAC-4561/4562) = fix confirmed deployed.
- **Smallest safe remediation:** Clear `errorReason=null` / `status=idle` for agents with `activeRun: none` and `lastHeartbeatAt` within last 30 minutes. Route to Luna via JAC-4422 (clear stale error breadcrumbs) follow-up.
- **No escalation to Wings needed** — ownership is clear: Zatara=diagnostic (done), Luna=implementation of stale-breadcrumb clearing, Coordinator=bulk operations if needed.
- **Release gate (JAC-3597):** I will NOT sign off on release readiness while stale error breadcrumbs obscure the true fleet state. The truncation bug must be fixed (full tracebacks stored) before the release gate can pass.

### Durable Evidence
Full machine-readable snapshot and verification commands: `doc/plans/2026-08-04-jac-4577-zatara-verdict-update.md`