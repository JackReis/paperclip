/**
 * Regression test for onSpawn forwarding in the hermes-local adapter.
 *
 * Ensures ctx.onSpawn is forwarded to runChildProcess() so the orphan
 * reaper can track live child processes by PID, preventing false-positive
 * reaps on runs whose updatedAt becomes stale.
 *
 * @see https://github.com/paperclipai/paperclip/issues/8723
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the adapter-utils server-utils module that execute.ts imports from.
// We intercept runChildProcess so we can inspect its opts without spawning
// a real child process.
vi.mock("@paperclipai/adapter-utils/server-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@paperclipai/adapter-utils/server-utils")>();
  return {
    ...actual,
    runChildProcess: vi.fn(async () => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: "",
      stderr: "",
    })),
  };
});

// Mock fs and path resolution to avoid real file reads in execute()
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => ""),
  writeFile: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  rm: vi.fn(async () => undefined),
  access: vi.fn(async () => undefined),
  readdir: vi.fn(async () => []),
  stat: vi.fn(async () => ({ isFile: () => true, isDirectory: () => false })),
}));

import { execute } from "./execute.js";
import * as serverUtils from "@paperclipai/adapter-utils/server-utils";

import {
  OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV,
  DEFAULT_CLOUD_ADMISSION_WRAPPER,
} from "../shared/constants.js";

function makeCtx(overrides: Record<string, unknown> = {}) {
  const onSpawn = vi.fn(async () => undefined);
  return {
    ctx: {
      runId: "test-run-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Hermes",
        adapterType: "hermes_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "/usr/bin/hermes",
        timeoutSec: 60,
        graceSec: 5,
        ...overrides,
      },
      context: {
        issueId: "issue-1",
        wakeReason: "manual",
        paperclipWake: null,
      },
      onLog: vi.fn(async () => undefined),
      onMeta: vi.fn(async () => undefined),
      onSpawn,
    } satisfies Record<string, unknown>,
    onSpawn,
  };
}

describe("hermes-local adapter onSpawn forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards ctx.onSpawn to runChildProcess", async () => {
    const { ctx, onSpawn } = makeCtx();

    // execute() will call runChildProcess internally.
    // We expect it to propagate ctx.onSpawn.
    // Because we mocked runChildProcess, the actual child doesn't spawn,
    // but we can verify it was called with onSpawn.
    try {
      await execute(ctx as any);
    } catch {
      // execute may fail due to missing hermes binary / env — that's OK,
      // we only care that runChildProcess was called with onSpawn.
    }

    const mocked = vi.mocked(serverUtils.runChildProcess);
    expect(mocked.mock.calls.length).toBeGreaterThan(0);
    const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
    const opts = lastCall[3] as Record<string, unknown>;
    expect(opts.onSpawn).toBe(onSpawn);
  });

  it("runChildProcess opts type includes onSpawn", () => {
    // Type-level assertion: if onSpawn were removed from the type,
    // this file would fail to compile. The runtime test above catches
    // the behavioral case; this documents the contract.
    const opts: Parameters<typeof serverUtils.runChildProcess>[3] = {
      cwd: "/tmp",
      env: {},
      timeoutSec: 60,
      graceSec: 5,
      onLog: async () => undefined,
      onSpawn: async () => undefined,
    };
    expect(opts.onSpawn).toBeDefined();
  });

  it("does not inherit PAPERCLIP_API_KEY without a harness token", async () => {
    const previousApiKey = process.env.PAPERCLIP_API_KEY;
    process.env.PAPERCLIP_API_KEY = "parent-process-key";

    try {
      const { ctx } = makeCtx();
      await execute(ctx as any);

      const mocked = vi.mocked(serverUtils.runChildProcess);
      const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
      const opts = lastCall[3] as { env: Record<string, string> };
      expect(opts.env.PAPERCLIP_API_KEY).toBeUndefined();
    } finally {
      if (previousApiKey === undefined) delete process.env.PAPERCLIP_API_KEY;
      else process.env.PAPERCLIP_API_KEY = previousApiKey;
    }
  });
});


// ---------------------------------------------------------------------------
// Cloud admission wrapper wiring (hermes-04ps.1.3.1)
// ---------------------------------------------------------------------------
//
// Ensures the Hermes CLI invocation is wrapped with the counting-semaphore
// when the resolved provider is "ollama-cloud" and the admission state dir
// is configured via PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR.
//
// See: doc/plans/2026-08-04-cloud-admission-mutation-table-jac-4139.md §2.3

describe("hermes-local adapter cloud admission wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT wrap when provider is not ollama-cloud", async () => {
    const { ctx } = makeCtx({
      model: "poolside/laguna-s-2.1:free",
      provider: "nous",
    });

    try {
      await execute(ctx as any);
    } catch {
      // ignored — we assert on the mocked runChildProcess call
    }

    const mocked = vi.mocked(serverUtils.runChildProcess);
    expect(mocked.mock.calls.length).toBeGreaterThan(0);
    const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
    const [cmd]: [string] = [lastCall[1] as string];
    expect(cmd).not.toContain("ollama_cloud_admission");
    expect(cmd).toBe("/usr/bin/hermes");
  });

  it("does NOT wrap when ollama-cloud but state dir env is unset", async () => {
    const previous = process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];
    delete process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];

    const { ctx } = makeCtx({
      model: "ollama-cloud/deepseek-v4-flash",
      provider: "ollama-cloud",
    });

    try {
      await execute(ctx as any);
    } catch {
      // ignored
    }

    const mocked = vi.mocked(serverUtils.runChildProcess);
    const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
    const cmd = lastCall[1] as string;
    expect(cmd).toBe("/usr/bin/hermes"); // no wrapping

    if (previous !== undefined) {
      process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV] = previous;
    }
  });

  it("wraps with passthrough when provider is ollama-cloud and state dir is set", async () => {
    const stateDir = "/tmp/test-ollama-cloud-admission";
    const previous = process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];
    process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV] = stateDir;

    const { ctx } = makeCtx({
      model: "ollama-cloud/deepseek-v4-flash",
      provider: "ollama-cloud",
    });

    try {
      await execute(ctx as any);
    } catch {
      // ignored
    }

    const mocked = vi.mocked(serverUtils.runChildProcess);
    expect(mocked.mock.calls.length).toBeGreaterThan(0);
    const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
    const cmd = lastCall[1] as string;
    const callArgs = lastCall[2] as string[];

    // The wrapper path should be the default (no env override, no config override).
    expect(cmd).toBe(DEFAULT_CLOUD_ADMISSION_WRAPPER);

    // Args must start with passthrough -- then the base hermes command + original args.
    expect(callArgs[0]).toBe("passthrough");
    expect(callArgs[1]).toBe("--");
    expect(callArgs[2]).toBe("/usr/bin/hermes");
    // The original hermes args (chat -q <prompt> -Q ...) follow.
    expect(callArgs[3]).toBe("chat");
    expect(callArgs.includes("-Q")).toBe(true);
    expect(callArgs.includes("-m")).toBe(true);
    expect(callArgs.includes("ollama-cloud")).toBe(true);

    // Cleanup
    if (previous !== undefined) {
      process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV] = previous;
    } else {
      delete process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];
    }
  });

  it("respects cloudAdmissionWrapper config override", async () => {
    const stateDir = "/tmp/test-ollama-cloud-admission-override";
    const customWrapper = "/custom/path/ollama_cloud_admission.py";
    const previousState = process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];
    process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV] = stateDir;

    const { ctx } = makeCtx({
      model: "ollama-cloud/deepseek-v4-flash",
      provider: "ollama-cloud",
      cloudAdmissionWrapper: customWrapper,
    });

    try {
      await execute(ctx as any);
    } catch {
      // ignored
    }

    const mocked = vi.mocked(serverUtils.runChildProcess);
    const lastCall = mocked.mock.calls[mocked.mock.calls.length - 1];
    const cmd = lastCall[1] as string;
    expect(cmd).toBe(customWrapper);

    const callArgs = lastCall[2] as string[];
    expect(callArgs[0]).toBe("passthrough");
    expect(callArgs[1]).toBe("--");
    expect(callArgs[2]).toBe("/usr/bin/hermes");

    if (previousState !== undefined) {
      process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV] = previousState;
    } else {
      delete process.env[OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV];
    }
  });
});
