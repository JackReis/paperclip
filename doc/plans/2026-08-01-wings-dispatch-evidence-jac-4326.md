# JAC-4326 — Coordinator Fleet Coordination Check — Dispatch Evidence

**Heartbeat run:** 2a30b44b-b4ba-44e0-bd80-7d26b9e7319a (Wings / hermes_local)
**Timestamp:** 2026-08-01T18:56Z
**Live Paperclip API:** http://127.0.0.1:3101/api (git d3610f2e7, v2026.626.0)

## Lane Inventory (live agent table, metadata.executionLane)

| Agent | Pool | Lane State | Agent Status | Active Run | Routable? |
|-------|------|-----------|--------------|------------|-----------|
| Wings | ollama-cloud | **reserved** | running | null | NO — reserved strategic gateway, excluded |
| Herald | claude-code | **verified** | idle | null | YES — free seat (1/2 in pool) |
| Plan Runner | claude-code | verified | running | JAC-3666 active (running) | NO — occupied (pool seat 2/2) |
| Paperclip Agent Auditor | codex | **quota_blocked** | error | null | NO — quota until Aug 4 |
| Hermes Mistral | ollama-cloud | **paused** | paused | null | NO — manual pause |
| Kimi Code via Ringer | independent-review | verified | error | null | NO — Ringer receipt ENOENT |
| Flash | ollama-cloud | **pending_repair** | idle | null | NO — event-loop-closed defect |
| Aegis Coder X | local-aegis | verified | error | null | NO — process lost, stale |
| Aegis Coder Y | local-aegis | **error** | idle | null | NO — timed out |

## Capacity Analysis

- **Claude Code pool (maxParallel=2):** 1 seat occupied by Plan Runner (active run JAC-3666). Herald is verified + idle. **1 free seat.**
- **Ollama Cloud pool:** Wings (reserved), Hermes Mistral (paused), Flash (pending_repair). **0 routable.**
- **Codex pool:** Paperclip Agent Auditor (quota_blocked). **0 routable.**
- **Local-aegis pool:** Aegis Coder X (error/process lost), Aegis Coder Y (error/timeout). **0 routable.**
- **Independent-review:** Kimi Code via Ringer (error/receipt missing). **0 routable.**
- **External fast lane:** No verified lane configured. **0 routable.**

## Correction to prior comment claims

The 18:42Z comment claimed "all 4 verified lanes occupied by live runs." Live re-verification shows:
- Herald (claude-code) is verified + idle with no active run — **FREE seat**, not occupied.
- Aegis Coder X and Kimi Code via Ringer are in `error` state, not `running` — not live runs.

## Dispatch

**Selected candidate:** JAC-3716 — "[Talaris] Baseline the existing Nix install as the parity reference"
- Pool: claude-code (Herald's lane)
- Priority: medium
- Status: todo, unassigned, unblocked
- Plan-backed: parent is JAC-3713 (Nix scoped adoption)
- Visible/fleet-facing: yes (Talaris Nix baseline for Aegis parity)
- Not credential-bound, not externally destructive, not a human gate
- Herald's allowedWork: read-only, implementation, review — JAC-3716 is read-only ✓
- SSH to Talaris verified: Nix 2.34.6 installed, nix-darwin absent, `/run/current-system` absent

**Action taken:** PATCH /issues/fe839eb0-... → assigneeAgentId = Herald (a1e8cb0d-9132-4b3b-b7a3-8b53cdb10708). Verified on live API.

## Dispatch Follow-up (Herald execution)

Herald (claude-code, verified, idle) checked out JAC-3716 at 2026-08-01T18:56:08Z, created a git worktree branch `JAC-3716-talaris-baseline-…`, and shipped:
- `ops/nix-parity/talaris-nix-baseline-capture.sh` — strictly read-only capture harness (syntax-checked, grep-verified: no install/remove/activate/mutate commands).
- `ops/nix-parity/JAC-3716-talaris-nix-baseline.md` — baseline document pre-seeded with known facts and structured tables mapping to harness output.

**First-class blocker recorded:** JAC-3716 is `blocked` — Herald's Aegis lane denies `ssh talaris` per host policy (denied even with sandbox disabled), with no interactive approver on an autonomous heartbeat. **No Talaris state was touched.**

**Unblock owner + action:** Jack — (a) run `bash ops/nix-parity/talaris-nix-baseline-capture.sh > ops/nix-parity/talaris-nix-baseline-$(date +%Y%m%d).txt` on Talaris (login shell) and commit output; or (b) grant this Aegis lane read-only `ssh talaris` and re-wake Herald. This is a JAC-3716 follow-up issue, not a JAC-4326 blocker.

## Queue

- 41 total TODO issues
- 22 unassigned + unblocked TODO candidates
- After filtering (excluding human gates, credential-bound, externally destructive, review, dependent, duplicate coordinator checks): 2 fleet-facing candidates for Herald: JAC-3716 (selected), JAC-3715 (depends on Nix on Aegis, follow-up)

## Final Disposition: done

0 dispatches to other lanes (no other free verified lanes). 1 dispatch to Herald for JAC-3716 — assignment verified on live API. Herald completed all lane-capable work and left a properly-attributed first-class blocker. Issue status updated to `done`.
