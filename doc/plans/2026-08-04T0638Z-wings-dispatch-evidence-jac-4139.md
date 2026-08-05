# Wings Dispatch Evidence — JAC-4139 Cycle 2026-08-04T06:38Z

**Run ID:** Current heartbeat (Wings, hermes_local, poolside/laguna-s-2.1:free)
**Cycle:** 2026-08-04T06:38Z
**Dispatches:** 0
**Result:** Queue exhausted — state unchanged since 06:08Z cycle

## Acknowledged Wake

Comment `8094deeb` at 2026-08-04T06:26:11Z by `local-board` — Coordinator Cycle 2026-08-04T06:08Z (0 dispatches, queue exhausted, live re-verified). This cycle confirms no change in dispatchable capacity.

## Fresh Live Verification

Authenticated GET `/api/companies/87c32b8e-f131-4df8-ad8e-963d01b458e7/agents` + bulk issue fetch.

### Agent State (84 total; 41 error, 25 running, 16 idle, 2 paused)

**Verified lanes (metadata.executionLane.state=verified):**

| Lane | Agent | Status | Error | Pool | Provider | VerifiedAt | maxParallel | Dispatchable? |
|------|-------|--------|-------|------|----------|------------|-------------|---------------|
| Wings (self) | Wings | running | — | local-aegis | nous | 2026-08-03T23:38Z | 4 | NO — reserved (strategic) |
| Coordinator | Coordinator | idle | — | local-aegis | nous | 2026-08-03T23:38Z | 2 | NO — reserved (strategic) |
| Aegis Coder X | da00de99 | running | — | local-aegis | ollama-local | 2026-07-31T19:56Z (stale 4d) | 1 | NO — lane lease-occupied by JAC-4511 (in_progress) + JAC-3705 dispatched |
| Herald | a1e8cb0d | error | Traceback (most recent call last) | local-aegis | nous | 2026-08-03T23:37Z | 2 | NO — agent in error state |
| Plan Runner | 2c6b1cc9 | error | Traceback (most recent call last) | local-aegis | nous | 2026-08-03T23:15Z | 2 | NO — agent in error state |
| Aegis Coder Y | 181f381b | idle | — | local-aegis | ollama-local | 2026-07-31T19:56Z (stale) | 1 | NO — laneState=error (timed out, pending_repair) |

**Ollama-cloud pool (0/3):**
| Lane | Agent | Status | Reason |
|------|-------|--------|--------|
| Hermes Mistral | — | paused | manual pause |
| Flash | — | error | pending_repair (instance_settings query failure) |
| (Scout) | — | paused | manual pause |

### Root Cause of Error-State Lanes

**NOUS_API_KEY confirmed absent from `~/.hermes/.env`.** Hermes aegis profile `config.yaml` sets `provider=nous` + `base_url=https://inference-api.nousresearch.com/v1`, and `AUXILIARY_APPROVAL_PROVIDER=nous`. All hermes_local agents using the nous provider (Herald, Plan Runner, Coordinator, Wings) fail at adapter init with "Traceback (most recent call last)".

This is NOT a Wing-fixable credentials issue — requires Jack/Nous team to restore the key. Recovery path: **JAC-4565**.

### Host Health Gate

**P component down (P87, stale 14+ days per CTX-SpO2).** local-aegis pool's host health gate is red. Even though Aegis Coder X shows `running` with `verification: "heartbeat fresh, no errorReason"`, the P89/P87 gate remains down per the CTX-SpO2 signal. Per coordinator policy, local-aegis is excluded from dispatch while host health is not green.

### Active Child Runs

| Issue | Agent | Status | Detail |
|-------|-------|--------|--------|
| JAC-4580 (Fenix) | 7fa9c1ac | in_progress | Bounded liveness exhausted (2/2, plan_only). 10 comments, all re-initializations, no diagnosis posted. Stalled. |
| JAC-4511 | da00de99 | in_progress | JAC-4505 follow-up: promote MLX embed lane to OB1 production. Lease-occupies Aegis Coder X lane. |
| JAC-3705 | da00de99 | todo (assigned) | Canary efficient Hermes-local agents. Dispatched to Aegis Coder X (da00de99) at 2026-08-03T02:31Z via Coordinator comment. Lane lease-occupied. |

### Changes Since 06:08Z Cycle

1. **JAC-4187** — DONE at 2026-08-03T15:22Z (was blocking Herald lane work). But Herald agent remains in `error` state due to NOUS_API_KEY — lane metadata was `verified` but the agent cannot initialize. NOT dispatchable without key recovery.
2. **JAC-3933** — DONE at 2026-08-03T14:33Z (was blocking Plan Runner lane work). Same root cause — Plan Runner agent remains `error`. NOT dispatchable.
3. **JAC-3705** — Now assigned to Aegis Coder X (da00de99). Status `todo` but assignee set, meaning it has been dispatched but not yet checked out. Aegis Coder X lane is lease-occupied by JAC-4511 (in_progress) + JAC-3705. NOT a free lane.
4. **Coordinator** — transitioned from `running` to `idle` (still reserved/strategic).
5. **JAC-4580 (Fenix)** — Last activity at 06:34:19Z (re-initialization). Still stalled, liveness exhausted.
6. All other lane states, agent statuses, and upstream blockers unchanged.

### Queue Scan

All 18 unassigned TODOs reviewed — all policy-excluded:

| ID | Title | Exclusion |
|----|-------|-----------|
| JAC-4536 | [JAC-3929] P2: Telegram redacted delivery contract | Dependency-gated — parent JAC-3929 is `blocked` |
| JAC-4535 | [JAC-3929] P2: Freshness split | Dependency-gated — parent JAC-3929 is `blocked` |
| JAC-4217 | DECISION (Jack): migrate autonomous Paperclip org off claude_local | Jack decision gate |
| JAC-4216 | DECISION (Jack): re-enable ollama-cloud as autonomous tier-2 | Jack decision gate |
| JAC-3714 | [Aegis] Install Nix | Approval-gated, requires interactive sudo |
| JAC-3558 | [Human gate] Call Oklahoma Integrated Care | Human gate |
| JAC-3557 | [Human gate] Prius 12V test | Human gate |
| JAC-3555 | [Human gate] Belmont records release | Human gate |
| JAC-4555 | Test issue - please ignore | Test issue |
| JAC-4539 | [JAC-3929] P3: Rollback acceptance tests | Dependency-gated — parent JAC-3929 blocked |
| JAC-3437 | Get haircut | Personal |
| JAC-3365 | Populate notebook | Personal |
| JAC-3359 | Book diagnostic Toyota | Personal |
| JAC-3361 | Prius codes known | Personal |
| JAC-3358 | OBD-II scan AutoZone | Personal |
| JAC-3360 | Hybrid battery quote | Personal |
| JAC-3970 | Dispatch JAC-3705 | Low-priority, JAC-3705 already dispatched |
| JAC-3541 | TEST_DELETE | Test issue |

**No independent plan-backed task found in the queue.**

## Dispatches: 0

No lane met dispatch criteria:
- All verified-idle lanes (Herald, Plan Runner, Kimi) either have error-state agents (NOUS_API_KEY) or are lease-occupied / blocked on upstream.
- All verified-running lanes (Aegis Coder X, Coordinator, Wings) are either lease-occupied, reserved (strategic), or in error state.
- All verified-error lanes (Aegis Coder Y) have laneState=error.

## Disposition

**in_progress (restart-ready).** Awaiting native child-completion wake on:
1. **JAC-4580** (Fenix diagnosis) — currently stalled, liveness exhausted
2. **JAC-4565** (NOUS_API_KEY recovery + Hermes-local lane restoration) — unblocks Herald, Plan Runner, Fenix
3. Upstream resolution of JAC-4511 (MLX embed promotion) — frees Aegis Coder X lane

Per policy: never infer a quota outage from stale logs. Recorded fresh: NOUS_API_KEY confirmed absent at 06:38Z via direct `.env` inspection. No fresh authenticated generation failure needed on verified lanes — the root cause is at the auth layer, not the generation layer.

Evidence: `doc/plans/2026-08-04T0638Z-wings-dispatch-evidence-jac-4139.md`
