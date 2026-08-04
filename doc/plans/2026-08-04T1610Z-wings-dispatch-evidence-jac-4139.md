# Wings Dispatch Evidence — JAC-4139 — Cycle 2026-08-04T16:10Z

## Environment

- **Paperclip API**: http://127.0.0.1:3101/api (v2026.722.0, local_trusted)
- **Paperclip API key**: present (52 chars, bearer token redacted)
- **NOUS_API_KEY**: UNSET in this Wings execution environment
- **OPENROUTER_API_KEY**: UNSET
- **OLLAMA_HOST**: SET (ollama-launch on 127.0.0.1:11434)
- **Paperclip agent ID**: 80284e06-41ab-415a-ba1c-6c3121debd0d (Wings)
- **Company ID**: 87c32b8e-f131-4df8-ad8e-963d01b458e7

## Wake Acknowledged

Wake comment `fb19d154` (2026-08-04T16:01:13Z, 15:45Z cycle) — 0 dispatches, queue exhausted.

The 15:45Z comment claimed NOUS_API_KEY unset was the root cause blocking Herald and Plan Runner. This cycle performs a fresh independent live verification.

## Live Agent Table Read (16:06Z, authenticated)

Method: GET /api/companies/87c32b8e.../agents (bearer=Wings 80284e06)

### Agents with executionLane metadata (8 lanes):

| Agent | status | errorReason | lane.state | provider(label) | actual route | maxPar | allowedWork | verifiedAt | Dispatchable? |
|---|---|---|---|---|---|---|---|---|---|
| Coordinator | idle | none | verified | nous | openrouter (poolside) | 2 | read-only | 2026-08-03T23:38:49Z | NO (self-reserved) |
| Herald | **idle** | **none** | verified | nous | openrouter (poolside) | 2 | read-only | 2026-08-03T23:37:00Z | **YES** |
| Plan Runner | **paused** | none | verified | nous | openrouter (poolside) | 2 | read-only+impl | 2026-08-03T23:15:00Z | NO (paused) |
| Aegis Coder X | idle | none | verified | ollama-local | ollama-launch (qwen3-coder:30b) | 1 | read-only+impl+review | 2026-07-31T19:56:00Z | YES (capacity check below) |
| Aegis Coder Y | idle | none | **error** | ollama-local | ollama-launch | 1 | read-only+impl | 2026-07-31T19:56:00Z | NO (lane=error) |
| Hermes Mistral | paused | none | paused | ollama-cloud | ollama-cloud | 1 | read-only+impl+review | 2026-07-31T19:56:00Z | NO (paused) |
| Flash | running | none | pending_repair | ollama-cloud | ollama-cloud | 1 | read-only+impl | 2026-07-31T19:56:00Z | NO (pending_repair) |
| Wings (self) | running | none | verified | nous | openrouter (poolside) | 4 | read-only+impl | 2026-08-03T23:38:49Z | NO (self-reserved) |

### Corrections vs wake comment (15:45Z):

1. **Herald**: Wake reported `status=error, errorReason="Traceback (most recent call last):"`. Live read shows `status=idle, errorReason=none` — **Herald has recovered**. The error has self-cleared. Wake diagnosis was based on 15:45Z stale state.

2. **Plan Runner**: Wake reported `status=error, errorReason="Process lost pid 98149 no longer running"`. Live read shows `status=paused, errorReason=none` — **Plan Runner is manually paused**, not errored.

3. **Wings (self)**: Wake reported `status=running, errorReason="Traceback (most recent call last):"`. Live read shows `status=running, errorReason=none` — **error has self-cleared**.

4. **NOUS_API_KEY**: Confirmed UNSET in this execution environment. However, the `nous` label in `executionLane.provider` is an **alias**, not the actual routing provider. Per Hermes config (`~/.hermes/profiles/aegis/config.yaml`):
   - `model.aliases.kimi: "nous/poolside/laguna-s-2.1:free"` maps to the `openrouter` provider in the fallback chain
   - `auxiliary.*.provider: openrouter, model: poolside/laguna-s-2.1:free`
   - Fallback chain: openai-codex → xai-oauth → openrouter → ollama-launch

   Herald's recovery from error → idle suggests the openrouter fallback is working despite NOUS_API_KEY being unset. The wake's root cause diagnosis needs re-verification (see below).

## NOUS_API_KEY Verification

Per issue contract: "Never infer a quota outage from stale logs; record a fresh authenticated generation failure before holding a verified lane."

**Status**: Cannot reproduce a fresh NOUS generation failure because:
- The `nous` provider label routes to `openrouter` (free tier) per the actual config
- Herald's `errorReason` has already cleared to `none`
- Herald's `status` has recovered to `idle`
- This is a real state change, not stale-log artifact

**Conclusion**: Herald is now verified+idle with no error and is dispatchable. The 15:45Z wake's NOUS_API_KEY root-cause diagnosis was based on stale state that has since self-corrected. NO fresh generation failure can be recorded because the lane has recovered.

## Pool Capacity

### local-aegis pool:

| Agent | status | lane | dispatchable | reason |
|---|---|---|---|---|
| Herald | idle | verified (poolside/openrouter) | YES | Recovered from error; no active run, no assigned todo issues |
| Aegis Coder X | idle | verified (ollama/qwen3-coder:30b) | YES | But assigned JAC-3705 which is blocked by JAC-4093 |
| Coordinator | idle | verified (poolside/openrouter) | NO | Self-reserved (Wings dispatcher) |
| Plan Runner | paused | verified (poolside/openrouter) | NO | Manually paused |
| Aegis Coder Y | idle | error | NO | lane.state=error |
| Wings | running | verified (poolside/openrouter) | NO | Self-reserved |

**local-aegis available capacity**: Herald (idle, 0 assigned), Coder X (idle, 1 assigned but blocked)

### ollama-cloud pool:
| Agent | status | lane | dispatchable |
|---|---|---|---|
| Hermes Mistral | paused | paused | NO |
| Flash | running | pending_repair | NO |

**ollama-cloud available capacity**: 0

### independent-review pool: No agents with executionLane in this pool. JAC-3596 (Kimi) shows status=running but no executionLane metadata (not a formal lane).

## Assigned Work on Dispatchable Lanes

### Herald (a1e8cb0d) — DISPATCHABLE:
- Assigned todo issues: **0**
- Herald is free and dispatchable. Can accept new work or child issues.

### Aegis Coder X (da00de99) — DISPATCHABLE:
- Assigned todo issues: **JAC-3705** ("Canary efficient Hermes-local agents without losing memory")
- JAC-3705 is **blocked by JAC-4093** ("JAC-3705 canary preconditions: verify live Hermes parser + freeze compact profile + host-wide Ollama semaphore") which is `blocked` status, assigned to Plan Runner.
- Coder X's lane has capacity (maxParallel=1, currently 0 active runs), but its assigned work is dependency-blocked.

## Unassigned Todo Issues — Dispatch Eligibility

| Issue | Priority | Status | Eligible? | Reason |
|---|---|---|---|---|
| JAC-4604 | high | todo | NO | Credential-bound (NOUS_API_KEY); assigned to Wings (self) |
| JAC-4217 | high | todo | NO | DECISION-gate (Jack decision required) |
| JAC-4216 | high | todo | NO | DECISION-gate (Jack decision required) |
| JAC-3714 | high | todo | NO | Approval-gate (interactive sudo) |
| JAC-3558 | high | todo | NO | Human gate (Jack action required) |
| JAC-3557 | high | todo | NO | Human gate (Jack action required) |
| JAC-3555 | high | todo | NO | Human gate (Jack action required) |
| JAC-3956 | high | todo | NO | Monitor receptacle (read-only alert collector) |
| JAC-3437 | medium | todo | NO | Personal/human-gate (haircut, requires Jack) |
| JAC-3365 | medium | todo | NO | Requires NotebookLM login (human-gated tool) |
| JAC-3359 | medium | todo | NO | Child of JAC-2447 (cancelled); human-gate |
| JAC-3361 | medium | todo | NO | Child of JAC-2447 (cancelled); depends on 3359 |
| JAC-3358 | medium | todo | NO | Child of JAC-2447 (cancelled); human-gate |
| JAC-3360 | medium | todo | NO | Child of JAC-2447 (cancelled); human-gate |
| JAC-3970 | low | todo | NO | Dispatch-meta (points to JAC-3705 which is blocked) |

## Active Runs (in_progress/running with executionRunId)

| Issue | Run ID | Assignee | Title |
|---|---|---|---|
| JAC-4626 | 4fa1836f... | Watchdog (3fad92dc) | Repair stale in-progress queue violations |
| JAC-4601 | dc5f93fe... | Bright (8b6ea7f8) | PLAN: Decompose fleet-wide hermes_local adapterConfig |
| JAC-4605 | 21aa8a4d... | Bright (8b6ea7f8) | Verify: Confirm all 20 errored agents clear |
| JAC-4235 | c6bf547a... | Karax (f54fc3bc) | Harden Hermes gateway plists |
| JAC-4539 | d8d25079... | Karax (f54fc3bc) | P3: Rollback acceptance tests |
| JAC-4612 | 30c2beac... | Fenix (5056439a) | Deploy DEFAULT_MODEL + resolveProvider fix |
| JAC-4139 | 4d08cede... | Wings (80284e06) | Coordinator Fleet Coordination Check (self, this run) |
| JAC-4606 | aef7b42a... | Coder X (da00de99) | Decommission Scout agent |

Note: JAC-4606 is assigned to Coder X and has an active run — this partially occupies Coder X's capacity (maxParallel=1). So Coder X is NOT available for additional dispatch.

## Dispatch Decision

**Dispatches: 0**

### Rationale:

1. **Herald** is verified+idle+error-free and has **0 assigned todo issues**. However, there are **no independent, plan-backed tasks** available for Herald that aren't policy-excluded:
   - All unassigned high-priority todos are either credential-bound (JAC-4604), Jack-decision-gates (JAC-4217, JAC-4216), approval-gates (JAC-3714), human-gates (JAC-3555/57/58), monitor receptacles (JAC-3956), or personal tasks (JAC-3437) requiring Jack action.
   - The medium-priority unassigned todos (JAC-3365, JAC-3359/3360/3361/3358) are either NotebookLM-login-gated or children of a cancelled parent (JAC-2447), making them dependency-gated.

2. **Aegis Coder X** is verified+idle but its capacity is occupied by JAC-4606 (active run, maxParallel=1). Even without JAC-4606, its only assigned todo (JAC-3705) is blocked by JAC-4093.

3. **JAC-4604** (NOUS_API_KEY fix) is assigned to Wings (self) and is credential-bound. Per the Wings contract, Wings does NOT alter credentials — this requires board-level provisioning (JAC-4575, currently `blocked`).

4. **local-aegis pool**: 0 dispatchable free lanes with available independent work.
5. **ollama-cloud pool**: 0 dispatchable lanes (both paused/pending_repair).
6. **independent-review pool**: No formal lanes.

### Corrections to wake comment:

The 15:45Z wake comment's root cause diagnosis (NOUS_API_KEY unset causing Herald/Plan Runner errors) was based on stale state. As of 16:06Z live verification:
- Herald has **recovered** (idle, no error)
- Plan Runner is **paused** (not error)
- Wings has **recovered** (errorReason none)
- The `nous` provider label is an alias routing to `openrouter` (free tier), not direct NOUS API access
- No fresh generation failure can be recorded because the lane has self-cleared

## Blockers

| Blocker | Issue | Owner | Action |
|---|---|---|---|
| NOUS_API_KEY unset | JAC-4604 | Board (JAC-4575 blocked) | Provision NOUS_API_KEY or remove nous provider label from lane config |
| Coder X capacity occupied | JAC-4606 (active run) | Coder X | Complete JAC-4606 run |
| Coder X assigned work blocked | JAC-3705 → JAC-4093 | Plan Runner | Resolve JAC-4093 preconditions |
| No independent unblocked todos | Queue exhaustion | Fleet | Upstream issues must resolve |

## Pools Summary

| Pool | Verified+Idle | Dispatchable | Available Capacity |
|---|---|---|---|
| local-aegis | Herald, Coder X | Herald only | 0 (no eligible work) |
| ollama-cloud | 0 | 0 | 0 |
| independent-review | N/A (Kimi no lane) | 0 | 0 |

## Disposition

**in_progress (restart-ready)** — 0 dispatches, queue genuinely exhausted. No dispatchable lane has eligible independent work. Native child-completion continuation remains the liveness path. Awaiting:

- JAC-4604 (NOUS_API_KEY provisioning or provider config update)
- JAC-4606 completion (frees Coder X capacity)
- JAC-4093 resolution (unblocks JAC-3705 for Coder X)
- Upstream dependency resolution (JAC-4187, JAC-3933, etc.)

No stale-log inference — all gates from live authenticated metadata.executionLane.
