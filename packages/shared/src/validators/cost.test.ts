import { describe, expect, it } from "vitest";
import {
  createCostEventSchema,
  createRunEventSchema,
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

describe("JAC-4533 privacy/retention field defaults", () => {
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

  describe("createCostEventSchema", () => {
    it("defaults to fail-closed values when privacy fields are omitted", () => {
      const result = createCostEventSchema.parse(base);
      expect(result.visibilityClass).toBe("internal");
      expect(result.retentionClass).toBe("standard");
      expect(result.redactionState).toBe("unredacted");
      expect(result.sourcePermissionRef).toBeUndefined();
      expect(result.tenantRefHash).toBeUndefined();
      expect(result.subjectRefHashes).toBeUndefined();
      expect(result.sourceDeletedAt).toBeUndefined();
      expect(result.tombstoneRef).toBeUndefined();
      expect(result.policyVersion).toBeUndefined();
    });

    it("accepts explicitly provided privacy fields", () => {
      const result = createCostEventSchema.parse({
        ...base,
        visibilityClass: "private",
        retentionClass: "long_term",
        redactionState: "partially_redacted",
        sourcePermissionRef: "agent:abc:scope:usage.read",
        tenantRefHash: "a".repeat(64),
        subjectRefHashes: ["b".repeat(64), "c".repeat(64)],
        sourceDeletedAt: "2026-08-04T12:00:00.000Z",
        tombstoneRef: "tombstone:company:event:20260804",
        policyVersion: "privacy-v1.2",
      });
      expect(result.visibilityClass).toBe("private");
      expect(result.retentionClass).toBe("long_term");
      expect(result.redactionState).toBe("partially_redacted");
      expect(result.sourcePermissionRef).toBe("agent:abc:scope:usage.read");
      expect(result.tenantRefHash).toBe("a".repeat(64));
      expect(result.subjectRefHashes).toHaveLength(2);
      expect(result.sourceDeletedAt).toBe("2026-08-04T12:00:00.000Z");
      expect(result.tombstoneRef).toBe("tombstone:company:event:20260804");
      expect(result.policyVersion).toBe("privacy-v1.2");
    });

    it("rejects invalid visibilityClass enum values", () => {
      expect(() =>
        createCostEventSchema.parse({ ...base, visibilityClass: "supersecret" }),
      ).toThrow();
    });

    it("rejects invalid retentionClass enum values", () => {
      expect(() =>
        createCostEventSchema.parse({ ...base, retentionClass: "forever" }),
      ).toThrow();
    });

    it("rejects invalid redactionState enum values", () => {
      expect(() =>
        createCostEventSchema.parse({ ...base, redactionState: "stripped" }),
      ).toThrow();
    });

    it("rejects tenantRefHash that is not a 64-char SHA-256 hex digest", () => {
      expect(() =>
        createCostEventSchema.parse({ ...base, tenantRefHash: "not-a-hash" }),
      ).toThrow();
    });

    it("rejects tenantRefHash with uppercase hex", () => {
      expect(() =>
        createCostEventSchema.parse({ ...base, tenantRefHash: "A".repeat(64) }),
      ).toThrow();
    });

    it("rejects subjectRefHashes element that is not a 64-char hex digest", () => {
      expect(() =>
        createCostEventSchema.parse({
          ...base,
          subjectRefHashes: ["bad", "b".repeat(64)],
        }),
      ).toThrow();
    });

    it("accepts null for nullable privacy fields", () => {
      const result = createCostEventSchema.parse({
        ...base,
        sourcePermissionRef: null,
        tenantRefHash: null,
        subjectRefHashes: null,
        sourceDeletedAt: null,
        tombstoneRef: null,
        policyVersion: null,
      });
      expect(result.sourcePermissionRef).toBeNull();
      expect(result.tenantRefHash).toBeNull();
      expect(result.subjectRefHashes).toBeNull();
      expect(result.sourceDeletedAt).toBeNull();
      expect(result.tombstoneRef).toBeNull();
      expect(result.policyVersion).toBeNull();
    });
  });

  describe("createRunEventSchema", () => {
    const runEventBase = {
      runId: "00000000-0000-0000-0000-000000000001",
      adapterType: "hermes_local",
      model: "gpt-5",
      provider: "openai",
      status: "success",
      inputTokens: null,
      outputTokens: null,
      costCents: null,
      occurredAt: "2026-08-04T00:00:00.000Z",
      usageReportedState: "not_reported",
      priceBasis: "not_reported",
      costConfidence: "low",
    };

    it("defaults to fail-closed values when privacy fields are omitted", () => {
      const result = createRunEventSchema.parse({ ...runEventBase });
      expect(result.visibilityClass).toBe("internal");
      expect(result.retentionClass).toBe("standard");
      expect(result.redactionState).toBe("unredacted");
    });

    it("rejects invalid visibilityClass enum values", () => {
      expect(() =>
        createRunEventSchema.parse({
          ...runEventBase,
          visibilityClass: "supersecret",
        }),
      ).toThrow();
    });

    it("rejects tenantRefHash that is not a 64-char SHA-256 hex digest", () => {
      expect(() =>
        createRunEventSchema.parse({
          ...runEventBase,
          tenantRefHash: "short",
        }),
      ).toThrow();
    });
  });
});
