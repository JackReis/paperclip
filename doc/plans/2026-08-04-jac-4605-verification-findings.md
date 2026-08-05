# JAC-4605 Verification Findings — Independent Re-check

Date: 2026-08-04T15:35Z
Agent: Bright (8b6ea7f8-781e-49ce-8c37-4f5564fc7481)
Issue: [JAC-4575-5] Verify: Confirm all 20 errored agents clear and Bright resumes lane

## Source of truth
All data independently read live from the Paperclip API at 127.0.0.1:3101
(`GET /api/companies/{cid}/agents`) with the runtime API key — NOT from the
assertions in the "fresh live verification" comment.

## Independent findings (live, 15:32–15:35Z)

### Fleet-wide agent state
- Total agents: 83
- Agents in TRUE "error" STATUS: 8 (INCREASED from 4 at ~15:10 — errors are rising, not clearing)
- Agents carrying a non-empty `errorReason`: 22 (all hermes_local)
- Status distribution: 8 error, 42 idle, 1 paused, 32 running
- Bright (8b6ea7f8): status=running, errorReason=null, orgChainHealth=healthy ✓

### Discrepancy vs. the comment
The issue comment claims "0 errored agents at 15:08Z" and that all 27 errored
agents "cleared after pause/resume cycle." The live API directly contradicts this:
- 8 agents in true "error" status at 15:32Z
- 22 agents with non-empty errorReason tracebacks
- The errored population GREW (4→8 in true error, 30→22 in errorReason
  between 15:10 and 15:32) — the opposite of "clearing."

### Root-cause: fix exists in source, NOT deployed
- The DEFAULT_MODEL fix (commit 2f5ff6345, JAC-4603) and the fallback-routing
  fix (commit d466bb405, JAC-4604/JAC-4608) are present in the LOCAL repo at
  `packages/adapters/hermes/src/shared/constants.ts:39`
  (`DEFAULT_MODEL = "ollama-launch/qwen3-coder:30b"`).
- The RUNNING server is npm paperclipai v2026.722.0. Its bundled
  `dist/index.js` contains ZERO occurrences of DEFAULT_MODEL, "ollama-launch",
  "qwen3-coder:30b", or "openai-codex" — i.e. the deployed server still
  passes model="auto" to Hermes, the original JAC-3422 root cause.
- Paperclip server /health confirms: `"git": {"shortSha":"40c9d98c0"}`,
  `"untrackedFileCount": 249` — local repo edits are uncommitted and not
  rebuilt into the running instance.

### NOUS_API_KEY
- Not set in this agent shell. Not present in ~/.hermes/.env.
- Hermes config.yaml provider is `nous`; fallback chain is
  openai-codex → ollama-launch qwen3-coder:30b@127.0.0.1:11434.

### Bright-specific status (ACCEPTANCE CRITERION 2 — MET)
- Bright: status=running, errorReason=null, adapterConfig={},
  orgChainHealth.healthy=true. Bright's own execution lane is functional.
- Bright's most recent completed heartbeat run (started 2026-08-04T15:08:40Z,
  finished 15:30:59Z) succeeded with status=succeeded, error=null.
- Bright's 14:56:39Z run also succeeded.

## Acceptance criteria verdict
- [x] Bright agent executionLane healthy — running, no errorReason. (criterion 2)
- [ ] 0 errored agents in fleet summary — NOT MET. Live API shows 8 error-status + 22 errorReason. (criterion 1)
- [ ~ ] Test invocation / model resolution — Bright runs succeed, but the deployed server lacks the DEFAULT_MODEL fix, so resolution depends on Hermes config.yaml fallback (nous→codex→ollama), not the intended deterministic ollama-launch default. (criterion 3)
- [ ~ ] NOUS_API_KEY / fallback to Ollama — NOUS_API_KEY absent; fallback exists in config.yaml and `hermes status` resolved Model=qwen3-coder:30b/Provider=ollama-launch, but the running Paperclip server has no DEFAULT_MODEL override, so it still sends "auto". (criterion 4)

## Conclusion
The fleet-wide fix is NOT yet effective in the running system because the
source fix was never rebuilt and deployed to the npm server instance.
Re-verification comment's "0 errored" claim is not corroborated by the live API.
Recommend: rebuild + redeploy the local repo (`pnpm --filter @paperclipai/server
build` then restart the paperclipai process), then re-run this verification.
