import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { heartbeatRuns } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import {
  createCostEventSchema,
  createFinanceEventSchema,
  createRunEventSchema,
  normalizeIssueIdentifier,
  resolveBudgetIncidentSchema,
  updateBudgetSchema,
  upsertBudgetPolicySchema,
} from "@paperclipai/shared";
import type { RunCoverageResolution } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import {
  budgetService,
  costService,
  financeService,
  companyService,
  agentService,
  issueService,
  heartbeatService,
  accessService,
  logActivity,
} from "../services/index.js";
import { assertBoard, assertCompanyAccess, getAccessibleResource, getActorInfo } from "./authz.js";
import { DEFAULT_VISIBILITY_CLASS } from "@paperclipai/shared";
import { fetchAllQuotaWindows } from "../services/quota-windows.js";
import { badRequest } from "../errors.js";
import type { PluginWorkerManager } from "../services/plugin-worker-manager.js";

export function parseCostDateRange(query: Record<string, unknown>) {
  const fromRaw = query.from as string | undefined;
  const toRaw = query.to as string | undefined;
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && isNaN(from.getTime())) throw badRequest("invalid 'from' date");
  if (to && isNaN(to.getTime())) throw badRequest("invalid 'to' date");
  return (from || to) ? { from, to } : undefined;
}

export function parseCostLimit(query: Record<string, unknown>) {
  const raw = Array.isArray(query.limit) ? query.limit[0] : query.limit;
  if (raw == null || raw === "") return 100;
  const limit = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 500) {
    throw badRequest("invalid 'limit' value");
  }
  return limit;
}

export function costRoutes(
  db: Db,
  options: { pluginWorkerManager?: PluginWorkerManager } = {},
) {
  const router = Router();
  const heartbeat = heartbeatService(db, {
    pluginWorkerManager: options.pluginWorkerManager,
  });
  const budgetHooks = {
    cancelWorkForScope: heartbeat.cancelBudgetScopeWork,
  };
  const costs = costService(db, budgetHooks);
  const finance = financeService(db);
  const budgets = budgetService(db, budgetHooks);
  const companies = companyService(db);
  const agents = agentService(db);
  const issues = issueService(db);
  const access = accessService(db);

  async function resolveIssueByRef(rawId: string) {
    const identifier = normalizeIssueIdentifier(rawId);
    if (identifier) {
      return issues.getByIdentifier(identifier);
    }
    return issues.getById(rawId);
  }

  async function assertCompanyCostReadAllowed(req: Parameters<typeof assertCompanyAccess>[0], res: any, companyId: string) {
    const decision = await access.decide({
      actor: req.actor,
      action: "company_scope:read",
      resource: { type: "company", companyId },
    });
    if (decision.allowed) return true;
    res.status(403).json({ error: "Costs are outside this actor's authorization boundary" });
    return false;
  }

  async function assertIssueCostReadAllowed(req: Parameters<typeof assertCompanyAccess>[0], res: any, issue: {
    id: string;
    companyId: string;
    projectId: string | null;
    parentId: string | null;
    assigneeAgentId: string | null;
    assigneeUserId: string | null;
    status: string;
  }) {
    const decision = await access.decide({
      actor: req.actor,
      action: "issue:read",
      resource: {
        type: "issue",
        companyId: issue.companyId,
        issueId: issue.id,
        projectId: issue.projectId,
        parentIssueId: issue.parentId,
        assigneeAgentId: issue.assigneeAgentId,
        assigneeUserId: issue.assigneeUserId,
        status: issue.status,
      },
    });
    if (decision.allowed) return true;
    res.status(403).json({ error: "Issue costs are outside this actor's authorization boundary" });
    return false;
  }

  router.post("/companies/:companyId/cost-events", validate(createCostEventSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    if (req.actor.type === "agent" && req.actor.agentId !== req.body.agentId) {
      res.status(403).json({ error: "Agent can only report its own costs" });
      return;
    }

    // JAC-4533: fail-closed enforcement — external (non-board) actors cannot
    // escalate visibility_class to "public". Clamp to the internal default
    // and record an activity-log entry for the rejected escalation.
    if (req.actor.type !== "board" && req.body.visibilityClass === "public") {
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        agentApiKeyId: actor.agentApiKeyId,
        action: "visibility_escalation.rejected",
        entityType: "cost_event",
        entityId: req.body.runId ?? "pending",
        details: {
          submittedVisibilityClass: "public",
          clampedTo: DEFAULT_VISIBILITY_CLASS,
        },
      });
      req.body.visibilityClass = DEFAULT_VISIBILITY_CLASS;
    }

    const event = await costs.createEvent(companyId, {
      ...req.body,
      occurredAt: new Date(req.body.occurredAt),
    });

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "cost.reported",
      entityType: "cost_event",
      entityId: event.id,
      details: { costCents: event.costCents, model: event.model },
    });

    res.status(201).json(event);
  });

  /**
   * Accept a normalized run event from the adapter (JAC-4529).
   * Agents may report their own run events; board users may report for any agent.
   * Coverage fields are resolved via fail-closed transforms in the schema —
   * callers cannot override coverageState, sourceStatus, or safeStatus.
   */
  router.post(
    "/companies/:companyId/run-events",
    validate(createRunEventSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      // Resolve agent from the associated heartbeat run (run events are
      // reported per-run, not per-agent — the adapter does not know the agent
      // id). The issueId, if provided by the adapter, is preferred; otherwise
      // it is looked up from the run's contextSnapshot.
      const [runRow] = await db
        .select({
          agentId: heartbeatRuns.agentId,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, req.body.runId));

      if (!runRow) {
        res.status(404).json({ error: "Run not found" });
        return;
      }

      if (req.actor.type === "agent" && req.actor.agentId !== runRow.agentId) {
        res.status(403).json({ error: "Agent can only report run events for its own runs" });
        return;
      }

      // JAC-4533: fail-closed enforcement — external (non-board) actors cannot
      // escalate visibility_class to "public". Clamp to the internal default
      // and record an activity-log entry for the rejected escalation.
      if (req.actor.type !== "board" && req.body.visibilityClass === "public") {
        const actor = getActorInfo(req);
        await logActivity(db, {
          companyId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          agentId: actor.agentId,
          runId: actor.runId,
          agentApiKeyId: actor.agentApiKeyId,
          action: "visibility_escalation.rejected",
          entityType: "run_event",
          entityId: req.body.runId,
          details: {
            submittedVisibilityClass: "public",
            clampedTo: DEFAULT_VISIBILITY_CLASS,
          },
        });
        req.body.visibilityClass = DEFAULT_VISIBILITY_CLASS;
      }

      const runIssueId =
        req.body.issueId ?? (runRow.contextSnapshot?.issueId as string | undefined);

      // The Zod schema transform has already resolved coverage fields
      // (coverageState, sourceStatus, safeStatus, confidence, etc.)
      // fail-closed from the submitted usage/token values. Reconstruct
      // the RunCoverageResolution shape for the cost service.
      const coverage: RunCoverageResolution = {
        usageReportedState: req.body.usageReportedState,
        inputTokens: req.body.inputTokens ?? null,
        outputTokens: req.body.outputTokens ?? null,
        cachedInputTokens: req.body.cachedInputTokens ?? null,
        reasoningTokens: req.body.reasoningTokens ?? null,
        toolCallTokens: req.body.toolCallTokens ?? null,
        costCents: req.body.costCents ?? null,
        // JAC-4530: forward cost-provenance metadata. priceBasis/costConfidence
        // are resolved fail-closed by the schema transform above; native/recomputed
        // totals and isSubscriptionIncluded come from the same transform.
        priceBasis: req.body.priceBasis,
        costConfidence: req.body.costConfidence,
        nativeTotalTokens: req.body.nativeTotalTokens ?? null,
        recomputedTotalTokens: req.body.recomputedTotalTokens ?? null,
        isSubscriptionIncluded: req.body.isSubscriptionIncluded,
        coverageState: req.body.coverageState,
        sourceStatus: req.body.sourceStatus,
        safeStatus: req.body.safeStatus,
        confidence: req.body.confidence,
      };

      const event = await costs.createRunEvent(companyId, {
        runId: req.body.runId,
        agentId: runRow.agentId,
        issueId: runIssueId ?? null,
        adapterType: req.body.adapterType,
        model: req.body.model,
        provider: req.body.provider,
        status: req.body.status,
        occurredAt: new Date(req.body.occurredAt),
        coverage: coverage,
        pricingVersionRef: req.body.pricingVersionRef ?? null,
        // JAC-4533: forward privacy/retention fields from validated request body.
        // The Zod schema already applied fail-closed defaults; the visibility_class
        // public-clamp above ensures non-board actors cannot escalate.
        visibilityClass: req.body.visibilityClass,
        retentionClass: req.body.retentionClass,
        redactionState: req.body.redactionState,
        sourcePermissionRef: req.body.sourcePermissionRef,
        tenantRefHash: req.body.tenantRefHash,
        subjectRefHashes: req.body.subjectRefHashes,
        sourceDeletedAt: req.body.sourceDeletedAt ? new Date(req.body.sourceDeletedAt) : null,
        tombstoneRef: req.body.tombstoneRef,
        policyVersion: req.body.policyVersion,
        // JAC-4532: forward event identity / idempotency fields.
        sourceSystem: req.body.sourceSystem,
        sourceEventId: req.body.sourceEventId ?? null,
        sourceEventVersion: req.body.sourceEventVersion ?? null,
        eventKind: req.body.eventKind,
        attemptIndex: req.body.attemptIndex,
        observedSequence: req.body.observedSequence ?? null,
        supersedesEventId: req.body.supersedesEventId ?? null,
        payloadHash: req.body.payloadHash ?? null,
      });

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "run_event.reported",
        entityType: "run_event",
        entityId: event.id,
        details: {
          adapterType: event.adapterType,
          model: event.model,
          status: event.status,
          coverageState: event.coverageState,
        },
      });

      res.status(201).json(event);
    },
  );

  router.post("/companies/:companyId/finance-events", validate(createFinanceEventSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);

    const event = await finance.createEvent(companyId, {
      ...req.body,
      occurredAt: new Date(req.body.occurredAt),
    });

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "finance_event.reported",
      entityType: "finance_event",
      entityId: event.id,
      details: {
        amountCents: event.amountCents,
        biller: event.biller,
        eventKind: event.eventKind,
        direction: event.direction,
      },
    });

    res.status(201).json(event);
  });

  router.get("/companies/:companyId/costs/summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const summary = await costs.summary(companyId, range);
    res.json(summary);
  });

  router.get("/issues/:id/cost-summary", async (req, res) => {
    const rawId = req.params.id as string;
    const issue = await getAccessibleResource(req, res, resolveIssueByRef(rawId), "Issue not found");
    if (!issue) return;
    if (!(await assertIssueCostReadAllowed(req, res, issue))) return;
    const excludeRoot = req.query.excludeRoot === "true" || req.query.excludeRoot === "1";
    const summary = await costs.issueTreeSummary(issue.companyId, issue.id, { excludeRoot });
    res.json(summary);
  });

  router.get("/companies/:companyId/costs/by-agent", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.byAgent(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/by-agent-model", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.byAgentModel(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/by-provider", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.byProvider(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/by-biller", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.byBiller(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/finance-summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const summary = await finance.summary(companyId, range);
    res.json(summary);
  });

  router.get("/companies/:companyId/costs/finance-by-biller", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await finance.byBiller(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/finance-by-kind", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await finance.byKind(companyId, range);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/finance-events", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const limit = parseCostLimit(req.query);
    const rows = await finance.list(companyId, range, limit);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/window-spend", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const rows = await costs.windowSpend(companyId);
    res.json(rows);
  });

  router.get("/companies/:companyId/costs/quota-windows", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    // validate companyId resolves to a real company so the "__none__" sentinel
    // and any forged ids are rejected before we touch provider credentials
    const company = await companies.getById(companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    const results = await fetchAllQuotaWindows();
    res.json(results);
  });

  router.get("/companies/:companyId/budgets/overview", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const overview = await budgets.overview(companyId);
    res.json(overview);
  });

  router.post(
    "/companies/:companyId/budgets/policies",
    validate(upsertBudgetPolicySchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const summary = await budgets.upsertPolicy(companyId, req.body, req.actor.userId ?? "board");
      res.json(summary);
    },
  );

  router.post(
    "/companies/:companyId/budget-incidents/:incidentId/resolve",
    validate(resolveBudgetIncidentSchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      const incidentId = req.params.incidentId as string;
      assertCompanyAccess(req, companyId);
      const incident = await budgets.resolveIncident(companyId, incidentId, req.body, req.actor.userId ?? "board");
      res.json(incident);
    },
  );

  router.get("/companies/:companyId/costs/by-project", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.byProject(companyId, range);
    res.json(rows);
  });

  /** Coverage-aware fail-closed summary endpoints (JAC-4529). */
  router.get("/companies/:companyId/coverage/warnings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const summary = await costs.coverageSummary(companyId, range);
    res.json(summary);
  });

  router.get("/companies/:companyId/coverage/by-agent", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    if (!(await assertCompanyCostReadAllowed(req, res, companyId))) return;
    const range = parseCostDateRange(req.query);
    const rows = await costs.coverageByAgent(companyId, range);
    res.json(rows);
  });

  router.patch("/companies/:companyId/budgets", validate(updateBudgetSchema), async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const company = await companies.update(companyId, { budgetMonthlyCents: req.body.budgetMonthlyCents });
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    await logActivity(db, {
      companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "company.budget_updated",
      entityType: "company",
      entityId: companyId,
      details: { budgetMonthlyCents: req.body.budgetMonthlyCents },
    });

    await budgets.upsertPolicy(
      companyId,
      {
        scopeType: "company",
        scopeId: companyId,
        amount: req.body.budgetMonthlyCents,
        windowKind: "calendar_month_utc",
      },
      req.actor.userId ?? "board",
    );

    res.json(company);
  });

  router.patch("/agents/:agentId/budgets", validate(updateBudgetSchema), async (req, res) => {
    const agentId = req.params.agentId as string;
    const agent = await getAccessibleResource(req, res, agents.getById(agentId), "Agent not found");
    if (!agent) return;

    assertBoard(req);

    const updated = await agents.update(agentId, { budgetMonthlyCents: req.body.budgetMonthlyCents });
    if (!updated) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: updated.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "agent.budget_updated",
      entityType: "agent",
      entityId: updated.id,
      details: { budgetMonthlyCents: updated.budgetMonthlyCents },
    });

    await budgets.upsertPolicy(
      updated.companyId,
      {
        scopeType: "agent",
        scopeId: updated.id,
        amount: updated.budgetMonthlyCents,
        windowKind: "calendar_month_utc",
      },
      req.actor.type === "board" ? req.actor.userId ?? "board" : null,
    );

    res.json(updated);
  });

  return router;
}
