import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  agentFolders,
  agents,
  companies,
  createDb,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "../__tests__/helpers/embedded-postgres.js";
import { FolderMigrationService } from "../services/folder-migration.js";
import { AgentFolderService } from "../services/agent-folders.js";
import { AgentInstructionsInheritanceService } from "../services/agent-instructions-inheritance.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;
type Db = ReturnType<typeof createDb>;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres folder migration tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("FolderMigrationService", () => {
  let db!: Db;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let companyId!: string;
  let folderService!: AgentFolderService;
  let inheritanceService!: AgentInstructionsInheritanceService;
  let migrationService!: FolderMigrationService;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-folder-migration-");
    db = createDb(tempDb.connectionString);
    folderService = new AgentFolderService(db);
    inheritanceService = new AgentInstructionsInheritanceService(db);
    migrationService = new FolderMigrationService(db, folderService, inheritanceService);
  }, 20_000);

  beforeEach(async () => {
    companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Test Company",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
  });

  afterEach(async () => {
    await db.delete(agentFolders).where(eq(agentFolders.companyId, companyId));
    await db.delete(agents).where(eq(agents.companyId, companyId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  // ─── Helper: create a test agent without a folder ────────────
  async function createUnassignedAgent(name: string, role: string) {
    const [agent] = await db
      .insert(agents)
      .values({
        companyId,
        name,
        role,
        adapterType: "process",
      })
      .returning();
    return agent;
  }

  // ─── getUnassignedSummary ────────────────────────────────────

  describe("getUnassignedSummary", () => {
    it("returns total count and groups by role", async () => {
      await createUnassignedAgent("Agent A", "coordinator");
      await createUnassignedAgent("Agent B", "coordinator");
      await createUnassignedAgent("Agent C", "watchdog");

      const summary = await migrationService.getUnassignedSummary(companyId);

      expect(summary.total).toBe(3);
      expect(summary.roleGroups).toEqual({
        coordinator: 2,
        watchdog: 1,
      });
    });

    it("returns zero for empty company", async () => {
      const summary = await migrationService.getUnassignedSummary(companyId);
      expect(summary.total).toBe(0);
      expect(summary.roleGroups).toEqual({});
    });
  });

  // ─── migrateByRole ───────────────────────────────────────────

  describe("migrateByRole", () => {
    it("creates role-based folders and assigns agents", async () => {
      await createUnassignedAgent("Coordinator A", "coordinator");
      await createUnassignedAgent("Watchdog A", "watchdog");

      const result = await migrationService.migrateByRole(companyId);

      expect(result.totalUnassigned).toBe(2);
      expect(result.groupsCreated).toEqual(expect.arrayContaining(["coordinator", "watchdog"]));
      expect(result.foldersCreated).toHaveLength(2);
      expect(result.foldersReused).toBe(0);
    });

    it("is idempotent — running twice does not duplicate folders", async () => {
      await createUnassignedAgent("Agent A", "coordinator");

      // First run
      const result1 = await migrationService.migrateByRole(companyId);
      expect(result1.foldersCreated).toHaveLength(1);
      expect(result1.totalUnassigned).toBe(1);

      // Second run — no unassigned agents left
      const result2 = await migrationService.migrateByRole(companyId);
      expect(result2.totalUnassigned).toBe(0);
      expect(result2.foldersCreated).toHaveLength(0);
    });

    it("assigns agents to correct folders by role", async () => {
      const agent = await createUnassignedAgent("Coord Agent", "coordinator");

      await migrationService.migrateByRole(companyId);

      // Verify the agent was assigned to a folder
      const updatedAgent = await db
        .select({ folderId: agents.folderId })
        .from(agents)
        .where(eq(agents.id, agent.id))
        .limit(1);

      expect(updatedAgent[0]!.folderId).not.toBeNull();

      // Verify the folder name matches the role
      const folder = await db
        .select({ name: agentFolders.name })
        .from(agentFolders)
        .where(eq(agentFolders.id, updatedAgent[0]!.folderId!))
        .limit(1);

      expect(folder[0]!.name).toBe("coordinator");
    });
  });

  // ─── migrateToCustomFolder ───────────────────────────────────

  describe("migrateToCustomFolder", () => {
    it("moves specified agents into a named folder", async () => {
      const agentA = await createUnassignedAgent("Agent A", "coordinator");
      const agentB = await createUnassignedAgent("Agent B", "watchdog");

      const result = await migrationService.migrateToCustomFolder(
        companyId,
        "Custom Group",
        [agentA.id, agentB.id],
      );

      expect(result.totalUnassigned).toBe(2);
      expect(result.groupsCreated).toEqual(["Custom Group"]);
      expect(result.foldersCreated).toHaveLength(1);

      // Verify both agents are in the same folder
      const [folder] = await db
        .select({ id: agentFolders.id })
        .from(agentFolders)
        .where(eq(agentFolders.name, "Custom Group"));

      const updatedAgents = await db
        .select({ id: agents.id, folderId: agents.folderId })
        .from(agents)
        .where(eq(agents.folderId, folder.id));

      expect(updatedAgents).toHaveLength(2);
      expect(updatedAgents.map((a: { id: string }) => a.id)).toEqual(
        expect.arrayContaining([agentA.id, agentB.id]),
      );
    });
  });
});
