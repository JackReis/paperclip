import { z } from "zod";
import { GOAL_LEVELS, GOAL_STATUSES, GOAL_STATUS_TRANSITIONS } from "../constants.js";

export const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  level: z.enum(GOAL_LEVELS).optional().default("task"),
  status: z.enum(GOAL_STATUSES).optional().default("planned"),
  parentId: z.string().uuid().optional().nullable(),
  ownerAgentId: z.string().uuid().optional().nullable(),
  syncMetadata: z.object({
    beadId: z.string().nullable().optional(),
    linearLabel: z.string().nullable().optional(),
    ringerManifestRef: z.string().nullable().optional(),
    externalRefs: z.record(z.string(), z.string()).optional(),
  }).optional().nullable(),
});

export type CreateGoal = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  level: z.enum(GOAL_LEVELS).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
  parentId: z.string().uuid().nullable().optional(),
  ownerAgentId: z.string().uuid().nullable().optional(),
  syncMetadata: z.object({
    beadId: z.string().nullable().optional(),
    linearLabel: z.string().nullable().optional(),
    ringerManifestRef: z.string().nullable().optional(),
    externalRefs: z.record(z.string(), z.string()).optional(),
  }).nullable().optional(),
});

export type UpdateGoal = z.infer<typeof updateGoalSchema>;

/**
 * Validates that a status transition is allowed per the GOAL_STATUS_TRANSITIONS map.
 * Returns true if the transition is valid, false otherwise.
 */
export function isValidGoalStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = GOAL_STATUS_TRANSITIONS[from as keyof typeof GOAL_STATUS_TRANSITIONS];
  return allowed ? allowed.includes(to as never) : false;
}

export const goalSyncMetadataSchema = z.object({
  beadId: z.string().nullable().optional(),
  linearLabel: z.string().nullable().optional(),
  ringerManifestRef: z.string().nullable().optional(),
  externalRefs: z.record(z.string(), z.string()).optional(),
});

export type GoalSyncMetadataInput = z.infer<typeof goalSyncMetadataSchema>;