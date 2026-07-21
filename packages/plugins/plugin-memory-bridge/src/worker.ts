import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import { runLocalTurnSync } from "./cli.js";
import {
  CLI_TIMEOUT_MS,
  DEFAULT_CONFIG,
  DEFAULT_NOTE_KIND,
  DEFAULT_NOTE_TASK_ID,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MAX_TEXT_LENGTH,
  NOTE_SOURCE,
  PLUGIN_ID,
  TOOL_NAMES,
} from "./constants.js";

type MemoryBridgeConfig = {
  localTurnSyncPath?: string;
};

let currentContext: PluginContext | null = null;

async function getCliPath(ctx: PluginContext): Promise<string> {
  try {
    const config = (await ctx.config.get()) as MemoryBridgeConfig;
    if (typeof config.localTurnSyncPath === "string" && config.localTurnSyncPath.trim().length > 0) {
      return config.localTurnSyncPath.trim();
    }
  } catch {
    // Fall through to the default path when config is unavailable.
  }
  return DEFAULT_CONFIG.localTurnSyncPath;
}

/**
 * Bound and clean free text before handing it to the CLI. The CLI is invoked
 * via execFile (no shell), so this only needs to bound length and drop
 * control characters that would garble the argv.
 */
function sanitizeText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
}

/** Restrict label-like values (kind, taskId) to a safe token alphabet. */
function sanitizeLabel(value: unknown, pattern: RegExp, fallback: string): string {
  if (typeof value === "string" && pattern.test(value)) return value;
  return fallback;
}

function clampLimit(value: unknown): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_SEARCH_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_SEARCH_LIMIT);
}

function failOpen(operation: string, error: string): ToolResult {
  return {
    content: `${operation} failed (memory substrate unavailable): ${error}`,
    data: { ok: false, error },
  };
}

async function audit(
  ctx: PluginContext,
  operation: string,
  runCtx: ToolRunContext,
  detail: Record<string, unknown>,
): Promise<void> {
  ctx.logger.info(`${operation} invoked`, { ...detail, agentId: runCtx.agentId, runId: runCtx.runId });
  try {
    await ctx.activity.log({
      companyId: runCtx.companyId,
      message: `${PLUGIN_ID}: ${operation}`,
      metadata: { ...detail, agentId: runCtx.agentId, runId: runCtx.runId },
    });
  } catch (error) {
    // Audit must never break the tool call; the structured logger above
    // already captured the operation.
    ctx.logger.warn("activity log write failed", {
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function registerTools(ctx: PluginContext): Promise<void> {
  ctx.tools.register(
    TOOL_NAMES.memorySearch,
    {
      displayName: "Memory Search",
      description: "Search the fleet memory substrate for evidence relevant to a topic.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
    async (params, runCtx): Promise<ToolResult> => {
      const payload = params as { query?: unknown; limit?: unknown };
      const query = typeof payload.query === "string" ? sanitizeText(payload.query) : "";
      if (!query) {
        return failOpen(TOOL_NAMES.memorySearch, "query is required and must be a non-empty string");
      }
      const limit = clampLimit(payload.limit);
      const cliPath = await getCliPath(ctx);
      await audit(ctx, TOOL_NAMES.memorySearch, runCtx, { query, limit });

      // "--" stops option parsing so a query can never be read as a CLI flag.
      const result = await runLocalTurnSync(
        cliPath,
        ["brief", "--limit", String(limit), "--", query],
        CLI_TIMEOUT_MS,
      );
      if (result.code !== 0) {
        ctx.logger.warn("memory_search CLI failed", { code: result.code, stderr: result.stderr });
        return failOpen(TOOL_NAMES.memorySearch, result.stderr.trim() || `exit code ${result.code}`);
      }
      const output = result.stdout.trim();
      return {
        content: output.length > 0 ? output : "No memory evidence found for this query.",
        data: { ok: true, query, limit, output },
      };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.memoryNote,
    {
      displayName: "Memory Note",
      description: "Capture one durable fact to the fleet memory substrate.",
      parametersSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: { type: "string" },
          taskId: { type: "string" },
        },
        required: ["text"],
      },
    },
    async (params, runCtx): Promise<ToolResult> => {
      const payload = params as { text?: unknown; kind?: unknown; taskId?: unknown };
      const text = typeof payload.text === "string" ? sanitizeText(payload.text) : "";
      if (!text) {
        return failOpen(TOOL_NAMES.memoryNote, "text is required and must be a non-empty string");
      }
      const kind = sanitizeLabel(payload.kind, /^[a-z][a-z0-9_-]{0,63}$/i, DEFAULT_NOTE_KIND);
      const taskId = sanitizeLabel(payload.taskId, /^[a-z0-9][a-z0-9/_.-]{0,127}$/i, DEFAULT_NOTE_TASK_ID);
      const cliPath = await getCliPath(ctx);
      await audit(ctx, TOOL_NAMES.memoryNote, runCtx, { kind, taskId, textLength: text.length });

      const result = await runLocalTurnSync(
        cliPath,
        ["capture", "--source", NOTE_SOURCE, "--task-id", taskId, "--kind", kind, "--", text],
        CLI_TIMEOUT_MS,
      );
      if (result.code !== 0) {
        ctx.logger.warn("memory_note CLI failed", { code: result.code, stderr: result.stderr });
        return failOpen(TOOL_NAMES.memoryNote, result.stderr.trim() || `exit code ${result.code}`);
      }
      return {
        content: `Captured durable fact (kind=${kind}, taskId=${taskId}).`,
        data: { ok: true, kind, taskId, output: result.stdout.trim() },
      };
    },
  );
}

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    currentContext = ctx;
    await registerTools(ctx);
    ctx.logger.info("memory-bridge plugin setup complete", { pluginId: PLUGIN_ID });
  },

  async onHealth() {
    const ctx = currentContext;
    const cliPath = ctx ? await getCliPath(ctx) : DEFAULT_CONFIG.localTurnSyncPath;
    return {
      status: "ok",
      message: "Memory bridge worker is running",
      details: { cliPath },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
