import { describe, expect, it } from "vitest";
import { mapCodexRpcQuota } from "./quota.js";

describe("mapCodexRpcQuota", () => {
  it("labels the primary window from the duration reported by Codex RPC", () => {
    const snapshot = mapCodexRpcQuota({
      rateLimits: {
        limitId: "codex",
        primary: {
          usedPercent: 78,
          windowDurationMins: 10_080,
          resetsAt: 1_784_949_881,
        },
      },
    });

    expect(snapshot.windows[0]).toMatchObject({
      label: "7d limit",
      usedPercent: 78,
      resetsAt: "2026-07-25T03:24:41.000Z",
    });
  });

  it("preserves legacy labels when Codex RPC omits window durations", () => {
    const snapshot = mapCodexRpcQuota({
      rateLimits: {
        limitId: "codex",
        primary: { usedPercent: 10 },
        secondary: { usedPercent: 20 },
      },
    });

    expect(snapshot.windows.map((window) => window.label)).toEqual([
      "5h limit",
      "Weekly limit",
    ]);
  });

  it("keeps named non-default limits distinct while using their real durations", () => {
    const snapshot = mapCodexRpcQuota({
      rateLimitsByLimitId: {
        codex_bengalfox: {
          limitId: "codex_bengalfox",
          limitName: "GPT-5.3-Codex-Spark",
          primary: { usedPercent: 0, windowDurationMins: 1_440 },
        },
      },
    });

    expect(snapshot.windows[0]?.label).toBe("GPT-5.3-Codex-Spark · 24h limit");
  });
});
