import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createAgentFolderSchema,
  moveAgentFolderSchema,
  moveAgentToFolderSchema,
  updateAgentFolderSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { agentFolderService, logActivity } from "../services/index.js";
import { invalidateCompanyCache } from "../services/agent-instructions-inheritance.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function agentFolderRoutes(db: Db) {
  const router = Router();
  const svc = agentFolderService(db);

  router.get("/companies/:companyId/agent-folders", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.list(companyId));
  });

  router.get("/companies/:companyId/agent-folders/:folderId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const folderId = req.params.folderId as string;
    assertCompanyAccess(req, companyId);
    const folder = await svc.get(companyId, folderId);
    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
    res.json(folder);
  });

  router.post("/companies/:companyId/agent-folders", validate(createAgentFolderSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const created = await svc.create(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      runId: actor.runId,
      agentApiKeyId: actor.agentApiKeyId,
      action: "agent_folder.created",
      entityType: "agent_folder",
      entityId: created.id,
      details: { name: created.name, slug: created.slug, parentId: created.parentId },
    });
    res.status(201).json(created);
  });

  router.patch(
    "/companies/:companyId/agent-folders/:folderId",
    validate(updateAgentFolderSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const folderId = req.params.folderId as string;
      assertCompanyAccess(req, companyId);
      const updated = await svc.update(companyId, folderId, req.body);
      if (!updated) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_folder.updated",
        entityType: "agent_folder",
        entityId: updated.id,
        details: { name: updated.name, slug: updated.slug },
      });
      res.json(updated);
    },
  );

  router.post(
    "/companies/:companyId/agent-folders/:folderId/move",
    validate(moveAgentFolderSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const folderId = req.params.folderId as string;
      assertCompanyAccess(req, companyId);
      const moved = await svc.moveFolder(companyId, folderId, req.body);
      if (!moved) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
      // On folder reparent, invalidate all descendant agent caches
      // (both old and new parent chains may contain different agent sets)
      invalidateCompanyCache(companyId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_folder.moved",
        entityType: "agent_folder",
        entityId: moved.id,
        details: { parentId: moved.parentId, sortOrder: moved.sortOrder },
      });
      res.json(moved);
    },
  );

  router.delete("/companies/:companyId/agent-folders/:folderId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const folderId = req.params.folderId as string;
    const force = req.query.force === "true";
    assertCompanyAccess(req, companyId);
    try {
      const deleted = await svc.deleteFolder(companyId, folderId, { force });
      if (!deleted) {
        res.status(404).json({ error: "Folder not found" });
        return;
      }
      // On folder deletion, invalidate caches for any descendant agents
      invalidateCompanyCache(companyId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_folder.deleted",
        entityType: "agent_folder",
        entityId: deleted.id,
        details: { name: deleted.name, force },
      });
      res.json({ deleted });
    } catch (err) {
      if (err instanceof Error && "status" in err) {
        const status = (err as { status: number }).status;
        res.status(status).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  // Assign agents to a folder
  router.post(
    "/companies/:companyId/agent-folders/:folderId/agents",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const folderId = req.params.folderId as string;
      assertCompanyAccess(req, companyId);
      const agentIds: string[] = Array.isArray(req.body?.agentIds) ? req.body.agentIds : [];
      if (agentIds.length === 0) {
        res.status(400).json({ error: "agentIds array is required" });
        return;
      }
      await svc.assignAgents(companyId, folderId, agentIds);
      // Invalidate inheritance cache for affected agents
      invalidateCompanyCache(companyId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_folder.agents_assigned",
        entityType: "agent_folder",
        entityId: folderId,
        details: { agentIds, count: agentIds.length },
      });
      res.json({ ok: true });
    },
  );

  // List agents in a folder (recursive)
  router.get("/companies/:companyId/agent-folders/:folderId/agents", async (req, res) => {
    const companyId = req.params.companyId as string;
    const folderId = req.params.folderId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listAgentsInFolder(companyId, folderId));
  });

  // Move an agent to/from a folder (or unassign by passing null)
  router.post(
    "/companies/:companyId/agent-folders/agents/:agentId/move",
    validate(moveAgentToFolderSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const agentId = req.params.agentId as string;
      assertCompanyAccess(req, companyId);
      const folderId = req.body.folderId;
      if (folderId) {
        await svc.assignAgents(companyId, folderId, [agentId]);
      } else {
        await svc.unassignAgent(companyId, agentId);
      }
      // Invalidate inheritance cache for the affected agent
      invalidateCompanyCache(companyId);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "agent_folder.agent_moved",
        entityType: "agent",
        entityId: agentId,
        details: { folderId: folderId ?? null },
      });
      res.json({ ok: true });
    },
  );

  return router;
}
