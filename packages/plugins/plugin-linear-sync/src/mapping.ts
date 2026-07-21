/**
 * Mapping logic: Paperclip entity → Linear entity.
 *
 * Design per architecture doc JAC-3473 §5:
 * - Paperclip Project → Linear Project
 * - Paperclip Goal (company) → Linear label (initiative indicator)
 * - Paperclip Goal (project) → Linear label (epic indicator)
 * - Paperclip Goal (task) → Linear label (issue indicator)
 * - Goal status → Linear label color
 * - Goal priority → Linear label color
 * - Paperclip Label → Linear Label (direct name mapping)
 *
 * The mapping is strictly one-way (Paperclip → Linear). No write-back.
 */

import type { Goal, Project } from "@paperclipai/plugin-sdk";
import {
  LinearClient,
  LinearLabel,
  LinearProject,
  GOAL_STATUS_COLORS,
  GOAL_PRIORITY_COLORS,
} from "./linear-client.js";

export interface SyncState {
  /** Map of Paperclip goal ID → Linear label ID */
  goalLabelMap: Record<string, string>;
  /** Map of Paperclip project ID → Linear project ID */
  projectMap: Record<string, string>;
  /** Map of Paperclip label ID → Linear label ID */
  labelMap: Record<string, string>;
  /** Last full reconciliation timestamp (ISO 8601) */
  lastReconcileAt: string | null;
  /** Last event-driven sync timestamp */
  lastEventSyncAt: string | null;
}

export function emptySyncState(): SyncState {
  return {
    goalLabelMap: {},
    projectMap: {},
    labelMap: {},
    lastReconcileAt: null,
    lastEventSyncAt: null,
  };
}

/**
 * Generate a Linear label name for a Paperclip goal.
 * Format: "goal:{level}:{title}"
 */
export function goalLabelName(goal: Goal): string {
  return `goal:${goal.level}:${goal.title}`;
}

/**
 * Generate a Linear label description for a Paperclip goal.
 * Includes the Paperclip goal UUID for idempotency.
 */
export function goalLabelDescription(goal: Goal): string {
  const parts = [
    `Paperclip Goal ID: ${goal.id}`,
    `Level: ${goal.level}`,
    `Status: ${goal.status}`,
  ];
  if (goal.ownerAgentId) {
    parts.push(`Owner Agent: ${goal.ownerAgentId}`);
  }
  if (goal.parentId) {
    parts.push(`Parent Goal: ${goal.parentId}`);
  }
  return parts.join("\n");
}

/**
 * Determine the Linear label color for a goal based on its status.
 * Falls back to priority color if status is unknown, or default gray.
 */
export function goalLabelColor(goal: Goal): string {
  return GOAL_STATUS_COLORS[goal.status] ?? "#e2e2e2";
}

/**
 * Generate a Linear project name for a Paperclip project.
 * Uses the project name directly.
 */
export function projectLinearName(project: Project): string {
  return project.name;
}

/**
 * Generate a Linear project description for a Paperclip project.
 * Includes the Paperclip project UUID for idempotency.
 */
export function projectLinearDescription(project: Project): string {
  const parts = [
    `Paperclip Project ID: ${project.id}`,
  ];
  if (project.goalId) {
    parts.push(`Linked Goal: ${project.goalId}`);
  }
  if (project.leadAgentId) {
    parts.push(`Lead Agent: ${project.leadAgentId}`);
  }
  return parts.join("\n");
}

/**
 * Sync a single Paperclip goal to Linear as a label.
 * Idempotent — if the label already exists (by name), updates it.
 */
export async function syncGoalToLinear(
  client: LinearClient,
  goal: Goal,
  state: SyncState,
): Promise<{ label: LinearLabel; created: boolean }> {
  const name = goalLabelName(goal);
  const description = goalLabelDescription(goal);
  const color = goalLabelColor(goal);

  // Check if we already have a mapping
  const existingLabelId = state.goalLabelMap[goal.id];

  if (existingLabelId) {
    // Update existing label
    const label = await client.updateLabel(existingLabelId, {
      name,
      description,
      color,
    });
    return { label, created: false };
  }

  // Check if a label with the same name already exists on the team
  const team = await client.getTeamState();
  const existing = team.labels.find((l) => l.name === name);

  if (existing) {
    // Adopt existing label and update it
    const label = await client.updateLabel(existing.id, {
      name,
      description,
      color,
    });
    state.goalLabelMap[goal.id] = label.id;
    return { label, created: false };
  }

  // Create new label
  const label = await client.createLabel({ name, description, color });
  state.goalLabelMap[goal.id] = label.id;
  return { label, created: true };
}

/**
 * Sync a single Paperclip project to Linear as a project.
 * Idempotent — if the project already exists (by name), updates it.
 */
export async function syncProjectToLinear(
  client: LinearClient,
  project: Project,
  state: SyncState,
): Promise<{ linearProject: LinearProject; created: boolean }> {
  const name = projectLinearName(project);
  const description = projectLinearDescription(project);

  const existingProjectId = state.projectMap[project.id];

  if (existingProjectId) {
    const linearProject = await client.updateProject(existingProjectId, {
      name,
      description,
    });
    return { linearProject, created: false };
  }

  // Check if a project with the same name already exists
  const team = await client.getTeamState();
  const existing = team.projects.find((p) => p.name === name);

  if (existing) {
    const linearProject = await client.updateProject(existing.id, {
      name,
      description,
    });
    state.projectMap[project.id] = linearProject.id;
    return { linearProject, created: false };
  }

  const linearProject = await client.createProject({ name, description });
  state.projectMap[project.id] = linearProject.id;
  return { linearProject, created: true };
}

/**
 * Full batch reconciliation: sync all goals and projects to Linear.
 * Returns a summary of what was created/updated.
 */
export async function fullReconcile(
  client: LinearClient,
  goals: Goal[],
  projects: Project[],
  state: SyncState,
): Promise<{
  goalsCreated: number;
  goalsUpdated: number;
  goalsSkipped: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let goalsCreated = 0;
  let goalsUpdated = 0;
  let goalsSkipped = 0;
  let projectsCreated = 0;
  let projectsUpdated = 0;
  let projectsSkipped = 0;

  // Sync all goals to Linear labels
  for (const goal of goals) {
    try {
      const { created } = await syncGoalToLinear(client, goal, state);
      if (created) goalsCreated++;
      else goalsUpdated++;
    } catch (err) {
      errors.push(`Goal ${goal.id} (${goal.title}): ${(err as Error).message}`);
      goalsSkipped++;
    }
  }

  // Sync all projects to Linear projects
  for (const project of projects) {
    try {
      const { created } = await syncProjectToLinear(client, project, state);
      if (created) projectsCreated++;
      else projectsUpdated++;
    } catch (err) {
      errors.push(`Project ${project.id} (${project.name}): ${(err as Error).message}`);
      projectsSkipped++;
    }
  }

  state.lastReconcileAt = new Date().toISOString();

  return {
    goalsCreated,
    goalsUpdated,
    goalsSkipped,
    projectsCreated,
    projectsUpdated,
    projectsSkipped,
    errors,
  };
}