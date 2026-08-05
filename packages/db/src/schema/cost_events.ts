import { pgTable, uuid, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";
import { goals } from "./goals.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const costEvents = pgTable(
  "cost_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    issueId: uuid("issue_id").references(() => issues.id),
    projectId: uuid("project_id").references(() => projects.id),
    goalId: uuid("goal_id").references(() => goals.id),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),
    billingCode: text("billing_code"),
    provider: text("provider").notNull(),
    biller: text("biller").notNull().default("unknown"),
    billingType: text("billing_type").notNull().default("unknown"),
    costStatus: text("cost_status").notNull().default("reported"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens"),
    toolCallTokens: integer("tool_call_tokens"),
    costCents: integer("cost_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    pricingVersionRef: text("pricing_version_ref"),
    /** Coverage state of usage reporting. Fail-closed: absent/uncertain = "unknown". */
    coverageState: text("coverage_state").notNull().default("unknown"),
    /** Source system's ability to report usage. "unavailable" = source did not expose reporting. */
    sourceStatus: text("source_status").notNull().default("unavailable"),
    /** Whether usage data is safe to use for billing/computation. Fail-closed: derived from coverageState. */
    safeStatus: text("safe_status").notNull().default("unavailable"),
    /** Confidence level of the reported cost/usage data. */
    confidence: text("confidence").notNull().default("low"),
    /** Coverage warning surfaced separately from spend — explains why coverage is uncovered/partial. */
    coverageWarning: text("coverage_warning"),
    /** How the cost was determined (JAC-4530): per_1m_tokens, plan_billed, estimated, not_reported, unknown. */
    priceBasis: text("price_basis").notNull().default("not_reported"),
    /** Confidence in cost accuracy (JAC-4530): high, medium, low, unknown. Distinct from generic `confidence`. */
    costConfidence: text("cost_confidence").notNull().default("low"),
    /** Privacy/retention visibility classification (JAC-4533). */
    visibilityClass: text("visibility_class").notNull().default("internal"),
    /** Retention policy class for this event (JAC-4533). */
    retentionClass: text("retention_class").notNull().default("standard"),
    /** Redaction state — whether sensitive data was redacted (JAC-4533). */
    redactionState: text("redaction_state").notNull().default("unredacted"),
    /** Reference to the permission that authorized source data access (JAC-4533). */
    sourcePermissionRef: text("source_permission_ref"),
    /** Hash of the tenant boundary for cross-tenant correlation (JAC-4533). */
    tenantRefHash: text("tenant_ref_hash"),
    /** JSONB array of subject reference hashes (SHA-256) for multi-subject attribution (JAC-4533). */
    subjectRefHashes: text("subject_ref_hashes").array(),
    /** When the source data was deleted at the origin (JAC-4533). */
    sourceDeletedAt: timestamp("source_deleted_at", { withTimezone: true }),
    /** Tombstone reference for deleted/suppressed events (JAC-4533). */
    tombstoneRef: text("tombstone_ref"),
    /** Policy version that governed this event's retention/redaction (JAC-4533). */
    policyVersion: text("policy_version"),
    /** When the source system emitted this event (for idempotency, JAC-4532). */
    sourceSystem: text("source_system").notNull().default("paperclip"),
    /** Deterministic external event ID for idempotency (JAC-4532). */
    sourceEventId: text("source_event_id"),
    /** Version of the source event schema (JAC-4532). */
    sourceEventVersion: text("source_event_version"),
    /** Kind of event for idempotency keying (JAC-4532). */
    eventKind: text("event_kind").notNull().default("cost_report"),
    /** Retry/attempt index for re-ingest deduplication (JAC-4532). */
    attemptIndex: integer("attempt_index").notNull().default(0),
    /** Monotonically increasing sequence number observed from the source (JAC-4532). */
    observedSequence: integer("observed_sequence"),
    /** When this event supersedes a previous event ID (for corrections/replacements) (JAC-4532). */
    supersedesEventId: text("supersedes_event_id"),
    /** Deterministic ingest ID — computed from run_id + usage_updated_at + payload_hash (JAC-4532). */
    ingestId: text("ingest_id").notNull(),
    /** SHA-256 hex digest of the canonical payload, for idempotency (JAC-4532). */
    payloadHash: text("payload_hash"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyOccurredIdx: index("cost_events_company_occurred_idx").on(table.companyId, table.occurredAt),
    companyAgentOccurredIdx: index("cost_events_company_agent_occurred_idx").on(
      table.companyId,
      table.agentId,
      table.occurredAt,
    ),
    companyProviderOccurredIdx: index("cost_events_company_provider_occurred_idx").on(
      table.companyId,
      table.provider,
      table.occurredAt,
    ),
    companyBillerOccurredIdx: index("cost_events_company_biller_occurred_idx").on(
      table.companyId,
      table.biller,
      table.occurredAt,
    ),
    companyHeartbeatRunIdx: index("cost_events_company_heartbeat_run_idx").on(
      table.companyId,
      table.heartbeatRunId,
    ),
    companyCoverageIdx: index("cost_events_company_coverage_idx").on(
      table.companyId,
      table.coverageState,
      table.occurredAt,
    ),
    companyPrivacyIdx: index("cost_events_company_privacy_idx").on(
      table.companyId,
      table.visibilityClass,
      table.retentionClass,
      table.redactionState,
    ),
    /** Idempotency enforcement (JAC-4532): re-ingest of the same logical event
     * is a no-op via ON CONFLICT DO NOTHING on this composite. */
    costEventsSourceEventUq: uniqueIndex("cost_events_source_event_uq").on(
      table.companyId,
      table.sourceSystem,
      table.sourceEventId,
      table.eventKind,
      table.attemptIndex,
    ),
  }),
);
