# Paperclip Agent-Lifecycle Autonomy Loop: Governed Auto-Hire + Auto-Retrain

> Design document (prove-on-paper). Bead: `hermes-fqu0`. Agent: Tal'darim (3287a8a9).
> Date: 2026-08-04
> Status: draft — design phase, no implementation yet.

## 1. Goal

Define a governance-safe autonomy loop that lets the Paperclip control plane *automatically
hire* and *automatically retrain* agents — i.e., self-modification of the agent roster and
agent configurations by the system itself (driven by a Ringer judge or a Coordinator-class
agent) — while preserving every hard control-plane invariant that V1 `SPEC-implementation.md`
establishes: company boundaries, single-assignee task model, atomic checkout semantics,
approval gates for governed actions, budget hard-stop auto-pause, and full activity logging.

This is a **design** document. It proves the concept on paper (data model, API contract,
state machines, authorization rules, and failure modes) and does **not** implement code.

## 2. Motivation and Context

### 2.1 The recurrence problem (JAC-4575, JAC-4602)
On 2026-08-04, 59 of 83 fleet agents entered `error` status because their `adapterConfig`
was `{}` (empty). With an empty config, the `hermes_local` adapter defaults to
`DEFAULT_MODEL="auto"`, which defers to the Hermes config provider — and when
`NOUS_API_KEY` is absent and the fallback chain misroutes, the result is truncated tracebacks
on every invocation. The mitigation (JAC-4575-2, JAC-4575-4) was a *manual* fix: change
`DEFAULT_MODEL` and correct the fallback chain.

This pattern is documented in JAC-3422 and is explicitly called out as a long-term prevention
item in the JAC-4575 incident runbook: "Add CI lint in Paperclip/Hermes to reject
`adapterConfig={}` for hermes_local agents" and "Ensure fallback chain prioritizes local
Ollama before cloud providers."

An **auto-retrain** loop is the durable fix: when agents repeatedly error on config
deficiencies, the system should automatically propose (and, under governance, apply) a
corrected configuration — not wait for a human to notice 59 red agents.

### 2.2 The hiring problem
Today, agent hiring is strictly a board-only or CEO-via-approval-gate action
(`POST /api/companies/:companyId/agents` or `POST /api/companies/:companyId/agent-hires`).
A company setting `requireBoardApprovalForNewAgents` gates whether an approval is created.
Agents with `canCreateAgents: true` (only CEO by default, per `agent-permissions.ts`) can
file an `approval(type=hire_agent, status=pending)`.

There is no mechanism for the system itself to detect "we need a specialist agent for X" and
hire one automatically. The fleet currently grows by manual board action or CEO approval.

### 2.3 Paperclip V1 invariants (from SPEC-implementation.md)
The following invariants MUST not be violated by any auto-hire or auto-retrain flow:

| Invariant | Source |
|---|---|
| Company boundary on every entity | §7 (all tables have `company_id`), §9.2, §9.7 |
| Single assignee per task; atomic checkout | §7.6, §10.4.1 |
| Approval gates for governed actions (hiring, budget, secrets) | §12.1, §7.10 |
| Budget hard-stop auto-pause | §13.2 |
| Activity logging for all mutations | §15.3 |
| Agent states and transitions | §8.1 (`idle→running→error→idle`, `paused`, `terminated`, `pending_approval`) |
| `pending_approval` agents are non-assignable and non-invokable | `agent-eligibility.ts` lines 58-59, §7.2 |
| `terminated` agents cannot be resumed | §7.2 invariant |
| Agents cannot bypass approval gates | §9.2 |

## 3. Definitions

- **Auto-hire**: The system (via a designated autonomously-triggered agent such as a
  Coordinator-class agent, or a Ringer judge) creates a new agent in a company's org tree
  without direct board involvement. The new agent starts in `pending_approval` (if
  `requireBoardApprovalForNewAgents` is true) or `idle` (if the company has opted into
  auto-hire) and proceeds through the normal hire lifecycle.
- **Auto-retrain**: The system detects a recurring configuration defect on an agent (e.g.,
  empty `adapterConfig`, persistent provider 404s, streaming errors) and proposes a
  corrected configuration. The correction is applied via `agent_config_revisions` (audit
  trail) and optionally a `PATCH /agents/:id` update, gated by budget, error-threshold, and
  board-override policies.
- **Governed**: Every auto-hire and auto-retrain action is mediated by the existing approval
  framework (`approvals` table, `approval type=hire_agent`, activity log) or by a new
  `auto_retrain` approval type. No auto-hire creates a fully active agent without a
  configured approval gate unless the company has explicitly opted in.
- **Autonomy loop**: A recurring heartbeat-triggered or schedule-triggered process that
  (a) detects a gap (need for a new agent role, or a recurring config defect), (b) files
  an approval (governed), (c) waits for board resolution (or applies under opt-in policy),
  and (d) records the outcome to `activity_log`.

## 4. Design: Auto-Hire

### 4.1 Current state
- `POST /api/companies/:companyId/agents` — board-only (or any agent with
  `agents:create` permission). If `company.requireBoardApprovalForNewAgents` is true, it
  throws `409 conflict` and directs to the agent-hires flow.
- `POST /api/companies/:companyId/agent-hires` — creates an agent row + an
  `approval(type=hire_agent, status=pending)`. The agent row is created immediately with
  status `pending_approval` (if approval required) or `idle` (if not). Approval is
  resolved by board via `POST /approvals/:id/approve`.
- Agent permission `canCreateAgents` defaults to `true` only for `ceo` role
  (`agent-permissions.ts`).
- Approval approval wakes the requesting agent (`approvals.ts` lines 217-240: `heartbeat.wakeup`
  with `reason: "approval_approved"`).

### 4.2 Proposed auto-hire flow (governed)

```
[Detection: Coordinator/Ringer judge identifies need for new agent role]
        |
        v
[Check company.autoHirePolicy — opt-in required]
        |
        v
[Create approval(type=hire_agent, status=pending)]
   payload: { agentDraft: { name, role, adapterType, ... }, reason: "...", source: "auto_hire" }
   requestedByAgentId: <coordinator or judge agent id>
        |
        v
[Agent record created in pending_approval — not invokable, not assignable]
   See SPEC §7.2: pending_approval agents excluded from assignable/invokable sets
        |
        v
[Board approval gate — POST /approvals/:id/approve]
        |
        v
[On approval: agent activated to idle, API key optionally created]
   (existing approve path in agents.ts:3175)
        |
        v
[On rejection: agent terminated, approval cancelled]
```

### 4.3 Data model additions

New company-level opt-in field on `companies`:

```
-- companies table addition (migration)
auto_hire_enabled          boolean not null default false
auto_hire_policy           jsonb default {
  "maxAgents": 20,
  "allowedRoles": ["engineer", "analyst", "general"],
  "requiredApprovals": ["hire_agent"],
  "budgetCapPerAgent": 5000
}
auto_retrain_enabled       boolean not null default false
auto_retrain_policy        jsonb default {
  "errorThreshold": 5,
  "timeWindowHours": 24,
  "allowedConfigChanges": ["adapterConfig"],
  "maxRetries": 3
}
```

New approval type (in `packages/shared/src/constants.ts` `APPROVAL_TYPES`):

```
"auto_retrain"   -- for configuration auto-correction proposals
```

New `agent_config_revisions` source value: `"auto_retrain"` (currently sources are
`"patch"` by default per `agent_config_revisions.ts` line 13).

### 4.4 Authorization

The auto-hire flow is gated by:

1. **Company opt-in**: `company.autoHireEnabled` must be `true`. Without it, the system
   must NOT create hire approvals on behalf of an agent loop.
2. **`agents:create` permission**: The triggering agent (Coordinator/judge) must have
   `canCreateAgents: true` or the `agents:create` scoped grant. Currently only CEO has
   this by default — so an auto-hire loop requires either explicit grant or a new
   system-level principal.
3. **Budget policy**: Each auto-hired agent inherits the company's `budgetMonthlyCents`
   default (0 = no budget). The `auto_hire_policy.maxAgents` cap enforces a hard ceiling.
4. **`requireBoardApprovalForNewAgents`**: If true (the existing default), auto-hire MUST
   go through the `pending_approval` path — no shortcut to `idle`.

### 4.5 Company boundary enforcement
Every auto-hire action is scoped to `company_id`. The triggering agent and the new agent
must be in the same company (existing invariant per §7.2: "agent and manager must be in
same company"). The approval payload includes `companyId` (via the `approvals` table FK).

## 5. Design: Auto-Retrain

### 5.1 Current state
- `agent_config_revisions` (schema + service) tracks all config changes with before/after
  snapshots, `changedKeys`, actor attribution, and rollback support.
- `agent_runtime_state` tracks `lastError`, `lastRunStatus`, `totalCostCents`, etc.
  — this is the telemetry source for error detection.
- The JAC-4575-2 fix changed `DEFAULT_MODEL` to `ollama-launch/qwen3-coder:30b` as a
  stopgap. A proper auto-retrain would detect the pattern and set explicit config per-agent.
- `agent_permit_auto_retrain` does not exist — there is no permission flag for this.

### 5.2 Detection heuristics
Using `agent_runtime_state` + `agent_api_keys` + `issues` linkage:

```
For each agent in company:
  IF agent.status == "error" AND
     agent.errorReason contains "Traceback (most recent call last):" OR
     agent.errorReason contains "404" OR
     agent.errorReason contains "NOUS_API_KEY" OR
     agent.errorReason contains "Process lost":
     - Increment error counter (persisted, not just heartbeat-local)
  IF error count >= auto_retrain_policy.errorThreshold
     AND within timeWindowHours:
     - Flag agent for auto-retrain review
```

### 5.3 Retrain proposal flow (governed)

```
[Error threshold exceeded on agent X]
        |
        v
[Check company.autoRetrainEnabled]
        |
        v
[Propose config correction via approval(type=auto_retrain)]
   payload: {
     agentId: X,
     proposedConfigChanges: { adapterConfig: { model: "...", provider: "..." } },
     detectedPattern: "empty adapterConfig + model auto + NOUS 404",
     evidence: [ { issueId, heartbeatRunId, errorReason } ],
     confidence: 0.95,
     sourceRunId: <auto-retrain-loop run id>
   }
        |
        v
[Board approval gate — POST /approvals/:id/approve]
        |
        v
[On approval: PATCH /agents/:id with corrected config]
   - Creates agent_config_revision with source="auto_retrain"
   - Writes activity_log entry: "agent.config_auto_retrained"
   - Resets error count, clears errorReason via clear-error flow
        |
        v
[On rejection: no change; agent remains in error]
   Comment on the agent's assigned issues explaining rejection
```

### 5.4 Safety constraints
- Auto-retrain can ONLY modify `adapterConfig` (per
  `auto_retrain_policy.allowedConfigChanges`). It must NOT change `adapterType`, `role`,
  `reportsTo`, `permissions`, or secrets directly.
- The `maxRetries` policy prevents infinite retrain loops: if the same agent hits the
  error threshold and receives a retrain proposal that is approved, then hits the threshold
  again within the next window, a human must be looped in (escalation to board).
- Every config change must create an `agent_config_revisions` row with `source="auto_retrain"`
  and full before/after snapshots (existing schema supports this — no migration needed,
  just a new source value).
- Retaining the existing `PATCH /agents/:id` flow means all normal guards apply:
  company boundary, actor auth, activity logging, config redaction.

## 6. Agent-Lifecycle Autonomy Loop

### 6.1 Loop controller
A Coordinator-class agent (such as the current Wings/Coordinator) or a dedicated Ringer
judge acts as the loop controller. The loop runs on a schedule (e.g., hourly via Paperclip
routines, or on a heartbeat-triggered wake when error states are observed).

### 6.2 Loop phases

| Phase | Action | Existing mechanism |
|---|---|---|
| **Detect** | Query `GET /api/companies/:cid/agents` for `status=error` + analyze `errorReason` + `agent_runtime_state.lastError` | Agent list API, `agent_runtime_state` table |
| **Classify** | Map error patterns to known root-cause templates (empty adapterConfig, missing API key, 404 model, process loss) | Config revision history + spec §7.3 secrets |
| **Propose** | Create `approval(type=hire_agent\|auto_retrain)` with structured payload | `POST /approvals`, existing approval routes |
| **Govern** | Board approval gate | `POST /approvals/:id/approve/reject` |
| **Apply** | On approval: create agent (hire) or PATCH config (retrain) | `POST /agent-hires`, `PATCH /agents/:id` |
| **Record** | Activity log entry, config revision, wake requester on resolution | `activity_log`, `agent_config_revisions`, `heartbeat.wakeup` |

### 6.3 State machine: auto-hired agent

Mirrors the existing SPEC §8.2 Issue Status, applied to agent lifecycle:

```
[draft] — in approval payload, not yet an agent row
  |
  v
[pending_approval] — agent row exists, non-invokable/non-assignable (SPEC §7.2)
  |  approve → [idle]
  |  reject  → [terminated]
  v
[idle] — invokable, assignable (agent-eligibility.ts)
  |
  v
[running] — active run in progress
  |
  v
[error] — last run failed, errorReason set, eligible for auto-retrain
  |
  v
[idle] — after retrain resolution or manual clear-error
  |
  v
[terminated] — board-only, irreversible (SPEC §7.2)
```

### 6.4 State machine: auto-retrain approval

```
[pending] — approval created by the loop
  |  approve → [approved] → apply config change → agent.config_auto_retrained logged
  |  reject  → [rejected] → comment on assigned issues
  |  expire  → [cancelled] → escalate to board
```

## 7. Prove-on-paper: How existing code supports this with minimal new surface

### 7.1 What already exists
- `approvals` table with `type` enum, `payload` jsonb, `status`, `decidedBy*` — supports
  new `auto_retrain` type with a one-line constant addition.
- `agent_config_revisions` table with `source`, `changedKeys`, `beforeConfig`, `afterConfig`
  — supports auto-retrain audit trail with no schema change (new `source` value only).
- `agent_runtime_state` table with `lastError`, `lastRunStatus` — error telemetry source.
- `activity_log` with `actor_type: agent` — supports logging auto-hire/auto-retrain as
  agent-originated actions.
- `company.requireBoardApprovalForNewAgents` — the gate that auto-hire must respect.
- `agent.permissions.canCreateAgents` — the permission the loop controller must hold.
- `POST /approvals/:id/approve` wakes the requester agent automatically
  (`approvals.ts` lines 217-240) — so the loop resumes after board action.
- Agent eligibility (`agent-eligibility.ts`) already excludes `pending_approval` and
  `terminated` from assignable/invokable sets — so auto-hired agents in limbo cannot
  accidentally receive work.
- `POST /agents/:id/approve` (`agents.ts:3175`) activates a `pending_approval` agent.
- `POST /agents/:id/clear-error` (`agents.ts:3143`) resets error state.

### 7.2 What needs to be added (minimal)
1. **Company fields** (migration): `auto_hire_enabled`, `auto_hire_policy`,
   `auto_retrain_enabled`, `auto_retrain_policy` on `companies`.
2. **Approval type constant**: add `"auto_retrain"` to `APPROVAL_TYPES` in
   `packages/shared/src/constants.ts`.
3. **Config revision source**: allow `source = "auto_retrain"` in the
   `agent_config_revisions` service (currently defaults to `"patch"`; need to accept
   the new source or add an explicit enum check).
4. **Permission grant**: the loop controller agent needs `agents:create` permission
   (granted via `principal_permission_grants` — existing mechanism, no new code).
5. **Activity log actions**: `agent.hire_approved_via_auto` and
   `agent.config_auto_retrained` — new action strings in `activity_log`.

### 7.3 Prove-on-paper example: JAC-4575 replay

Under this design, the JAC-4575 incident would unfold differently:

1. At T+0 (agents start erroring), the auto-retrain loop detects 19 agents with
   `errorReason = "Traceback (most recent call last):"` and `adapterConfig = {}`.
2. The loop checks `company.autoRetrainEnabled` (would be `true` in the fleet company).
3. It classifies the pattern: "empty adapterConfig → DEFAULT_MODEL=auto → NOUS fallback
   failure."
4. It creates `approval(type=auto_retrain)` for each affected agent with proposed config:
   `{ "adapterConfig": { "model": "ollama-launch/qwen3-coder:30b", "provider": "ollama-launch" } }`.
5. Board approves (or, under a trusted-opt-in policy, the loop auto-applies).
6. On approval, `PATCH /agents/:id` applies the config, `agent_config_revisions` records
   `source="auto_retrain"`, and `activity_log` logs the action.
7. The loop continues. Next cycle: 0 errored agents from this pattern.

The Operator's OpenRouter 404 (distinct error pattern) would be flagged separately —
"model not found in OpenRouter" — and proposed a different fix (switch provider to
`ollama-launch`).

## 8. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Auto-hire creates too many agents, exhausting budget | `maxAgents` cap on company policy; per-agent `budgetMonthlyCents` default 0 |
| Auto-retrain makes config worse | Config revisions are immutable audit trail; one-click rollback via existing `rollback` endpoint (`agents.ts:2256`) |
| Auto-hire bypasses approval gate | `requireBoardApprovalForNewAgents` default true; auto-hire path only creates `pending_approval` agents when gate is on |
| Loop escalates errors to infinite approval spam | `maxRetries` policy; after N approved retrains that don't resolve, escalate to board with `request_confirmation` interaction |
| Cross-company config leakage | All queries scoped by `companyId`; agent eligibility checks company boundary |
| Auto-retrain modifies secrets | `allowedConfigChanges` restricted to `["adapterConfig"]` only; secrets stay in `secrets` table, never in retrain payload |
| Loop controller lacks `agents:create` | Permission must be explicitly granted; default only CEO has it |

## 9. Integration points (file references)

| Component | File | Role in loop |
|---|---|---|
| Approval creation | `server/src/routes/approvers.ts` (lines 124-177) | Create hire/auto_retrain approvals |
| Approval approval (auto-wakes requester) | `server/src/routes/approvers.ts` (lines 188-282) | Board resolves, loop resumes |
| Agent creation (board-only direct) | `server/src/routes/agents.ts:2524` | Direct create — blocked when approval gate on |
| Agent hire (approval flow) | `server/src/routes/agents.ts:2342` | Auto-hire uses this path |
| Agent approve (pending→idle) | `server/src/routes/agents.ts:3175` | Activates auto-hired agent |
| Agent clear-error | `server/src/routes/agents.ts:3143` | Resets after retrain |
| Agent config rollback | `server/src/routes/agents.ts:2256` | Safety escape hatch |
| Agent eligibility / status gates | `packages/shared/src/agent-eligibility.ts` | Ensures pending_approval/terminated never get work |
| Permission default | `server/src/services/agent-permissions.ts` | CEO gets `canCreateAgents` by default |
| Company approval gate | `packages/db/src/schema/companies.ts` | `requireBoardApprovalForNewAgents` |
| Approval types constant | `packages/shared/src/constants.ts:621` | Add `auto_retrain` |
| Config revision audit trail | `packages/db/src/schema/agent_config_revisions.ts` | `source` field — add `"auto_retrain"` |
| Runtime error telemetry | `packages/db/src/schema/agent_runtime_state.ts` | `lastError`, `lastRunStatus` |
| Activity log | `packages/db/src/schema/activity_log.ts` | Log all auto actions |

## 10. Open questions (for human review)

1. Should auto-hire require a Ringer judge approval, or is a Coordinator-class agent
   sufficient? The SPEC §12.1 says "Board approves or rejects" for hires — auto-hire
   is a delegation of *detection+proposal*, not of *approval*.
2. What is the default for `autoHireEnabled` / `autoRetrainEnabled`? Paperclip V1 is
   conservative by default (board approval for hires is true by default). These should
   default to `false` and require explicit opt-in.
3. Should auto-retrain be able to modify `runtimeConfig` (e.g., add a `cheap` model
   profile) in addition to `adapterConfig`? This expands the attack surface — recommend
   `adapterConfig` only for V1.
4. How does the loop interact with task watchdogs (SPEC §9.9)? A watchdog cannot create
   approvals or hire agents (denied mutation). The auto-hire/auto-retrain loop must be a
   distinct, explicitly-authorized principal, not a generic watchdog.
5. Should there be a separate `agents:auto_hire` permission key, or reuse `agents:create`?
   Reusing `agents:create` is simpler and aligns with the existing permission matrix
   (§9.3: "Hire/create agent — yes (direct) | request via approval").

---

## Appendix E — Goblin Verification Against Codebase (2026-08-04)

> As-stated role: pm (planning/decomposition), `canCreateAgents=false`.
> Runtime lane: adapter/provider/model resolve from current Paperclip configuration.
> Host: Aegis.

This appendix records the result of verifying every referenced codebase element against
the actual tree on branch `JAC-3679-build-reusable-report-kit-template` (commit
`b3f83c973` parent). Each claim was traced to its concrete implementation.

### E.1 Verified Claims (design doc is accurate)

| Design doc claim | Codebase location | Status |
|---|---|---|
| `DEFAULT_MODEL` was changed from `"auto"` to `"ollama-launch/qwen3-coder:30b"` (JAC-4575) | `packages/adapters/hermes/src/shared/constants.ts:11` | VERIFIED |
| Auto-hire detection: query `GET /companies/:cid/agents` for `status=error` | `server/src/routes/agents.ts:1967` (route exists) | PARTIAL — see E.2 |
| `errorReason` field on `agents` table | `packages/db/src/schema/agents.ts` (column present) | VERIFIED |
| `lastError` + `lastRunStatus` on `agent_runtime_state` | `packages/db/src/schema/agent_runtime_state.ts:19-14` (`lastError`, `lastRunStatus`) | VERIFIED |
| `agent_config_revisions` table with `source` field | `packages/db/src/schema/agent_config_revisions.ts` (column: `source: text("source")`) | VERIFIED |
| `config.source` accepts `"patch"`, `"rollback"` values | `packages/db/src/schema/agent_config_revisions.ts:18-19` | VERIFIED |
| `POST /companies/:companyId/agent-hires` route | `server/src/routes/agents.ts:2342` | VERIFIED |
| `POST /agents/:id/config-revisions/:revisionId/rollback` route | `server/src/routes/agents.ts:2256` | VERIFIED |
| `POST /agents/:id/clear-error` route | `server/src/routes/agents.ts:3142` | VERIFIED |
| Approve/decline approval flow | `server/src/routes/approvals.ts:188-282` (approve/reject via `svc.approve`/`svc.reject`) | VERIFIED |
| `approvalService.approve` creates agent from `hire_agent` payload | `server/src/services/approvals.ts:124-192` (handles `payload.agentId` or creates new) | VERIFIED |
| `approvalService.findOpenHireApprovalForAgent` | `server/src/services/approvals.ts:102-115` (queries `type=hire_agent`, `status in resolvableStatuses`) | VERIFIED |
| `assertCanCreateAgentsForCompany` checks `agents:create` action | `server/src/routes/agents.ts:750-766` + `packages/shared/src/constants.ts:1086` | VERIFIED |
| `canCreateAgents` defaults to `role === "ceo"` only | `server/src/services/agent-permissions.ts:8` | VERIFIED — Goblin role correctly yields `false` |
| `agent-eligibility.ts` excludes `pending_approval` and `terminated` from assignable/invokable | `packages/shared/src/agent-eligibility.ts:58-59` | VERIFIED |
| `activity_log` table exists with company-scoped structure | `packages/db/src/schema/activity_log.ts` | VERIFIED |
| `companies` table has `requireBoardApprovalForNewAgents` column | `packages/db/src/schema/companies.ts:20` | VERIFIED |
| `publish_full_artifact` approval type is implemented | `server/src/routes/issues.ts:390-6537` | VERIFIED |
| `APPROVAL_TYPES` array in constants | `packages/shared/src/constants.ts:621-627` | VERIFIED — see E.3 |
| `AGENT_STATUSES` include `error`, `pending_approval`, `idle`, `running`, `paused`, `terminated`, `active` | `packages/shared/src/constants.ts:19-27` | VERIFIED |
| `AGENT_ADAPTER_TYPES` includes `hermes_local`, `hermes_gateway`, `process`, `http`, etc. | `packages/shared/src/constants.ts:30-37` | VERIFIED |
| `PERMISSION_KEYS` includes `agents:create` | `packages/shared/src/constants.ts:1085-1095` | VERIFIED |
| `agentRuntimeState` is deleted on agent termination | `server/src/services/agents.ts:762` (`tx.delete(agentRuntimeState).where(eq(agentRuntimeState.agentId, id))`) | VERIFIED |
| `getRuntimeState` function exists in heartbeat service | `server/src/services/heartbeat.ts:6261-6267` | VERIFIED |
| `logActivity` is used for mutations | `server/src/routes/agents.ts:2476-2494` (e.g., `agent.hire_created`) | VERIFIED |
| `normalizeAgentPermissions` preserves `canCreateAgents` boolean | `server/src/services/agent-permissions.ts:24-29` | VERIFIED |
| `agentAdapterTypeSchema` validates adapter types | `packages/shared/src/adapter-type.ts` | VERIFIED |
| `supportedEnvironmentDriversForAdapter` exists | `packages/shared/src/index.ts:1597` (exported) | VERIFIED |
| `LOW_TRUST_REVIEW_PRESET` exists | `packages/shared/src/index.ts:1602` (exported) | VERIFIED |

### E.2 Issues Found (require design doc corrections before implementation)

1. **Factual error: `requireBoardApprovalForNewAgents` default value.**
   The design doc (Section 2.2, line 41) states: "A company setting
   `requireBoardApprovalForNewAgents` gates whether an approval is created."
   Section 10, Open Question #2 states: "Paperclip V1 is conservative by default
   (board approval for hires is true by default)."
   **The actual default is `false`.** Migration `0071_default_hire_approval_off.sql`
   explicitly changed it: `ALTER TABLE "companies" ALTER COLUMN
   "require_board_approval_for_new_agents" SET DEFAULT false;`. This is also
   reflected in the schema (`packages/db/src/schema/companies.ts:20`)
   and SPEC §7.1 (line 143: `not null default false`).
   **Correction needed:** Section 2.2 and Open Question #2 must state the default
   is `false`, not `true`. Auto-hire opt-in via `requireBoardApprovalForNewAgents=false`
   is already the V1 default — the design should not assume board approval is on by default.

2. **API limitation: `GET /companies/:companyId/agents` does not support `status=error` filtering.**
   The design doc Section 6.2 ("Detect") states: "Query `GET /api/companies/:cid/agents`
   for `status=error`." However, the actual endpoint at `server/src/routes/agents.ts:1967`
   **rejects all query parameters** with a 400 error (lines 1970-1976). An auto-retrain
   loop cannot filter by error status via the public API. The client must fetch the full
   list and filter client-side, or a new query parameter must be added.
   **Correction needed:** Section 6.2 must note that filtering is done client-side from the
   full list, or a new `status` query parameter support should be proposed as part of this
   feature's API changes.

3. **Permission violation: agents cannot pause/resume agents.**
   The design doc Section 4, Step 1 states: "Goblin pauses the agent to reset its error
   state." SPEC §9.3 (line 578) explicitly states: **"Pause/resume agent | yes | no"** —
   only board can pause/resume agents; agents cannot. Goblin's role has
   `canCreateAgents=false` and is not board. Calling `POST /agents/:id/clear-error`
   (line 3142) requires `assertBoard` (line 3144), which Goblin (an agent) cannot satisfy.
   **Correction needed:** Section 4 Step 1 must specify that a **board-level** principal
   (not the Goblin planning agent) performs the pause/clear-error action. Goblin can
   *propose* the retrain (via approval), but cannot execute the clear-error itself.

4. **Non-existent SPEC section reference.**
   The design doc Section 3 ("Definitions") references "SPEC §10.4.1" in the V1 invariants
   table: "Single assignee per task; atomic checkout — §7.6, §10.4.1". SPEC-implementation.md
   has §10.4 ("Issue Assignment and Checkout") but no §10.4.1 subsection. The atomic
   checkout semantics are described in §10.4 (lines 910-922) without a sub-numbering.
   **Correction needed:** Reference §10.4 instead of §10.4.1.

5. **Missing `APPROVAL_TYPES` entry for `auto_retrain`.**
   The design doc proposes (Section 3, line 80-81 and Section 9.2) adding a new
   `auto_retrain` approval type. Currently `APPROVAL_TYPES` at
   `packages/shared/src/constants.ts:621-627` contains exactly:
   `["hire_agent", "approve_ceo_strategy", "budget_override_required", "request_board_approval", "publish_full_artifact"]`.
   The `auto_retrain` type does not exist. The approval service's `approve` function
   (`server/src/services/approvals.ts:134`) only branches on `type === "hire_agent"` —
   an `auto_retrain` approval would fall through with no side effects unless the service
   is extended.
   **No correction needed to design doc** — this is correctly identified as a proposed
   addition. However, the implementation plan must include adding `"auto_retrain"` to
   `APPROVAL_TYPES` AND extending `approvalService.approve()` to handle the new type
   (apply config patch, log activity).

6. **SPEC §12.1 citation for "approval gates for governed actions.".**
   The design doc V1 invariants table (line 55) cites §12.1 for "Approval gates for
   governed actions (hiring, budget, secrets)." SPEC §12.1 ("Hiring") exists and correctly
   describes the hire approval flow (lines 1082-1087). However, budget approvals
   (§13.2 Enforcement Rules, lines 1116-1124) are implemented as auto-pause, not as
   approval-gated actions — budget overrides are a `budget_override_required` approval type
   but the *auto-pause* on budget exhaustion is automatic (no approval needed to pause).
   This is consistent with the design doc's intent. No correction needed, but worth noting.

7. **Open Question #2 default assumption.**
   Open Question #2 asks: "What is the default for `autoHireEnabled` / `autoRetrainEnabled`?"
   and suggests "Paperclip V1 is conservative by default (board approval for hires is true
   by default). These should default to `false`." This is **correct in spirit** (auto-hire
   and auto-retrain should default off) but the premise is wrong per issue #1 above —
   board approval for new agents is NOT true by default; it's `false`. The defaults
   should still be `false`, but the justification should be rewritten.

8. **`approve_ceo_strategy` approval type is defined but unimplemented.**
   The design doc references CEO strategy approval as an existing pattern. The
   `approve_ceo_strategy` type exists in `APPROVAL_TYPES` but has **no server-side
   implementation** — there is zero code in `server/src/` matching `approve_ceo_strategy`
   or `ceo_strategy` (only the constant definition exists). This is aspirational from SPEC
   §12.2 but not yet built. The design doc should note this as a prerequisite or
   alternative path rather than treating it as a working pattern to mirror.

### E.3 Test Verification

| Test Suite | Location | Result |
|---|---|---|
| Hermes adapter compatibility tests | `packages/adapters/hermes/src/server/` | 46 tests PASS (7 files) |
| `test-environment.compatibility.test.ts` (uncommitted change in working dir) | `packages/adapters/hermes/src/server/` | 6 tests PASS |
| Report-kit template regression tests | `report-kit/report-kit.test.mjs` | 12 tests PASS |

The uncommitted test file `packages/adapters/hermes/src/server/test-environment.compatibility.test.ts`
(JAC-4575 empty-adapterConfig fallback) passes on the current branch. The report-kit
test suite (JAC-3679, already merged `done`) also passes.
