import type {
  CoverageState,
  SafeStatus,
  SourceStatus,
  ConfidenceLevel,
  UsageReportedState,
  RunEventStatus,
} from "../constants.js";

/**
 * A normalized run event — emitted by the Paperclip adapter for every
 * heartbeat_run regardless of whether it produced spend.
 *
 * Token/cost fields are nullable: null = not_reported, 0 = explicitly zero.
 * Coverage fields are fail-closed: absent/uncertain source reporting → uncovered/unavailable.
 */
export interface RunEvent {
  id: string;
  companyId: string;
  agentId: string;
  issueId: string | null;
  runId: string;
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
  usageReportedState: UsageReportedState;
  usageSourceField: string | null;
  coverageState: CoverageState;
  sourceStatus: SourceStatus;
  safeStatus: SafeStatus;
  confidence: ConfidenceLevel;
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
