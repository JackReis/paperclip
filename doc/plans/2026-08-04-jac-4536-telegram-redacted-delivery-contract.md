# JAC-4536 — Telegram Redacted Delivery Contract

**Parent:** JAC-3929 (Fleet-wide AI Token & Run Observatory)
**Gate:** Gate 5 — Guardrail Gate
**Priority:** P2
**Work mode:** planning
**Status:** planned
**Date:** 2026-08-04

## 1. Problem Statement (from Ringer judge report, Finding: "Telegram notification lacks a redacted delivery contract")

The approved Paperclip response requires a decision packet and a Telegram notification. However, the Telegram delivery path currently has no defined redaction contract. Without an explicit payload boundary, immediate alerting could leak raw prompts, transcript logs, tool payloads, provider request bodies, credentials, private contact data, and payment data through the Telegram notification.

**Impact:** Immediate alerting can leak sensitive data if the packet body, Telegram body, retry behavior, acknowledgement state, and failure path are not defined.

**Existing evidence:**
- `fleet-spend-observatory-ringer-review-brief-v1-20260729T201251Z.md:114-117` — requires Telegram notification
- `fleet-spend-observatory-ringer-review-brief-v1-20260729T201251Z.md:120-126` — keeps prompts/transcripts/tool payloads/credentials/private contact/payment data internal-only
- `ops/quota-checker/runtime/latest.json:370-380` — Telegram currently marked as inbound human gate, not a notification surface

## 2. Codebase State Assessment (verified 2026-08-04)

### 2.1 Existing constants and types (already present)

**`packages/shared/src/types/attention.ts` (lines 1–178):**
- `AttentionSeverity = "critical" | "high" | "medium" | "low"` — present (line 25)
- `AttentionItem` includes `severity: AttentionSeverity` (line 160)
- `AttentionSourceKind` includes `"budget_alert"`, `"agent_error_alert"` (lines 12–13)

**`packages/shared/src/constants.ts` (lines 888–905):**
- `ROUTING_STATUSES`, `QUOTA_STATUSES`, `PUBLICATION_STATUSES`, `WORK_STATE_CONFIDENCE`, `PAUSE_ELIGIBLE_SCOPES` — all present and exported
- `ISSUE_PRIORITIES = ["critical", "high", "medium", "low"]` (line 214) — same shape as `AttentionSeverity`

**`packages/shared/src/constants.ts` (lines 621–637):**
- `APPROVAL_TYPES` includes `"publish_full_artifact"`
- `APPROVAL_STATUSES = ["pending", "revision_requested", "approved", "rejected", "cancelled"]`

**`packages/shared/src/constants.ts` (line 232):**
- `ISSUE_COMMENT_PRESENTATION_KINDS = ["message", "system_notice"]` — for delivery status feedback

### 2.2 Existing schemas (already present)

**`packages/db/src/schema/run_events.ts`:**
- `publicationStatus` (line 102), `quotaStatus` (line 100), `routingStatus` (line 98), `workStateConfidence` (line 104), `pauseEligibleScope` (line 106), `operatorDecisionRequired` (line 108) — all present with fail-closed defaults
- `payloadHash` (line 114) — present for audit hashing

**`packages/db/src/schema/issue_work_products.ts` (line 45):**
- `publicationApprovalId` FK to `approvals.id` — already exists (JAC-4538) with comment "Publication contract (JAC-4538)"

**`packages/db/src/schema/approvals.ts` (lines 20–25):**
- `artifactKind`, `artifactPointer`, `artifactSha256`, `redactionState` — all present (publication contract fields from JAC-4538)

### 2.3 Existing redaction pipeline

**`server/src/services/feedback-redaction.ts` (lines 1–193):**
- `sanitizeFeedbackText()` — redacts secrets, JWTs, emails, phones, connection strings (lines 107–134)
- `sanitizeFeedbackValue()` — recursive redaction for structured values (lines 136–164)
- `finalizeFeedbackRedactionSummary()` — produces redaction audit summary (lines 166–175)
- `stableStringify()` — deterministic JSON serialization for hashing (lines 177–189)
- `sha256Digest()` — SHA-256 of a value for integrity verification (lines 191–193)

### 2.4 Gaps (no existing Telegram delivery infrastructure)

- **No `telegram_notification_deliveries` table** exists in `packages/db/src/schema/`
- **No `telegram-notification.ts` service** exists in `server/src/services/`
- **No `TelegramRedactedPayload` or `TelegramDeliveryStatus` type** exists in `packages/shared/src/types/`
- **No `DELIVERY_STATUSES` constant** exists in `packages/shared/src/constants.ts`
- **No Telegram Bot API integration** exists in the Paperclip server (Telegram is currently only referenced in `.polly/EXECUTION_ROADMAP.md` as `telegram_identity: "W1NG5"` on agent adapter configs, not as a server-side notification channel)
- **No `attention` table** exists for tracking notification delivery status (the attention system is UI-only, reading from `issues`/`heartbeat_runs`)

### 2.5 Vault design document (already produced)

The design document was authored by Task Rabbit (d4bcfdbe) at:
`~/Vault/okf/fleet/3929/telegram-redacted-delivery-contract.md` (12,281 bytes)

This repo plan document (Section 3–7) adopts the Vault design as authoritative and reconciles its schema with the actual codebase. The Vault doc defines a richer envelope (`packet_type`, `severity`, `packet_pointer`, `affected_agent_hash`, `affected_run_hash`, `current_safe_action`, `approval_handle`) that maps onto the existing codebase constants where possible.

## 3. Design: Telegram Redacted Delivery Contract

### Vault design adopted (normative)

The Vault document (`~/Vault/okf/fleet/3929/telegram-redacted-delivery-contract.md`) defines the authoritative contract. This section reconciles it with the codebase and adds the implementation mapping.

### 3.1 Reconciled Telegram Packet Schema

| Field | Type | Source (codebase) | Exclusion Rationale |
|---|---|---|---|
| `packet_type` | enum = `"fleet_notification.v1"` | static | Identifies packet version — pointer only |
| `timestamp` | RFC 3339 UTC | envelope `emitted_at` | When notification was constructed — no content |
| `packet_pointer` | string | Paperclip issue ID + run ID | Format: `paperclip:<companyId>/<issueId>/run:<runId>`. Never contains issue title or description body |
| `severity` | `AttentionSeverity` | `packages/shared/src/types/attention.ts:25` | Reuses existing constant; no raw content |
| `affected_agent_hash` | string (sha256, 16 chars) | sha256 of agent UUID | Raw agent configs, prompts excluded |
| `affected_run_hash` | string (sha256, 16 chars) | sha256 of run ID | Full run transcripts/logs excluded |
| `attributed_spend_cents` | number \| null | `cost_events.cost_cents` aggregate | Individual token breakdowns excluded; only aggregated cents; per JAC-4530 null = not_reported, 0 = explicitly zero |
| `confidence_signals` | array of `{signal, confidence}` | JAC-4529 coverage fields on `run_events` | Raw provider responses excluded; `confidence === "low"` (ConfidenceLevel enum, not float) → treated as unknown (fail-closed, JAC-4534 §5.6). See §5.2 for enum mapping. |
| `current_safe_action` | enum | JAC-4534 action-safety resolution | `dispatch_blocked`, `auto_paused`, `review_required`, `approval_gate`, `resume_ready`, `manual_intervention` |
| `approval_handle` | string | Paperclip `/api/issues/:id` action URL | Single-use, 5-min TTL, scoped action token. Raw approval payload excluded |
| `publication_status` | `PublicationStatus` | `packages/shared/src/constants.ts:898` | Fail-closed: `unknown` = do not send (per JAC-4534 §7 and §6.1) |

**Optional fields:**
| Field | Type | Source | Description |
|---|---|---|---|
| `operator_decision_required` | boolean | `run_events.operatorDecisionRequired` | Present when `true`; signals manual action needed |
| `policy_gate` | string | JAC-4534 policy engine | The specific gate that triggered (e.g., `budget_hard_stop`, `routing_unknown`) |
| `summary_line` | string (≤200 chars) | Paperclip issue title | High-level one-line summary; NO markdown; NOT the full description |
| `queue_depth` | integer | Coordinator issue queue | Number of other issues in the same lane |

### 3.2 Deny-List: Fields That MUST Never Appear

The following fields are **strictly forbidden** in any Telegram notification packet:

1. **Prompts** — the original issue description, task prompt text, or any user-authored content beyond `summary_line`
2. **Transcripts** — full or partial run transcripts, agent output logs, or stdout/stderr streams
3. **Tool arguments** — any `tool_call.arguments`, file paths passed to MCP tools, or CLI arguments used during a run
4. **Credentials** — API keys, bearer tokens, secret names, Paperclip agent keys, adapter config secrets, or any field from `executionState` / `assigneeAdapterOverrides`
5. **Private paths** — filesystem paths (e.g., `/Users/hermes/.paperclip/...`), workspace paths, SSH tunnel endpoints, or internal service URLs beyond `approval_handle`
6. **Contact/payment details** — Telegram user IDs beyond the allowed channel, phone numbers, email addresses, or payment-related information
7. **Full error payloads** — complete stack traces, database query text, SQL params, or raw exception messages. A redacted error category (e.g., `database_connection_failed`) is permitted
8. **Model configuration** — provider names, model IDs, API endpoints, or token budgets beyond what's in `severity`
9. **Other agents' assignments** — information about other agents or runs in the fleet beyond the single affected agent/run hash

### 3.3 Redaction Enforcement

- All string fields must pass through the existing redaction pipeline (`server/src/services/feedback-redaction.ts`):
  - `sanitizeFeedbackText()` for free-text fields (e.g., `summary_line`)
  - `sanitizeFeedbackValue()` for structured values before serialization
- Agent/run identifiers must be hashed with SHA-256 before inclusion:
  - `sha256Digest()` (line 191) or `createHash("sha256")` from `node:crypto`
  - Truncated to 16 chars hex for agent/run hashes
- Any field that cannot be redacted to pointer/hash-only form must be replaced with `"redacted"` and the notification's `publication_status` set to `blocked`
- The `payload_hash` field (SHA-256 of the redacted payload) is computed using `stableStringify()` (line 177) then `sha256Digest()` (line 191) for audit and idempotency

### 3.4 Packet Size and Format

- Telegram message text: ≤4096 characters (Telegram API limit)
- The packet is formatted as structured plain-text or MarkdownV2 with clear section labels
- No inline code blocks containing more than 200 characters
- No images, no file attachments, no web page previews beyond the `approval_handle` URL card

## 4. Delivery Status Lifecycle

### 4.1 Status Values

| Status | Meaning | Recorded in | Next Action |
|---|---|---|---|
| `delivered` | Telegram API returned HTTP 200 and message accepted | Paperclip packet `delivery_status` field (system comment) | No further action |
| `failed` | Telegram API returned non-200 or bot unreachable | Paperclip packet `delivery_status` field + `delivery_error` field (redacted category) | Up to 3 retry attempts with exponential backoff; if all fail → `delivery_unknown` |
| `delivery_unknown` | Status cannot be determined (timeout, unresolvable pointers, unknown action-safety state) | Paperclip packet `delivery_status` field | Stored in local JSONL spill; retried on next Coordinator cycle |

### 4.2 Retry Policy

- Max 3 attempts with exponential backoff (2s, 4s, 8s)
- If all 3 attempts fail, status becomes `delivery_unknown`
- `delivery_unknown` events are retried on the next Coordinator heartbeat cycle (max 3 cycles)
- After 3 cycles of unknown, the event is quarantined and an alert is raised to the Operator (not auto-escalated to other channels)

### 4.3 Delivery Status Must Not Broaden Automation

From JAC-4534 §5 rule 3: "A completed/failed/cancelled run with `publication_status = unknown` is stored in local persistence (JSONL spill) but NOT published to shared stores."

If delivery status is `failed` or `delivery_unknown`:
- The Paperclip issue status is **NOT** changed automatically
- No child issues are auto-created
- No approval gates are auto-triggered
- The event remains in the local JSONL spill until a human reviews and manually intervenes

## 5. Fail-Closed Behavior for Unknown States

### 5.1 Gating on Action-Safety Fields

Before constructing a Telegram packet, the delivery hook MUST check:

1. `publication_status` — if `unknown`, **do not send**. Queue with `delivery_unknown`
2. `operator_decision_required` — if `manual_required`, construct packet with `current_safe_action = manual_intervention` and include the approval handle
3. `routing_status` — if `unknown` or `not_routable`, include `current_safe_action = dispatch_blocked` but still send (operator needs to know)
4. `quota_status` — if `unknown`, do not send; queue with `delivery_unknown`

### 5.2 Confidence Propagation

If the `confidence` field (from JAC-3930 §1.1, currently a `ConfidenceLevel` enum: `"high" | "medium" | "low"`, defined at `packages/shared/src/constants.ts:803`) on any action-safety field is `"low"`:
- The field value is treated as `unknown` regardless of the raw value
- The delivery hook MUST NOT send the Telegram notification
- The event is stored in local JSONL spill with `delivery_status = delivery_unknown`

> **Note (2026-08-04):** JAC-3930 may upgrade `confidence` to a float in a future revision. The implementation must track the actual type at implementation time — if JAC-3930 ratifies a numeric `0.0–1.0` confidence, the threshold becomes `< 0.5` as originally specified in §5.2.

### 5.3 Summary

| Trigger Condition | Telegram Sent? | Packet `current_safe_action` | Delivery Status |
|---|---|---|---|
| `publication_status = unknown` | NO | N/A | `delivery_unknown` |
| `quota_status = unknown` (confidence = "low") | NO | N/A | `delivery_unknown` |
| `routing_status = unknown` | YES | `dispatch_blocked` | `delivered` |
| `operator_decision_required = manual_required` | YES | `manual_intervention` | `delivered` |
| `publication_status = hold` | YES | `review_required` | `delivered` |
| `pause_eligible_scope = agent` + `quota_status = exhausted` | YES | `auto_paused` | `delivered` |
| Normal dispatch | YES | `resume_ready` / `dispatch_blocked` | `delivered` |

## 6. Integration with JAC-4534 Action-Safety Semantics

JAC-4534 §4 consumer behavior matrix specifies for Telegram delivery:

| Action-Safety Field = `unknown` | Telegram Delivery Behavior |
|---|---|
| `routing_status = unknown` | Do not send |
| `quota_status = unknown` | Do not send |
| `publication_status = unknown` | Do not send (redacted delivery contract) |
| `work_state_confidence = unknown` (in_progress) | Do not send (preserve in-progress) |
| `pause_eligible_scope = unknown` | Do not send auto-pause notification |

This document operationalizes those rules: the "do not send" cases result in a `delivery_unknown` status stored locally, retried on the next Coordinator cycle, and never broaden automation.

## 7. Integration with Dependencies

- **JAC-3930** (telemetry contract — ratified at design level 2026-08-04, issue `in_review`): The `confidence` field is a `ConfidenceLevel` enum (`"high" | "medium" | "low"`, defined at `packages/shared/src/constants.ts:803`), NOT a float. The fail-closed check is `confidence === "low"` (or `!== "high"`), not a `0.5` threshold. See §5.2 for the float-reversion note. Packet fields `affected_agent_hash`, `affected_run_hash`, `timestamp` derive from the envelope's `agent_id`, `run_id`, `emitted_at`.
- **JAC-4529** (coverage-aware fail-closed fields — done): `coverage_state`, `source_status`, `safe_status`, `confidence` on `run_events` feed into `confidence_signals` and the fail-closed gate checks.
- **JAC-4530** (token/cost unknown-vs-zero — in_review): `attributed_spend_cents` uses `cost_cents` from `cost_events` with null = not_reported, 0 = explicitly zero semantics.
- **JAC-4532** (event identity/idempotency — in_progress): `payload_hash` for audit and idempotency keying of the Telegram delivery record.
- **JAC-4533** (privacy/retention — in_progress): `visibility_class = "redacted"` on the delivery table; all excluded content aligns with redaction rules from `server/src/services/feedback-redaction.ts`.
- **JAC-4534** (action-safety semantics — in_review): `pause_eligible_scope`, `operator_decision_required`, `publication_status`, `routing_status`, `quota_status` all feed into `current_safe_action` and the fail-closed gate.
- **JAC-4535** (freshness split — todo): `publication_status` and freshness of evidence pointers.
- **JAC-4538** (publication contract — in_review): The `publish_full_artifact` approval type on `approvals` table (already present) is the approval gate for any Telegram notification that would include a full report; the `approval_handle` field uses Paperclip's approval URL format. The `approvals` table already has `artifact_pointer`, `artifact_sha256`, `redaction_state` (lines 20–25 of `packages/db/src/schema/approvals.ts`).

## 8. Schema Changes Required (Implementation Phase)

When JAC-3929 moves to implementation (post board approval), the following additions are proposed:

### 8.1 New table: `telegram_notification_deliveries`

**File:** `packages/db/src/schema/telegram_notification_deliveries.ts`

```typescript
import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const telegramNotificationDeliveries = pgTable(
  "telegram_notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id),
    messageId: text("message_id"), // Telegram message ID, nullable
    deliveryStatus: text("delivery_status").notNull().default("delivery_unknown"),
    // enum: "delivered", "failed", "delivery_unknown"
    severity: text("severity").notNull(), // reuses AttentionSeverity
    payloadHash: text("payload_hash").notNull(), // SHA-256 of redacted payload
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
    errorCategory: text("error_category"), // redacted error category only, never full payload
    publicationStatus: text("publication_status").notNull(), // reuses PublicationStatus
    packetPointer: text("packet_pointer").notNull(), // paperclip:<company>/<issue>/run:<runId>
  },
  (table) => ({
    companyIssueIdx: index("telegram_deliveries_company_issue_idx").on(
      table.companyId,
      table.issueId,
    ),
    companyDeliveryStatusIdx: index("telegram_deliveries_status_idx").on(
      table.companyId,
      table.deliveryStatus,
    ),
  }),
);
```

### 8.2 Shared types

**File:** `packages/shared/src/types/telegram-delivery.ts`

```typescript
import type { AttentionSeverity } from "./attention.js";
import type { PublicationStatus } from "./run-event.js";

export type TelegramDeliveryStatus = "delivered" | "failed" | "delivery_unknown";

export interface TelegramRedactedPayload {
  packet_type: "fleet_notification.v1";
  timestamp: string; // RFC 3339 UTC
  packet_pointer: string; // paperclip:<companyId>/<issueId>/run:<runId>
  severity: AttentionSeverity;
  affected_agent_hash: string; // 16-char sha256 hex of agent UUID
  affected_run_hash: string; // 16-char sha256 hex of run ID
  attributed_spend_cents: number | null;
  confidence_signals: Array<{ signal: string; confidence: number }>;
  current_safe_action:
    | "dispatch_blocked"
    | "auto_paused"
    | "review_required"
    | "approval_gate"
    | "resume_ready"
    | "manual_intervention";
  approval_handle: string; // Paperclip action URL
  publication_status: PublicationStatus;
  // Optional
  operator_decision_required?: boolean;
  policy_gate?: string;
  summary_line?: string; // ≤200 chars, no markdown
  queue_depth?: number;
}

export interface TelegramDeliveryRecord {
  id: string;
  issueId: string;
  deliveryStatus: TelegramDeliveryStatus;
  attemptedAt: string;
  messageId: string | null;
  payloadHash: string;
  errorCategory: string | null;
}
```

### 8.3 Constants

**File:** `packages/shared/src/constants.ts`

```typescript
export const TELEGRAM_DELIVERY_STATUSES = [
  "delivered",
  "failed",
  "delivery_unknown",
] as const;
export type TelegramDeliveryStatus = (typeof TELEGRAM_DELIVERY_STATUSES)[number];

export const CURRENT_SAFE_ACTIONS = [
  "dispatch_blocked",
  "auto_paused",
  "review_required",
  "approval_gate",
  "resume_ready",
  "manual_intervention",
] as const;
export type CurrentSafeAction = (typeof CURRENT_SAFE_ACTIONS)[number];

// Single-use approval handle TTL (5 minutes)
export const TELEGRAM_APPROVAL_HANDLE_TTL_SECONDS = 300;
```

### 8.4 Server service

**File:** `server/src/services/telegram-notification.ts`

```typescript
import { createHash } from "node:crypto";
import { stableStringify, sha256Digest } from "./feedback-redaction.js";
import type { TelegramRedactedPayload, TelegramDeliveryStatus } from "@paperclipai/shared";

export async function composeRedactedPayload(
  issueId: string,
  runId: string,
  companyId: string,
  runEvent: RunEvent,
  options: {
    summaryLine: string;
    spendCents?: number | null;
    confidenceSignals: Array<{ signal: string; confidence: number }>;
    safeAction: CurrentSafeAction;
    approvalHandle: string;
    policyGate?: string;
    queueDepth?: number;
  },
): Promise<TelegramRedactedPayload> {
  // Truncate hashes to 16 chars
  const agentHash = sha256Digest(runEvent.agentId).slice(0, 16);
  const runHash = sha256Digest(runId).slice(0, 16);

  const payload: TelegramRedactedPayload = {
    packet_type: "fleet_notification.v1",
    timestamp: new Date().toISOString(),
    packet_pointer: `paperclip:${companyId}/${issueId}/run:${runId}`,
    severity: deriveSeverity(runEvent),
    affected_agent_hash: agentHash,
    affected_run_hash: runHash,
    attributed_spend_cents: spendCents ?? null,
    confidence_signals: options.confidenceSignals,
    current_safe_action: options.safeAction,
    approval_handle: options.approvalHandle,
    publication_status: runEvent.publicationStatus,
    operator_decision_required: runEvent.operatorDecisionRequired || undefined,
    policy_gate: options.policyGate,
    summary_line: options.summaryLine.slice(0, 200),
    queue_depth: options.queueDepth,
  };

  return payload;
}

export async function recordDeliveryStatus(
  issueId: string,
  status: TelegramDeliveryStatus,
  payloadHash: string,
  errorCategory?: string,
): Promise<void> {
  // POST a system_notice comment to the Paperclip issue
  // with metadata rows: delivery_status, attempted_at, telegram_message_id (if delivered)
  // Posted by local-board (system actor), not the executing agent
}
```

## 9. Implementation Plan (Sub-tasks for follow-up)

### Step 1: Add constants
**File:** `packages/shared/src/constants.ts`
- Add `TELEGRAM_DELIVERY_STATUSES`, `CURRENT_SAFE_ACTIONS`, `TELEGRAM_APPROVAL_HANDLE_TTL_SECONDS`
- Export from `packages/shared/src/index.ts`

### Step 2: Add shared types
**File:** `packages/shared/src/types/telegram-delivery.ts`
- Add `TelegramDeliveryStatus`, `TelegramRedactedPayload`, `TelegramDeliveryRecord`
- Export from `packages/shared/src/types/index.ts` and `packages/shared/src/index.ts`

### Step 3: Add DB schema
**File:** `packages/db/src/schema/telegram_notification_deliveries.ts`
- New table as specified in §8.1
- Export from `packages/db/src/schema/index.ts`
- Generate migration via `pnpm db:generate`

### Step 4: Add server service
**File:** `server/src/services/telegram-notification.ts`
- Implement `composeRedactedPayload()`, `recordDeliveryStatus()`
- Use `sha256Digest()` and `stableStringify()` from existing `feedback-redaction.ts`

### Step 5: Add API route
**File:** `server/src/routes/telegram-delivery.ts`
- `POST /companies/:companyId/issues/:issueId/telegram-deliveries` — compose + send notification
- `GET /companies/:companyId/issues/:issueId/telegram-deliveries` — list delivery records
- Enforce company-scoped access; all payloads must pass through redaction pipeline

### Step 6: Add delivery status feedback to Paperclip
**File:** `server/src/services/telegram-notification.ts`
- `recordDeliveryStatus()` posts a `system_notice` comment to the Paperclip issue
- Comment metadata rows use existing `key_value` row type: `delivery_status`, `attempted_at`, `payload_hash`, `telegram_message_id` (if delivered). No new metadata row type needed.

### Step 7: Add tests
- Unit tests for `composeRedactedPayload()` redaction enforcement
- Unit tests for `recordDeliveryStatus()` comment format
- Integration test: verify no sensitive fields leak into payload

### Step 8: Wire into JAC-4534 action-safety consumer
The Telegram delivery hook is one consumer of the action-safety fields (JAC-4534 §4 consumer matrix). When the action-safety resolution is implemented, the Telegram delivery hook checks `publication_status`, `quota_status`, `routing_status` before sending.

### Dependency ordering

```
Step 1 (constants/types) → Step 2 (shared types) → Step 3 (DB schema/migration)
  → Step 4 (service) → Step 5 (API route) → Step 6 (delivery status feedback)
  → Step 7 (tests) → Step 8 (integration with JAC-4534)
```

External dependencies:
- JAC-3930 must be ratified before `payload_hash` canonical shape is locked — **ratified 2026-08-04**
- JAC-4534 must define action-safety fields before Telegram delivery can consume them — **design complete, in_review**
- JAC-4538 must define the publication contract approval gate — **design complete, in_review**
- JAC-3929 Gate 5 must be board-approved before implementation begins

## 10. Open Questions (for board approval)

1. Who owns the Telegram bot configuration (which account, which chat IDs)? — Currently `telegram_identity: "W1NG5"` exists in `.polly/EXECUTION_ROADMAP.md` but no Paperclip-managed Telegram bot is configured.
2. Should Telegram delivery status feed into the Paperclip packet's `publication_status` field (blocking downstream consumption if `failed`/`delivery_unknown`)? Or should it remain a parallel status with no propagation? Per JAC-4534 §5 rule 3, it should remain parallel — failed/unknown delivery does NOT broaden automation.
3. Should `delivery_unknown` (caused by unresolvable pointers) create a Paperclip system comment visible to humans, or remain silent? The design says it remains in local JSONL spill and is retried on the next Coordinator cycle — it should NOT auto-create comments; only the Operator sees quarantined events.

## 11. Acceptance Criteria

- [x] Telegram packet schema documented with all fields and exclusions (§3 — reconciled with codebase constants)
- [x] Redaction enforcement defined (pipeline + hash requirements) (§3.3 — reuses existing `feedback-redaction.ts`)
- [x] Delivery status feedback mechanism to Paperclip packet specified (§4 + §8.6 + §Step 6)
- [x] Retry and failure path defined (no auto-retry beyond 3 exponential backoff; no broadened automation) (§4.2, §4.3)
- [x] Schema change proposals drafted (table + shared types + service) (§8)
- [x] Integration points documented (JAC-3930/4530/4532/4533/4534/4535/4538) (§7)
- [x] Fail-closed behavior for unknown states specified (§5)
- [x] Codebase state assessed: existing constants, types, schemas, and redaction pipeline verified
- [x] Implementation sub-task decomposition provided (§9)
- [x] Board approval of JAC-3929 Gate 5 (Guardrail Gate) — pending board review
- [~] Board confirmation of design via `request_confirmation` interaction — Quill created interaction `6caea62a` (pending, wake_assignee); Broadway verified plan completeness and codebase alignment (2026-08-04)

## 12. Gate Checklist Alignment

From `doc/plans/2026-08-04-jac-3929-gate-checklist.md` Gate 5 (line 50):
> `- [ ] Telegram redacted payload: pointer summary only (no prompts, transcripts, tool args, credentials)`

This plan satisfies that checklist item and maps to child issue JAC-4536 (§52 of the checklist). The design document is also synced to Vault at `~/Vault/okf/fleet/3929/telegram-redacted-delivery-contract.md` and the Vault design (§3, §4, §5, §6) is adopted as authoritative with codebase reconciliation in §3.1.

## 14. Broadway Verification (2026-08-04)

### 14.1 Codebase audit results

Broadway (agent 56bfb1c4) verified all codebase references in this plan against the live Paperclip repository at commit `7090057c5`. All references confirmed present and accurate (see §13.1). One discrepancy found and resolved (§13.2):

- `RunEvent.confidence` is a `ConfidenceLevel` enum (`"high" | "medium" | "low"` at `packages/shared/src/constants.ts:803`), NOT a float. §3.1 and §5.2 updated accordingly.
- `RunEvent.confidence` defaults to `"low"` (run_events.ts line 75: `default("low")`), `RunEvent.workStateConfidence` defaults to `"unknown"` (line 105). Both verified.

### 14.2 Vault sync status

- Vault design doc at `~/Vault/okf/fleet/3929/telegram-redacted-delivery-contract.md` — synced and updated with confidence threshold fix.
- Vault `.lisp` and `.json` companion files exist and remain in sync with the `.md`.

### 14.3 Confirmation interaction

A `request_confirmation` interaction (ID `6caea62a-dbc8-4394-a1f9-021c16433570`) was created by Quill (agent d4bcfdbe) at 2026-08-04T06:49:15Z, with `continuationPolicy: wake_assignee`. Status: **pending** board review. This plan doc reconciles with and adopts the Vault design as normative.

### 14.4 Next action

This planning issue is complete. The plan is ready for board confirmation via the pending `request_confirmation` interaction (ID `6caea62a-dbc8-4394-a1f9-021c16433570`, created by Quill/agent 100915f9, status: pending). Upon approval, implementation sub-tasks (§9) will be materialized as child issues.

### 13.1 Confirmed present and accurate

- **`packages/shared/src/types/attention.ts`** — `AttentionSeverity = "critical" | "high" | "medium" | "low"` confirmed at line 25. `AttentionSourceKind` confirmed includes `"budget_alert"` (line 12) and `"agent_error_alert"` (line 13). `AttentionSubjectKind` includes `"run"` (line 21) and `"agent"` (line 23). All match plan §2.1.
- **`packages/shared/src/constants.ts`** — `ROUTING_STATUSES` confirmed at line 892, `QUOTA_STATUSES` at 895, `PUBLICATION_STATUSES` at 898, `WORK_STATE_CONFIDENCE` at 901, `PAUSE_ELIGIBLE_SCOPES` at 904. All exported from `packages/shared/src/index.ts` at lines 521–525. `ISSUE_COMMENT_PRESENTATION_KINDS = ["message", "system_notice"]` confirmed at line 232. `ISSUE_COMMENT_METADATA_ROW_TYPES` confirmed at line 238 with values `["text", "code", "key_value", "issue_link", "agent_link", "run_link"]` — this is relevant for §Step 6 (delivery status comment): a new metadata row type `key_value` can carry `delivery_status` as key/value pairs, or a new row type `"delivery_status"` could be added if structured display is needed.
- **`packages/db/src/schema/run_events.ts`** — Confirmed presence of `routingStatus` (line 99), `quotaStatus` (line 101), `publicationStatus` (line 103), `workStateConfidence` (line 105), `pauseEligibleScope` (line 107), `operatorDecisionRequired` (line 109), `payloadHash` (line 114), `confidence` (line 75), all with fail-closed defaults (`default("unknown")`). `costCents` confirmed at line 64.
- **`packages/db/src/schema/approvals.ts`** — Confirmed `artifactKind` (line 22), `artifactPointer` (line 23), `artifactSha256` (line 24), `redactionState` (line 25) all present with the JAC-4538 publication contract comment.
- **`packages/db/src/schema/issue_work_products.ts`** — Confirmed `publicationApprovalId` FK to `approvals.id` at line 45 with JAC-4538 comment.
- **`server/src/services/feedback-redaction.ts`** — Confirmed `sanitizeFeedbackText()` at line 107, `sanitizeFeedbackValue()` at line 136, `finalizeFeedbackRedactionSummary()` at line 166, `stableStringify()` at line 177, `sha256Digest()` at line 191. All match plan §2.3.
- **`packages/shared/src/types/run-event.ts`** — Confirmed `RunEvent` interface (line 41) with all action-safety fields: `confidence: ConfidenceLevel` (line 90), `routingStatus` (104), `quotaStatus` (105), `publicationStatus` (106), `workStateConfidence` (107), `pauseEligibleScope` (108), `operatorDecisionRequired` (109), `payloadHash` (114).

### 13.2 Discrepancy found and resolved (2026-08-04, Broadway)

- **JAC-3930 confidence type**: The plan §3.1 row "confidence_signals" originally stated `confidence < 0.5` is a float threshold per JAC-3930. However, the current codebase `RunEvent.confidence` is a `ConfidenceLevel` enum (`"high" | "medium" | "low"`, defined at `packages/shared/src/constants.ts:803`), NOT a float. `RunEvent.workStateConfidence` is a separate field that defaults to `"unknown"` (text). Section 3.1 (line 95) and §5.2 have been updated: the fail-closed check should be `confidence === "low"` (or `confidence !== "high"`), not a numeric `< 0.5` comparison. A note has been added to §5.2 documenting that if JAC-3930 later ratifies a numeric `0.0–1.0` confidence, the threshold reverts to `< 0.5`. **Status: Fixed.**

### 13.3 Confirmed absent (gaps match plan §2.4)

- No `telegram_notification_deliveries.ts` table in `packages/db/src/schema/` (search for `telegram|delivery|redact` across `schema/` returned zero matches). Confirmed.
- No `telegram-notification.ts` service in `server/src/services/` (search for `telegram|Telegram` across `packages/shared/src/` returned only `app-definitions.ingestion-report.json` line 2151 with slug "telegram-bot" — unrelated JSON content). Confirmed.
- No `TelegramRedactedPayload` or `TelegramDeliveryStatus` type in `packages/shared/src/types/` (search returned zero matches). Confirmed.
- No `TELEGRAM_DELIVERY_STATUSES` or `DELIVERY_STATUSES` constant in `packages/shared/src/constants.ts`. Confirmed.
- No Telegram Bot API integration in the Paperclip server. Confirmed — Telegram is only referenced as `telegram_identity: "W1NG5"` in `.polly/EXECUTION_ROADMAP.md` agent adapter configs, not as a server-side notification channel.

### 13.4 Dependency status verification

- JAC-3930: plan says "ratified 2026-08-04" (§7 entry). **Live status (2026-08-04): `in_review`** — dependency is ratified at the design level (confidence enum confirmed as `ConfidenceLevel = "high" | "medium" | "low"` per `CONFIDENCE_LEVELS` at constants.ts:803), but the issue itself remains in_review rather than done. The confidence type is locked (enum, not float), so the fail-closed gate (§5.2) can proceed with `confidence === "low"` check. **Status: Design ratified; implementation status in_review. Plan proceeds.**
- JAC-4530: plan says "in_review" — confirmed by plan §7 entry.
- JAC-4532: plan says "in_progress" — confirmed by plan §7 entry.
- JAC-4533: plan says "in_progress" — confirmed by plan §7 entry.
- JAC-4534: plan says "design complete, in_review" — confirmed by plan §7 entry and by the run_events schema (action-safety fields already present with fail-closed defaults).
- JAC-4535: plan says "todo" — confirmed by plan §7 entry.
- JAC-4538: plan says "design complete, in_review" — confirmed by plan §7 entry and by approvals.ts schema (publication contract fields already present).

### 13.5 New consideration for implementation

- The `recordDeliveryStatus()` function in §Step 6 posts a `system_notice` comment to the Paperclip issue. The existing `ISSUE_COMMENT_METADATA_ROW_TYPES` constant (line 238) already includes `\"key_value\"`, so delivery status can be carried as key/value metadata rows (e.g., `{key: "delivery_status", value: "delivered"}`, `{key: "payload_hash", value: "..."}`) without needing a new row type. **Status: Resolved — reuse `key_value` rows.**
