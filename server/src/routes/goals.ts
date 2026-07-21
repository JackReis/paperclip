import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createGoalSchema, updateGoalSchema } from "@paperclipai/shared";
import { trackGoalCreated } from "@paperclipai/shared/telemetry";
import { validate } from "../middleware/validate.js";
import { goalService, logActivity, createLifecycleEvent, publishLifecycleEvent } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { getTelemetryClient } from "../telemetry.js";

export function goalRoutes(db: Db) {
  const router = Router();
  const svc = goalService(db);

  router.get("/companies/:companyId/goals", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.list(companyId);
    res.json(result);
  });

  router.get("/goals/:id", async (req, res) => {
    const id = req.params.id as string;
    const goal = await svc.getById(id);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    assertCompanyAccess(req, goal.companyId);
    res.json(goal);
  });

  // Bidirectional lookup: get all routines linked to a goal
  router.get("/goals/:id/routines", async (req, res) => {
    const id = req.params.id as string;
    const goal = await svc.getById(id);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    assertCompanyAccess(req, goal.companyId);
    const result = await svc.listRoutinesForGoal(id);
    res.json(result);
  });

  router.post("/companies/:companyId/goals", validate(createGoalSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const goal = await svc.create(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "goal.created",
      entityType: "goal",
      entityId: goal.id,
      details: { title: goal.title },
    });
    const telemetryClient = getTelemetryClient();
    if (telemetryClient) {
      trackGoalCreated(telemetryClient, { goalLevel: goal.level });
    }

    // Publish lifecycle event to memory planes
    const event = createLifecycleEvent({
      entityType: "goal",
      entityId: goal.id,
      companyId,
      oldStatus: null,
      newStatus: goal.status,
      agentId: actor.agentId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      runId: actor.runId ?? null,
      metadata: { title: goal.title, level: goal.level },
    });
    publishLifecycleEvent(event).catch(() => {
      // Non-blocking — memory plane failures don't block the API response
    });

    res.status(201).json(goal);
  });

  router.patch("/goals/:id", validate(updateGoalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    let goal;
    try {
      goal = await svc.updateWithTransition(id, req.body);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
      return;
    }
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: goal.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "goal.updated",
      entityType: "goal",
      entityId: goal.id,
      details: req.body,
    });

    // Publish lifecycle event if status changed
    if (req.body.status && req.body.status !== existing.status) {
      // Log a dedicated status_changed activity for plugin event bus propagation
      await logActivity(db, {
        companyId: goal.companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "goal.status_changed",
        entityType: "goal",
        entityId: goal.id,
        details: { oldStatus: existing.status, newStatus: goal.status, title: goal.title },
      });
      const event = createLifecycleEvent({
        entityType: "goal",
        entityId: goal.id,
        companyId: goal.companyId,
        oldStatus: existing.status,
        newStatus: goal.status,
        agentId: actor.agentId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        runId: actor.runId ?? null,
        metadata: { title: goal.title, level: goal.level, changes: req.body },
      });
      publishLifecycleEvent(event).catch(() => {
        // Non-blocking — memory plane failures don't block the API response
      });
    }

    res.json(goal);
  });

  router.delete("/goals/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const goal = await svc.remove(id);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: goal.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "goal.deleted",
      entityType: "goal",
      entityId: goal.id,
    });

    // Publish lifecycle event for deletion
    const event = createLifecycleEvent({
      entityType: "goal",
      entityId: goal.id,
      companyId: goal.companyId,
      oldStatus: existing.status,
      newStatus: "cancelled",
      agentId: actor.agentId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      runId: actor.runId ?? null,
      metadata: { title: goal.title, level: goal.level, action: "deleted" },
    });
    publishLifecycleEvent(event).catch(() => {
      // Non-blocking
    });

    res.json(goal);
  });

  return router;
}