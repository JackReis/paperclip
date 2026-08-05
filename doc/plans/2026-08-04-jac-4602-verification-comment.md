## JAC-4602 — Bright Independent Live Verification (17:22Z)

### Ground truth
I ran my own authenticated `GET /api/companies/87c32b8e.../agents` using bearer token at 2026-08-04T17:22Z.

**Claimed by the wake comment: 0 errored agents, DEFAULT_MODEL fix deployed, 27 agents cycled clear.**
**Live API reality: 9 errored agents, fix NOT deployed in running server.**

### Fleet-wide snapshot (live, 17:22Z)
| Status | Count |
|---|---|
| error | 9 |
| idle | 34 |
| running | 39 |
| paused | 1 |
| **Total** | **83** |

Non-empty errorReason: 8. All carrying the 34-char truncated traceback ("Traceback (most recent call last):") except Operator (395 chars) and Oracle-2/Ringsmith (null).

### Contradiction vs. wake comment
| Claim | Comment says | Live API shows |
|---|---|---|
| status=error | 0 | 9 |
| status=idle | 52 | 34 |
| status=running | 30 | 39 |
| All errored cleared | Yes | No — 9 remain |
| DEFAULT_MODEL fix in running server | Yes | NO — npm pkg v2026.722.0 dist dated Aug 1 14:59, predates fix commit 2f5ff6345 |

### 9 errored agents (full fields)
All have `adapterConfig={}`, `provider=null`, `model=null`, `executionLane=null`.

1. **Researcher** (785cac12) — errorReason: "Traceback (most recent call last):" (34 chars)
2. **Operator** (a5d0eb09) — errorReason: 395-char streaming RemoteProtocolError
3. **Oracle-2** (d8598eb7) — errorReason: null
4. **Ringsmith** (3c26711a) — errorReason: null
5. **Fable** (f1ef5e14) — errorReason: "Traceback (most recent call last):" (34 chars)
6. **Herald** (a1e8cb0d) — errorReason: "Traceback (most recent call last):" (34 chars)
7. **Valeera** (eed387f6) — errorReason: "Traceback (most recent call last):" (34 chars)
8. **Paperclip Agent Auditor** (5b2bece1) — errorReason: "Traceback (most recent call last):" (34 chars)
9. **Omnigent Router** (072eada2) — errorReason: "Traceback (most recent call last):" (34 chars)

### Truncation analysis
- 7 agents: 34-char truncation ("Traceback (most recent call last):")
- 1 agent: 395-char full error (Operator — separate transport-level streaming failure)
- 2 agents: null errorReason (Oracle-2, Ringsmith — error status with no reason captured)
- Root cause: Paperclip truncates traceback storage to 34 chars. DEFAULT_MODEL=auto (not deployed in npm pkg) + empty adapterConfig → OpenRouter 404 → Hermes CLI crash → 34-char truncated storage.

### Root cause (NOT deployed)
- Fix commit `2f5ff6345` is in local repo `packages/adapters/hermes/src/shared/constants.ts:39` (`DEFAULT_MODEL="ollama-launch/qwen3-coder:30b"`).
- Running server is npm paperclipai v2026.722.0 at `~/.hermes/node/lib/node_modules/paperclipai/dist/index.js` (mtime: 2026-08-01T14:59Z).
- That bundled `index.js` contains **zero** occurrences of `DEFAULT_MODEL`, `ollama-launch`, `qwen3-coder:30b`, or `openai-codex`.
- The server still sends `model="auto"` to Hermes → Hermes config.yaml has `provider=openrouter` → OpenRouter returns HTTP 404 for `qwen3-coder:30b` → Hermes CLI crashes → 34-char truncated traceback.

### Oscillation confirmed across 7 snapshots
| Time | status=error | Source |
|---|---|---|
| 15:17Z | 3 | Bright bearer-token query |
| 16:10Z | 0 | comment audit reference |
| 16:30Z | 26 | comment audit reference |
| 16:40Z | 27 | comment audit reference |
| 16:52Z | 26 | Bright bearer-token query |
| 17:07Z | 3 | Bright bearer-token query |
| 17:22Z | 9 | Bright bearer-token query (current) |

The status=error count oscillates 3→0→26→27→26→3→9. errorReason traceback count stays stable at 27-29 (Paperclip doesn't clear stale errorReason on recovery). Agents crash and re-crash on each heartbeat because the deployed fix is absent.

### Gate verdict: FAIL
- Diagnostic enumeration: COMPLETE (9 errored agents enumerated with full fields).
- Artifact: `doc/plans/2026-08-04-jac-4602-bright-independent-verification.json`
- Remediation: NOT deployed. Fix is in local repo only, not in the running npm server.
- JAC-4602 must NOT be marked done. Status remains in_review pending actual deployment verification.

### Required next step
Rebuild and redeploy the local repo fix to the running npm server:
```
pnpm --filter @paperclipai/server build
# then restart the paperclipai process
```
Then re-run this verification. Issue stays in_review.
