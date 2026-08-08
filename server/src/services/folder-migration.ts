import type { Db } from "@paperclipai/db";
import { agents as agentsTable } from "@paperclipai/db";
import { and, eq, isNull } from "drizzle-orm";
import type { AgentFolder } from "@paperclipai/shared";
import { agentFolderService } from "./agent-folders.js";
import {
  writeAgentFolderPointerFile,
  type AgentLikeForInheritance,
} from "./agent-instructions-inheritance.js";

/**
 * Service for migrating agents from a flat (no folder) organization
 * into the hierarchical agent folder structure (JAC-4746).
 *
 * All operations are idempotent and company-scoped.
 */
export class FolderMigrationService {
  constructor(private db: Db) {}

  private get folderService() {
    return agentFolderService(this.db);
  }

  /**
   * Migrate agents grouped by `role` into role-based root folders.
   * Idempotent: agents that already have a folder are skipped; folders are
   * reused if a folder with the matching slug already exists at the root.
   */
  async migrateByRole(companyId: string): Promise<MigrationResult> {
    const list = await this.folderService.list(companyId);
    const unassigned = await this.db
      .select({
        id: agentsTable.id,
        name: agentsTable.name,
        role: agentsTable.role,
        adapterConfig: agentsTable.adapterConfig,
        folderId: agentsTable.folderId,
      })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    const groups = new Map<string, typeof unassigned>();
    for (const agent of unassigned) {
      const role = agent.role ?? "general";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(agent);
    }

    const created: string[] = [];
    for (const [role, roleAgents] of groups) {
      const slug = slugify(role);
      const existing = list.folders.find(
        (f) => f.slug === slug && f.parentId === null,
      );
      let folder: AgentFolder;
      if (existing) {
        folder = existing;
      } else {
        folder = await this.folderService.create(companyId, {
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

        await writeAgentFolderPointerFile(
          {
            id: agent.id,
            companyId,
            name: agent.name,
            adapterConfig: (agent.adapterConfig as Record<string, unknown>) ?? {},
            folderId: folder.id,
          },
          folder.id,
        );
      }
    }

    return {
      totalUnassigned: unassigned.length,
      groupsCreated: Array.from(groups.keys()),
      foldersCreated: created,
      foldersReused: groups.size - created.length,
    };
  }

  /**
   * Migrate agents grouped by a metadata key (e.g. "team", "project").
   */
  async migrateByMetadataKey(
    companyId: string,
    metadataKey: string,
  ): Promise<MigrationResult> {
    const unassigned = await this.db
      .select({
        id: agentsTable.id,
        name: agentsTable.name,
        role: agentsTable.role,
        adapterConfig: agentsTable.adapterConfig,
        folderId: agentsTable.folderId,
      })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    const groups = new Map<string, typeof unassigned>();
    for (const agent of unassigned) {
      const meta = (agent.adapterConfig as Record<string, unknown> | null) ?? {};
      const groupValue = (meta[metadataKey] as unknown) ?? null;
      const groupKey =
        typeof groupValue === "string" && groupValue ? groupValue : "unspecified";
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(agent);
    }

    const created: string[] = [];
    for (const [groupKey, groupAgents] of groups) {
      const folder = await this.folderService.create(companyId, {
        name: groupKey,
        slug: slugify(groupKey),
        metadata: { [metadataKey]: groupKey },
      });
      created.push(folder.id);

      for (const agent of groupAgents) {
        await this.db
          .update(agentsTable)
          .set({ folderId: folder.id, updatedAt: new Date() })
          .where(eq(agentsTable.id, agent.id));

        await writeAgentFolderPointerFile(
          {
            id: agent.id,
            companyId,
            name: agent.name,
            adapterConfig: (agent.adapterConfig as Record<string, unknown>) ?? {},
            folderId: folder.id,
          },
          folder.id,
        );
      }
    }

    return {
      totalUnassigned: unassigned.length,
      groupsCreated: Array.from(groups.keys()),
      foldersCreated: created,
      foldersReused: 0,
    };
  }

  /**
   * Migrate a specific list of agent IDs into a named folder.
   */
  async migrateToCustomFolder(
    companyId: string,
    folderName: string,
    agentIds: string[],
  ): Promise<MigrationResult> {
    const folder = await this.folderService.create(companyId, {
      name: folderName,
      slug: slugify(folderName),
      metadata: { migration: true },
    });

    let assigned = 0;
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

      await writeAgentFolderPointerFile(
        {
          id: agent.id,
          companyId,
          name: agent.name,
          adapterConfig: (agent.adapterConfig as Record<string, unknown>) ?? {},
          folderId: folder.id,
        },
        folder.id,
      );
      assigned++;
    }

    return {
      totalUnassigned: assigned,
      groupsCreated: [folderName],
      foldersCreated: [folder.id],
      foldersReused: 0,
    };
  }

  /** Get a summary of unassigned agents (folderId IS NULL) grouped by role. */
  async getUnassignedSummary(companyId: string): Promise<{
    total: number;
    roleGroups: Record<string, number>;
  }> {
    const rows = await this.db
      .select({ role: agentsTable.role })
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.companyId, companyId),
          isNull(agentsTable.folderId),
        ),
      );

    const roleGroups: Record<string, number> = {};
    for (const row of rows) {
      const role = row.role ?? "general";
      roleGroups[role] = (roleGroups[role] ?? 0) + 1;
    }
    return { total: rows.length, roleGroups };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 64);
}

export interface MigrationResult {
  totalUnassigned: number;
  groupsCreated: string[];
  foldersCreated: string[];
  foldersReused: number;
}

/** Convenience factory: migrate flat agents into role-based folders. */
export async function folderMigrationService(
  db: Db,
  companyId: string,
): Promise<MigrationResult> {
  return new FolderMigrationService(db).migrateByRole(companyId);
}
