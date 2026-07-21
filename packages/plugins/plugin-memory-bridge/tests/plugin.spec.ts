import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import { runLocalTurnSync } from "../src/cli.js";
import { DEFAULT_CONFIG, MAX_TEXT_LENGTH, TOOL_NAMES } from "../src/constants.js";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

vi.mock("../src/cli.js", () => ({
  runLocalTurnSync: vi.fn(),
}));

const mockedRun = vi.mocked(runLocalTurnSync);

async function setupHarness(config?: Record<string, unknown>) {
  const harness = createTestHarness({ manifest, config });
  await plugin.definition.setup(harness.ctx);
  return harness;
}

beforeEach(() => {
  mockedRun.mockReset();
  mockedRun.mockResolvedValue({ code: 0, stdout: "", stderr: "" });
});

describe("manifest", () => {
  it("declares the tool capability and both tools", () => {
    expect(manifest.capabilities).toContain("agent.tools.register");
    expect(manifest.tools?.map((tool) => tool.name)).toEqual([
      TOOL_NAMES.memorySearch,
      TOOL_NAMES.memoryNote,
    ]);
  });
});

describe("memory_search", () => {
  it("builds a brief argv with bounded limit and -- separator", async () => {
    const harness = await setupHarness();
    mockedRun.mockResolvedValue({ code: 0, stdout: "row one\nrow two\n", stderr: "" });

    const result = await harness.executeTool(TOOL_NAMES.memorySearch, {
      query: "paperclip memory",
      limit: 3,
    });

    expect(mockedRun).toHaveBeenCalledWith(
      DEFAULT_CONFIG.localTurnSyncPath,
      ["brief", "--limit", "3", "--", "paperclip memory"],
      expect.any(Number),
    );
    expect(result.content).toBe("row one\nrow two");
    expect(result.data).toMatchObject({ ok: true, query: "paperclip memory", limit: 3 });
  });

  it("defaults the limit to 5 and clamps out-of-range values", async () => {
    const harness = await setupHarness();

    await harness.executeTool(TOOL_NAMES.memorySearch, { query: "topic" });
    expect(mockedRun).toHaveBeenLastCalledWith(
      expect.any(String),
      ["brief", "--limit", "5", "--", "topic"],
      expect.any(Number),
    );

    await harness.executeTool(TOOL_NAMES.memorySearch, { query: "topic", limit: 999 });
    expect(mockedRun).toHaveBeenLastCalledWith(
      expect.any(String),
      ["brief", "--limit", "50", "--", "topic"],
      expect.any(Number),
    );
  });

  it("uses the configured localTurnSyncPath override", async () => {
    const harness = await setupHarness({ localTurnSyncPath: "/opt/custom/local-turn-sync" });

    await harness.executeTool(TOOL_NAMES.memorySearch, { query: "topic" });

    expect(mockedRun).toHaveBeenCalledWith(
      "/opt/custom/local-turn-sync",
      expect.any(Array),
      expect.any(Number),
    );
  });

  it("fails open with { ok: false, error } on nonzero exit", async () => {
    const harness = await setupHarness();
    mockedRun.mockResolvedValue({ code: 2, stdout: "", stderr: "planes unavailable" });

    const result = await harness.executeTool(TOOL_NAMES.memorySearch, { query: "topic" });

    expect(result.data).toEqual({ ok: false, error: "planes unavailable" });
    expect(result.content).toContain("memory_search failed");
  });

  it("rejects a missing query without invoking the CLI", async () => {
    const harness = await setupHarness();

    const result = await harness.executeTool(TOOL_NAMES.memorySearch, {});

    expect(mockedRun).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ ok: false });
  });
});

describe("memory_note", () => {
  it("builds a capture argv with source, task id, kind, and -- separator", async () => {
    const harness = await setupHarness();

    const result = await harness.executeTool(TOOL_NAMES.memoryNote, {
      text: "Durable fact",
      kind: "done",
      taskId: "paperclip/build-1",
    });

    expect(mockedRun).toHaveBeenCalledWith(
      DEFAULT_CONFIG.localTurnSyncPath,
      [
        "capture",
        "--source",
        "paperclip",
        "--task-id",
        "paperclip/build-1",
        "--kind",
        "done",
        "--",
        "Durable fact",
      ],
      expect.any(Number),
    );
    expect(result.data).toMatchObject({ ok: true, kind: "done", taskId: "paperclip/build-1" });
  });

  it("falls back to default kind and taskId for missing or unsafe values", async () => {
    const harness = await setupHarness();

    await harness.executeTool(TOOL_NAMES.memoryNote, {
      text: "fact",
      kind: "--not-a-kind",
      taskId: "-rf /",
    });

    expect(mockedRun).toHaveBeenLastCalledWith(
      expect.any(String),
      [
        "capture",
        "--source",
        "paperclip",
        "--task-id",
        "paperclip/manual",
        "--kind",
        "fact",
        "--",
        "fact",
      ],
      expect.any(Number),
    );
  });

  it("caps text length at the configured maximum", async () => {
    const harness = await setupHarness();
    const longText = "x".repeat(MAX_TEXT_LENGTH + 500);

    await harness.executeTool(TOOL_NAMES.memoryNote, { text: longText });

    const argv = mockedRun.mock.calls[0]?.[1] ?? [];
    const captured = argv[argv.length - 1] ?? "";
    expect(captured).toHaveLength(MAX_TEXT_LENGTH);
  });

  it("fails open with { ok: false, error } on nonzero exit", async () => {
    const harness = await setupHarness();
    mockedRun.mockResolvedValue({ code: 1, stdout: "", stderr: "capture failed" });

    const result = await harness.executeTool(TOOL_NAMES.memoryNote, { text: "fact" });

    expect(result.data).toEqual({ ok: false, error: "capture failed" });
    expect(result.content).toContain("memory_note failed");
  });

  it("rejects empty text without invoking the CLI", async () => {
    const harness = await setupHarness();

    const result = await harness.executeTool(TOOL_NAMES.memoryNote, { text: "   " });

    expect(mockedRun).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ ok: false });
  });

  it("audits each operation via the activity log", async () => {
    const harness = await setupHarness();

    await harness.executeTool(TOOL_NAMES.memoryNote, { text: "fact" });

    expect(harness.activity).toHaveLength(1);
    expect(harness.activity[0]?.message).toContain("memory_note");
  });
});
