import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

/**
 * Normalized run event — emitted by the Paperclip adapter for EVERY
 * heartbeat_run, regardless of whether the run produced spend.
 *
 * This is distinct from cost_events (which represent spend line-items).
 * run_events capture coverage metadata so fail-closed reasoning works
 * even for zero-cost runs (process/http adapters, errors, sandbox failures).
 *
 * Token/cost fields are nullable: null means "not_reported", 0 means "explicitly zero".
 */
export const runEvents = pgTable(
  "run_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    issueId: uuid("issue_id").references(() => issues.id),
    runId: uuid("run_id").notNull().references(() => heartbeatRuns.id),
    adapterType: text("adapter_type").notNull(),
    model: text("model").notNull().default("unknown"),
    provider: text("provider").notNull().default("unknown"),
    status: text("status").notNull().default("success"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    toolCallTokens: integer("tool_call_tokens"),
    costCents: integer("cost_cents"),
    currency: text("currency").notNull().default("USD"),
    usageReportedState: text("usage_reported_state").notNull().default("not_reported"),
    usageSourceField: text("usage_source_field"),
    coverageState: text("coverage_state").notNull().default("unknown"),
    sourceStatus: text("source_status").notNull().default("unavailable"),
    safeStatus: text("safe_status").notNull().default("unavailable"),
    confidence: text("confidence").notNull().default("low"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    ingestId: uuid("ingest_id").notNull().defaultRandom(),
    payloadHash: text("payload_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runEventsCompanyRunIdx: index("run_events_company_run_idx").on(
      table.companyId,
      table.runId,
    ),
    runEventsCompanyCoverageIdx: index("run_events_company_coverage_idx").on(
      table.companyId,
      table.coverageState,
      table.observedAt,
    ),
    runEventsCompanySafeStatusIdx: index("run_events_company_safe_status_idx").on(
      table.companyId,
      table.safeStatus,
      table.observedAt,
    ),
    runEventsPayloadHashIdx: index("run_events_payload_hash_idx").on(
      table.companyId,
      table.payloadHash,
    ),
  }),
);
