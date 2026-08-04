# JAC-4538 — Publication Contract: Pointer Projection vs Canonical Ownership (Plan)

**Date:** 2026-08-04
**Work mode:** Planning only — no code
**Author:** Kimi Code via Ringer (hermes_local)
**Issue:** JAC-4538 [JAC-3929] P2: Publication contract — pointer projection vs canonical ownership
**Branch:** JAC-3929-fleet-wide-ai-token-run-observatory-reconciled-initiative-and-approval-gate
**Parent:** JAC-3929 Fleet-wide AI Token & Run Observatory
**Priority:** High
**Depends on:** JAC-3930 (telemetry contract), JAC-3932 (privacy-safe replay)

---

## 0. Purpose and scope

This document is the planning artifact for JAC-4538. It addresses the Ringer
judge finding (Gate 6 — Publication) that the current publication wording could
blur **pointer projection** (Paperclip/Ringer storing metadata, pointers, and
hashes that reference canonical documents elsewhere) with **canonical ownership**
(Paperclip/Ringer being the authoritative copy of those documents).

The fix has two parts:

1. **Re-word the publication contract** so it is unambiguous: Paperclip and Ringer
   store approval/evidence pointers, status summaries, and hashes only; canonical
   documents remain in Vault/OKF and versioned Agentic OS.
2. **Add an approval gate** for any operation that would copy a full report, raw
   transcript, or private payload into Paperclip or Ringer — this must require
   explicit separate approval, not happen implicitly via projection hooks.

**Non-goals:**
- No code execution, no provider-account changes, no telemetry configuration.
- No dashboard external publication (covered by JAC-3934 and JAC-3929 Gate 6).
- No changes to the canonical storage locations (Vault/OKF, Agentic OS) — these
  remain external to the Paperclip repo.

---

## 1. Evidence

### 1.1 The judge finding (verbatim)

From the Ringer independent judge report (`report.md`, SHA-256 `a24277b3`),
Finding 7 (Gate 6 — Publication), lines 99–105:

> **Finding: Publication wording could blur pointer projection with canonical ownership**
>
> Evidence: The brief says publication stays pointer-based and Paperclip/Ringer
> receive projection/evidence pointers rather than canonical ownership
> (`fleet-spend-observatory-ringer-review-brief-v1-20260729T201251Z.md:57-58`).
> The ADR states Vault/OKF and versioned Agentic OS documents remain canonical,
> while Paperclip and Ringer records are operational projections
> (`docs/fleet/adr-aegis-3.1-paperclip-ringer-peer-planes-v1-20260729T201251Z.md:23-25`).
> The master map later says canonical results are "duplicated into Paperclip
> artifacts and Vault/OKF according to approved publication policy"
> (`docs/fleet/master-operating-system-map-v2-20260729T201251Z.md:177-178`).
>
> Impact: "Duplicated into Paperclip artifacts" can be read as making Paperclip a
> document store or private transcript sink, conflicting with the privacy boundary
> and creating stale parallel artifacts.
>
> Fix: Change the publication contract to "Paperclip and Ringer store
> approval/evidence pointers, status summaries, and hashes only; canonical documents
> remain in Vault/OKF and versioned Agentic OS." Require a separate approval before
> copying any full report, raw transcript, or private payload into Paperclip or
> Ringer.

### 1.2 Canonical source documents (not in repo — references only)

These are Vault/OKF documents referenced by the judge. They are canonical but
stored outside the Paperclip repo:

- `docs/fleet/adr-aegis-3.1-paperclip-ringer-peer-planes-v1-20260729T201251Z.md` (ADR)
  - §23–25: "Vault/OKF and versioned Agentic OS documents remain canonical;
    Paperclip and Ringer records are operational projections"
- `docs/fleet/master-operating-system-map-v2-20260729T201251Z.md` (master map)
  - Lines 177–178: "canonical results are duplicated into Paperclip artifacts
    and Vault/OKF according to approved publication policy" — **this is the
    wording that creates ambiguity**
- `fleet-spend-observatory-ringer-review-brief-v1-20260729T201251Z.md` (brief)
  - Lines 57–58: "publication stays pointer-based and Paperclip/Ringer receive
    projection/evidence pointers rather than canonical ownership"

### 1.3 Publication contract wording currently in the Paperclip codebase

A targeted search of the Paperclip repo shows **no single document currently
states the publication contract**. The relevant concepts are scattered:

- `doc/SPEC.md` (line 146): "Each agent publishes a short description of their
  responsibilities and capabilities" — but this refers to agent self-description,
  not the pointer-vs-canonical contract.
- `doc/SPEC-implementation.md`:
  - §7.15: Documents/work products/attachments schema. Documents store `latest_body`
    (full text). Attachments store object metadata (sha256, content_type, byte_size)
    but NOT inline content — objects are stored by provider (local_disk/s3).
  - §10.4: `thin` context delivery sends "IDs and pointers only; agent fetches
    context via API."
  - §16 Security: "store only hashed agent API keys", "redact secrets in logs".
- `packages/db/src/schema/run_events.ts` (lines 4–28): The run_events table comment
  references JAC-4532 (event identity), JAC-4533 (privacy/retention), and JAC-4534
  (action-safety), including `publicationStatus` with values
  `["published", "pending", "blocked", "unknown"]` and the comment: "Whether cost/
  usage publication is safe for downstream consumers. Fail-closed: unknown = blocked."
  This field exists but has no governing contract text — it's a status flag without
  a defined policy for when publication transitions from `pending`/`unknown` to
  `published`.
- `packages/shared/src/constants.ts` (line 863): `PUBLICATION_STATUSES` enum.
- `docs/projects/token-observability/dashboard-d3-wireframes.md` (line 250):
  "Claude/Codex/Kimi transcript bodies are content-bearing → replay stores POINTER
  + hash tier only, never raw (JAC-4211 §5 redaction)" — this is the dashboard
  rendering contract, not the publication storage contract.
- `doc/plans/2026-08-04-jac-3929-gate-checklist.md` (line 57): Gate 6 checklist item
  — "Exact pointer surfaces projected to Paperclip/Ringer (pointer-only, not canonical
  ownership)" and (line 61) "Dashboard publication can revert to previous versioned
  artifact."

**Conclusion:** The publication contract is underspecified in the Paperclip repo.
There is no single document that states: "Paperclip stores pointers/hashes/summaries
only; canonical documents live elsewhere." The judge finding asks us to create that
contract.

### 1.4 Where the ambiguity lives

The problematic wording ("duplicated into Paperclip artifacts") is in
`docs/fleet/master-operating-system-map-v2-*.md` (a Vault/OKF doc). The Paperclip
repo has no equivalent normative doc. There is also no Paperclip-side language
that explicitly **counters** the ambiguity — nowhere in SPEC-implementation.md or
the plan docs does it say "Paperclip does NOT store canonical documents."

### 1.5 The Ringer projection hook (`paperclip_projector.py`)

From `/Users/hermes/.hermes/worktrees/ringer-fleet-wave-candidate-20260716-v1/hooks/paperclip_projector.py`
(line 65–121): The `format_verdict_comment` function currently projects a
**partial payload** — not a full report or transcript, but not a pure pointer
either. It embeds:
- `run_id`, `run_name`, `identity`, `started_at`, `state` — metadata (acceptable)
- `pass_count`, `fail_count`, `total_tokens` — status summary (acceptable)
- Per-task table with key, status, verdict, attempts, elapsed, model — status
  summary (acceptable; model is a coarse routing label already public in Ringer
  receipts)
- `report_path` — **raw filesystem path** (`/Users/hermes/.../report_path`)
  exposing the executor's home directory layout (problematic — not a portable
  pointer)
- `artifact_path` — **raw filesystem path** (same concern as `report_path`)
- Dashboard URL `http://127.0.0.1:8700` — localhost-bound, non-portable,
  misleading to remote readers (problematic)

The hook does NOT currently copy full report content, raw transcript text, or
private payload data into Paperclip comments. It projects a structured verdict
summary. However, the raw filesystem paths and total_tokens aggregate are
problematic under the target contract: paths should be replaced with content
hashes + receipt references, and `total_tokens` should be replaced with
per-agent `not_reported` (no safe zero, per JAC-4530).

### 1.6 Work product creation flow (how documents/artifacts enter Paperclip)

From `server/src/routes/issues.ts` (line 6426) and the `issueWorkProducts` schema
(`packages/db/src/schema/issue_work_products.ts`):

- `POST /issues/:id/work-products` creates a work product. It supports:
  - `type: "artifact"` with `provider: "paperclip"` → references an attachment
    (full file stored in `assets` table, sharded by provider local_disk/s3).
  - `type: "artifact"` with `provider: "<external>"` → references an external
    system by `externalId`.
  - `metadata.resourceRef.kind: "workspace_file"` → references a file in a
    workspace (pointer only).
- `POST /companies/:companyId/issues/:issueId/attachments` uploads file content
  to `assets` — this is the path where full file content enters Paperclip.
- Work products carry `sourceTrust` metadata (from `SourceTrustMetadata` type)
  and `sourceTrust` JSONB column, indicating a trust level for the source.

**Key observation:** The attachment upload + work-product creation flow is the
current path for putting full report files or raw transcripts into Paperclip.
There is no approval gate on this path — if an agent uploads a full transcript as
an attachment and creates an artifact work product, it just happens.

---

## 2. Design

### 2.1 The publication contract (normative text)

The following text should be added as a new subsection in `doc/SPEC-implementation.md`
under the Documents/Artifacts section (near §7.15), and referenced from the
AGENTS.md guidance for agents:

> **Publication Contract — Pointer Projection vs Canonical Ownership**
>
> Paperclip and Ringer store **approval/evidence pointers, status summaries, and
> hashes only**. They do not store canonical full-content documents, raw
> transcripts, or private payloads as their authoritative copy. Canonical documents
> remain in Vault/OKF and versioned Agentic OS repositories.
>
> When Paperclip needs to reference a canonical document (a report, transcript, or
> private payload), it stores:
> - A **pointer**: an identifier or locator (e.g., Vault version ref, OKF document
>   ID, workspace file path relative to a registered workspace).
> - A **hash**: SHA-256 of the referenced content for integrity verification.
> - A **status summary**: structured fields (verdict, pass/fail counts, token
>   counts, timestamps, model/provider attribution) derived from the source.
>
> Paperclip may store full file content **only** as a cached attachment via the
> `assets`/`issue_attachments` mechanism, and only when:
> 1. The attachment is explicitly approved for ingestion into Paperclip (separate
>    approval step, not implicit), AND
> 2. The content is classified as non-sensitive (not raw prompts, not full private
>    transcripts, not credentials or personal data).
>
> Copying any full report, raw transcript, or private payload into Paperclip or
> Ringer requires a **separate, explicit approval** — it must not happen
> implicitly via projection hooks, adapter output processing, or auto-projection.
> This approval is recorded in the `approvals` table with type
> `publish_full_artifact` (new type, see §2.3).
>
> Paperclip's `publication_status` field (on `run_events`) tracks whether a run's
> cost/usage data is safe to publish downstream; the same fail-closed principle
> applies to full-content publication: `unknown` = blocked until explicit approval.
>
> **What NEVER enters Paperclip or Ringer as content (without explicit approval):**
> - Raw filesystem paths exposing the executor's home directory layout
>   (`/Users/hermes/...`). Use content hashes + receipt references instead.
> - Full run-state `notes` field content (contains raw check output, spec text,
>   missing-file lists).
> - Raw transcript text or full report body content.
> - Credentials, API keys, or personal data.
> - Localhost-bound dashboard URLs (non-portable, misleading to remote readers).
> - Aggregate `total_tokens` without per-agent decomposition (no safe zero per
>   JAC-4530); project as `not_reported` with a pointer to per-agent breakdowns.

### 2.2 Approval gate for full-content publication

A new approval type `publish_full_artifact` must be added to the approval system.
The flow:

1. Agent or adapter identifies a full report, raw transcript, or private payload
   that should be stored in Paperclip (e.g., as an attachment + artifact work product).
2. A `publish_full_artifact` approval is created on the relevant issue, carrying:
   - `artifact_kind`: `"full_report" | "raw_transcript" | "private_payload"`
   - `artifact_pointer`: source identifier (Vault ref, workspace path, etc.)
   - `artifact_sha256`: hash of the content for later integrity verification
   - `justification`: why full content is needed in Paperclip (not just a pointer)
   - `redaction_state`: `"unredacted" | "partially_redacted" | "fully_redacted"`
3. Board approval is required before the attachment upload + work product creation
   proceeds.
4. Once approved, the upload and work-product creation carry the approval ID in
   `sourceTrust` metadata for audit.

### 2.3 Changes to the codebase

This section lists what code/doc changes JAC-4538 would trigger. Per the planning
directive, these are NOT implemented here — they are the sub-task decomposition
for follow-up implementation issues.

#### 2.3.1 Documentation changes

1. **`doc/SPEC-implementation.md`** — Add the normative "Publication Contract"
   text (§2.1 above) as a new subsection under §7.15, and add a note in §8
   (State Machines) or §11 (Adapter Contract) that the adapter's output
   projection must be pointer-only by default.

2. **`doc/SPEC.md`** — No change needed; SPEC.md is long-horizon and already
   states "not a knowledge base" and "control plane, not execution plane."
   The publication contract belongs in the implementation spec.

3. **`doc/DEVELOPING.md`** (or `doc/AGENT-ARTIFACTS.md`) — Add a note that
   agents should never upload full transcripts or raw payloads as attachments
   without explicit board approval. Link to the new approval type.

#### 2.3.2 Schema changes

1. **`packages/shared/src/constants.ts`** — Add `"publish_full_artifact"` to the
   `APPROVAL_TYPES` array (line 621–626).

2. **`packages/db/src/schema/issue_approvals.ts`** — Add columns to carry the
   artifact metadata: `artifact_kind` (text), `artifact_pointer` (text),
   `artifact_sha256` (text), `justification` (text), `redaction_state` (text,
   default `"unredacted"`). These are nullable so existing approvals are
   unaffected.

3. **`packages/db/src/schema/issue_work_products.ts`** — Add an optional
   `publicationApprovalId` foreign key referencing `issue_approvals.id`, set
   when the work product was created from an approved full-content publication.
   This ties the artifact work product to its approval for audit.

#### 2.3.3 Route changes

1. **`server/src/routes/issues.ts`** — In the `POST /issues/:id/work-products`
   handler (line 6426), add a check: if the work product `metadata.resourceRef`
   is absent and the `type` is `"artifact"` with `provider: "paperclip"` (i.e.,
   it's an attachment-backed artifact, not a pointer), verify that a
   `publish_full_artifact` approval exists and is approved. If not, return 403
   with an error explaining the approval requirement.

   Note: `workspace_file` resource refs are already pointers — they do NOT
   require approval. Only full attachment uploads require the gate.

2. **`server/src/routes/issues.ts`** — In the
   `POST /companies/:companyId/issues/:issueId/attachments` handler (line 10406),
   add a check that an approved `publish_full_artifact` approval exists before
   allowing the upload of any attachment whose content type suggests a full
   report/transcript (e.g., `text/plain`, `text/markdown`, `application/pdf`,
   `application/x-json`). Smaller artifact types (images, screenshots) can use
   the `artifact` work-product path directly without a separate approval, since
   they are not "full reports, raw transcripts, or private payloads."

   **Open question (§4.1):** What is the precise content-type or size threshold
   that triggers the approval gate? See §4.

#### 2.3.4 Adapter/projector changes

1. **`paperclip_projector.py`** (Ringer hook, in `~/.hermes/worktrees/...`) —
   Update `format_verdict_comment` to emit pointer-style comments instead of
   raw payload. Specifically:
   - Replace `artifact_path` and `report_path` raw filesystem paths with:
     - `artifact_hash: <sha256>` (when deliverable exists, else "not_reported")
     - `evidence_pointer: runs/<run_id>.json#sha256=<contract_sha256>`
   - Replace `total_tokens` aggregate with `tokens: not_reported (per-agent,
     see composite adapter)` — no safe zero per JAC-4530.
   - Remove dashboard URL (localhost-bound, non-portable).
   - Keep per-task verdict summary (key, status, verdict, model) — coarse
     routing labels already in Ringer receipts.
   - Bump marker from `<!-- ringer-projection-v1:{digest} -->` to v2 so
     old-style comments are not re-projected.
   - Add a citing comment referencing the publication contract (§2.1) to prevent
     future drift.

2. **Paperclip adapters** (in `packages/adapters/`) — Audit all adapter output
   processing paths to ensure no adapter copies raw transcript content into work
   products or attachments without the approval gate (§2.2). This is a broader
   audit (see §4.2 for open questions).

### 2.4 Where canonical documents live (pointer targets)

The publication contract says canonical documents remain in Vault/OKF and
versioned Agentic OS. From the judge report and SPEC-implementation.md, the
pointer surfaces are:

- **Vault/OKF**: External knowledge graph / document store. Paperclip stores a
  pointer (Vault version ref or document ID) + SHA-256 hash.
- **Agentic OS (versioned)**: Git-tracked documents in the agentic OS repository.
  Pointers can be `repoUrl` + git ref + file path (as referenced in
  SPEC-implementation.md §10.4: `thin` sends "IDs and pointers only").
- **Workspace files**: For execution-time generated files, `workspace_file`
  resource refs already serve as pointers (see AGENT-ARTIFACTS.md §"Workspace
  Files").

---

## 3. Acceptance criteria

1. **Contract text exists** in the Paperclip repo: `doc/SPEC-implementation.md`
   contains the normative publication contract stating "Paperclip and Ringer
   store approval/evidence pointers, status summaries, and hashes only; canonical
   documents remain in Vault/OKF and versioned Agentic OS." — plus the "What NEVER
   enters Paperclip" exclusion list (§2.1).

2. **Approval gate exists**: A `publish_full_artifact` approval type is defined
   in `packages/shared/src/constants.ts`, and the schema/docs describe its fields.

3. **Enforcement exists**: The work-product creation and attachment upload routes
   in `server/src/routes/issues.ts` reject full-content publication without an
   approved `publish_full_artifact` approval.

4. **Audit trail**: Work products created from approved full-content publication
   carry `publicationApprovalId` linking back to the approval record.

5. **No regression**: Existing `workspace_file` pointer references and
   pointer-only projections continue to work without requiring approval.

6. **Guidance exists**: `doc/AGENT-ARTIFACTS.md` (or `doc/DEVELOPING.md`)
   documents that agents must not upload full transcripts or private payloads
   without explicit board approval; pointer-only is the default.

7. **Projector contract**: The Ringer `paperclip_projector.py` hook's
   `format_verdict_comment` emits pointer-style comments only — raw filesystem
   paths replaced with content hashes + evidence pointers, `total_tokens`
   replaced with `not_reported`, dashboard URL removed, v2 marker used.
   Full-content inlining is guarded against.

---

## 4. Open questions and risk areas

### 4.1 What triggers the full-content approval gate?

- **Content types?** The judge says "full report, raw transcript, or private
  payload." We need a concrete definition: file type (text/markdown/pdf/json),
  file size threshold, or semantic classification.
- **Scope?** Should the gate apply to all attachments, or only to those on issues
  linked to Ringer runs? A narrow gate (only on observatory-linked issues) is
  safer but harder to enforce generically.
- **Recommendation:** Start narrow — gate on `text/*` and `application/pdf` and
  `application/json` content types for `artifact`-type work products, and on
  attachments uploaded to issues that have a Ringer run-linked tag. Revisit for
  broader scope after V1.

### 4.2 Pointer-only vs full-content boundary for adapter outputs

- Some adapters (e.g., `hermes_local`) naturally produce full transcripts and
  reports as workspace files. The boundary is: workspace files are pointers
  (`workspace_file` ref), but uploading them as attachment-backed artifacts
  is full-content publication.
- **Question:** Should the adapter auto-approve uploading its own run reports?
  The judge finding says NO — "require a separate approval." The approval must
  be explicit, not adapter-auto-approved.

### 4.3 Ringer projector drift

- The `paperclip_projector.py` hook currently only projects verdicts (status
  summaries + paths), which is compliant. But the hook's `find_manifest` function
  and `extract_cross_links` could be extended in the future to inline full
  report contents. The plan should add an explicit guard or comment.

### 4.4 Interaction with JAC-4533 (privacy/retention)

- JAC-4533 adds `redaction_state` to events. The publication contract's
  `redaction_state` on the approval record should reuse the same enum
  (`unredacted | partially_redacted | fully_redacted`).
- The approval gate for full-content publication should enforce that
  `redaction_state` is set appropriately before the attachment is stored.

### 4.5 Interaction with JAC-3932 (privacy-safe replay)

- JAC-3932 defines the replay contract (pointer + hash, no raw payload). The
  publication contract's "pointers only" mandate is consistent with JAC-3932's
  replay model. The plan should reference JAC-3932 as the replay-side enforcement:
  replay never re-emits full content, only pointers.

### 4.6 Backward compatibility

- Existing attachment-backed artifact work products in the database were created
  without the approval gate. The enforcement should be **forward-only**: new
  publications require approval; existing ones remain accessible. A migration
  could backfill `publicationApprovalId = NULL` on existing work products.

---

## 5. Planned sub-tasks (for follow-up issues after approval)

1. **Sub-task A** — Add `publish_full_artifact` to `APPROVAL_TYPES` and add
   artifact metadata columns to `issue_approvals` schema. Generate migration.

2. **Sub-task B** — Add `publicationApprovalId` FK to `issue_work_products`
   schema. Generate migration.

3. **Sub-task C** — Enforce approval gate in
   `POST /issues/:id/work-products` route: reject attachment-backed artifact
   work products without an approved `publish_full_artifact` approval.

4. **Sub-task D** — Enforce approval gate in
   `POST /companies/:companyId/issues/:issueId/attachments` route: reject
   full-content attachment uploads without approval (based on content-type
   threshold defined in §4.1).

5. **Sub-task E** — Add publication contract normative text to
   `doc/SPEC-implementation.md` (§7.15 addition).

6. **Sub-task F** — Update `doc/AGENT-ARTIFACTS.md` (or `doc/DEVELOPING.md`)
   with guidance: agents must not upload full transcripts or private payloads
   without explicit board approval; pointer-only is the default.

7. **Sub-task G** — Add enforcement guard to `paperclip_projector.py` (Ringer
   hook): reject any attempt to inline full report content into a Paperclip
   comment. Add citing comment referencing the publication contract.

8. **Sub-task H** — Audit all Paperclip adapters (`packages/adapters/hermes/src/`,
   `packages/adapters/ringer-kimi/`, etc.) for any path that copies full
   transcript content into a work product or attachment. Add guards where
   missing.

---

## 6. Dependencies

| Issue | Status | Relevance |
|-------|--------|-----------|
| JAC-3929 | in_progress (critical) | Parent — publication gate is one of the 6 approval gates |
| JAC-3930 | in_review | Telemetry contract — the `publication_status` field on run_events derives its semantics from this contract |
| JAC-3932 | in_review | Privacy-safe replay — pointer/hash-only replay is the read-side counterpart to this write-side contract |
| JAC-3933 | done | Detectors — not directly impacted, but detector findings should not trigger full-content publication |
| JAC-4533 | todo | Privacy/retention schema fields — the `redaction_state` on the approval record reuses this enum |
| JAC-4534 | todo | Action-safety semantics — `publicationStatus` fail-closed (`unknown = blocked`) is already modeled in run_events |
| JAC-4535 | todo | Freshness split — may affect when `publication_freshness` is updated after pointer verification |

**Blocking gate:** JAC-3929 Gate 6 (Publication gate) is pending. This plan
addresses the finding but implementation requires board approval of the gate.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Agents can't get full reports when they genuinely need them in Paperclip | The `publish_full_artifact` approval type makes the exception path explicit and auditable; board can approve case-by-case |
| Content-type threshold (§4.1) is too narrow/broad | Start narrow (text/markdown/pdf/json); ship with a configurable allowlist; revisit after V1 feedback |
| Existing work products lack approval records (backward compat) | Forward-only enforcement: new publications require approval; existing ones remain accessible with `publicationApprovalId = NULL` |
| Ringer projector hook drifts and starts inlining full content | Add explicit guard + comment in `paperclip_projector.py`; tests in Ringer's own suite |
| Adapter audit (Sub-task H) misses a path | The audit is a follow-up; initial implementation focuses on the route-level gate + documentation |

---

## 8. Approval gate

This plan is `workMode: planning` per JAC-4538. Per the Paperclip execution
contract for plan approval:

1. This plan document is the plan revision.
2. After writing this plan, create a `request_confirmation` interaction targeting
   this plan revision with `idempotencyKey:
   confirmation:JAC-4538:plan:v1`.
3. Wait for acceptance before creating implementation sub-tasks (Section 5).
4. If board/user comments supersede this plan, create a fresh confirmation
   against the revised revision.

**Blockers:** JAC-3929 Gate 6 (Publication gate) is pending board approval.
Implementation of sub-tasks A–H cannot begin until the gate is approved.
Planning (this document) is unblocked.

---

## 9. Verification checkpoint (2026-08-04T03:34Z)

**Run:** 7520ca25-07d8-4c29-a9e5-6936f6754e39 (Kimi Code via Ringer — handoff consumption)

**Verified:**
- Plan document exists at `doc/plans/2026-08-04-jac-4538-publication-contract-pointer-projection.md` (532 lines, ~28 KB)
- §1.5 matches actual `paperclip_projector.py` source (format_verdict_comment at lines 65–121)
- Prior run comments verified on issue a17cfe55 (4 agent comments + 1 system notice)
- `request_confirmation` interactions created: 62b5c266 (canonical) and 5aa27d65 (duplicate) — both now **expired**; a fresh confirmation is needed when upstream gates clear.
- No source mutations performed — planning only

## 10. Verification checkpoint (2026-08-04T16:30Z)

**Run:** dd3f760a (Kimi Code via Ringer — heartbeat re-verification)

**Upstream dependency status (live API verified, unchanged since §9):**
| Dependency | Status | Assignee | Last Activity |
|---|---|---|---|
| JAC-3929 (parent) | blocked | dc2ca597 (Coordinator) | 2026-08-04T16:28Z |
| JAC-3930 (telemetry contract) | in_review | none (board) | 2026-08-01T01:15Z |
| JAC-3932 (privacy-safe replay) | in_review | none (board) | 2026-07-31T21:56Z |

**Confirmation interactions:**
- `62b5c266` — canonical request_confirmation, **status: expired**
- `5aa27d65` — duplicate request_confirmation, **status: expired**

**Assessment:** Both upstream gates remain in_review with no recent activity.
The plan is complete and correct — no updates needed to the plan content itself.
The two expired confirmation interactions must be reissued (fresh idempotencyKey
`confirmation:JAC-4538:plan:v2`) once JAC-3930 and JAC-3932 reach approved
status, per the directive in §8.4.

**No source mutations performed — planning only.**

**Verification token:** jack-green-phoenix
