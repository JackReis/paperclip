/**
 * Worker lifecycle for the Linear Read-Only Project Map plugin.
 *
 * This plugin projects Paperclip Goals, Projects, and Labels onto Linear
 * as a read-only project map. It subscribes to goal/project mutation events
 * for event-driven sync and registers a 15-minute batch reconciliation job.
 *
 * Design per architecture doc JAC-3473 §5:
 * - One-way push (Paperclip → Linear), no write-back
 * - Event-driven with 15-min batch reconciliation
 * - Linear API token via Paperclip company secrets
 * - Handles Linear API rate limits with exponential backoff
 * - Sync events logged for audit trail via activity log
 */

import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { Goal, Project, PluginEvent, PluginContext } from "@paperclipai/plugin-sdk";
import { LinearClient } from "./linear-client.js";
import {
  SyncState,
  emptySyncState,
  syncGoalToLinear,
  syncProjectToLinear,
  fullReconcile,
} from "./mapping.js";
import manifest from "./manifest.js";

const SYNC_STATE_KEY = "linear-sync-state";
const SYNC_STATE_SCOPE = "instance";

interface PluginConfig {
  linearApiTokenRef: string;
  linearTeamId: string;
  syncIntervalMinutes?: number;
}

/**
 * Resolve the Linear API token from config and secrets.
 */
async function resolveLinearClient(
  ctx: PluginContext,
): Promise<LinearClient | null> {
  const config = (await ctx.config.get()) as unknown as PluginConfig | null;
  if (!config?.linearApiTokenRef || !config?.linearTeamId) {
    ctx.logger.warn("Linear sync plugin: missing config (linearApiTokenRef or linearTeamId)");
    return null;
  }

  const token = await ctx.secrets.resolve(config.linearApiTokenRef);
  if (!token) {
    ctx.logger.warn("Linear sync plugin: could not resolve Linear API token from secret ref");
    return null;
  }

  return new LinearClient(token as string, config.linearTeamId);
}

/**
 * Load sync state from plugin state store.
 */
async function loadSyncState(
  ctx: PluginContext,
): Promise<SyncState> {
  const raw = await ctx.state.get({
    scopeKind: SYNC_STATE_SCOPE as "instance",
    stateKey: SYNC_STATE_KEY,
  });
  if (raw && typeof raw === "object") {
    return { ...emptySyncState(), ...(raw as SyncState) };
  }
  return emptySyncState();
}

/**
 * Persist sync state to plugin state store.
 */
async function saveSyncState(
  ctx: PluginContext,
  state: SyncState,
): Promise<void> {
  await ctx.state.set({
    scopeKind: SYNC_STATE_SCOPE as "instance",
    stateKey: SYNC_STATE_KEY,
  }, state);
}

/**
 * Log a sync event for audit trail.
 */
async function logSyncEvent(
  ctx: PluginContext,
  summary: string,
  details?: Record<string, unknown>,
): Promise<void> {
  ctx.logger.info(`[linear-sync] ${summary}`, details ?? {});
  // Activity log requires companyId — extract from details if available
  if (details?.companyId) {
    await ctx.activity.log({
      companyId: details.companyId as string,
      message: summary,
      entityType: details.entityType as string | undefined,
      entityId: details.entityId as string | undefined,
      metadata: details,
    });
  }
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Linear Read-Only Project Map plugin starting up");

    // --- Event-driven sync: goal.created ---
    ctx.events.on("goal.created", async (event: PluginEvent) => {
      ctx.logger.info("Linear sync: goal.created event received", { eventId: event.eventId });

      const client = await resolveLinearClient(ctx);
      if (!client) return;

      const state = await loadSyncState(ctx);
      const goal = event.payload as Goal;
      if (!goal?.id) {
        ctx.logger.warn("Linear sync: goal.created event missing goal data");
        return;
      }

      try {
        const { label, created } = await syncGoalToLinear(client, goal, state);
        state.lastEventSyncAt = new Date().toISOString();
        await saveSyncState(ctx, state);
        await logSyncEvent(ctx, `Goal "${goal.title}" → Linear label "${label.name}" (${created ? "created" : "updated"})`, {
          goalId: goal.id,
          labelId: label.id,
          created,
        });
      } catch (err) {
        ctx.logger.error("Linear sync: failed to sync goal on created event", { error: (err as Error).message });
        await logSyncEvent(ctx, `Failed to sync goal "${goal.title}" to Linear: ${(err as Error).message}`, {
          goalId: goal.id,
          error: (err as Error).message,
        });
      }
    });

    // --- Event-driven sync: goal.updated ---
    ctx.events.on("goal.updated", async (event: PluginEvent) => {
      ctx.logger.info("Linear sync: goal.updated event received", { eventId: event.eventId });

      const client = await resolveLinearClient(ctx);
      if (!client) return;

      const state = await loadSyncState(ctx);
      const goal = event.payload as Goal;
      if (!goal?.id) {
        ctx.logger.warn("Linear sync: goal.updated event missing goal data");
        return;
      }

      try {
        const { label, created } = await syncGoalToLinear(client, goal, state);
        state.lastEventSyncAt = new Date().toISOString();
        await saveSyncState(ctx, state);
        await logSyncEvent(ctx, `Goal "${goal.title}" → Linear label "${label.name}" updated (status=${goal.status})`, {
          goalId: goal.id,
          labelId: label.id,
          status: goal.status,
          created,
        });
      } catch (err) {
        ctx.logger.error("Linear sync: failed to sync goal on updated event", { error: (err as Error).message });
        await logSyncEvent(ctx, `Failed to sync goal "${goal.title}" update to Linear: ${(err as Error).message}`, {
          goalId: goal.id,
          error: (err as Error).message,
        });
      }
    });

    // --- Event-driven sync: project.created ---
    ctx.events.on("project.created", async (event: PluginEvent) => {
      ctx.logger.info("Linear sync: project.created event received", { eventId: event.eventId });

      const client = await resolveLinearClient(ctx);
      if (!client) return;

      const state = await loadSyncState(ctx);
      const project = event.payload as Project;
      if (!project?.id) {
        ctx.logger.warn("Linear sync: project.created event missing project data");
        return;
      }

      try {
        const { linearProject, created } = await syncProjectToLinear(client, project, state);
        state.lastEventSyncAt = new Date().toISOString();
        await saveSyncState(ctx, state);
        await logSyncEvent(ctx, `Project "${project.name}" → Linear project "${linearProject.name}" (${created ? "created" : "updated"})`, {
          projectId: project.id,
          linearProjectId: linearProject.id,
          created,
        });
      } catch (err) {
        ctx.logger.error("Linear sync: failed to sync project on created event", { error: (err as Error).message });
        await logSyncEvent(ctx, `Failed to sync project "${project.name}" to Linear: ${(err as Error).message}`, {
          projectId: project.id,
          error: (err as Error).message,
        });
      }
    });

    // --- Event-driven sync: project.updated ---
    ctx.events.on("project.updated", async (event: PluginEvent) => {
      ctx.logger.info("Linear sync: project.updated event received", { eventId: event.eventId });

      const client = await resolveLinearClient(ctx);
      if (!client) return;

      const state = await loadSyncState(ctx);
      const project = event.payload as Project;
      if (!project?.id) {
        ctx.logger.warn("Linear sync: project.updated event missing project data");
        return;
      }

      try {
        const { linearProject, created } = await syncProjectToLinear(client, project, state);
        state.lastEventSyncAt = new Date().toISOString();
        await saveSyncState(ctx, state);
        await logSyncEvent(ctx, `Project "${project.name}" → Linear project "${linearProject.name}" updated`, {
          projectId: project.id,
          linearProjectId: linearProject.id,
          created,
        });
      } catch (err) {
        ctx.logger.error("Linear sync: failed to sync project on updated event", { error: (err as Error).message });
        await logSyncEvent(ctx, `Failed to sync project "${project.name}" update to Linear: ${(err as Error).message}`, {
          projectId: project.id,
          error: (err as Error).message,
        });
      }
    });

    // --- Batch reconciliation job ---
    ctx.jobs.register("full-reconcile", async (_job) => {
      ctx.logger.info("Linear sync: full batch reconciliation starting");

      const client = await resolveLinearClient(ctx);
      if (!client) {
        ctx.logger.warn("Linear sync: skipping full-reconcile — no Linear client configured");
        return;
      }

      // Fetch all goals and projects from Paperclip
      const companies = await ctx.companies.list();
      const allErrors: string[] = [];
      let totalGoalsCreated = 0;
      let totalGoalsUpdated = 0;
      let totalGoalsSkipped = 0;
      let totalProjectsCreated = 0;
      let totalProjectsUpdated = 0;
      let totalProjectsSkipped = 0;

      for (const company of companies) {
        const state = await loadSyncState(ctx);

        // Fetch all goals for this company
        const goals = await ctx.goals.list({ companyId: company.id });
        // Fetch all projects for this company
        const projects: Project[] = [];
        // The projects client may not have a direct list method;
        // we use the data from the projects client if available
        try {
          const companyProjects = await ctx.projects.list({ companyId: company.id });
          projects.push(...companyProjects);
        } catch {
          ctx.logger.warn(`Linear sync: could not list projects for company ${company.id}`);
        }

        try {
          const result = await fullReconcile(client, goals, projects, state);
          totalGoalsCreated += result.goalsCreated;
          totalGoalsUpdated += result.goalsUpdated;
          totalGoalsSkipped += result.goalsSkipped;
          totalProjectsCreated += result.projectsCreated;
          totalProjectsUpdated += result.projectsUpdated;
          totalProjectsSkipped += result.projectsSkipped;
          allErrors.push(...result.errors);
        } catch (err) {
          ctx.logger.error("Linear sync: full-reconcile failed for company", {
            companyId: company.id,
            error: (err as Error).message,
          });
          allErrors.push(`Company ${company.id}: ${(err as Error).message}`);
        }

        await saveSyncState(ctx, state);
      }

      await logSyncEvent(ctx, "Full batch reconciliation complete", {
        goalsCreated: totalGoalsCreated,
        goalsUpdated: totalGoalsUpdated,
        goalsSkipped: totalGoalsSkipped,
        projectsCreated: totalProjectsCreated,
        projectsUpdated: totalProjectsUpdated,
        projectsSkipped: totalProjectsSkipped,
        errors: allErrors.length,
        errorDetails: allErrors.length > 0 ? allErrors.slice(0, 10) : undefined,
      });

      ctx.logger.info("Linear sync: full batch reconciliation complete", {
        goalsCreated: totalGoalsCreated,
        goalsUpdated: totalGoalsUpdated,
        projectsCreated: totalProjectsCreated,
        projectsUpdated: totalProjectsUpdated,
        errors: allErrors.length,
      });
    });
  },

  async onHealth() {
    return {
      status: "ok" as const,
      message: "Linear Read-Only Project Map plugin ready",
      details: {
        manifestId: manifest.id,
        version: manifest.version,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);