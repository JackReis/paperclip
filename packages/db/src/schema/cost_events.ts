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
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
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
    costCents: integer("cost_cents").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // --- JAC-4532: Event identity and idempotency ---
    /** Source system that emitted this event (paperclip, adapter, provider, external). */
    sourceSystem: text("source_system").notNull().default("paperclip"),
    /** Deterministic external event ID for idempotency. */
    sourceEventId: text("source_event_id"),
    /** Version of the source event schema/format. */
    sourceEventVersion: text("source_event_version"),
    /** Kind of event for idempotency keying. */
    eventKind: text("event_kind").notNull().default("cost_report"),
    /** Retry/attempt index — incremented on re-ingest of the same logical event. */
    attemptIndex: integer("attempt_index").notNull().default(0),
    /** Monotonically increasing sequence number observed from the source. */
    observedSequence: integer("observed_sequence"),
    /** When this event supersedes a previous event ID (for corrections/replacements). */
    supersedesEventId: text("supersedes_event_id"),
    /** Deterministic ingest ID — computed from run_id + usage_updated_at + payload_hash (JAC-4532). */
    ingestId: text("ingest_id").notNull().default(""),
    /** SHA-256 hex digest of the canonical payload, for idempotency (JAC-4532). */
    payloadHash: text("payload_hash"),
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
    costEventsSourceEventUq: uniqueIndex("cost_events_source_event_uq").on(
      table.companyId,
      table.sourceSystem,
      table.sourceEventId,
      table.eventKind,
      table.attemptIndex,
    ),
  }),
);
