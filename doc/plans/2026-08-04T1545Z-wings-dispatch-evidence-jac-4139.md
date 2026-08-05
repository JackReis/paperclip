# JAC-4139 Cycle 2026-08-04T15:45Z — Fresh Live Re-Verification

**Run:** 57541198-27c9-47e7-95c1-d20ddbdd36e8 (Wings, hermes_local)
**Paperclip API:** http://127.0.0.1:3101 (v2026.722.0, deploymentMode=local_trusted)
**Paperclip git:** 40c9d98c0 (branch JAC-3679-build-reusable-report-kit-template)
**Method:** authenticated GET /api/companies/87c32b8e.../agents + GET issue detail + env inspection
**Wall clock at read:** 2026-08-04T15:45:43Z

## Acknowledged Wake
Comment 68b9649c (14:59Z, local-board) summarizing cycle 20:45Z (0 dispatches, queue exhausted) and reporting root cause: NOUS_API_KEY absent from the Wings execution environment, blocking Herald + Plan Runner (both provider=nous/model=poolside/laguna-s-2.1:free). The wake's supporting evidence doc is `doc/plans/2026-08-04T2045Z-wings-dispatch-evidence-jac-4139.md`. Per protocol, performed an independent fresh live re-verification.

## Lane State — Fresh Live Read (15:45Z)

`executionLane` lives under `metadata.executionLane` on each agent record.

| Agent | status | errorReason (live) | lane.state | model | maxPar | dispatchable? |
|---|---|---|---|---|---|---|
| Wings (self) | running | Traceback (most recent call last): | verified | nous/poolside/laguna-s-2.1:free | 4 | NO — reserved (strategic) |
| Coordinator | idle | none | verified | nous/poolside/laguna-s-2.1:free | 2 | NO — reserved (strategic) |
| Herald | **error** | Traceback (most recent call last): | verified | nous/poolside/laguna-s-2.1:free | 2 | NO — error root cause below |
| Plan Runner | **error** | Process lost -- child pid 98149 is no longer running | verified | nous/poolside/laguna-s-2.1:free | 2 | NO — occupied + error |
| Aegis Coder X | idle | none | verified | ollama/qwen3-coder:30b | 1 | NO — at capacity (3 leased, maxParallel=1) |
| Aegis Coder Y | idle | none | error | ollama/qwen3-coder:30b | 1 | NO — lane state=error |
| Hermes Mistral | paused | none | paused | deepseek-v4-pro | 1 | NO — paused |
| Flash | running | none | pending_repair | deepseek-v4-flash | 1 | NO — pending_repair |
| Kimi Code via Ringer | idle | none | error | — | — | NO — lane error |
| Luna High Planner | idle | none | — | — | — | NO — no executionLane |

## Pool Capacity (live)
| Pool | Capacity | Available | Reason |
|---|---|---|---|
| local-aegis | 5 | 0 | Herald error (NOUS_API_KEY), Plan Runner error+occupied, Coder X at capacity, Coder Y lane=error |
| ollama-cloud | 2 | 0 | Mistral paused, Flash pending_repair |
| independent-review | 0 | 0 | Kimi lane=error |

0 dispatchable lanes.

## Root Cause (confirmed live at 15:45Z)

**1. NOUS_API_KEY absent from the Wings execution environment.** Herald and Plan Runner both bind
provider=nous / model=poolside/laguna-s-2.1:free. `env` inspection confirms NOUS_API_KEY is
UNSET in this run's environment. Herald's live `errorReason` is the start of a Python traceback
("Traceback (most recent call last):"), truncated at 100 chars by the API — consistent with adapter
init failure (HTTP 401/402 upstream). This is a credential/infrastructure gap, NOT a quota outage.

Tracking issue is **JAC-4604** (id f8be6082-12a2-4eb1-bdce-4601265167a3, todo, assigned to Wings 80284e06 — "[JAC-4575-3] Fix: Restore NOUS_API_KEY or remove NOUS from f..."). The wake's attribution to JAC-4604/execRun=f39be63a is confirmed correct via the assigneeAgentId list endpoint; JAC-3671 (the Aegis-assigned "Restore Talaris anthropic + mistral credentials", done today 13:48Z) is a SEPARATE prior task, not the present NOUS_API_KEY gap. Per contract Wings does NOT alter credentials — the unblocking action is board-level provisioning of NOUS_API_KEY into the Wings execution environment (JAC-4604), or removal of the NOUS provider from the lane model.

**2. Plan Runner also `Process lost -- child pid 98149 is no longer running`.** Distinct symptom
from Herald but same provider/model, so the same NOUS_API_KEY deficit is the likelier proximate
cause (child process init failed and crashed out of the lane).

**3. Coder X at capacity.** 3 in_progress issues carry active execRuns but maxParallel=1; lane
is occupied, not spare capacity.

## Queue Scan
The identifier-search endpoint (/api/companies/{cid}/issues?identifier=JAC-{n}) is untrustworthy
here: it returns a DIFFERENT issue than queried (known Paperclip false-positive per OH memory
fact holograph #2914). Confirmed: JAC-3671 search returns JAC-3671 first, but `?identifier=4139`
returns JAC-3671, JAC-3929, JAC-2447 as head hits — routing-by-identifier is not authoritative.
Authoritative state requires UUID-scoped detail endpoints. This is noted as a fleet-tooling
reliability finding; see below.

## Verified Findings vs. Wake Comment
- Wake 20:45Z doc claims Herald `status=idle, errorReason none`. Live read at 15:45Z (next cycle)
  shows Herald `status=error, errorReason=Traceback...`. Herald degraded between the wake cycle
  and this heartbeat — a real state change, not a contradiction worth ignoring.
- Wake doc references JAC-4604 with execRun=f39be63a. That mapping is confirmed correct (JAC-4604 = id f8be6082, todo, assigned to Wings 80284e06 — the NOUS_API_KEY recovery task). The stale-mapping note in the prior doc version was an error; JAC-3671 is a separate, already-closed Aegis task.

## Disposition
0 dispatches. Queue exhausted. The single unblocking path (NOUS_API_KEY provisioning for the
nous/poolside/laguna-s-2.1:free provider on Herald + Plan Runner) is board-level and not
agent-fixable; the cred task JAC-4604 (f8be6082, todo, assigned to Wings) is the live tracking
issue. Remainder: in_progress (restart-ready), awaiting either (a) board-level re-provisioning of
NOUS_API_KEY (re-instantiating Herald + Plan Runner lanes), or (b) Coder X capacity freeing
(JAC-4603/4610/4606 completion), or (c) native child-completion wake on an upstream blocker
resolving. Fallback schedule remains secondary liveness, not a dispatch path.

## Reliability Notes (fleet tooling)
- `herdr list` is not a valid command in this environment (unknown command). Workspace-manager
  routing assumed by prior run logs is not available as documented.
- `/api/auth/whoami` returns "API route not found" — bearer-key owner cannot be self-confirmed
  via API; identity is inferred from PAPERCLIP_AGENT_ID=80284e06.
- Identifier search endpoint routes by substring and returns wrong head issue; UUID-scoped
  GET /api/companies/{cid}/issues/{uuid} is authoritative.
