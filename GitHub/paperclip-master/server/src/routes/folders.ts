import { Router, type Request } from "express";
import type { Db } from "@paperclipai/db";
import { agentFolders } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import {
  createFolderSchema,
  updateFolderSchema,
  deleteFolderSchema,
  upsertFolderInstructionsFileSchema,
  bulkCreateAgentsInFolderSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { AgentFolderService } from "../services/agent-folders.js";
import { AgentInstructionsInheritanceService } from "../services/agent-instructions-inheritance.js";
import { FolderMigrationService } from "../services/folder-migration.js";
import { agentService, logActivity } from "../services/index.js";
import { notFound, unprocessable } from "../errors.js";
import path from "node:path";
import fs from "node:fs/promises";

export function folderRoutes(db: Db): Router {
  const router = Router();
  const folderService = new AgentFolderService(db);
  const inheritanceService = new AgentInstructionsInheritanceService(db);
  const agentSvc = agentService(db);

  // ── Folder CRUD ──────────────────────────────────────────────

  /** POST /api/companies/:cid/folders — Create a folder */
  router.post(
    "/api/companies/:cid/folders",
    assertBoard,
    validate(createFolderSchema),
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const actor = getActorInfo(req);
        const folder = await folderService.create({
          companyId,
          ...req.body,
        });
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.created",
          entityType: "folder",
          entityId: folder.id,
          details: { name: folder.name, parentId: folder.parentId },
        });
        res.status(201).json(folder);
      } catch (err) {
        next(err);
      }
    },
  );

  /** GET /api/companies/:cid/folders — List folders (flat or tree) */
  router.get(
    "/api/companies/:cid/folders",
    assertBoard,
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const tree = req.query.tree === "true";
        if (tree) {
          const result = await folderService.listTree(companyId);
          res.json(result);
        } else {
          const result = await folderService.list(companyId);
          res.json(result);
        }
      } catch (err) {
        next(err);
      }
    },
  );

  /** GET /api/companies/:cid/folders/:id — Get folder detail */
  router.get(
    "/api/companies/:cid/folders/:id",
    assertBoard,
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const folderId = req.params.id as string;
        const folder = await folderService.getDetail(companyId, folderId);
        res.json(folder);
      } catch (err) {
        next(err);
      }
    },
  );

  /** PATCH /api/companies/:cid/folders/:id — Update folder */
  router.patch(
    "/api/companies/:cid/folders/:id",
    assertBoard,
    validate(updateFolderSchema),
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const actor = getActorInfo(req);
        const folderId = req.params.id as string;
        const folder = await folderService.update(companyId, folderId, req.body);
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.updated",
          entityType: "folder",
          entityId: folder.id,
          details: { changedKeys: Object.keys(req.body) },
        });
        res.json(folder);
      } catch (err) {
        next(err);
      }
    },
  );

  /** DELETE /api/companies/:cid/folders/:id — Delete folder */
  router.delete(
    "/api/companies/:cid/folders/:id",
    assertBoard,
    validate(deleteFolderSchema),
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const actor = getActorInfo(req);
        const folderId = req.params.id as string;
        await folderService.delete(companyId, folderId, req.body);
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.deleted",
          entityType: "folder",
          entityId: folderId,
          details: req.body,
        });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  // ── Folder Instructions ──────────────────────────────────────

  /** GET /api/folders/:id/instructions-bundle — Get folder instructions bundle */
  router.get(
    "/api/folders/:id/instructions-bundle",
    assertBoard,
    async (req, res, next) => {
      try {
        const folderId = req.params.id as string;
        const [folder] = await db
          .select({ id: agentFolders.id, companyId: agentFolders.companyId })
          .from(agentFolders)
          .where(eq(agentFolders.id, folderId))
          .limit(1);

        if (!folder) throw notFound("Folder not found");

        const rootPath = folderService.resolveFolderInstructionsRoot(folder);
        const files = await listInstructionFiles(rootPath);

        res.json({
          folderId: folder.id,
          companyId: folder.companyId,
          rootPath,
          entryFile: "AGENTS.md",
          resolvedEntryPath: path.join(rootPath, "AGENTS.md"),
          files,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  /** PUT /api/folders/:id/instructions-bundle/file — Write a file in folder instructions */
  router.put(
    "/api/folders/:id/instructions-bundle/file",
    assertBoard,
    validate(upsertFolderInstructionsFileSchema),
    async (req, res, next) => {
      try {
        const actor = getActorInfo(req);
        const folderId = req.params.id as string;
        const [folder] = await db
          .select({ id: agentFolders.id, companyId: agentFolders.companyId })
          .from(agentFolders)
          .where(eq(agentFolders.id, folderId))
          .limit(1);

        if (!folder) throw notFound("Folder not found");

        const rootPath = folderService.resolveFolderInstructionsRoot(folder);
        await fs.mkdir(rootPath, { recursive: true });

        const filePath = path.join(rootPath, req.body.path);
        const relativePath = path.relative(rootPath, filePath);
        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
          throw unprocessable("File path must stay within the folder instructions root");
        }

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.body.content, "utf8");

        // Invalidate caches for all agents in this folder subtree
        await inheritanceService.invalidateFolderCache(folder.id);

        await logActivity(db, {
          companyId: folder.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.instructions_file_written",
          entityType: "folder",
          entityId: folder.id,
          details: { path: req.body.path },
        });

        res.json({ path: req.body.path, written: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ── Agents in Folder ─────────────────────────────────────────

  /** GET /api/folders/:id/agents — List agents in folder */
  router.get(
    "/api/folders/:id/agents",
    assertBoard,
    async (req, res, next) => {
      try {
        const recursive = req.query.recursive === "true";
        const folderId = req.params.id as string;
        const [folder] = await db
          .select({ id: agentFolders.id, companyId: agentFolders.companyId })
          .from(agentFolders)
          .where(eq(agentFolders.id, folderId))
          .limit(1);

        if (!folder) throw notFound("Folder not found");

        const agents = await folderService.listAgents(folder.companyId, folder.id, { recursive });
        res.json(agents);
      } catch (err) {
        next(err);
      }
    },
  );

  /** POST /api/folders/:id/agents — Bulk create agents in folder */
  router.post(
    "/api/folders/:id/agents",
    assertBoard,
    validate(bulkCreateAgentsInFolderSchema),
    async (req, res, next) => {
      try {
        const actor = getActorInfo(req);
        const folderId = req.params.id as string;
        const [folder] = await db
          .select({ id: agentFolders.id, companyId: agentFolders.companyId })
          .from(agentFolders)
          .where(eq(agentFolders.id, folderId))
          .limit(1);

        if (!folder) throw notFound("Folder not found");

        const createdAgents = [];
        for (const agentInput of req.body.agents) {
          const agent = await agentSvc.create(folder.companyId, {
            name: agentInput.name,
            role: agentInput.role ?? "general",
            title: agentInput.title ?? null,
            adapterType: agentInput.adapterType,
            adapterConfig: agentInput.adapterConfig ?? {},
            budgetMonthlyCents: agentInput.budgetMonthlyCents ?? 0,
            metadata: agentInput.metadata ?? null,
            folderId: folder.id,
          });
          createdAgents.push(agent);

          // Generate pointer file
          await inheritanceService.writePointerFile(
            {
              id: agent.id,
              companyId: folder.companyId,
              name: agent.name,
              adapterConfig: agent.adapterConfig,
              folderId: folder.id,
            },
            folder.id,
          );
        }

        await logActivity(db, {
          companyId: folder.companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.agents_bulk_created",
          entityType: "folder",
          entityId: folder.id,
          details: { count: createdAgents.length },
        });

        res.status(201).json(createdAgents);
      } catch (err) {
        next(err);
      }
    },
  );

  // ── Migration ────────────────────────────────────────────────

  /** GET /api/companies/:cid/folders/migration-preview — Preview unassigned agents */
  router.get(
    "/api/companies/:cid/folders/migration-preview",
    assertBoard,
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const migrationService = new FolderMigrationService(db, folderService, inheritanceService);
        const summary = await migrationService.getUnassignedSummary(companyId);
        res.json(summary);
      } catch (err) {
        next(err);
      }
    },
  );

  /** POST /api/companies/:cid/folders/migrate-by-role — Migrate unassigned agents to role folders */
  router.post(
    "/api/companies/:cid/folders/migrate-by-role",
    assertBoard,
    async (req, res, next) => {
      try {
        const companyId = req.params.cid as string;
        assertCompanyAccess(req, companyId);
        const actor = getActorInfo(req);
        const migrationService = new FolderMigrationService(db, folderService, inheritanceService);
        const result = await migrationService.migrateByRole(companyId);
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action: "folder.migration_by_role",
          entityType: "folder",
          entityId: "",
          details: { total: result.totalUnassigned, groups: result.groupsCreated },
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

// Helper: list instruction files in a directory
async function listInstructionFiles(rootPath: string): Promise<Array<{
  path: string;
  size: number;
  language: string;
  markdown: boolean;
  isEntryFile: boolean;
  editable: boolean;
  deprecated: boolean;
  virtual: boolean;
}>> {
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (entry.name.startsWith(".")) continue;
      const filePath = path.join(rootPath, entry.name);
      const stat = await fs.stat(filePath);
      files.push({
        path: entry.name,
        size: stat.size,
        language: entry.name.endsWith(".md") ? "markdown" : "text",
        markdown: entry.name.endsWith(".md"),
        isEntryFile: entry.name === "AGENTS.md",
        editable: true,
        deprecated: false,
        virtual: false,
      });
    }
    return files;
  } catch {
    return [];
  }
}
