# Paperclip Autonomy Loop — Decision Policy

**Companion to:** [`paperclip-autonomy-loop-DESIGN.md`](./paperclip-autonomy-loop-DESIGN.md)
**Scope:** Deterministic `decide()` pseudocode, Bounds definition, auto-retrain candidate table, and governance rules.
**Status:** proposed (pending board grant of bounded auto-approve)

---

## Table of Contents

1. [Bounds (read-only at loop start)](#1-bounds-read-only-at-loop-start)
2. [Sense signals (S1–S9)](#2-sense-signals-s1s9)
3. [Action vocabulary](#3-action-vocabulary)
4. [The `decide()` function](#4-the-decide-function)
5. [Routing table](#5-routing-table)
6. [Auto-retrain candidate table](#6-auto-retrain-candidate-table)
7. [Governance rules](#7-governance-rules)
8. [Rate caps & cadence](#8-rate-caps--cadence)

---

## 1. Bounds (read-only at loop start)

Bounds are loaded from a versioned, board-signed artifact as read-only
configuration. The loop runner cannot mutate them. Any Bounds change is a
hard-ESCALATE governance action. `decide()` records the Bounds hash
(`bounds_hash`) per decision for post-hoc audit.

```yaml
# ── Bounds: loaded read-only at loop start ──────────────────────────
AUTOLOOP_ENABLED: bool              # master kill-switch (Paperclip control record)
AUTOLOOP_MAX_SCOPE: Scope           # minimal — e.g. { lanes: [ollama-cloud], agent_types: [coder] }
AUTOLOOP_BUDGET_CENTS: int          # board-set monthly sub-cap (default: 0 → AUTO disabled)
AUTOLOOP_RATE_CAP_PER_HOUR: int     # 3
AUTOLOOP_MAX_SCOPE: Scope           # scope ceiling for any auto-action
GOVERNANCE_CRITICAL: Set[agent_id]  # { Fable, CEO/board agents, loop runner agent }
model_allow: Set[str]               # static human-ratified: [kimi-for-coding/k3, kimi/k3]
NEW_HIRE_BASE_SCOPE: Scope          # minimal (narrower than AUTOLOOP_MAX_SCOPE)
rate_cap_per_hour: int              # 3
```

**Bounds rules (all must pass for AUTO):**

```
budget_rule:        planned_action.projected_monthly_cost <= AUTOLOOP_BUDGET_CENTS
                        AND does_not_raise_any(budgetMonthlyCents)   # structural
scope_rule:         result_permissions ⊆ min(agent.permissions, bounds.AUTOLOOP_MAX_SCOPE)
                        AND (for hires) result_permissions = NEW_HIRE_BASE_SCOPE
model_rule:         target_model ∈ model_allow
secret_rule:        result_config introduces_no_inline_secret   # new secrets rejected
concurrency_rule:   no_concurrent_auto_action(agent.id)         # atomic lease
rate_rule:          actions_this_hour < rate_cap_per_hour
```

---

## 2. Sense signals (S1–S9)

| Code | Name | Source | Condition |
|------|------|--------|-----------|
| S3 | `AGENT_WEAK` | Paperclip agent table | pass-rate trend or spend efficiency below threshold |
| S5 | `SECRET_CLEARTEXT` | agent `adapterConfig`/`runtimeConfig` survey | inline cleartext secret field detected |
| S6 | `CAP_GAP` | Beads/Paperclip issue queue | `ready`/`todo` issue with no assignable agent; OR issue reassigned ≥2× (bouncing) |
| S7 | `MODEL_DRIFT` | `./ringer.py models` scoreboard | a proven model beats agent's current on first-try by ≥0.15 OR ≥40% cheaper $/task at equal pass |
| S9 | `BROKEN_SIGNAL` | agent table + MCP error logs | `status=error`, `errorReason` set, or MCPServerTask "Event loop is closed" |

Signal provenance: S1–S5 are **read-only pulls** of fleet state. Signals that
would benefit the resulting action's agent (S6, S7) require trusted-principal
origin or human-confirmed triage. No signal field may be influenced by the
agent the resulting action would benefit.

---

## 3. Action vocabulary

```
action ∈ { hire | retrain | retire | reroute-model | no-op }
```

- `hire` — create a new agent from a template (S6 CAP_GAP signal)
- `retrain` — PATCH an existing agent's model/provider config (S3, S9)
- `reroute-model` — swap the model in runtime config (S3, S7)
- `retire` — pause + disable an agent (S9 dormant, or as hire-revert)
- `no-op` — signal was false/duplicate

---

## 4. The `decide()` function

```
decide(signal, agent, bounds) -> Decision:
    # ── Step 1: compute the proposed change ──
    planned_change = plan_change(signal, agent)
    action = planned_change.action
    target_model = planned_change.target_model
    target_config = planned_change.target_config
    result_permissions = planned_change.permissions
    result_scope = planned_change.scope

    # ── Step 2: compute bounds report ──
    bounds_report = {
        budget: planned_change.projected_monthly_cost <= bounds.AUTOLOOP_BUDGET_CENTS
                  AND does_not_raise_any(budgetMonthlyCents),
        scope:  result_permissions ⊆ min(agent.permissions, bounds.AUTOLOOP_MAX_SCOPE)
               AND (action == "hire" → result_permissions == NEW_HIRE_BASE_SCOPE),
        model:  target_model ∈ bounds.model_allow,
        secret: introduces_no_inline_secret(target_config),
        concurrency: NOT has_concurrent_auto_action(agent.id),
        rate:  actions_this_hour < bounds.rate_cap_per_hour,
    }
    all_bounds_pass = all(bounds_report.values())

    # ── Step 3: compute hard_escalate ──
    hard_escalate = (
        action == "retire"
        OR agent.id ∈ bounds.GOVERNANCE_CRITICAL
        OR agent.adapterConfig contains any inline secret field        # ← agent-state, not signal-kind
        OR target introduces broad scope                               # beyond AUTOLOOP_MAX_SCOPE
        OR target raises budget
        OR target introduces danger-full-access or approval-off
        OR target exposes a durable plane on the tailnet interface
        OR signal.requires_human_review                               # S5 on governance-critical
    )

    # ── Step 4: route ──
    if not AUTOLOOP_ENABLED:
        return ESCALATE("loop disabled")
    if not all_bounds_pass:
        return ESCALATE("bounds not satisfied")
    if hard_escalate:
        return ESCALATE("governance boundary")
    return AUTO(
        action=action,
        target_model=target_model,
        target_config=target_config,
        bounds_hash=hash(bounds),
        reason="all bounds pass; not hard-escalate"
    )
```

**Key correction from adversarial review (S5 Finding):**
`hard_escalate` now includes
`agent.adapterConfig contains any inline secret field` — this escalates
any retraint/reroute of a secret-bearing agent regardless of which signal
fired, closing the gap where a non-SECRET_CLEARTEXT signal (e.g.
`AGENT_WEAK`) would route an inline-secret agent to AUTO.

---

## 5. Routing table

| Signal | Agent state | hard_escalate? | all_bounds pass? | Route | Action |
|--------|------------|-----------------|-------------------|-------|--------|
| S6 | new hire, scoped | NO | YES | AUTO | hire (from template, NEW_HIRE_BASE_SCOPE) |
| S3 | qwen3-coder:30b coder (idle, no secrets) | NO | YES | AUTO | reroute-model → kimi-for-coding/k3 |
| S7 | drift signal, model ∈ model_allow | NO | YES | AUTO | reroute-model → proven model |
| S9 | dormant agent | NO* | YES | ESCALATE | retire (governance-critical: always ESCALATE) |
| S5 | inline secret, non-critical agent | YES | — | ESCALATE | reroute → secret_ref migration (human) |
| S5 | inline secret, governance-critical | YES | — | ESCALATE | secret migration (human) |
| S9 | Wings crash-loop | YES (inline secret) | — | ESCALATE | crash diagnosis + secret migration |
| S9 | Aegis crash-loop | YES (inline secret) | — | ESCALATE | crash diagnosis + secret migration |
| S3 | Fable quota-hit | YES (governance-critical) | — | ESCALATE | quota repair / model switch |
| any | signal.manufactured | depends | depends | ESCALATE* | provenance check: trusted-principal-only |

*No signal field may be influenced by the agent the resulting action would benefit.

---

## 6. Auto-retrain candidate table

Source: read-only survey of 43 agents (2026-07-29).

| Signal | Agent | Adapter / Model | Route | Action | Notes |
|--------|-------|-----------------|-------|--------|-------|
| S3 `AGENT_WEAK` | Fable (claude-fable-5) | claude-fable-5 | ESCALATE | quota repair | governance-critical judge; quota exhausted per AGENTS.md |
| S9 `BROKEN_SIGNAL` | Wings | hermes_local | ESCALATE | crash diagnose + secret migration | RuntimeError: Event loop is closed; inline `telegram_bot_token` |
| S9 `BROKEN_SIGNAL` | Aegis | hermes_local | ESCALATE | crash diagnose + secret migration | RuntimeError: Event loop is closed; inline `telegram_bot_token` |
| S3 `AGENT_WEAK` | Coder Y | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | 6 Ollama-lane coders → reroute, AUTO |
| S3 `AGENT_WEAK` | Aegis Coder X | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | |
| S3 `AGENT_WEAK` | Hermes Coder | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | |
| S3 `AGENT_WEAK` | Operator | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | |
| S3 `AGENT_WEAK` | Dispatcher Worker | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | |
| S3 `AGENT_WEAK` | Pi Campaign Auditor | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model → kimi-for-coding/k3 | |
| S5 `SECRET_CLEARTEXT` | Wings, Klaw, Klaude, Kloud | hermes_local / openclaw_gateway | ESCALATE | migrate inline → secret_ref | secret posture hard-escalate (agent-state) |
| S9 `BROKEN_SIGNAL` (dormant) | Kloud, Bill, Reflection Coach, Goblin II | — | ESCALATE | retire | dormant 30+ days; board approval required |

**Recommended first actuation:** reroute ONE idle Ollama coder (Coder Y →
kimi-for-coding/k3) through the full snapshot→PATCH→probation-smoke→
promote/auto-revert cycle. This validates the widest-blast-radius AUTO
action before touching any ESCALATE candidate.

**Governance model: policy-gate, NOT approval-off.**
The loop is granted bounded auto-approve ONLY for in-bounds action classes
that pass ALL bounds AND are not hard-escalate. Approvals stay globally ON.

---

## 7. Governance rules

1. **The loop cannot edit its own Bounds.** `AUTOLOOP_MAX_SCOPE`,
   `AUTOLOOP_BUDGET_CENTS`, `model_allow`, `GOVERNANCE_CRITICAL` are
   read-only. Any change is a hard-ESCALATE governance action.

2. **GOVERNANCE_CRITICAL is enumerated with concrete agent IDs** before
   actuation. Fail-safe: any agent whose `reportsTo` chain reaches the
   board/CEO is treated as critical unless explicitly exempted.

3. **Budget changes are structurally blocked in AUTO** via
   `does_not_raise_any(budgetMonthlyCents)`.

4. **Tailnet exposure of any plane is hard-ESCALATE.**

5. **The loop has NO verb to edit approvals or its own governance.**
   The action vocabulary `{hire, retrain, retire, reroute-model, no-op}`
   cannot modify Bounds, GOVERNANCE_CRITICAL, or the auto-approve grant.

6. **Decide is pure.** `decide(signal, agent, bounds)` is deterministic —
   given the same inputs, the same route. `bounds_hash` is recorded per
   decision.

7. **Server-side enforcement.** Paperclip's approval/actuation API
   validates the action class against the signed Bounds before executing
   an auto-approved request. The loop proposes; the plane disposes.

8. **Dead-man fail-closed.** If the human-gate judge (Fable) is
   unreachable/error for N consecutive cycles, the AUTO lane freezes
   (fail-closed). The sovereign Telegram surface pages the human directly
   (not via Fable).

9. **Secret posture = agent-state.** `hard_escalate |=
   agent.adapterConfig contains any inline secret field`
   regardless of signal kind.

10. **Hire revert auto-retire carve-out.** The only unilateral
    `retire` the loop may perform is `pause` then `retire` of a
    never-proven probationary hire (within its probation window) as
    part of hire-revert. This is explicitly carved out from the
    "retire of any agent → ESCALATE" boundary in §2.3 of DESIGN.md.

---

## 8. Rate caps & cadence

```
cadence:             1 Sense→Decide→Act→Verify→Observe cycle per hour
rate_cap_per_hour:   3  (aggregate auto-actions)
concurrency_per_agent: 1 (atomic per-agent lease, enforced server-side)
probation window:    until ≥0.67 first-try pass over ≥3 tasks
snapshot retention:  pre-image of live change retained for life of that change
```

**Daily action cap:** 24 (hard ceiling; triggers fail-closed circuit breaker
if 3 consecutive same-agent reverts occur).

---

## Verifier

```bash
# Validate bounds conformance: every hard_escalate branch in decide() pseudocode
# must correspond to a governance rule in §7.
# The decision-policy must reference the adversarial review synthesis §9
# in DESIGN.md for each closed finding.
grep -c 'hard_escalate' paperclip-autonomy-decision-policy.md  # expect ≥ 2
grep 'inline secret field' paperclip-autonomy-decision-policy.md  # agent-state correction
grep 'GOVERNANCE_CRITICAL' paperclip-autonomy-decision-policy.md    # enumerated
```
