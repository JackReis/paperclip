import type { GoalLevel, GoalStatus } from "../constants.js";

/**
 * Metadata for external system sync references on Goals.
 * Supports Beads task IDs, Linear labels, Ringer manifest references, and other
 * external tracking system links.
 */
export interface GoalSyncMetadata {
  /** Beads issue/epic ID if this goal is synced to Beads. */
  beadId?: string | null;
  /** Linear label/epic identifier for read-only project map projection. */
  linearLabel?: string | null;
  /** Ringer manifest reference (run ID or manifest key) linked to this goal. */
  ringerManifestRef?: string | null;
  /** Additional external system references. */
  externalRefs?: Record<string, string>;
}

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  level: GoalLevel;
  status: GoalStatus;
  parentId: string | null;
  ownerAgentId: string | null;
  syncMetadata: GoalSyncMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}
