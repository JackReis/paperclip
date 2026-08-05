import type { BillingType, ConfidenceLevel, CostStatus, CoverageState, SafeStatus, SourceStatus, PriceBasis, CostConfidenceLevel, VisibilityClass, RetentionClass, RedactionState } from "../constants.js";

export interface CostEvent {
  id: string;
  companyId: string;
  agentId: string;
  issueId: string | null;
  projectId: string | null;
  goalId: string | null;
  heartbeatRunId: string | null;
  billingCode: string | null;
  provider: string;
  biller: string;
  billingType: BillingType;
  costStatus: CostStatus;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number | null;
  toolCallTokens: number | null;
  costCents: number;
  currency: string;
  pricingVersionRef: string | null;
  /** How the cost was determined (JAC-4530). */
  priceBasis: PriceBasis;
  /** Confidence in cost accuracy (JAC-4530). */
  costConfidence: CostConfidenceLevel;
  coverageState: CoverageState;
  sourceStatus: SourceStatus;
  safeStatus: SafeStatus;
  confidence: ConfidenceLevel;
  coverageWarning: string | null;
  visibilityClass: VisibilityClass;
  retentionClass: RetentionClass;
  redactionState: RedactionState;
  sourcePermissionRef: string | null;
  tenantRefHash: string | null;
  subjectRefHashes: string[] | null;
  sourceDeletedAt: Date | null;
  tombstoneRef: string | null;
  policyVersion: string | null;
  sourceSystem: string;
  sourceEventId: string | null;
  sourceEventVersion: string | null;
  eventKind: string;
  attemptIndex: number;
  /** JAC-4532: monotonic sequence number from source. */
  observedSequence: number | null;
  /** JAC-4532: supersedes a previous event ID when this is a correction. */
  supersedesEventId: string | null;
  /** JAC-4532: deterministic ingest key (adapter key). */
  ingestId: string;
  /** JAC-4532: SHA-256 of canonical payload. */
  payloadHash: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface CostSummary {
  companyId: string;
  spendCents: number;
  budgetCents: number;
  utilizationPercent: number;
}

export interface IssueCostSummary {
  issueId: string;
  issueCount: number;
  includeDescendants: boolean;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  /** number of distinct heartbeat runs aggregated across the issue tree */
  runCount: number;
  /** sum of wall-clock duration of each run in the tree (ms);
   * still-running runs contribute (now - startedAt) so this ticks up live */
  runtimeMs: number;
}

export interface CostByAgent {
  agentId: string;
  agentName: string | null;
  agentStatus: string | null;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  apiRunCount: number;
  subscriptionRunCount: number;
  subscriptionCachedInputTokens: number;
  subscriptionInputTokens: number;
  subscriptionOutputTokens: number;
}

export interface CostByProviderModel {
  provider: string;
  biller: string;
  billingType: BillingType;
  model: string;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  apiRunCount: number;
  subscriptionRunCount: number;
  subscriptionCachedInputTokens: number;
  subscriptionInputTokens: number;
  subscriptionOutputTokens: number;
}

export interface CostByBiller {
  biller: string;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  apiRunCount: number;
  subscriptionRunCount: number;
  subscriptionCachedInputTokens: number;
  subscriptionInputTokens: number;
  subscriptionOutputTokens: number;
  providerCount: number;
  modelCount: number;
}

/** per-agent breakdown by provider + model, for identifying token-hungry agents */
export interface CostByAgentModel {
  agentId: string;
  agentName: string | null;
  provider: string;
  biller: string;
  billingType: BillingType;
  model: string;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/** spend per provider for a fixed rolling time window */
export interface CostWindowSpendRow {
  provider: string;
  biller: string;
  /** duration label, e.g. "5h", "24h", "7d" */
  window: string;
  /** rolling window duration in hours */
  windowHours: number;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/** cost attributed to a project via heartbeat run → activity log → issue → project chain */
export interface CostByProject {
  projectId: string | null;
  projectName: string | null;
  costCents: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}
