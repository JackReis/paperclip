# 2026-08-03T08-07Z Dispatch Evidence — JAC-4139 (run db167d83)

## Verification method
Fresh authenticated live API reads on Paperclip v2026.722.0:
- `GET /api/companies/87c32b8e.../agents` (bearer = Wings)
- `GET /api/companies/87c32b8e.../issues?status=todo&limit=500`
- `GET /api/companies/87c32b8e.../issues?status=in_progress&limit=500`
- `GET /api/issues/{uuid}` for each candidate

## Live runs at cycle start
| Run ID   | Agent                  | Issue        | State                                   |
|----------|------------------------|--------------|-----------------------------------------|
| db167d83 | Wings (self)           | JAC-4139     | running (this run)                      |
| b2d06856 | Herald                 | JAC-0cefb63c | (stale name; actual issue unassigned)   |
| 13f1203e | Wings                  | JAC-4000     | queued backlog                          |
| d00ec8de | Wings                  | on-demand    | queued backlog                          |

## Lane / pool state (fresh, from metadata.executionLane)

### Free & verified-idle
- **Claude Code (Herald a1e8cb0d)** — pool=claude-code, model=claude-opus-4-8, state=verified, maxParallel=1, transport=omnigent. Status=idle. **0 issues currently assigned** (cleared since 07:53Z snapshot).
- **Claude Code (Plan Runner 2c6b1cc9)** — pool=claude-code, model=claude-opus-4-8, state=verified, maxParallel=1, transport=omnigent. Status=idle. **0 issues currently assigned** (cleared since 07:53Z snapshot).
- **Independent Review (Kimi Code via Ringer 3f1712eb)** — pool=independent-review, k3, state=verified, maxParallel=1. Status=idle. Assigned JAC-3596 (exact-SHA HOLD gate verification) — **but JAC-3596 blockedByIssueIds=[] in API**; however per issue description it is blocked on Luna JAC-3592/3593/3594 (in_progress). Treated as dependency-blocked per issue-thread description.

### Excluded (not capacity)
- **Local Aegis / Coder X (da00de99)** — lane=verified, pool=local-aegis, state=verified, BUT agent.status=error ("Timed out after 12000s"); host P89 gate applies. Not dispatched.
- **Local Aegis / Coder Y** — lane=error.
- **Ollama Cloud / Wings (80284e06)** — reserved (strategic). excluded.
- **Hermes Mistral** — paused (manual). excluded.
- **Flash (b37f4d70)** — pool=ollama-cloud, state=pending_repair (MCPServerTask event-loop-closed defect). excluded.
- **Omnigent / Fable (f1ef5e14)** — status=error ("Traceback (most recent call last)"). excluded.
- **Pi (763e018c)** — openclaw_gateway, pendingOperatorPrereqs (gateway token mismatch). excluded.
- **Klaw (d216ee6e)** — status=error (No API key for anthropic). excluded.
- **Forge (0b902be0)** — status=error (last heartbeat 2026-08-01). excluded.
- **Codex Auditor** — not present in current agent table (was quota_blocked in 07:53Z snapshot); confirmed absent.
- **Scout (c093061e)** — paused. excluded.
- **Operator (a5d0eb09)** — status=error. excluded.

## Unassigned todo candidate pool (all unassigned to both agent and user)

| Issue    | Priority | blockedByIssueIds | Plan-backed? | Disposition |
|----------|----------|-------------------|--------------|-------------|
| JAC-3671 | critical | [] | No  | **Credential-bound** — "Restore Talaris anthropic + mistral credentials". Policy-excluded (secrets/credentials). |
| JAC-4501 | high     | [] | No  | **Self-review** — "Review productivity for JAC-4000". Policy-excluded (self-authored artifact review, no reviewer). |
| JAC-4500 | high     | [] | No  | **Self-review** — "Review productivity for JAC-4139". Policy-excluded. |
| JAC-3714 | high     | [] | No  | **Approval-gated / non-autonomous** — "[Aegis] Install Nix (approval-gated; requires interactive sudo)". Blocked on Jack/human gate. |
| JAC-4511 | medium   | [] | No  | **Strategic/OB1 production** — "promote MLX embed lane to OB1 production". Requires production rollout gate; no explicit plan doc. Treated as dependent on JAC-4505. |
| JAC-3437 | medium   | [] | No  | **Human-gate** — "Get haircut from Danny in Ardmore this week". Physical/service action, not Paperclip-dispatchable. |
| JAC-3365 | medium   | [] | No  | **Human-gate** — notebook population. No plan doc. |
| JAC-3359..3361, JAC-3358, JAC-3360 | medium | [] | No | All **Prius-related human-gate** tasks (JAC-2447 lifecycle). Physical repair actions requiring human execution. |
| JAC-3970 | low      | [] | No  | **Dispatch meta-task** — "Dispatch JAC-3705 to local-ae". Circular/meta; no independent work. |
| JAC-3541 | low      | [] | No  | **TEST_DELETE** — test artifact, excluded. |

## Upstream blockers (confirmed via live API, status unchanged from 07:53Z)
- **JAC-3933** (ac15a19c) — status=in_review. Blocks Herald candidate chain. (Note: identifier-substring search returns stale JAC-2447; UUID-scoped GET confirms in_review.)
- **JAC-4388** (4954a59f) — status=todo, assigneeUserId=local-board. **Jack approval gate** ("[board action] Repair Fable executionLane + authorizationPol"). Blocks Plan Runner chain (JAC-3629 → JAC-3628).
- **JAC-3592/3593/3594** (46839114 / 8b616780 / feacb699) — status=in_progress, assigneeAgentId=2f92499a (Luna High Planner). Blocks Kimi via JAC-3596.

## Fresh generation-failure check on verified lanes
No fresh authenticated generation failure observed on Herald, Plan Runner, or Kimi Code lanes since 07:53Z. All remain verified/idle. No stale-log inference used.

## Dispatch decision
**0 dispatches.** Queue exhausted.

### Rationale
1. All 3 free verified-idle lanes (Herald, Plan Runner, Kimi Code) have no assignable unblocked independent task. Herald and Plan Runner have zero assigned issues as of this fresh read. Kimi's assigned issue (JAC-3596) is blocked upstream on Luna JAC-3592/3593/3594 despite API showing empty blockedByIssueIds (issue-thread description confirms dependency).
2. No unassigned todo in the candidate pool is both (a) plan-backed and (b) free of policy exclusion. The 7 unassigned todos that appear unblocked all fall into excluded categories: credential-bound (JAC-3671), self-review (JAC-4500/4501), human-gate/approval-gate (JAC-3714, JAC-3358-3361), or strategic dependent (JAC-4511).
3. No new upstream blocker has cleared since the 07:53Z cycle. JAC-3933 still in_review; JAC-4388 still at Jack approval gate; Luna tasks still in_progress.
4. No fresh generation failure observed — no verified lane held on stale-log inference.

## Liveness path
Native Paperclip child-completion continuation. Awaiting upstream resolution on JAC-3933 / JAC-4388 / JAC-3592-3594 to wake JAC-4139. Disposition: in_progress (restart-ready). Fallback schedule: standard Paperclip heartbeat cadence.

## Time
Cycle executed at 2026-08-03T08:07:46Z. Run ID: db167d83-c863-4cc3-acd9-69117f80536b.
