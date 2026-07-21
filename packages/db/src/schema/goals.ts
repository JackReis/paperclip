import {
  type AnyPgColumn,
  jsonb,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";

/**
 * Metadata for external system sync references.
 * Supports Beads task IDs, Linear labels, Ringer manifest references, and other
 * external tracking system links.
 */
export interface GoalSyncMetadata {
  /** Beads issue/epic ID if this goal is synced to Beads. */
  beadId?: string | null;
  /** Linear label/epic identifier for read-only project map projection. */
  linearLabel?: string | null;
  /** Ringer manifest reference (run ID or manifest key) linked to this goal. */
  ringerManifestRef?: string | null;
  /** Additional external system references. */
  externalRefs?: Record<string, string>;
}

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    title: text("title").notNull(),
    description: text("description"),
    level: text("level").notNull().default("task"),
    status: text("status").notNull().default("planned"),
    parentId: uuid("parent_id").references((): AnyPgColumn => goals.id),
    ownerAgentId: uuid("owner_agent_id").references(() => agents.id),
    syncMetadata: jsonb("sync_metadata").$type<GoalSyncMetadata>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("goals_company_idx").on(table.companyId),
    companyStatusIdx: index("goals_company_status_idx").on(table.companyId, table.status),
    parentIdx: index("goals_parent_idx").on(table.parentId),
    ownerIdx: index("goals_owner_idx").on(table.ownerAgentId),
  }),
);
