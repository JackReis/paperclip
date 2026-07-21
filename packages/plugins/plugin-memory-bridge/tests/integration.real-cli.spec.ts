import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import { TOOL_NAMES } from "../src/constants.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

/**
 * Round-trip smoke against the REAL local-turn-sync CLI. Skipped by default
 * because it writes to and reads from the live local memory planes.
 *
 * Run with:
 *   PAPERCLIP_MEMORY_BRIDGE_REAL_CLI=1 pnpm vitest run tests/integration.real-cli.spec.ts
 */
const enabled = process.env.PAPERCLIP_MEMORY_BRIDGE_REAL_CLI === "1";

describe.skipIf(!enabled)("real local-turn-sync round-trip", () => {
  it("captures a note and recalls it via search", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);

    const marker = "[TEST] paperclip memory-bridge roundtrip 2026-07-21";
    const note = await harness.executeTool(TOOL_NAMES.memoryNote, {
      text: marker,
      kind: "fact",
      taskId: "paperclip/integration-smoke",
    });
    expect(note.data).toMatchObject({ ok: true });

    const search = await harness.executeTool(TOOL_NAMES.memorySearch, {
      query: "paperclip memory-bridge roundtrip",
      limit: 5,
    });
    expect(search.data).toMatchObject({ ok: true });
    expect(String(search.content)).toContain("memory-bridge roundtrip");
  }, 180_000);
});
