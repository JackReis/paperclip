# Paperclip Autonomy Loop — Snapshot & Rollback Contract

**Companion to:** [`paperclip-autonomy-loop-DESIGN.md`](./paperclip-autonomy-loop-DESIGN.md)
**Scope:** Full-object snapshot capture, sha256 gate, one-tap revert semantics,
concurrency control, crash recovery, and secret-handling rules.
**Status:** proposed (pending board grant of bounded auto-approve)

---

## Table of Contents

1. [Snapshot object schema](#1-snapshot-object-schema)
2. [CAPTURE → APPLY → VERIFY → PROMOTE/REVERT lifecycle](#2-capture--apply--verify--promote-revert-lifecycle)
3. [Revert contract](#3-revert-contract)
4. [Concurrency control](#4-concurrency-control)
5. [Crash recovery & startup reconciler](#5-crash-recovery--startup-reconciler)
6. [Secret handling & redaction](#6-secret-handling--redaction)
7. [Storage & mirror](#7-storage--mirror)
8. [Kill-switch interaction](#8-kill-switch-interaction)
9. [Verifiers](#9-verifiers)

---

## 1. Snapshot object schema

```
Snapshot {
  snapshot_id:       string (uuid)
  agent_id:          string (uuid)              # the agent this change targets
  paperclip_issue:   string (uuid)              # Paperclip issue driving the action
  bead_id:           string                     # Beads tracking this lifecycle
  run_id:            string (uuid)              # this loop's run_id
  decision:          Decision                   # the AUTO/ESCALATE verdict + reason
  bounds_hash:       string (sha256)            # hash of Bounds evaluated against
  pre_image:         ConfigMutation             # live config BEFORE the change
  planned_change:    ConfigMutation             # the PATCH body to apply
  pre_image_sha256:  string (sha256)            # canonicalized hash of pre_image subset
  manifest_sha256:   string (sha256)            # hash of the filled probation-smoke manifest
  check_sha256:      string (sha256)            # hash of the check script at capture time
  redactions:        Redaction[]                # fields redacted in pre_image (never cleartext)
  state:             "captured" | "applied" | "verified" | "promoted" | "reverted"
  applied_at:        timestamp | null           # set when APPLY succeeds
  verified_at:       timestamp | null           # set when VERIFY passes
  final_verdict:     "promoted" | "reverted" | null
  version:           string                     # config_version / updatedAt at capture
  ttl_days:          int = 30                    # GC retention after superseded/reverted
}
```

**ConfigMutation** = the mutable config subset only:
```
{
  adapterConfig:      Record<string, unknown>
  runtimeConfig:      Record<string, unknown>   # includes modelProfiles
  permissions:        Record<string, unknown>
  budgetMonthlyCents: integer
  // NOTE: status, lastHeartbeatAt, spentMonthlyCents, errorReason,
  // createdAt, updatedAt are server-managed — EXCLUDED from pre_image
}
```

**Canonicalization (applies to pre_image, planned_change, sha256):**
- Sort all keys recursively (deep-sort).
- Drop server-managed fields (`status`, `lastHeartbeatAt`,
  `spentMonthlyCents`, `errorReason`, `createdAt`, `updatedAt`).
- Redact inline cleartext secrets to `"__REDACTED__"` + note
  (see §6).
- Hash the resulting canonical JSON string.

---

## 2. CAPTURE → APPLY → VERIFY → PROMOTE/REVERT lifecycle

```
                    ┌──────────┐
  CAPTURE           │ captured │
───────────────────→│  state   │
  1. GET /api/agents/{id}      │  ┌──────────┐
  2. Extract mutable subset    │→│ applied  │
  3. Canonicalize → sha256    │  └──────────┘
  4. Redact secrets ──────────┤        │
  5. Write snapshot file      │        │ APPLY
  6. Mirror to Talaris vault  │        ↓
  7. Acquire per-agent lease  │  ┌──────────┐
                              │→│ verified │
                                 └──────────┘
                                   │    │
                         smoke PASS│    │smoke FAIL
                                   ↓    ↓
                            ┌──────┐  ┌──────┐
                            │promoted│  │reverted│
                            └──────┘  └──────┘
```

### Step 1 — CAPTURE (snapshot)

```
pre_image = GET /api/agents/{agent_id}
    .filter_to_mutable_subset()           # adapterConfig, runtimeConfig, permissions, budgetMonthlyCents
    .redact_inline_secrets()              # → { field: "__REDACTED__", note: "inline_secret" }

snapshot = Snapshot{
  pre_image = pre_image,
  pre_image_sha256 = sha256(canonicalize(pre_image)),
  manifest_sha256 = sha256(filled_manifest),
  check_sha256 = sha256(check_script),
  redactions = redaction_list,
  state = "captured",
  version = live_config.updatedAt,
}

# Write snapshot file (Aegis local, append-only by convention)
write("~/.paperclip-autoloop/snapshots/{snapshot_id}.json", snapshot)

# Mirror to Talaris vault (hash-chained, append-only) — BEFORE apply
mirror_to_vault(snapshot)
```

### Step 2 — APPLY

```
# Acquire per-agent lease (concurrency control, §4)
lease = acquire_lease(agent_id, snapshot_id)
defer release_lease(lease)

# Re-read live config, assert it matches pre_image (If-Match semantics)
live_now = GET /api/agents/{agent_id}
if canonicalize(live_now.mutable_subset) != pre_image_canonical:
    # Config drifted since capture — refuse auto-apply
    return ESCALATE("config drift since capture — human review")

# Check manifest hasn't been tampered
assert sha256(filled_manifest) == snapshot.manifest_sha256
assert sha256(check_script) == snapshot.check_sha256

# Execute the PATCH
resp = PATCH /api/agents/{agent_id}
    body = planned_change
    headers = { "If-Match": snapshot.version }   # ETag / version guard

snapshot.state = "applied"
snapshot.applied_at = now()
persist(snapshot)   # Aegis + Talaris mirror
```

### Step 3 — VERIFY (probation-smoke)

```
# Run the probation-smoke on the CANDIDATE model
result = ringer.exec(manifest)           # runs on {{CANDIDATE_ENGINE}}/{{CANDIDATE_MODEL}}

if result.exit_code == 0 AND result.model == planned_change.target_model:
    snapshot.state = "verified"
    snapshot.verified_at = now()
    persist(snapshot)
    → PROBATION
else:
    → REVERT (see §3)
```

### Step 4 — PROBATION (live, supervised)

```
# After smoke PASS, the agent is live on real tasks under supervision:
#   ≥ 0.67 first-try pass rate over ≥ 3 supervised real tasks
#   (Wilson lower bound preferred; see DESIGN.md §9 Finding)
#
# Scope: probationary agents may only take non-destructive, reversible tasks.
#        Routing marks the agent "probation" until proven.
if probation_passed():
    → PROMOTE  (snapshot.state = "promoted")
else:
    → REVERT  (snapshot.state = "reverted")
```

---

## 3. Revert contract

```
revert(snapshot_id):
    snapshot = load_snapshot(snapshot_id)
    if snapshot.state not in ("applied", "verified"):
        return ERROR("not in revertible state")

    agent = GET /api/agents/{snapshot.agent_id}
    pre_image = snapshot.pre_image

    # ── Redacted-field special case (closed from DESIGN §9 Finding 2 / F2) ──
    # If the pre_image contained inline secrets (now redacted to placeholder),
    # revert EXCLUDES those fields from the PATCH — it does NOT re-PATCH
    # the placeholder over the live secret.
    if snapshot.redactions non-empty:
        # Merge-live: for redacted keys only, keep the current live value.
        # The PATCH includes all non-redacted mutable fields from pre_image.
        patch_body = pre_image.except_redacted_fields()
        # GET-verify is adjusted: assert non-redacted fields match;
        # assert redacted fields resolve (secret_ref liveness, §6).3)
    else:
        # Full-object revert: PATCH with the full pre_image
        patch_body = pre_image

    # Concurrency guard
    lease = acquire_lease(snapshot.agent_id, snapshot_id)
    defer release_lease(lease)

    # Version guard — refuse to stomp a newer change
    live = GET /api/agents/{snapshot.agent_id}
    if live.updatedAt != snapshot.version AND snapshot.state == "applied":
        # Only escalate if config has drifted since THIS snapshot was captured
        if canonicalize(live.mutable_subset) != pre_image_canonical:
            # Don't auto-revert over a newer change — escalate
            return ESCALATE("config changed since capture — human revert")

    # Execute revert
    PATCH /api/agents/{agent_id} body=patch_body
    GET /api/agents/{agent_id}  # verify

    snapshot.state = "reverted"
    snapshot.final_verdict = "reverted"
    persist(snapshot)

    # Post-revert secret liveness check (§6.3)
    if snapshot.redactions non-empty:
        verify_secret_refs_resolve(snapshot.agent_id)  # escalate if dead
```

**Key correction from adversarial review (Findings F1, F2):**
- Revert **excludes** redacted (secret) fields from the PATCH body.
  It does NOT write the placeholder over the live secret.
- The pre-image is scoped to the **mutable config subset only**
  (`adapterConfig`, `runtimeConfig`, `permissions`, `budgetMonthlyCents`),
  not the full server-managed GET body. (Finding F2: GET-verify equality
  against a full GET body is unsatisfiable.)
- Revert computes key-level diffs and explicitly handles keys added by
  `planned_change` that are absent from `pre_image`. (Finding F1:
  full-preimage PATCH cannot remove keys the change ADDED under merge
  semantics.)

---

## 4. Concurrency control

```
no_concurrent_auto_action(agent.id):
    # Atomic per-agent lease — acquire before CAPTURE, hold through REVERT
    try_acquire_lease(agent_id, snapshot_id, ttl=3600)    # fail → ESCALATE
```

**Lease semantics:**
- Acquire: create-if-absent lock record keyed on `agent_id`. If a lease
  already exists for this agent, refuse (ESCALATE — another change is in
  flight).
- Hold: the lease is held from CAPTURE through PROMOTE/REVERT.
- Release: on completion (promoted or reverted) or on crash (TTL expiry).
- Version guard: `apply` and `revert` both condition on
  `live.updatedAt == snapshot.version` (the version captured). A mismatch
  that does NOT match the pre_image triggers escalation, never stomp.

**Race condition addressed:** Two loop ticks cannot both pass
`no_concurrent_auto_action` before either records its action — the
create-if-absent lock is atomic. (Finding: no concurrency control — P1,
closed.)

---

## 5. Crash recovery & startup reconciler

**Snapshot state machine is persisted**, not in-memory:
```
states: captured → applied → verified → promoted | reverted
```

**Startup reconciler** runs on loop boot:
```
for snapshot in load_snapshots(state="applied", applied_at < now() - 1h):
    # Runner died between APPLY and VERIFY — the agent has an unproven
    # config live with no verdict.
    live = GET /api/agents/{snapshot.agent_id}
    if live.mutable_config != snapshot.planned_change:
        continue  # someone else fixed it
    # Auto-revert on the safe side
    revert(snapshot.id)  # fail-safe
    log("startup_reconciler: auto-reverted", snapshot.id)
```

This closes the gap where runner death after APPLY left a live, unproven,
unreverted config indefinitely. (Finding: no crash recovery — P1, closed.)

---

## 6. Secret handling & redaction

### 6.1 Inline secret detection

```
REDACTED_FIELDS = [
    "telegram_bot_token",       # Wings
    "authToken",                # Klaw, Klaude, Kloud
    "devicePrivateKeyPem",      # Kloud OpenClaw
    "apiKey",                   # providers
    # extended heuristically: any key matching *_token, *_key, *_secret,
    # *_private*, *_password
]
```

### 6.2 Redaction rule (pre-image capture)

If any `REDACTED_FIELDS` key appears with a non-`secret_ref` value in the
agent's `adapterConfig`/`runtimeConfig`:
- The value is replaced with `"__REDACTED__"` in the stored `pre_image`.
- A `Redaction` entry is added: `{ path: "adapterConfig.telegram_bot_token",
  note: "inline_secret_redacted", original_type: "string" }`.
- The snapshot is **forced into ESCALATE** (hard_escalate, see
  decision-policy.md §decide step 3). The loop never AUTO-applies or
  AUTO-reverts a redacted snapshot — a human must re-enter the secret.

### 6.3 Secret_ref preservation at revert

For non-redacted snapshots (normal case), the pre_image stores
`secret_ref` pointers, never resolved secret values. The post-revert
GET-verify includes a **liveness check**:
```
verify_secret_refs_resolve(agent_id):
    for ref in agent.adapterConfig.secret_refs:
        if not secret_store.exists(ref.secretId, version=ref.version):
            return ESCALATE("secret_ref does not resolve")  # dead secret
    return OK
```

This addresses the gap where a restored `secret_ref` pointer passes
GET-verify but resolves to a dead/wrong secret. (Finding: env secret_ref
does not restore secret — P3, closed.)

---

## 7. Storage & mirror

```
Aegis (primary):
  ~/.paperclip-autoloop/snapshots/{snapshot_id}.json    # append-only

Talaris vault (mirror, hash-chained):
  ~/Vault/.paperclip-autoloop/snapshots/{snapshot_id}.json
  ~/Vault/.paperclip-autoloop/decisions/{snapshot_id}.decision.hash   # hash chain entry
```

- The Talaris mirror is **hash-verified** against `pre_image_sha256`
  and is a **designated secondary** source of truth with an emergency-revert
  procedure. (Finding: Aegis-only snapshots, no off-host path — P2/P3, closed.)
- Retention: `≥30 days after superseded-ok/reverted`, EXCEPT the pre-image
  of **currently-live** changes is retained for the life of that change.
  (Finding: 30-day GC deletes live-change pre-image — P2, closed.)
- `revert()` fails loudly ("no pre-image within retention") instead of
  silently selecting an older snapshot.

---

## 8. Kill-switch interaction

- The kill-switch (`AUTOLOOP_ENABLED`) is a single source of truth: the
  Paperclip control record, read by the runner each cycle. The Aegis
  file flag is a local override that can only **disable**, never **enable**.
  (Finding: dual source, no conflict semantics — P3, closed.)
- Transition to `AUTOLOOP_ENABLED=true` requires an authenticated human
  action logged as a governance event; the loop structurally cannot set it.
- **REVERT is never blocked** by the kill-switch — even if the loop is
  disabled, a human can invoke revert. This is preserved from the original
  spec.

In-flight behavior: when the kill-switch is flipped mid-run, in-flight
probation runs finish and **auto-revert on the safe side** (fail-closed).

---

## 9. Verifiers

```bash
# 1. Snapshot pre_image must contain ONLY mutable config fields
#    (no server-managed volatile fields)
jq -e '.pre_image | has("status")' snapshot.json  # expect: false (error)

# 2. Redacted fields must be "__REDACTED__" not cleartext
jq -r '.redactions[].path' snapshot.json | while read path; do
    jq -e --arg p "$path" '$pre_image | getpath($p | split(".") | map(tonumber? // .)) | . == "__REDACTED__"' snapshot.json
done

# 3. Redacted snapshots must NEVER be auto-reverted (state must be ESCALATE)
jq -e '.redactions != [] and .state == "captured"' snapshot.json  # expect: ESCALATE, not applied

# 4. pre_image_sha256 must verify against canonicalized pre_image
canonicalize-pre-image.py snapshot.json | sha256sum -c <(echo "${pre_image_sha256}  -")
```
