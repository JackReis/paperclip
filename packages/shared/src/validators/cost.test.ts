import { describe, expect, it } from "vitest";
import {
  createCostEventSchema,
  resolveCoverageState,
  resolveSafeStatus,
} from "./cost.js";
import type { CoverageState, SafeStatus, SourceStatus } from "../constants.js";

describe("resolveCoverageState (fail-closed)", () => {
  it("forces uncovered when source is unavailable and caller claimed covered or partial", () => {
    expect(resolveCoverageState("covered", "unavailable" as SourceStatus)).toBe("uncovered");
    expect(resolveCoverageState("partial", "unavailable" as SourceStatus)).toBe("uncovered");
  });

  it("preserves unknown and uncovered when source is unavailable", () => {
    expect(resolveCoverageState("unknown", "unavailable" as SourceStatus)).toBe("unknown");
    expect(resolveCoverageState("uncovered", "unavailable" as SourceStatus)).toBe("uncovered");
  });

  it("preserves caller-provided coverage when source is available", () => {
    expect(resolveCoverageState("covered", "available")).toBe("covered");
    expect(resolveCoverageState("partial", "available")).toBe("partial");
    expect(resolveCoverageState("uncovered", "available")).toBe("uncovered");
    expect(resolveCoverageState("unknown", "available")).toBe("unknown");
  });
});

describe("resolveSafeStatus (fail-closed)", () => {
  it("maps uncovered to unavailable", () => {
    const unsafe: CoverageState[] = ["partial", "uncovered", "unknown"];
    for (const state of unsafe) {
      expect(resolveSafeStatus(state)).toBe("unavailable" satisfies SafeStatus);
    }
  });

  it("maps only covered to available", () => {
    expect(resolveSafeStatus("covered")).toBe("available" satisfies SafeStatus);
  });
});

describe("createCostEventSchema fail-closed transform", () => {
  const base = {
    agentId: "00000000-0000-0000-0000-000000000001",
    provider: "test",
    model: "test-model",
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    costCents: 0,
    occurredAt: "2026-08-04T00:00:00.000Z",
  };

  it("defaults to fail-closed unknown/unavailable when omitted", () => {
    const result = createCostEventSchema.parse(base);
    expect(result.coverageState).toBe("unknown");
    expect(result.sourceStatus).toBe("unavailable");
    expect(result.safeStatus).toBe("unavailable");
    expect(result.confidence).toBe("low");
  });

  it("forces uncovered/unavailable when source is unavailable even if coverage claims covered", () => {
    const result = createCostEventSchema.parse({
      ...base,
      coverageState: "covered",
      sourceStatus: "unavailable",
    });
    // source is unavailable -> coverage must be uncovered -> safe unavailable
    expect(result.coverageState).toBe("uncovered");
    expect(result.safeStatus).toBe("unavailable");
  });

  it("respects caller values when source is available", () => {
    const result = createCostEventSchema.parse({
      ...base,
      coverageState: "covered",
      sourceStatus: "available",
      confidence: "high",
    });
    expect(result.coverageState).toBe("covered");
    expect(result.safeStatus).toBe("available");
    expect(result.confidence).toBe("high");
  });

  it("derives safeStatus from the resolved coverageState", () => {
    // caller says covered + source available -> safe available
    expect(
      createCostEventSchema.parse({
        ...base,
        coverageState: "covered",
        sourceStatus: "available",
      }).safeStatus,
    ).toBe("available");

    // caller says covered but source unavailable -> coverage forced uncovered -> safe unavailable
    expect(
      createCostEventSchema.parse({
        ...base,
        coverageState: "covered",
        sourceStatus: "unavailable",
      }).safeStatus,
    ).toBe("unavailable");

    // caller says partial + source available -> coverage stays partial -> safe unavailable
    expect(
      createCostEventSchema.parse({
        ...base,
        coverageState: "partial",
        sourceStatus: "available",
      }).safeStatus,
    ).toBe("unavailable");
  });

  it("accepts null for optional token fields", () => {
    const result = createCostEventSchema.parse({
      ...base,
      reasoningTokens: null,
      toolCallTokens: null,
      pricingVersionRef: null,
    });
    expect(result.reasoningTokens).toBeNull();
    expect(result.toolCallTokens).toBeNull();
    expect(result.pricingVersionRef).toBeNull();
    expect(result.currency).toBe("USD");
  });

  it("defaults currency to USD", () => {
    const result = createCostEventSchema.parse(base);
    expect(result.currency).toBe("USD");
  });
});
