import type { Db } from "@paperclipai/db";
import { agents as agentsTable } from "@paperclipai/db";
import { and, eq, isNull } from "drizzle-orm";
import type { AgentFolder } from "@paperclipai/shared";
import { AgentFolderService } from "./agent-folders.js";
import { AgentInstructionsInheritanceService } from "./agent-instructions-inheritance.js";

/**
 * Service for migrating agents from a flat (no folder) organization
 * into the hierarchical folder structure.
 */
export class FolderMigrationService {
  constructor(
    private db: Db,
    private folderService: AgentFolderService,
    private inheritanceService: AgentInstructionsInheritanceService,
  ) {}

  /** Migrate agents grouped by `role` into role-based folders. Idempotent. */
  async migrateByRole(companyId: string): Promise<MigrationResult> {
    const agents = await this.db
      .select({
        id: agentsTable.id,
        name: agentsTable.name,
        role: agentsTable.role,
        adapterConfig: agentsTable.adapterConfig,
      })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    // Group agents by role
    const groups = new Map<string, typeof agents>();
    for (const agent of agents) {
      const role = agent.role ?? "general";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(agent);
    }

    const created: string[] = [];
    for (const [role, roleAgents] of groups) {
      const slug = this.slugify(role);

      // Check if a folder with this slug already exists at root level
      const existing = await this.folderService.list(companyId);
      const folderExists = existing.some(
        (f) => f.slug === slug && f.parentId === null,
      );

      let folder: AgentFolder;
      if (folderExists) {
        folder = existing.find(
          (f) => f.slug === slug && f.parentId === null,
        )!;
      } else {
        folder = await this.folderService.create({
          companyId,
          name: role,
          slug,
          metadata: { role },
        });
        created.push(folder.id);
      }

      for (const agent of roleAgents) {
        await this.db
          .update(agentsTable)
          .set({ folderId: folder.id, updatedAt: new Date() })
          .where(eq(agentsTable.id, agent.id));

        await this.inheritanceService.writePointerFile(
          {
            id: agent.id,
            companyId,
            name: agent.name,
            adapterConfig: agent.adapterConfig,
            folderId: folder.id,
          },
          folder.id,
        );
      }
    }

    return {
      totalUnassigned: agents.length,
      groupsCreated: Array.from(groups.keys()),
      foldersCreated: created,
      foldersReused: groups.size - created.length,
    };
  }

  /** Migrate agents grouped by a metadata key (e.g. "team", "project"). */
  async migrateByMetadataKey(
    companyId: string,
    metadataKey: string,
  ): Promise<MigrationResult> {
    const agents = await this.db
      .select({
        id: agentsTable.id,
        name: agentsTable.name,
        role: agentsTable.role,
        adapterConfig: agentsTable.adapterConfig,
        metadata: agentsTable.metadata,
      })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    const groups = new Map<string, typeof agents>();
    for (const agent of agents) {
      const meta = (agent.metadata ?? {}) as Record<string, unknown>;
      const groupValue = meta[metadataKey];
      const groupKey =
        typeof groupValue === "string" && groupValue
          ? groupValue
          : "unspecified";
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(agent);
    }

    const created: string[] = [];
    for (const [groupKey, groupAgents] of groups) {
      const slug = this.slugify(groupKey);
      const folder = await this.folderService.create({
        companyId,
        name: groupKey,
        slug,
        metadata: { [metadataKey]: groupKey },
      });
      created.push(folder.id);

      for (const agent of groupAgents) {
        await this.db
          .update(agentsTable)
          .set({ folderId: folder.id, updatedAt: new Date() })
          .where(eq(agentsTable.id, agent.id));

        await this.inheritanceService.writePointerFile(
          {
            id: agent.id,
            companyId,
            name: agent.name,
            adapterConfig: agent.adapterConfig,
            folderId: folder.id,
          },
          folder.id,
        );
      }
    }

    return {
      totalUnassigned: agents.length,
      groupsCreated: Array.from(groups.keys()),
      foldersCreated: created,
      foldersReused: 0,
    };
  }

  /** Migrate a specific list of agent IDs into a named folder. */
  async migrateToCustomFolder(
    companyId: string,
    folderName: string,
    agentIds: string[],
  ): Promise<MigrationResult> {
    const folder = await this.folderService.create({
      companyId,
      name: folderName,
      slug: this.slugify(folderName),
      metadata: { migration: true },
    });

    // Iterate agentIds and update each
    for (const agentId of agentIds) {
      const [agent] = await this.db
        .select({
          id: agentsTable.id,
          name: agentsTable.name,
          adapterConfig: agentsTable.adapterConfig,
        })
        .from(agentsTable)
        .where(
          and(
            eq(agentsTable.id, agentId),
            eq(agentsTable.companyId, companyId),
          ),
        )
        .limit(1);

      if (!agent) continue;

      await this.db
        .update(agentsTable)
        .set({ folderId: folder.id, updatedAt: new Date() })
        .where(eq(agentsTable.id, agent.id));

      await this.inheritanceService.writePointerFile(
        {
          id: agent.id,
          companyId,
          name: agent.name,
          adapterConfig: agent.adapterConfig,
          folderId: folder.id,
        },
        folder.id,
      );
    }

    return {
      totalUnassigned: agentIds.length,
      groupsCreated: [folderName],
      foldersCreated: [folder.id],
      foldersReused: 0,
    };
  }

  /** Get a summary of unassigned agents for a company. */
  async getUnassignedSummary(companyId: string): Promise<{
    total: number;
    roleGroups: Record<string, number>;
  }> {
    const agents = await this.db
      .select({ role: agentsTable.role })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    const roleGroups: Record<string, number> = {};
    for (const agent of agents) {
      const role = agent.role ?? "general";
      roleGroups[role] = (roleGroups[role] ?? 0) + 1;
    }

    return { total: agents.length, roleGroups };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|]+$/g, "")
      .substring(0, 64);
  }
}

/** Migration operation result */
export interface MigrationResult {
  /** Total number of previously-unassigned agents found */
  totalUnassigned: number;
  /** Role names that were grouped (or folder names created) */
  groupsCreated: string[];
  /** IDs of folders created during migration */
  foldersCreated: string[];
  /** Folders that were reused because a matching one already existed */
  foldersReused: number;
}

/**
 * Migrate agents from flat (folder_id = NULL) into role-based folders.
 * Idempotent: agents with existing folderId are skipped.
 */
export async function migrateFlatAgentsByRole(
  db: Db,
  companyId: string,
): Promise<MigrationResult> {
  const folderService = new AgentFolderService(db);
  const inheritanceService = new AgentInstructionsInheritanceService(db);
  const migration = new FolderMigrationService(
    db,
    folderService,
    inheritanceService,
  );
  return migration.migrateByRole(companyId);
}
