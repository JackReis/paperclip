import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { executionWorkspaces } from "./execution_workspaces.js";

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    agentSessionKey: text("agent_session_key").notNull(),
    title: text("title").notNull().default(""),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    contextJson: jsonb("context_json").$type<Record<string, unknown>>(),
    compactionJson: jsonb("compaction_json").$type<Record<string, unknown>>(),
    adapterMetadataJson: jsonb("adapter_metadata_json").$type<Record<string, unknown>>(),
    provider: text("provider"),
    executionWorkspaceId: uuid("execution_workspace_id").references(() => executionWorkspaces.id),
    cwd: text("cwd"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentSessionKeyUnique: uniqueIndex("agent_sessions_agent_session_key_unique").on(table.agentSessionKey),
    companyAgentUpdatedIdx: index("agent_sessions_company_agent_updated_idx").on(
      table.companyId,
      table.agentId,
      table.updatedAt,
    ),
    companyLastUsedIdx: index("agent_sessions_company_last_used_idx").on(table.companyId, table.lastUsedAt),
    companyAgentIssueIdx: index("agent_sessions_company_agent_issue_idx").on(
      table.companyId,
      table.agentId,
      table.contextJson,
    ),
    companyAgentStatusIdx: index("agent_sessions_company_agent_status_idx").on(
      table.companyId,
      table.agentId,
      table.status,
    ),
  }),
);
