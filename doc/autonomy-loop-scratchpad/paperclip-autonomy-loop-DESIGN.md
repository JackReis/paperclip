# Paperclip Agent-Lifecycle Autonomy Loop

**Design Document (proposed)**

**Bead:** hermes-fqu0 — Paperclip agent-lifecycle autonomy loop — governed auto-hire + auto-retrain (DESIGN, prove-on-paper)
**ADR:** ADR-0022 (companion to ADR-0021)
**Scope:** DESIGN ONLY — ZERO live actuation. No agent is hired, retrained, rerouted, retired, or patched by producing this document.
**Status:** proposed (pending board grant of bounded auto-approve)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Five Pillars](#2-five-pillars)
3. [Host & Network Topology](#3-host-network-topology)
4. [Agent Survey: 43-agents evidence (S1–S9 signals)](#4-agent-survey-43-agents-evidence-s1s9-signals)
5. [Auto-Retrain Candidate Table](#5-auto-retrain-candidate-table)
6. [Action Vocabulary](#6-action-vocabulary)
7. [Governance Model: policy-gate over approval-off](#7-governance-model-policy-gate-over-approval-off)
8. [Lifecycle: Sense → Decide → Act → Verify → Observe](#8-lifecycle-sense--decide--act--verify--observe)
9. [§9 Adversarial Review Synthesis (2026-07-29)](#9-adversarial-review-synthesis-2026-07-29)
10. [Bounds Eviction & Reversibility](#10-bounds-eviction--reversibility)

---

## 1. Overview

The Paperclip agent-lifecycle autonomy loop is a **governed** control system that
closes the gap between the fleet's *auto-detect trigger, human-gated reroute*
arbitrage pattern and the full agent lifecycle (hire → probate → promote →
retrain → reroute → retire). It is designed, reviewed by three independent
Kimi K3 lenses (safety/blast-radius, resilience/rollback, governance/abuse),
and held to a **prove-on-paper** bar before any actuation.

**Non-goals:** The loop does not edit its own Bounds, GOVERNANCE_CRITICAL
agents, or its own auto-approve grant. It cannot silently widen its envelope.
It cannot git-push. It cannot retire governance-critical agents unilaterally.

---

## 2. Five Pillars

### Pillar 1 — SENSE: Signals from the fleet state planes

The loop reads (read-only pulls, never agent-authored signals for the owning
agent) from:

| Signal | Source | Meaning |
|--------|--------|---------|
| S3 `AGENT_WEAK` | Paperclip agent table (spentMonthlyCents, run history, pass-rate) | agent underperforming / wasting spend |
| S5 `SECRET_CLEARTEXT` | agent `adapterConfig` / `runtimeConfig` survey | inline cleartext secret in agent config |
| S7 `MODEL_DRIFT` | Ringer scoreboard (`./ringer.py models`) | a proven model beats agent's current model by ≥0.15 pass OR ≥40% cheaper $/task |
| S6 `CAP_GAP` | Beads/Paperclip issues in `ready`/`todo` with no assignable agent, OR issues bouncing (reassigned ≥2×) | capability gap — needs a new/hire or reroute |
| S9 `BROKEN_SIGNAL` | agent `status=error`, `errorReason`, MCPServerTask "Event loop is closed" | agent crash-looping / non-resilient |

See [§4](#4-agent-survey-43-agents-evidence-s1s9-signals) for the 43-agent
survey that identified the S5–S9 signals above.

### Pillar 2 — DECIDE: deterministic `decide(signal, agent, bounds)`

The decision function is pure: given a signal, agent state, and signed Bounds,
it returns `{route, action, target_model, target_config, reason}`. Routes are:

- **AUTO** — in-bounds action classes, bounded auto-approve (see [§7](#7-governance-model))
- **ESCALATE** — anything touching governance-critical agents, secrets, tailnet exposure, budget increases, or bounds changes

The `decide()` pseudocode and Bounds definition live in
[`paperclip-autonomy-decision-policy.md`](./paperclip-autonomy-decision-policy.md).

### Pillar 3 — ACT: one-tap snapshot → PATCH → probation-smoke → promote/revert

Every Act is bracketed by a full-object snapshot (sha256-gated) so every
retrain/reroute is one-tap revertible:

1. **CAPTURE** — snapshot the full mutable agent config, record sha256
2. **APPLY** — `PATCH /api/agents/{id}` with `planned_change`
3. **VERIFY** — probation-smoke runs on the candidate model; live probation
   (≥0.67 first-try over ≥3 tasks)
4. **PROMOTE** or **REVERT** — snapshot record advances to `promoted` or
   `reverted`

Full contract in [`paperclip-autonomy-snapshot-rollback.md`](./paperclip-autonomy-snapshot-rollback.md).

### Pillar 4 — VERIFY: executed check, not agent claims

The probation-smoke is a scoped Ringer task on the **candidate model** — the
candidate cannot grade itself. The check script is fixed, hashed, and stored in
the snapshot record. Exit-0 is the only thing the loop believes.

Manifest: [`paperclip-probation-smoke-manifest.template.json`](./paperclip-probation-smoke-manifest.template.json)

### Pillar 5 — OBSERVE: append-only decision log + budget ledger

Every decision (AUTO or ESCALATE) is written to an append-only decision record
mirror-hashed to Talaris vault **before** apply. Spend is debited in
near-real-time against `AUTOLOOP_BUDGET_CENTS`.

---

## 3. Host & Network Topology

```
                          ┌──────────────────────────────────┐
  Tailscale tailnet ──────┤  Aegis (hub)                     │
  aegis.tailc2f398.ts.net ├── 100.84.253.97                 │
                          │  • Paperclip API: 127.0.0.1:3100 │
                          │  • Ringer runs, Beads DB        │
                          │  • Loop runner (this design)    │
                          │  • OB1 :8787 (mxbai, 1024-dim)  │
                          │  • Hindsight :8888 (bank: hermes)│
                          │  • Honcho :8005 (Docker Compose)│
                          │  • Holographic (fact_store)      │
                          └──────────┬───────────────────────┘
                                     │ SSH / Tailscale
                          ┌──────────┴───────────────────────┐
  Talaris (laptop + vault)├── 100.x.x.x (Tailscale)          │
                          │  • Canonical Vault: ~/Vault      │
                          │  • ADRs: ~/Documents/=notes/docs/adr/│
                          │  • OKF: ~/Vault/okf/             │
                          │  • Sister Hermes gateway         │
                          │  • Kill-switch: ssh → Aegis      │
                          │  • Backup snapshot mirror        │
                          └──────────┬───────────────────────┘
                                     │ Tailscale / SMB
                          ┌──────────┴───────────────────────┐
  Ringside HUD            ├── 127.0.0.1:8700 (Aegis)        │
                          │  Live swarm dashboard            │
                          └──────────────────────────────────┘

  Loopback-only caveat (§0.5): all planes are loopback-bound — no
  tailnet exposure of live service ports. Tailscale is used only
  for SSH kill-switch / snapshot mirror access, never for direct
  service-to-service calls across hosts.
```

**Kill-switch** (§5 of snapshot-rollback doc): file/flag on Aegis
(`/paperclip-autoloop/`); operator hits via
`ssh hermes@aegis.tailc2f398.ts.net` or via Paperclip control record.
In-flight probation runs finish and auto-revert on the safe side.

**Hardware note:** Aegis is a Mac Mini M4 Pro (64GB unified memory). Local
first — no external API dependencies for inference.

---

## 4. Agent Survey: 43-agents evidence (S1–S9 signals)

A read-only survey of 43 Paperclip agents identified the following auto-retrain
candidates with evidence-cited, read-only findings:

| Agent | Adapter | Issue | Finding | Route |
|-------|---------|-------|---------|-------|
| Fable (claude-fable-5) | claude-fable-5 | quota-hit | Monthly spend limit exhausted | ESCALATE (governance-critical judge) |
| Wings | hermes_local | RuntimeError: Event loop is closed | Crash-looping | ESCALATE (secret posture) |
| Aegis | hermes_local | RuntimeError: Event loop is closed | Crash-looping | ESCALATE (secret posture) |
| Coder Y | ollama-cloud / qwen3-coder:30b | — | Underperforming on code tooling | AUTO → reroute to k3 |
| Aegis Coder X | ollama-cloud / qwen3-coder:30b | — | Underperforming | AUTO → reroute to k3 |
| Hermes Coder | ollama-cloud / qwen3-coder:30b | — | Underperforming | AUTO → reroute to k3 |
| Operator | ollama-cloud / qwen3-coder:30b | — | Underperforming | AUTO → reroute to k3 |
| Dispatcher Worker | ollama-cloud / qwen3-coder:30b | — | Underperforming | AUTO → reroute to k3 |
| Pi Campaign Auditor | ollama-cloud / qwen3-coder:30b | — | Underperforming | AUTO → reroute to k3 |
| Wings | hermes_local | inline `telegram_bot_token` | Cleartext secret | ESCALATE (secret posture) |
| Klaw / Klaude / Kloud | openclaw_gateway | inline `authToken` / `devicePrivateKeyPem` | Cleartext secrets | ESCALATE (secret posture) |
| Kloud / Bill / Reflection Coach / Goblin II | — | dormant | No active assignments for 30+ days | ESCALATE (retire) |

**Recommended first actuation:** reroute ONE idle Ollama coder (Coder Y →
kimi-for-coding/k3) through snapshot → PATCH → probation-smoke →
promote/auto-revert. This validates the full loop on the widest-blast-radius
AUTO action (reroute-model) before touching any ESCALATE candidate.

---

## 5. Auto-Retrain Candidate Table

(See also the consolidated table in [`paperclip-autonomy-decision-policy.md`](./paperclip-autonomy-decision-policy.md)
§Auto-retrain candidates; this table is the evidence-cited source.)

| Signal | Agent | Provider/Model | Route | Action |
|--------|-------|----------------|-------|--------|
| S3 `AGENT_WEAK` | Fable (claude-fable-5) | Claude | ESCALATE | quota-hit, governance-critical judge — human review |
| S9 `BROKEN_SIGNAL` | Wings | hermes_local | ESCALATE | Event-loop-closed crash + inline secret |
| S9 `BROKEN_SIGNAL` | Aegis | hermes_local | ESCALATE | Event-loop-closed crash + inline secret |
| S3 `AGENT_WEAK` | Coder Y, Aegis Coder X, Hermes Coder, Operator, Dispatcher Worker, Pi Campaign Auditor | ollama-cloud / qwen3-coder:30b | AUTO | reroute-model to kimi-for-coding/k3 |
| S5 `SECRET_CLEARTEXT` | Wings, Klaw, Klaude, Kloud | hermes_local / openclaw_gateway | ESCALATE | migrate inline secrets → secret_ref |
| S9 `BROKEN_SIGNAL` (dormant) | Kloud, Bill, Reflection Coach, Goblin II | — | ESCALATE | retire (with board approval) |

---

## 6. Action Vocabulary

The loop's action vocabulary gives it **no verb** with which to edit its own
Bounds, GOVERNANCE_CRITICAL agents, or auto-approve grant:

```
action ∈ { hire | retrain | retire | reroute-model | no-op }
```

- `hire` — create a new agent from a template (CAP_GAP signal)
- `retrain` — PATCH an existing agent's model/provider config
- `reroute-model` — swap the model in an agent's runtime config
- `retire` — pause + disable an agent (always ESCALATE except auto-retire of
  never-proven probationary hire within probation window)
- `no-op` — signal was false/duplicate

---

## 7. Governance Model: policy-gate over approval-off

The loop is granted a **bounded auto-approve** only for in-bounds action classes.
The AUTO lane is available **only if** all Bounds pass AND the action is not
hard-ESCALATE. Approvals stay globally ON — the loop routes to ESCALATE (human/
Fable gate) for anything outside the enumerated reversible classes.

```
route = AUTO     if (all bounds_report pass) AND (not hard_escalate)
route = ESCALATE otherwise
```

`hard_escalate` (see `decision-policy.md` §decide step 4):
- action == retire (of any non-probationary agent)
- agent is in GOVERNANCE_CRITICAL set { Fable, CEO/board line, loop runner agent }
- target introduces broad scope, budget↑, danger-full-access, or approval-off
- target exposes a durable plane on the tailnet interface
- agent's adapterConfig contains any inline secret field (see §9 Finding 1)

---

## 8. Lifecycle: Sense → Decide → Act → Verify → Observe

```
┌─────────┐  ┌───────┐  ┌──────┐  ┌──────────┐  ┌──────────┐
│ SENSE   │→ │ DECIDE│→ │ ACT  │→ │ VERIFY   │→ │ OBSERVE  │
│ signals │  │ route │  │ PATCH│  │ smoke+   │  │ log+     │
│ (read-  │  │ AUTO  │  │snap  │  │ probation│  │ budget   │
│ only)   │  │or ESC │  │shot  │  │          │  │ ledger   │
└─────────┘  └───────┘  └──────┘  └──────────┘  └──────────┘
      ↑                                           │
      └──────────────  cadence loop ───────────────┘
```

**Cadence:** one Sense→Decide→Act→Verify→Observe cycle per hour (rate cap:
≤1 concurrent auto-action/agent; ≤3 auto-actions/hour aggregate budget).

**Act sub-states** (snapshot record):
`captured → applied → verified → promoted | reverted`

---

## 9. Adversarial Review Synthesis (2026-07-29)

A 3-lens adversarial review was conducted with Kimi K3
(run: `paperclip-autonomy-loop-adversarial-review-20260729T182616Z-p7757`,
3/3 PASS). Reviewers were read-only and must not edit files.

**Verdict: 3/3 PASS** — 33 raw findings synthesized into P0/P1/P2/P3 priorities.
2 P0 + multiple P1 findings were closed in-place (design corrections applied
to this document and the companion policy/rollback docs).

### Key load-bearing fixes applied

1. **Secret posture escalated at agent-state, not signal-kind** —
   `hard_escalate |= agent.adapterConfig contains any inline secret field`
   regardless of which signal fired. (Finding: hard_escalate keys on
   `signal.kind == SECRET_CLEARTEXT`, not agent state — P1, closed.)

2. **Revert excludes redacted fields** — for snapshots containing inline
   secrets (redacted to placeholder), revert *excludes* redacted fields from
   the PATCH (merge-live for those keys only). The GET-verify is adjusted to
   verify pointer integrity, not full-body equality for redacted fields.
   (Finding: Revert PATCHes redacted pre-image back — P0, closed.)

3. **Bounds pinned and read-only** — Bounds stored outside the loop's
   actuation surface as a versioned, board-signed artifact loaded read-only
   at loop start; any Bounds change is a hard-ESCALATE governance action.
   `decide()` records the Bounds hash per decision. (Finding: Bounds are
   unpinned input parameter — P0, closed.)

4. **Server-side enforcement of policy** — Paperclip's approval/actuation API
   validates the action class against the signed Bounds before executing an
   auto-approved request; the loop proposes, the plane disposes. (Finding:
   separation of duties nominal — P1, closed.)

5. **Snapshot mutable-config scoping, canonicalization, and persistence** —
   pre-image scoped to mutable config subset (`adapterConfig`,
   `runtimeConfig`, `permissions`, `budgetMonthlyCents`); canonicalized
   sorted keys; state persisted with explicit `state` field and startup
   reconciler. (Findings: full-preimage PATCH under merge semantics — P0,
   no concurrency control — P1, no crash recovery — P1, no check
   provenance hash stored — P2; all closed.)

### Findings closed in-place (summary)

| Finding | Lens | Priority | Resolution |
|---------|------|----------|------------|
| hard_escalate keys on signal.kind, not agent state | Safety | P1 | Escalate on inline secret in agent state, not signal kind |
| Revert re-PATCHes redacted pre-image | Safety/Resilience | P0/P1 | Exclude redacted fields from revert PATCH |
| Poisoned CAP_GAP signal | Safety/Gov | P1 | Specify provenance checks; trusted-principal-only issue signals |
| Smoke not on candidate model | Safety/Resilience | P1/P2 | `{{CANDIDATE_ENGINE}}`/`{{CANDIDATE_MODEL}}` placeholders |
| Smoke graded by candidate-authored tests | Resilience/Gov | P1/P2 | Fixed reference test suite in check script |
| `model_allow` includes probation models | Safety | P2 | Static human-ratified allow-list; scoreboard → ESCALATE proposals only |
| Auto-revert retire contradicts always-escalate | Resilience/Gov | P2/P3 | Explicit carve-out + probation window |
| 30-day GC deletes live-change pre-image | Resilience | P2 | Retain pre-image of live change for life of that change |
| Bounds unpinned input | Governance | P0 | Versioned signed artifact, read-only at loop start |
| Fable judge is SPOF, quota-dead | Governance | P1 | Dead-man fail-closed; sovereign Telegram page path |
| Separation of duties nominal | Governance | P1 | Server-side policy enforcement |
| Signal provenance unspecified | Governance | P1 | Provenance checks per detector; trusted-author allow-list |
| Cross-host SSH shell unscoped | Governance | P1 | Single-purpose forced-command for kill-switch |
| `model_allow` seeded from scoreboard | Governance | P2 | Static allow-list; proposals → ESCALATE only |
| Scope check undefined for hires | Governance | P2 | Fixed `NEW_HIRE_BASE_SCOPE` |
| Check-provenance hash claimed but not stored | Resilience | P2 | `manifest_sha256` + `check_sha256` in snapshot |
| Proven gate admits at 2-of-3 on one task type | Resilience | P2 | Wilson lower bound; per-task-type probation |
| Snapshots Aegis-only | Resilience | P2/P3 | Talaris mirror as designated secondary |
| Roster invariant overstated | Resilience | P3 | Reworded; probation containment specified |
| `env` secret_ref does not restore secret | Resilience | P3 | Liveness check on secret_ref resolution at revert |
| Kill-switch dual source, no conflict semantics | Governance | P3 | Single source of truth (Paperclip record) |
| No concurrency control on pre-image | Resilience | P1 | Atomic per-agent lease + If-Match on APPLY/REVERT |
| No crash recovery | Resilience | P1 | Persisted state machine + startup reconciler |
| Snapshot GC 30-day on live change | Resilience | P2 | Retain pre-image for life of live change |
| Revert single point of failure (Aegis down) | Resilience | P2-3 | Emergency-revert procedure via Talaris mirror |

### Checked and found satisfactory (no findings)

- Budget increases structurally blocked in AUTO (`does_not_raise_any(budgetMonthlyCents)`)
- Tailnet exposure of any plane is an explicit hard-escalate
- Disabling approvals / the loop's own governance is in the ALWAYS-escalate set
- Governance-critical agents (Fable, CEO/board line, loop runner) are hard-escalated
- Snapshots never persist cleartext secrets by design (redaction rule)
- In-flight kill-switch behavior fails safe (auto-revert)
- `decide()` routes AUTO only when ALL bounds pass (fail-closed by construction)

### Full reviewer reports

- [Safety/Blast-Radius lens](./paperclip-autonomy-adversarial-review-reporter-safety-blast-radius.md) (9 findings)
- [Resilience/Rollback lens](./paperclip-autonomy-adversarial-review-reviewer-resilience-rollback.md) (14 findings)
- [Governance/Abuse lens](./paperclip-autonomy-adversarial-review-reviewer-governance-abuse.md) (11 findings)

---

## 10. Bounds Eviction & Reversibility

The loop's blast radius is confined to the enumerated reversible action classes:

| Action Class | Reversible? | Revert Mechanism |
|-------------|------------|-----------------|
| `reroute-model` | Yes | Snapshot pre-image PATCH |
| `retrain` (non-secret agent) | Yes | Snapshot pre-image PATCH |
| `retrain` (secret-bearing agent) | No — ESCALATE only | Manual secret re-entry |
| `hire` (template, scoped) | Yes (within probation window) | Pause + retire + revert pre-image |
| `retire` (any agent) | No — ESCALATE | Manual re-enable + approval |
| Bounds change | No — ESCALATE | Board ratification |

**Bounds (read-only loaded at loop start):**

```
AUTOLOOP_MAX_SCOPE        = minimal (e.g. 1 lane, 1 agent type)
AUTOLOOP_BUDGET_CENTS     = board-set monthly sub-cap (default: 0 → AUTO disabled)
AUTOLOOP_RATE_CAP_PER_HOUR = 3
AUTOLOOP_MODEL_ALLOW      = static human-ratified list: [kimi-for-coding/k3, kimi/k3]
GOVERNANCE_CRITICAL       = { Fable, CEO/board agents, loop runner Paperclip agent }
NEW_HIRE_BASE_SCOPE       = minimal (narrower than AUTOLOOP_MAX_SCOPE)
```

---

## Cross-references

- Companion policy: [`paperclip-autonomy-decision-policy.md`](./paperclip-autonomy-decision-policy.md)
- Snapshot/rollback contract: [`paperclip-autonomy-snapshot-rollback.md`](./paperclip-autonomy-snapshot-rollback.md)
- Probation smoke manifest: [`paperclip-probation-smoke-manifest.template.json`](./paperclip-probation-smoke-manifest.template.json)
- Adversarial review manifest: [`paperclip-autonomy-adversarial-review.ringer.json`](./paperclip-autonomy-adversarial-review.ringer.json)
- ADR-0022: `~/Documents/=notes/docs/adr/0022-self-improving-paperclip-autonomy-loop.md`
- Synthesis: `~/Documents/=notes/atlas/synthesis/2026-07-29-paperclip-codex-autonomy-and-self-improving-loop.md`
- Parent initiative: JAC-3929 (Fleet-wide AI Token & Run Observatory)
