import type {
  CoverageState,
  SafeStatus,
  SourceStatus,
  ConfidenceLevel,
  PriceBasis,
  CostConfidenceLevel,
  UsageReportedState,
  RunEventStatus,
  RunEventSourceSystem,
  RunEventKind,
  VisibilityClass,
  RetentionClass,
  RedactionState,
  RoutingStatus,
  QuotaStatus,
  PublicationStatus,
  WorkStateConfidence,
  PauseEligibleScope,
} from "../constants.js";

/**
 * A normalized run event — emitted by the Paperclip adapter for every
 * heartbeat_run regardless of whether it produced spend.
 *
 * Token/cost fields are nullable: null means "not_reported", 0 means "explicitly zero".
 * Coverage fields are fail-closed: absent/uncertain source reporting → uncovered/unavailable.
 *
 * Event identity / idempotency (JAC-4532): sourceSystem, sourceEventId,
 * sourceEventVersion, eventKind, attemptIndex, observedSequence,
 * supersedesEventId, ingestId, payloadHash.
 *
 * Privacy / retention (JAC-4533): visibilityClass, retentionClass,
 * redactionState, sourcePermissionRef, tenantRefHash, subjectRefHashes,
 * sourceDeletedAt, tombstoneRef, policyVersion.
 *
 * Action-safety semantics (JAC-4534): routingStatus, quotaStatus,
 * publicationStatus, workStateConfidence, pauseEligibleScope,
 * operatorDecisionRequired.
 */
export interface RunEvent {
  id: string;
  companyId: string;
  agentId: string;
  issueId: string | null;
  runId: string;

  // Event identity / idempotency (JAC-4532)
  sourceSystem: string;
  sourceEventId: string | null;
  sourceEventVersion: string | null;
  eventKind: RunEventKind;
  attemptIndex: number;
  observedSequence: number | null;
  supersedesEventId: string | null;

  // Execution metadata
  adapterType: string;
  model: string;
  provider: string;
  status: RunEventStatus;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  reasoningTokens: number | null;
  toolCallTokens: number | null;
  costCents: number | null;
  currency: string;
  /** How the cost was determined (JAC-4530). */
  priceBasis: PriceBasis;
  /** Confidence in cost accuracy (JAC-4530). */
  costConfidence: CostConfidenceLevel;
  /** Pointer to the pricing-version record used for cost computation. */
  pricingVersionRef: string | null;
  /** Provider's native total token count (JAC-4530), if reported. */
  nativeTotalTokens: number | null;
  /** Recomputed total tokens = input + output + cached + reasoning + tool_call (JAC-4530). */
  recomputedTotalTokens: number | null;
  /** Whether usage is covered by subscription, not per-token metering (JAC-4530). */
  isSubscriptionIncluded: boolean;

  // Usage reporting state
  usageReportedState: UsageReportedState;
  usageSourceField: string | null;

  // Coverage-aware fail-closed fields
  coverageState: CoverageState;
  sourceStatus: SourceStatus;
  safeStatus: SafeStatus;
  confidence: ConfidenceLevel;

  // Privacy / retention (JAC-4533)
  visibilityClass: VisibilityClass;
  retentionClass: RetentionClass;
  redactionState: RedactionState;
  sourcePermissionRef: string | null;
  tenantRefHash: string | null;
  subjectRefHashes: string[] | null;
  sourceDeletedAt: Date | null;
  tombstoneRef: string | null;
  policyVersion: string | null;

  // Action-safety semantics (JAC-4534)
  routingStatus: RoutingStatus;
  quotaStatus: QuotaStatus;
  publicationStatus: PublicationStatus;
  workStateConfidence: WorkStateConfidence;
  pauseEligibleScope: PauseEligibleScope;
  operatorDecisionRequired: boolean;

  // Ingestion tracking
  observedAt: Date;
  ingestId: string;
  payloadHash: string | null;
  createdAt: Date;
}

/** Aggregate coverage totals for a company over a time window. */
export interface CoverageTotals {
  totalRuns: number;
  coveredRuns: number;
  uncoveredRuns: number;
  partialCoverageRuns: number;
  unknownRuns: number;
}

/** A single coverage warning surfaced separately from spend totals. */
export interface CoverageWarning {
  severity: "warning" | "info";
  adapterType: string;
  reason: string;
  runCount: number;
  safeStatus: SafeStatus;
}

/** Per-adapter coverage breakdown (no financial data). */
export interface CoverageByAdapterRow {
  adapterType: string;
  sourceStatus: SourceStatus;
  coverageState: CoverageState;
  safeStatus: SafeStatus;
  runCount: number;
}

/** Response shape for GET /companies/:companyId/coverage/warnings. */
export interface CoverageWarningsResponse {
  companyId: string;
  generatedAt: Date;
  totals: CoverageTotals;
  byAdapter: CoverageByAdapterRow[];
  warnings: CoverageWarning[];
}

/** Coverage augmentation added to CostByAgent when include_coverage=true. */
export interface CoverageByAgent {
  coveredRuns: number;
  uncoveredRuns: number;
  partialRuns: number;
  safeStatus: SafeStatus;
}
