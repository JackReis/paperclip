import { z } from "zod";
import {
  BILLING_TYPES,
  COST_STATUSES,
  COVERAGE_STATES,
  PRICE_BASIS,
  DEFAULT_PRICE_BASIS,
  COST_CONFIDENCE_LEVELS,
  DEFAULT_COST_CONFIDENCE,
  SOURCE_STATUSES,
  SAFE_STATUSES,
  CONFIDENCE_LEVELS,
  USAGE_REPORTED_STATES,
  DEFAULT_COVERAGE_STATE,
  RUN_EVENT_SOURCE_SYSTEMS,
  RUN_EVENT_KINDS,
  VISIBILITY_CLASSES,
  DEFAULT_VISIBILITY_CLASS,
  RETENTION_CLASSES,
  DEFAULT_RETENTION_CLASS,
  REDACTION_STATES,
  DEFAULT_REDACTION_STATE,
  ROUTING_STATUSES,
  QUOTA_STATUSES,
  PUBLICATION_STATUSES,
  WORK_STATE_CONFIDENCE,
  PAUSE_ELIGIBLE_SCOPES,
} from "../constants.js";
import type {
  CoverageState,
  SafeStatus,
  SourceStatus,
  ConfidenceLevel,
  CostStatus,
  PriceBasis,
  CostConfidenceLevel,
  UsageReportedState,
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
 * Resolve coverage_state with fail-closed semantics.
 *
 * - When source is "unavailable" and the caller explicitly asserted a coverage
 *   state other than the default "unknown" (e.g. "covered"), force "uncovered"
 *   — the source can't vouch for coverage it never exposed.
 * - When source is "unavailable" and coverageState is the default "unknown",
 *   preserve "unknown" so the DB default is not mutated by a no-op resolution.
 * - Otherwise, use the caller-provided or default coverage state as-is.
 */
export function resolveCoverageState(
  coverageState: CoverageState,
  sourceStatus: SourceStatus,
): CoverageState {
  if (sourceStatus === "unavailable" && coverageState !== "unknown") {
    return "uncovered";
  }
  return coverageState;
}

/**
 * Resolve safe_status with fail-closed semantics.
 * Any coverage_state that is not "covered" maps to "unavailable" —
 * absence/uncertainty is never promoted to available.
 */
export function resolveSafeStatus(coverageState: CoverageState): SafeStatus {
  return coverageState === "covered" ? "available" : "unavailable";
}

export const createCostEventSchema = z.object({
  agentId: z.string().uuid(),
  issueId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
  heartbeatRunId: z.string().uuid().optional().nullable(),
  billingCode: z.string().optional().nullable(),
  provider: z.string().min(1),
  biller: z.string().min(1).optional(),
  billingType: z.enum(BILLING_TYPES).optional().default("unknown"),
  costStatus: z.enum(COST_STATUSES).optional().default("reported"),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative().optional().default(0),
  cachedInputTokens: z.number().int().nonnegative().optional().default(0),
  outputTokens: z.number().int().nonnegative().optional().default(0),
  reasoningTokens: z.number().int().nonnegative().optional().nullable(),
  toolCallTokens: z.number().int().nonnegative().optional().nullable(),
  costCents: z.number().int().nonnegative(),
  currency: z.string().length(3).optional().default("USD"),
  pricingVersionRef: z.string().optional().nullable(),
  coverageState: z.enum(COVERAGE_STATES).optional().default(DEFAULT_COVERAGE_STATE),
  sourceStatus: z.enum(SOURCE_STATUSES).optional().default("unavailable"),
  confidence: z.enum(CONFIDENCE_LEVELS).optional().default("low"),
  coverageWarning: z.string().optional().nullable(),
  priceBasis: z.enum(PRICE_BASIS).optional().default(DEFAULT_PRICE_BASIS),
  costConfidence: z.enum(COST_CONFIDENCE_LEVELS).optional().default(DEFAULT_COST_CONFIDENCE),
  /** Privacy / retention fields (JAC-4533). Fail-closed defaults applied below. */
  visibilityClass: z.enum(VISIBILITY_CLASSES).optional().default(DEFAULT_VISIBILITY_CLASS),
  retentionClass: z.enum(RETENTION_CLASSES).optional().default(DEFAULT_RETENTION_CLASS),
  redactionState: z.enum(REDACTION_STATES).optional().default(DEFAULT_REDACTION_STATE),
  sourcePermissionRef: z.string().optional().nullable(),
  /** SHA-256 hex digest for tenant isolation (JAC-4533). */
  tenantRefHash: z.string().optional().nullable().refine(
    (val) => val === null || val === undefined || /^[a-f0-9]{64}$/.test(val),
    { message: "tenantRefHash must be a 64-char lowercase hex SHA-256 digest or null" },
  ),
  /** Array of SHA-256 hex digests for subject attribution (JAC-4533). */
  subjectRefHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional().nullable(),
  sourceDeletedAt: z.string().datetime().optional().nullable(),
  tombstoneRef: z.string().optional().nullable(),
  policyVersion: z.string().optional().nullable(),
  /** Event identity / idempotency fields (JAC-4532). */
  sourceSystem: z.enum(RUN_EVENT_SOURCE_SYSTEMS).optional().default("paperclip"),
  sourceEventId: z.string().optional().nullable(),
  sourceEventVersion: z.string().optional().nullable(),
  eventKind: z.enum(RUN_EVENT_KINDS).optional().default("cost_report"),
  attemptIndex: z.number().int().nonnegative().optional().default(0),
  observedSequence: z.number().int().nonnegative().optional().nullable(),
  supersedesEventId: z.string().optional().nullable(),
  payloadHash: z.string().optional().nullable(),
  occurredAt: z.string().datetime(),
}).transform((value) => {
  const resolvedCoverageState = resolveCoverageState(value.coverageState, value.sourceStatus);
  // Fail-closed: when costCents is absent, priceBasis defaults to not_reported
  // and costConfidence defaults to low.
  const resolvedPriceBasis = value.costCents != null && value.costCents > 0
    ? value.priceBasis
    : DEFAULT_PRICE_BASIS;
  const resolvedCostConfidence = value.costCents != null && value.costCents > 0
    ? value.costConfidence
    : DEFAULT_COST_CONFIDENCE;
  return {
    ...value,
    biller: value.biller ?? value.provider,
    // Fail-closed: safeStatus is derived from the RESOLVED coverageState, never caller-supplied.
    coverageState: resolvedCoverageState,
    safeStatus: resolveSafeStatus(resolvedCoverageState),
    priceBasis: resolvedPriceBasis,
    costConfidence: resolvedCostConfidence,
  };
});

export type CreateCostEvent = z.infer<typeof createCostEventSchema>;

/**
 * Result of fail-closed coverage resolution for a run event.
 * All nullable token fields: null means "not_reported".
 */
export interface RunCoverageResolution {
  usageReportedState: UsageReportedState;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  reasoningTokens: number | null;
  toolCallTokens: number | null;
  costCents: number | null;
  /** How the cost was determined (JAC-4530). */
  priceBasis: PriceBasis;
  /** Confidence in cost accuracy (JAC-4530). */
  costConfidence: CostConfidenceLevel;
  /** Provider's native total token count, if reported. */
  nativeTotalTokens: number | null;
  /** Recomputed total tokens (sum of all token fields). */
  recomputedTotalTokens: number | null;
  /** Whether usage is covered by subscription, not per-token metering. */
  isSubscriptionIncluded: boolean;
  coverageState: CoverageState;
  sourceStatus: SourceStatus;
  safeStatus: SafeStatus;
  confidence: ConfidenceLevel;
}


/**
 * Whether the billingType indicates subscription-based billing
 * (as opposed to per-token metering).
 */
function isNonPrimitiveBillingType(billingType: string | null | undefined): boolean {
  return billingType === "subscription_included" || billingType === "subscription_overage";
}

/**
 * Resolve coverage-aware fields for a run event from adapter execution results.
 *
 * Fail-closed semantics:
 * - When the adapter did not expose usage reporting at all (no `usage` object),
 *   usage_reported_state is "not_reported", source_status is "unavailable",
 *   coverage_state is "uncovered", safe_status is "unavailable", confidence is "low".
 *   All token fields are null (not 0).
 * - When the adapter reported usage with non-zero tokens, coverage is "covered".
 * - When the adapter reported a usage object but all token counts are zero,
 *   coverage is "partial" — the source reported but no tokens were captured.
 * - safeStatus is derived from coverageState: only "covered" maps to "available".
 * - confidence is "high" when tokens and cost are both present, "medium" when
 *   only tokens are present, "low" when coverage is partial or tokens are absent.
 */
export function resolveLedgerCoverageForRun(
  result: {
    usage?: unknown | null;
    costUsd?: number | null;
    billingType?: string | null;
    resultJson?: Record<string, unknown> | null;
  },
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    reasoningTokens?: number | null;
    toolCallTokens?: number | null;
  } | null,
): RunCoverageResolution {
  const hasUsageObject = result.usage != null;
  const inputTokens = tokens?.inputTokens ?? 0;
  const outputTokens = tokens?.outputTokens ?? 0;
  const cachedInputTokens = tokens?.cachedInputTokens ?? 0;
  const reasoningTokens = tokens?.reasoningTokens ?? 0;
  const toolCallTokens = tokens?.toolCallTokens ?? 0;
  const hasTokenUsage =
    inputTokens > 0 || outputTokens > 0 || cachedInputTokens > 0 || reasoningTokens > 0 || toolCallTokens > 0;
  const hasCost =
    result.costUsd != null && Number.isFinite(result.costUsd) && result.costUsd > 0;

  // Extract native total tokens from the provider usage object if available
  // (e.g. OpenAI usage.total_tokens). Kept separate from recomputed estimates (JAC-4530).
  const usageJson =
    typeof result.usage === "object" && result.usage !== null
      ? (result.usage as Record<string, unknown>)
      : {};
  const nativeTotalTokens =
    typeof usageJson.total_tokens === "number"
      ? Math.max(0, Math.floor(usageJson.total_tokens))
      : null;
  const recomputedTotalTokens =
    inputTokens + outputTokens + cachedInputTokens + reasoningTokens + toolCallTokens;
  const isSubscriptionIncluded = isNonPrimitiveBillingType(result.billingType);

  // Resolve priceBasis and costConfidence (JAC-4530).
  // Fail-closed: absent cost data to not_reported / low.
  let priceBasis: PriceBasis = DEFAULT_PRICE_BASIS;
  let costConfidence: CostConfidenceLevel = DEFAULT_COST_CONFIDENCE;
  if (hasCost) {
    if (isSubscriptionIncluded) {
      priceBasis = "plan_billed";
      costConfidence = "medium";
    } else {
      priceBasis = "per_1m_tokens";
      costConfidence = "high";
    }
  } else if (hasTokenUsage) {
    priceBasis = "not_reported";
    costConfidence = "medium";
  }

  // No usage object at all → everything not_reported, fail closed.
  if (!hasUsageObject) {
    return {
      usageReportedState: "not_reported",
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      reasoningTokens: null,
      toolCallTokens: null,
      costCents: null,
      priceBasis: DEFAULT_PRICE_BASIS,
      costConfidence: DEFAULT_COST_CONFIDENCE,
      nativeTotalTokens: null,
      recomputedTotalTokens: null,
      isSubscriptionIncluded: false,
      coverageState: "uncovered",
      sourceStatus: "unavailable",
      safeStatus: "unavailable",
      confidence: "low",
    };
  }

  // Usage object present with non-zero tokens.
  if (hasTokenUsage) {
    // Check for estimate signal from adapter.
    const resultJson = (result as any).resultJson;
    const isEstimated =
      resultJson?.usage_is_estimated === true ||
      resultJson?.usage_reported_state === "estimated";

    const usageReportedState: UsageReportedState = isEstimated ? "estimated" : "reported";
    const confidence: ConfidenceLevel = hasCost ? "high" : "medium";

    return {
      usageReportedState,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      reasoningTokens: null,
      toolCallTokens: null,
      costCents: hasCost ? Math.round(result.costUsd! * 100) : null,
      priceBasis,
      costConfidence,
      nativeTotalTokens,
      recomputedTotalTokens: recomputedTotalTokens > 0 ? recomputedTotalTokens : null,
      isSubscriptionIncluded,
      coverageState: "covered",
      sourceStatus: "available",
      safeStatus: "available",
      confidence,
    };
  }

  // Usage object present but all tokens zero → partial coverage.
  return {
    usageReportedState: "reported",
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: null,
    toolCallTokens: null,
    costCents: hasCost ? Math.round(result.costUsd! * 100) : null,
    priceBasis,
    costConfidence,
    nativeTotalTokens,
    recomputedTotalTokens: recomputedTotalTokens > 0 ? recomputedTotalTokens : null,
    isSubscriptionIncluded,
    coverageState: "partial",
    sourceStatus: "available",
    safeStatus: "unavailable",
    confidence: "low",
  };
}

/**
 * Resolve coverage for a pre-execution failure (workspace validation error,
 * sandbox startup error, adapter error, timeout, cancellation).
 * These runs have no adapter result at all → fully fail-closed.
 */
export function resolveRunCoverageForError(): RunCoverageResolution {
  return {
    usageReportedState: "not_reported",
    inputTokens: null,
    outputTokens: null,
    cachedInputTokens: null,
    reasoningTokens: null,
    toolCallTokens: null,
    costCents: null,
    priceBasis: DEFAULT_PRICE_BASIS,
    costConfidence: DEFAULT_COST_CONFIDENCE,
    nativeTotalTokens: null,
    recomputedTotalTokens: null,
    isSubscriptionIncluded: false,
    coverageState: "unknown",
    sourceStatus: "unavailable",
    safeStatus: "unavailable",
    confidence: "low",
  };
}

/**
 * Resolve coverage fields for a run event from its usageReportedState and token values.
 *
 * This mirrors the logic in `resolveLedgerCoverageForRun` but operates on the
 * flattened Zod input shape (usageReportedState + individual token fields).
 *
 * - usageReportedState = "not_reported" → uncovered / unavailable / unavailable / low
 * - usageReportedState = "estimated" → covered / available / available / {high|medium}
 * - usageReportedState = "redacted" → uncovered / available / unavailable / low
 * - usageReportedState = "reported" + tokens present → covered / available / available / {high|medium}
 * - usageReportedState = "reported" + no tokens (all 0 or null) → partial / available / unavailable / low
 */
function resolveRunEventCoverage(value: {
  usageReportedState: UsageReportedState;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  costCents: number | null;
}): {
  coverageState: CoverageState;
  sourceStatus: SourceStatus;
  safeStatus: SafeStatus;
  confidence: ConfidenceLevel;
} {
  const { usageReportedState, inputTokens, outputTokens, cachedInputTokens, costCents } = value;
  const hasTokenUsage =
    (inputTokens ?? 0) > 0 || (outputTokens ?? 0) > 0 || (cachedInputTokens ?? 0) > 0;
  const hasCost = (costCents ?? 0) > 0;

  switch (usageReportedState) {
    case "not_reported":
      return {
        coverageState: "uncovered",
        sourceStatus: "unavailable",
        safeStatus: "unavailable",
        confidence: "low",
      };
    case "redacted":
      return {
        coverageState: "uncovered",
        sourceStatus: "available",
        safeStatus: "unavailable",
        confidence: "low",
      };
    case "estimated":
      if (hasTokenUsage) {
        return {
          coverageState: "covered",
          sourceStatus: "available",
          safeStatus: "available",
          confidence: hasCost ? "high" : "medium",
        };
      }
      return {
        coverageState: "partial",
        sourceStatus: "available",
        safeStatus: "unavailable",
        confidence: "low",
      };
    case "reported":
    default:
      if (hasTokenUsage) {
        return {
          coverageState: "covered",
          sourceStatus: "available",
          safeStatus: "available",
          confidence: hasCost ? "high" : "medium",
        };
      }
      return {
        coverageState: "partial",
        sourceStatus: "available",
        safeStatus: "unavailable",
        confidence: "low",
      };
  }
}

/**
 * Compute a human-readable coverage warning reason from the resolved coverage fields.
 * Returns null when there is no coverage problem.
 */
export function computeCoverageWarning(
  usageReportedState: UsageReportedState,
  coverageState: CoverageState,
  sourceStatus: SourceStatus,
  costStatus: CostStatus,
): string | null {
  if (sourceStatus === "unavailable") {
    return "adapter_did_not_report_usage";
  }
  if (usageReportedState === "not_reported") {
    return "usage_not_reported";
  }
  if (coverageState === "partial") {
    return "usage_reported_but_tokens_zero";
  }
  if (costStatus === "unpriced") {
    return "cost_not_priced";
  }
  return null;
}

export const createRunEventSchema = z.object({
  runId: z.string().uuid(),
  adapterType: z.string().min(1),
  model: z.string().optional().default("unknown"),
  provider: z.string().optional().default("unknown"),
  status: z.enum(["success", "error", "timeout", "canceled"]).optional().default("success"),
  inputTokens: z.number().int().nonnegative().optional().nullable(),
  outputTokens: z.number().int().nonnegative().optional().nullable(),
  cachedInputTokens: z.number().int().nonnegative().optional().nullable(),
  reasoningTokens: z.number().int().nonnegative().optional().nullable(),
  toolCallTokens: z.number().int().nonnegative().optional().nullable(),
  costCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().default("USD"),
  usageReportedState: z.enum(USAGE_REPORTED_STATES).optional().default("not_reported"),
  usageSourceField: z.string().optional().nullable(),
  issueId: z.string().uuid().optional().nullable(),
  priceBasis: z.enum(PRICE_BASIS).optional().default(DEFAULT_PRICE_BASIS),
  costConfidence: z.enum(COST_CONFIDENCE_LEVELS).optional().default(DEFAULT_COST_CONFIDENCE),
  pricingVersionRef: z.string().optional().nullable(),
  nativeTotalTokens: z.number().int().nonnegative().optional().nullable(),
  recomputedTotalTokens: z.number().int().nonnegative().optional().nullable(),
  isSubscriptionIncluded: z.boolean().optional().default(false),
  /** Privacy / retention fields (JAC-4533). Fail-closed defaults applied below. */
  visibilityClass: z.enum(VISIBILITY_CLASSES).optional().default(DEFAULT_VISIBILITY_CLASS),
  retentionClass: z.enum(RETENTION_CLASSES).optional().default(DEFAULT_RETENTION_CLASS),
  redactionState: z.enum(REDACTION_STATES).optional().default(DEFAULT_REDACTION_STATE),
  sourcePermissionRef: z.string().optional().nullable(),
  /** SHA-256 hex digest for tenant isolation (JAC-4533). */
  tenantRefHash: z.string().optional().nullable().refine(
    (val) => val === null || val === undefined || /^[a-f0-9]{64}$/.test(val),
    { message: "tenantRefHash must be a 64-char lowercase hex SHA-256 digest or null" },
  ),
  /** Array of SHA-256 hex digests for subject attribution (JAC-4533). */
  subjectRefHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional().nullable(),
  sourceDeletedAt: z.string().datetime().optional().nullable(),
  tombstoneRef: z.string().optional().nullable(),
  policyVersion: z.string().optional().nullable(),
  /** Event identity / idempotency fields (JAC-4532). */
  sourceSystem: z.enum(RUN_EVENT_SOURCE_SYSTEMS).optional().default("paperclip"),
  sourceEventId: z.string().optional().nullable(),
  sourceEventVersion: z.string().optional().nullable(),
  eventKind: z.enum(RUN_EVENT_KINDS).optional().default("adapter_execution"),
  attemptIndex: z.number().int().nonnegative().optional().default(0),
  observedSequence: z.number().int().nonnegative().optional().nullable(),
  supersedesEventId: z.string().optional().nullable(),
  payloadHash: z.string().optional().nullable(),
  occurredAt: z.string().datetime(),
}).transform((value) => {
  // Fail-closed: coverage fields are derived from usageReportedState + token values,
  // never caller-supplied. A status of "error"/"timeout"/"canceled" with
  // not_reported usage is fully fail-closed.
  const coverage = resolveRunEventCoverage({
    usageReportedState: value.usageReportedState,
    inputTokens: value.inputTokens ?? null,
    outputTokens: value.outputTokens ?? null,
    cachedInputTokens: value.cachedInputTokens ?? null,
    costCents: value.costCents ?? null,
  });
  const coverageWarning = computeCoverageWarning(
    value.usageReportedState,
    coverage.coverageState,
    coverage.sourceStatus,
    value.costCents != null && value.costCents === 0
      ? (value.usageReportedState === "not_reported"
          ? ("reported" as CostStatus)
          : ("unpriced" as CostStatus))
      : ("reported" as CostStatus),
  );
  return {
    ...value,
    ...coverage,
    coverageWarning,
    // Fail-closed: when costCents is absent, priceBasis defaults to not_reported
    // and costConfidence defaults to low.
    priceBasis: value.costCents != null && value.costCents > 0 ? value.priceBasis : DEFAULT_PRICE_BASIS,
    costConfidence: value.costCents != null && value.costCents > 0 ? value.costConfidence : DEFAULT_COST_CONFIDENCE,
    isSubscriptionIncluded: value.isSubscriptionIncluded,
  };
});

export type CreateRunEventInput = z.infer<typeof createRunEventSchema>;

export const updateBudgetSchema = z.object({
  budgetMonthlyCents: z.number().int().nonnegative(),
});

export type UpdateBudget = z.infer<typeof updateBudgetSchema>;
