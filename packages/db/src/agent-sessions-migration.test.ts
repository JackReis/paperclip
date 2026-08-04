import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { applyPendingMigrations, inspectMigrations } from "./client.js";
import { agentSessions } from "./schema/agent_sessions.js";
import { agentTaskSessions } from "./schema/agent_task_sessions.js";
import { heartbeatRuns } from "./schema/heartbeat_runs.js";
import { issues } from "./schema/issues.js";
import * as schema from "./schema/index.js";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./test-embedded-postgres.js";

const RECONCILIATION_MIGRATION = "0185_environment_custom_image_templates_reconciliation.sql";
const AGENT_SESSIONS_MIGRATION = "0186_agent_sessions.sql";
const LOCAL_0125_AGENT_SESSIONS_HASH = "d53c4598fd1813fdff5c3fabdc8e6192bc665b3ec9031ae795c0e9d0955b08e6";

const protectedMigrationHashes = {
  "0125_environment_custom_image_templates.sql": "6e7bb3ab7b6fbf9926d79a1ead40e205e1bb26d08f5ddcd93cbfa64cca1d6001",
  "0127_environment_custom_images_instance_scoped.sql": "d8cfa7214ff61af7d8a1d7219e1d13a93017b825df14b9061fc0faa3d5a70fa6",
  "0128_user_specific_secrets.sql": "2d9414e39118d66da51a1c314deb040ffc845ae8d56fbfb1ab4c309f37facdc9",
  "0129_agent_api_key_responsible_user.sql": "a4a8e487517fba73b569a2f9aadbdf870b77a34e01b8bea0a43c3d4c88ce2a50",
  "0131_repair_run_responsible_user_context_refs.sql": "658a85151f870f1f89a3d3de61cde0f1b39bbc99a35c4bb27710590762d65a8d",
  "0132_issue_comment_derived_attribution_fast.sql": "80408941e435179af5441ec3c8207d7e31a78520d1ff8d18f3b8fe879ebde17d",
  "0133_resource_membership_stars.sql": "c2a7336b58e93aee41c48ffcf9bed6a2ca6255407a9e49b493ddbdf6deccc3b1",
  "0134_run_responsible_user_invariant.sql": "563b78f4ae4eb586820ecb9cdce5994b64ee840a6edc75e6a0e7feaf1f184630",
  "0135_repair_run_responsible_user_updated_at_sweep.sql": "fbe54ea1f702caf6241850697cbf6519e7d114641126db6ef469f38375c1815d",
} as const;

const cleanups: Array<() => Promise<void>> = [];
const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

async function createTempDatabase(): Promise<string> {
  const db = await startEmbeddedPostgresTestDatabase("paperclip-agent-sessions-");
  cleanups.push(db.cleanup);
  return db.connectionString;
}

async function migrationContent(migrationFile: string): Promise<string> {
  return fs.promises.readFile(new URL(`./migrations/${migrationFile}`, import.meta.url), "utf8");
}

async function migrationHash(migrationFile: string): Promise<string> {
  return createHash("sha256").update(await migrationContent(migrationFile)).digest("hex");
}

function indexColumns(table: Parameters<typeof getTableConfig>[0], indexName: string): string[] {
  const index = getTableConfig(table).indexes.find((candidate) => candidate.config.name === indexName);
  if (!index) return [];
  return index.config.columns.map((column) => (column as { name: string }).name);
}

function foreignKeyForColumn(table: Parameters<typeof getTableConfig>[0], columnName: string) {
  return getTableConfig(table).foreignKeys.find((candidate) =>
    candidate.reference().columns.some((column) => column.name === columnName),
  );
}

function postgresIdentifier(identifier: string): string {
  return identifier.slice(0, 63);
}

async function deleteMigrationHistory(
  sql: ReturnType<typeof postgres>,
  migrationFiles: readonly string[],
): Promise<void> {
  for (const migrationFile of migrationFiles) {
    const hash = await migrationHash(migrationFile);
    await sql`
      DELETE FROM "drizzle"."__drizzle_migrations"
      WHERE "hash" = ${hash}
    `;
  }
}

async function expectCurrentEnvironmentCustomImageSchema(
  sql: ReturnType<typeof postgres>,
): Promise<void> {
  const tableColumns = await sql<{ table_name: string; column_name: string }[]>`
    SELECT "table_name", "column_name"
    FROM "information_schema"."columns"
    WHERE "table_schema" = 'public'
      AND "table_name" IN (
        'environment_custom_image_templates',
        'environment_custom_image_setup_sessions'
      )
    ORDER BY "table_name", "ordinal_position"
  `;
  expect(tableColumns.some((column) => column.column_name === "company_id")).toBe(false);
  expect(tableColumns).toEqual(
    expect.arrayContaining([
      { table_name: "environment_custom_image_templates", column_name: "environment_id" },
      { table_name: "environment_custom_image_templates", column_name: "template_ref" },
      { table_name: "environment_custom_image_setup_sessions", column_name: "environment_id" },
      { table_name: "environment_custom_image_setup_sessions", column_name: "provider_lease_id" },
    ]),
  );

  const indexes = await sql<{ indexname: string }[]>`
    SELECT "indexname"
    FROM "pg_indexes"
    WHERE "schemaname" = 'public'
      AND "indexname" IN (
        'environment_custom_image_templates_environment_active_uq',
        'environment_custom_image_templates_environment_provider_status_idx',
        'environment_custom_image_setup_sessions_environment_active_uq',
        'environment_custom_image_setup_sessions_provider_lease_idx'
      )
    ORDER BY "indexname"
  `;
  expect(indexes.map((index) => index.indexname)).toEqual([
    "environment_custom_image_setup_sessions_environment_active_uq",
    "environment_custom_image_setup_sessions_provider_lease_idx",
    "environment_custom_image_templates_environment_active_uq",
    "environment_custom_image_templates_environment_provider_status_",
  ]);

  const constraints = await sql<{ constraint_name: string; delete_rule: string }[]>`
    SELECT tc."constraint_name", rc."delete_rule"
    FROM "information_schema"."table_constraints" tc
    JOIN "information_schema"."referential_constraints" rc
      ON rc."constraint_schema" = tc."constraint_schema"
     AND rc."constraint_name" = tc."constraint_name"
    WHERE tc."table_schema" = 'public'
      AND tc."table_name" IN (
        'environment_custom_image_templates',
        'environment_custom_image_setup_sessions'
      )
    ORDER BY tc."constraint_name"
  `;
  expect(constraints).toEqual([
    {
      constraint_name: postgresIdentifier("environment_custom_image_setup_sessions_environment_id_environments_id_fk"),
      delete_rule: "CASCADE",
    },
    {
      constraint_name: postgresIdentifier(
        "environment_custom_image_setup_sessions_environment_lease_id_environment_leases_id_fk",
      ),
      delete_rule: "SET NULL",
    },
    {
      constraint_name: "environment_custom_image_setup_sessions_promoted_template_id_fk",
      delete_rule: "SET NULL",
    },
    {
      constraint_name: postgresIdentifier(
        "environment_custom_image_setup_sessions_started_by_agent_id_agents_id_fk",
      ),
      delete_rule: "SET NULL",
    },
    {
      constraint_name: "environment_custom_image_setup_sessions_template_id_fk",
      delete_rule: "SET NULL",
    },
    {
      constraint_name: postgresIdentifier("environment_custom_image_templates_created_by_agent_id_agents_id_fk"),
      delete_rule: "SET NULL",
    },
    {
      constraint_name: postgresIdentifier("environment_custom_image_templates_environment_id_environments_id_fk"),
      delete_rule: "CASCADE",
    },
    {
      constraint_name: "environment_custom_image_templates_superseded_by_template_id_fk",
      delete_rule: "SET NULL",
    },
  ]);
}

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    await cleanup?.();
  }
});

describe("agent sessions schema", () => {
  it("models user-facing sessions separately from task-scoped adapter sessions", () => {
    expect(getTableName(agentSessions)).toBe("agent_sessions");
    expect(getTableName(agentTaskSessions)).toBe("agent_task_sessions");
    expect(agentSessions).not.toBe(agentTaskSessions);
    expect(schema.agentSessions).toBe(agentSessions);

    expect(getTableConfig(agentSessions).columns.map((column) => column.name)).toEqual([
      "id",
      "company_id",
      "agent_id",
      "agent_session_key",
      "title",
      "status",
      "started_at",
      "ended_at",
      "last_used_at",
      "context_json",
      "compaction_json",
      "adapter_metadata_json",
      "provider",
      "execution_workspace_id",
      "cwd",
      "created_at",
      "updated_at",
    ]);
    expect(indexColumns(agentSessions, "agent_sessions_agent_session_key_unique")).toEqual([
      "agent_session_key",
    ]);
    expect(indexColumns(agentSessions, "agent_sessions_company_agent_updated_idx")).toEqual([
      "company_id",
      "agent_id",
      "updated_at",
    ]);
    expect(indexColumns(agentSessions, "agent_sessions_company_last_used_idx")).toEqual([
      "company_id",
      "last_used_at",
    ]);
  });

  it("links runs and issues to agent sessions with nullable set-null relations", () => {
    expect(heartbeatRuns.sessionId.name).toBe("session_id");
    expect(heartbeatRuns.sessionId.notNull).toBe(false);
    expect(issues.sessionId.name).toBe("session_id");
    expect(issues.sessionId.notNull).toBe(false);

    const runSessionForeignKey = foreignKeyForColumn(heartbeatRuns, "session_id");
    const issueSessionForeignKey = foreignKeyForColumn(issues, "session_id");
    expect(getTableName(runSessionForeignKey!.reference().foreignTable)).toBe("agent_sessions");
    expect(runSessionForeignKey!.reference().foreignColumns[0]?.name).toBe("id");
    expect(runSessionForeignKey!.onDelete).toBe("set null");
    expect(getTableName(issueSessionForeignKey!.reference().foreignTable)).toBe("agent_sessions");
    expect(issueSessionForeignKey!.reference().foreignColumns[0]?.name).toBe("id");
    expect(issueSessionForeignKey!.onDelete).toBe("set null");
  });
});

describe("agent sessions migration artifacts", () => {
  it("preserves official 0125-0135 migrations byte-for-byte", async () => {
    await expect(
      Promise.all(
        Object.entries(protectedMigrationHashes).map(async ([migrationFile, expectedHash]) => [
          migrationFile,
          await migrationHash(migrationFile),
          expectedHash,
        ]),
      ),
    ).resolves.toEqual(
      Object.entries(protectedMigrationHashes).map(([migrationFile, expectedHash]) => [
        migrationFile,
        expectedHash,
        expectedHash,
      ]),
    );
  });

  it("journals reconciliation before the renumbered idempotent agent sessions migration", async () => {
    const journal = JSON.parse(
      await fs.promises.readFile(new URL("./migrations/meta/_journal.json", import.meta.url), "utf8"),
    ) as { entries: Array<{ idx: number; tag: string }> };

    expect(journal.entries.slice(-4)).toEqual([
      { idx: 189, version: "7", when: 1784592001000, tag: "0189_productivity_review_trigger_snooze", breakpoints: true },
      { idx: 190, version: "7", when: 1784592002000, tag: "0190_cost_events_price_basis", breakpoints: true },
      { idx: 191, version: "7", when: 1784592003000, tag: "0191_run_events_extended_fields", breakpoints: true },
      { idx: 192, version: "7", when: 1784592004000, tag: "0192_cost_events_privacy_index", breakpoints: true },
    ]);
    await expect(fs.promises.access(new URL("./migrations/0125_agent_sessions.sql", import.meta.url))).rejects.toThrow();
    await expect(migrationContent(RECONCILIATION_MIGRATION)).resolves.toContain("CREATE TABLE IF NOT EXISTS");
    await expect(migrationContent(AGENT_SESSIONS_MIGRATION)).resolves.toContain('CREATE TABLE IF NOT EXISTS "agent_sessions"');
  });
});

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres agent session migration tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("agent sessions migrations", () => {
  it(
    "creates the fresh current schema",
    async () => {
      const connectionString = await createTempDatabase();
      const state = await inspectMigrations(connectionString);
      expect(state.status).toBe("upToDate");
      expect(state.availableMigrations).toContain(RECONCILIATION_MIGRATION);
      expect(state.availableMigrations).toContain(AGENT_SESSIONS_MIGRATION);
      expect(state.availableMigrations).not.toContain("0125_agent_sessions.sql");

      const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
      try {
        const columns = await sql<{ table_name: string; column_name: string; is_nullable: string }[]>`
          SELECT "table_name", "column_name", "is_nullable"
          FROM "information_schema"."columns"
          WHERE "table_schema" = 'public'
            AND (
              ("table_name" = 'agent_sessions' AND "column_name" IN ('agent_session_key', 'execution_workspace_id'))
              OR ("table_name" = 'heartbeat_runs' AND "column_name" = 'session_id')
              OR ("table_name" = 'issues' AND "column_name" = 'session_id')
            )
          ORDER BY "table_name", "column_name"
        `;
        expect(columns).toEqual([
          { table_name: "agent_sessions", column_name: "agent_session_key", is_nullable: "NO" },
          { table_name: "agent_sessions", column_name: "execution_workspace_id", is_nullable: "YES" },
          { table_name: "heartbeat_runs", column_name: "session_id", is_nullable: "YES" },
          { table_name: "issues", column_name: "session_id", is_nullable: "YES" },
        ]);

        const sessionConstraints = await sql<{ constraint_name: string; delete_rule: string }[]>`
          SELECT tc."constraint_name", rc."delete_rule"
          FROM "information_schema"."table_constraints" tc
          JOIN "information_schema"."referential_constraints" rc
            ON rc."constraint_schema" = tc."constraint_schema"
           AND rc."constraint_name" = tc."constraint_name"
          WHERE tc."table_schema" = 'public'
            AND tc."constraint_name" IN (
              'agent_sessions_company_id_companies_id_fk',
              'agent_sessions_agent_id_agents_id_fk',
              'agent_sessions_execution_workspace_id_execution_workspaces_id_fk',
              'heartbeat_runs_session_id_agent_sessions_id_fk',
              'issues_session_id_agent_sessions_id_fk'
            )
          ORDER BY tc."constraint_name"
        `;
        expect(sessionConstraints).toEqual([
          { constraint_name: "agent_sessions_agent_id_agents_id_fk", delete_rule: "NO ACTION" },
          { constraint_name: "agent_sessions_company_id_companies_id_fk", delete_rule: "NO ACTION" },
          {
            constraint_name: postgresIdentifier(
              "agent_sessions_execution_workspace_id_execution_workspaces_id_fk",
            ),
            delete_rule: "NO ACTION",
          },
          { constraint_name: "heartbeat_runs_session_id_agent_sessions_id_fk", delete_rule: "SET NULL" },
          { constraint_name: "issues_session_id_agent_sessions_id_fk", delete_rule: "SET NULL" },
        ]);
        const sessionIndexes = await sql<{ indexname: string }[]>`
          SELECT "indexname"
          FROM "pg_indexes"
          WHERE "schemaname" = 'public'
            AND "indexname" IN (
              'agent_sessions_agent_session_key_unique',
              'agent_sessions_company_agent_updated_idx',
              'agent_sessions_company_last_used_idx',
              'agent_sessions_company_agent_issue_idx',
              'agent_sessions_company_agent_status_idx'
            )
          ORDER BY "indexname"
        `;
        expect(sessionIndexes.map((index) => index.indexname)).toEqual([
          "agent_sessions_agent_session_key_unique",
          "agent_sessions_company_agent_issue_idx",
          "agent_sessions_company_agent_status_idx",
          "agent_sessions_company_agent_updated_idx",
          "agent_sessions_company_last_used_idx",
        ]);
        await expectCurrentEnvironmentCustomImageSchema(sql);
      } finally {
        await sql.end();
      }
    },
    30_000,
  );

  it(
    "reconciles copied history with local 0125 agent sessions and is safe to replay",
    async () => {
      const connectionString = await createTempDatabase();
      const sql = postgres(connectionString, { max: 1, onnotice: () => {} });
      const companyId = randomUUID();
      const agentId = randomUUID();
      const sessionId = randomUUID();
      const runId = randomUUID();
      const issueId = randomUUID();

      try {
        await sql`DROP TABLE "environment_custom_image_setup_sessions" CASCADE`;
        await sql`DROP TABLE "environment_custom_image_templates" CASCADE`;
        await deleteMigrationHistory(sql, [RECONCILIATION_MIGRATION, AGENT_SESSIONS_MIGRATION]);
        await sql`
          INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
          VALUES (${LOCAL_0125_AGENT_SESSIONS_HASH}, 1782500000000)
        `;

        await sql`
          INSERT INTO "companies" ("id", "name", "issue_prefix")
          VALUES (${companyId}, 'Copied History Company', 'COPY')
        `;
        await sql`
          INSERT INTO "agents" ("id", "company_id", "name", "role", "adapter_type", "adapter_config")
          VALUES (${agentId}, ${companyId}, 'Copied History Agent', 'engineer', 'process', '{}'::jsonb)
        `;
        await sql`
          INSERT INTO "agent_sessions" (
            "id", "company_id", "agent_id", "agent_session_key", "title", "status"
          )
          VALUES (${sessionId}, ${companyId}, ${agentId}, 'copied-session', 'Copied session', 'active')
        `;
        await sql`
          INSERT INTO "heartbeat_runs" ("id", "company_id", "agent_id", "status", "session_id")
          VALUES (${runId}, ${companyId}, ${agentId}, 'succeeded', ${sessionId})
        `;
        await sql`
          INSERT INTO "issues" ("id", "company_id", "title", "identifier", "session_id")
          VALUES (${issueId}, ${companyId}, 'Copied issue', 'COPY-1', ${sessionId})
        `;
      } finally {
        await sql.end();
      }

      const pendingState = await inspectMigrations(connectionString);
      expect(pendingState).toMatchObject({
        status: "needsMigrations",
        pendingMigrations: [RECONCILIATION_MIGRATION, AGENT_SESSIONS_MIGRATION],
        reason: "pending-migrations",
      });

      await applyPendingMigrations(connectionString);

      const verifySql = postgres(connectionString, { max: 1, onnotice: () => {} });
      try {
        await expectCurrentEnvironmentCustomImageSchema(verifySql);
        const linkedRows = await verifySql<{
          session_id: string;
          run_session_id: string;
          issue_session_id: string;
        }[]>`
          SELECT
            sessions."id" AS "session_id",
            runs."session_id" AS "run_session_id",
            issues."session_id" AS "issue_session_id"
          FROM "agent_sessions" sessions
          JOIN "heartbeat_runs" runs ON runs."id" = ${runId}
          JOIN "issues" issues ON issues."id" = ${issueId}
          WHERE sessions."id" = ${sessionId}
        `;
        expect(linkedRows).toEqual([
          {
            session_id: sessionId,
            run_session_id: sessionId,
            issue_session_id: sessionId,
          },
        ]);
      } finally {
        await verifySql.end();
      }

      expect((await inspectMigrations(connectionString)).status).toBe("upToDate");
    },
    30_000,
  );
});
