# JAC-4756: Resolve Open Questions — Memory, Adapter, Privileges

**Status:** resolved
**Date:** 2026-08-05
**Paperclip issue:** JAC-4756 (parent plan for JAC-4746 hierarchical agent folder structure)
**Dispatch source:** JAC-4812 (Coordinator Fleet Coordination Check) → JAC-4823 (Plan Runner)
**Audience:** Engineering, product

## Summary

Three open design questions from the hierarchical agent folder structure plan
(`doc/plans/2026-08-04-hierarchical-agent-folder-structure.md`) are resolved
here. Each resolution follows a consistent pattern: **instructions/memory/adapter
configuration cascade through the folder tree, while security-sensitive
privileges do NOT cascade** — they are resolved from the agent's own
`reportsTo` manager chain (the org chart), per the existing Paperclip
authorization model (SPEC-implementation.md §9).

## Context

The `agent_folders` table (JAC-4747) introduces a second hierarchy alongside
the existing `agents.reportsTo` org-tree:

- **`reportsTo` (agents table):** defines the *management* hierarchy (who
  manages whom). Powers escalation paths, scoped task assignment grants, and
  budget delegation (SPEC.md §3, §4).

- **`folderId` (agents table → agent_folders):** defines the *instruction*
  hierarchy (which shared AGENTS.md / adapter config an agent inherits).
  Folders are a grouping/mgmt convenience for bulk instruction config, NOT an
  org-chart replacement.

The two hierarchies are intentionally **independent** (per the plan's "Design
Decisions": *"folder_id is separate from reportsTo (instruction inheritance ≠
org hierarchy)"*).

## Question 1 — Memory: How does memory scope/resolution relate to agent folders?

**Open question:** Do agents inherit memory scope or memory configuration from
their parent folder, or is memory scoped strictly per-agent/org?

### Resolution

**No folder-level memory scope inheritance.** Memory is scoped to the
**agent** and **company**, not the folder. Folder instructions cascade to
agents (AGENTS.md, HEARTBEAT.md), but memory scope — which memories an agent
can recall or write — is determined by:

1. **Company-level default provider** — set on the agent's company. All agents
   in the company share this default memory provider unless an individual agent
   overrides it via its `adapterConfig`. This is already the design described in
   `doc/memory-landscape.md`: *"lets each company choose a default memory
   provider; lets specific agents override that default."*

2. **Per-agent override** — an agent may set its own memory provider/config in
   `adapterConfig`, which takes precedence over the company default.

3. **Provenance tagging** — every memory write is tagged with
   `companyId`, `agentId`, `runId`, and `issueId` so it is always traceable
   back to its origin. Folder membership is recorded as metadata on the agent
   record (available for filtering), but is NOT a scope boundary.

### Rationale

- Memory is a **security/tenant boundary**, not a configuration convenience.
  Cascading it through folders would create implicit scope expansion — a folder
  with 50 agents could inadvertently grant all 50 access to memories intended
  for a subset.

- The `doc/memory-landscape.md` plan already establishes the contract:
  company-scoped default + per-agent override + provenance via
  `agent_id`/`run_id`/`issue_id`. Folder is not in that contract.

- Folder instructions are about **agent behavior** (how to work), not
  **data access** (what data the agent can see). Memory scope is data access.

### Implementation impact

None — the current agent_folders implementation does NOT add any memory-scope
columns. Memory configuration continues to live on the agent's `adapterConfig`
or company defaults. The folder's `metadata` jsonb is for instruction files
only. No code change required.

## Question 2 — Adapter: Do agents inherit adapter configuration from their parent folder/manager?

**Open question (SPEC.md §3.3):** "Do agents inherit any configuration from
their manager?"

### Resolution

**Yes, but only instruction/config content (AGENTS.md, HEARTBEAT.md), not the
adapter type or adapter-specific runtime config (env vars, model selection,
command-line arguments).**

- **Instruction content cascades from folder to agent.** The folder's
  `instructions/` directory (at
  `<instanceRoot>/companies/<cid>/folders/<fid>/instructions/`) is resolved via
  the `agentInstructionsService` chain-walk + merge + fingerprint-cache. This
  is the same mechanism used today for `reportsTo`-based instruction
  inheritance, extended to also walk the folder tree. Agents with overrides
  get pointer files; zero-override agents use pure-DB pointers.

- **Adapter type does NOT cascade.** An agent's `adapterType` (e.g.,
  `hermes_local`, `claude_local`, `codex_local`) is set at agent creation and
  cannot be inherited from a folder. Folders are adapter-agnostic.

- **Adapter-specific config (adapterConfig) does NOT cascade from folders.**
  Each agent has its own `adapterConfig` blob (model, env, parameters). These
  are NOT merged from folder metadata. If a folder wants to enforce a shared
  model or env across agents, that is a future feature requiring a separate
  `folder_defaults` table — **out of scope for JAC-4746**.

- **The `agentInstructionsService`** (existing) handles the pre-merge of
  instruction files with fingerprint caching. Folder instructions are
  resolved as additional ancestors in the chain, before the agent's own
  instructions.

### Rationale

- SPEC.md §2.1 is explicit: "Concepts like SOUL.md and HEARTBEAT.md are **not
  part of the Paperclip protocol**. They are **adapter-specific configurations**."
  The adapter type and its config blob are identity/behavior, not shared
  instructions.

- Cascading adapter config through folders would create an implicit privilege
  escalation: an agent in a folder could inherit a more powerful model or
  env that its manager did not intend. Instruction files are the safe
  "what to do" layer; adapter config is the "how to run" layer.

- The plan doc already resolved this: *"Generic vs per-role adapter script —
  RESOLVED: Generic approach. The `folder_id` column and instructions are
  adapter-agnostic; adapter-specific resolution happens in the existing
  `agentInstructionsService`."*

### Implementation impact

None beyond what JAC-4746 already implements. The folder instructions
filesystem (JAC-4749) and inheritance engine (JAC-4750) already handle
instruction cascade. No changes to `adapterConfig` resolution.

## Question 3 — Privileges: How do permissions/scope inherit through the folder hierarchy?

**Open question (from plan doc §3):** "Ordinal vs scalar privilege values"
marked as "Out of scope for this issue. Privilege model is unchanged."

JAC-4823 explicitly asks to resolve this question.

### Resolution

**No privilege/scope inheritance through agent folders. Privileges resolve
through the `reportsTo` org-chart hierarchy only, using the existing
Paperclip authorization model (SPEC-implementation.md §9).**

- **Folders do NOT grant permissions.** Being in a folder does not grant
  `tasks:assign`, `skills:create`, `issue:read`, or any other permission.
  Folders are a grouping/organization mechanism for agent instructions,
  not an RBAC mechanism.

- **Permissions cascade through `reportsTo`, not `folderId`.** An agent's
  authorization scope is determined by:
  1. Its own identity (agent API key → `agentId`, `companyId`)
  2. Its `reportsTo` manager chain (for scoped assignment grants —
     SPEC-implementation.md §9.8: `subtreeAgentId`, `managedSubtreeAgentId`)
  3. Board-level grants for human users

- **Scoped assignment grants** (`tasks:assign_scope`) already support subtree-
  based scoping via `reportsTo`: an agent can be granted assignment within
  its managed subtree. This uses the org chart (`reportsTo`), NOT folders.

- **The `agent_folders.metadata` column** is for instruction content only
  (AGENTS.md bytes, HEARTBEAT.md bytes). It does NOT contain privilege data.

### Rationale

- SPEC.md §3.1 is explicit: "The org structure defines **reporting and
  delegation lines**, not access control." Visibility/access control is
  company-scoped by default (SPEC.md §3 §Agent Visibility).

- SPEC-implementation.md §9.1–§9.4 establishes the full permission model
  (board vs agent, shared default-open writes, scoped grants). There is no
  folder-based permission mechanism.

- The plan doc already deferred this: *"Privilege model is unchanged."*
  Folders are not a privilege boundary — they are a bulk-instruction tool.

- Mixing privilege inheritance with folder membership would create a
  dangerous dual-authority model where moving an agent to a different folder
  could silently elevate or reduce its permissions, independent of the org
  chart.

### Implementation impact

None — the current implementation already does not add privilege columns to
`agent_folders`. The `metadata` jsonb is for instructions only. No code
change required. The privilege model continues to resolve purely through
`reportsTo` + board grants + company scope.

## Question from SPEC.md §2.5 (Open Questions): "Do agents inherit any configuration from their manager?"

This is answered implicitly by the above resolutions. The full answer:

- **Instruction content (AGENTS.md, HEARTBEAT.md):** inherits from BOTH the
  `reportsTo` chain AND the `folderId` chain. These merge.
- **Adapter type:** does NOT inherit. Set at agent creation.
- **Adapter config (env, model, parameters):** does NOT inherit. Set per-agent.
- **Memory scope:** does NOT inherit from folder. Company default + per-agent override.
- **Privileges/permissions:** inherit from `reportsTo` chain ONLY, not folders.

## Question from SPEC.md §7.3 (Open Questions): "Can org structure change at runtime?"

This is already handled by the `agent_folders` CRUD (move agent to folder via
POST `/companies/:companyId/agent-folders/agents/:agentId/move`). Moving an
agent to a different folder changes its instruction inheritance chain but does
NOT change its `reportsTo`, `adapterType`, `adapterConfig`, memory scope, or
permissions. This is the correct behavior — org structure (who manages whom)
is separate from folder structure (which shared instructions apply).

## Question from SPEC.md §7.3 (Open Questions): "Is this a strict tree or can agents report to multiple managers?"

**Resolved (SPEC-implementation.md V1 decision):** Strict tree. `reports_to`
is a single nullable FK. No multi-manager reporting in V1. Agent folders are
also a strict tree (`parent_id` → `agent_folders.id`, cycle detection
enforced in `agent-folders.ts`).

## Cross-reference to existing authz model

| Concern | Resolves via | SPEC ref |
|---|---|---|
| Memory scope | company default + per-agent adapterConfig override | §2, §10 |
| Instruction inheritance | folderId chain + reportsTo chain (merged) | §2.1, §3.1 |
| Adapter type | agent record (no inheritance) | §2.1 |
| Adapter config | agent record (no inheritance) | §2.1 |
| Task assignment scope | `tasks:assign` / `tasks:assign_scope` | §9.8 |
| Budget delegation | reportsTo chain (manager subtree) | §4, §2.5 |
| Escalation path | reportsTo chain (manager → board) | §3.3 |
| Work-object visibility | company-scoped (board + in-company agents) | §3.1, §9.4 |

## Acceptance

All three open questions are resolved with clear guidance:

1. **Memory** — scoped per company + per agent; folders are for instructions
   only, not memory scope.
2. **Adapter** — instruction content cascades from folder; adapter type and
   adapterConfig do NOT cascade.
3. **Privileges** — resolve through `reportsTo` org chart only; folders grant
   NO permissions.
