/**
 * Server-side execution logic for the Hermes Agent adapter.
 *
 * Spawns `hermes chat -q "..." -Q` as a child process, streams output,
 * and returns structured results to Paperclip.
 *
 * Verified CLI flags (hermes chat):
 *   -q/--query         single query (non-interactive)
 *   -Q/--quiet         quiet mode (no banner/spinner, only response + session_id)
 *   -m/--model         model name (e.g. anthropic/claude-sonnet-4)
 *   -t/--toolsets      comma-separated toolsets to enable
 *   --provider         inference provider (auto, openrouter, nous, etc.)
 *   -r/--resume        resume session by ID
 *   -w/--worktree      isolated git worktree
 *   -v/--verbose       verbose output
 *   --checkpoints      filesystem checkpoints
 *   --yolo             bypass dangerous-command approval prompts (agents have no TTY)
 *   --source           session source tag for filtering
 */

import fs from "node:fs/promises";
import path from "node:path";

import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  UsageSummary,
} from "@paperclipai/adapter-utils";

import {
  runChildProcess,
  buildPaperclipEnv,
  renderTemplate,
  ensureAbsoluteDirectory,
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
  joinPromptSections,
  renderPaperclipWakePrompt,
  selectPaperclipTaskMarkdown,
  stringifyPaperclipWakePayload,
  isPaperclipRecoveryWakePayload,
} from "@paperclipai/adapter-utils/server-utils";

import {
  HERMES_CLI,
  DEFAULT_TIMEOUT_SEC,
  DEFAULT_GRACE_SEC,
  DEFAULT_MODEL,
  VALID_PROVIDERS,
  OLLAMA_CLOUD_PROVIDER,
  OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV,
  OLLAMA_CLOUD_ADMISSION_POLICY_ENV,
  OLLAMA_CLOUD_ADMISSION_WRAPPER_ENV,
  DEFAULT_CLOUD_ADMISSION_WRAPPER,
  CLOUD_ADMISSION_ROUTE_CLASS,
} from "../shared/constants.js";

import {
  detectModel,
  resolveProvider,
} from "./detect-model.js";
import {
  parseCurrentResultFooter,
  authenticateModel,
  type ModelCatalogEntry,
} from "../shared/footer.js";

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function cfgString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function cfgNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function cfgBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}
function cfgStringArray(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.every((i) => typeof i === "string")
    ? (v as string[])
    : undefined;
}

export function resolveHermesCommand(config: Record<string, unknown>): string {
  return cfgString(config.hermesCommand) || cfgString(config.command) || HERMES_CLI;
}

// ---------------------------------------------------------------------------
// Wake-up prompt builder
// ---------------------------------------------------------------------------

const HERMES_DEFAULT_PROMPT_TEMPLATE = [
  'You are "{{agent.name}}", an AI agent employee in a Paperclip-managed company.',
  "",
  "Paperclip runtime identity:",
  "- Agent ID: {{agent.id}}",
  "- Company ID: {{agent.companyId}}",
  "- Run ID: {{run.id}}",
  "- API base: {{paperclipApiUrl}}",
  "",
  "Paperclip API guidance:",
  "- Use `curl` from the terminal for Paperclip API calls; browser/web extraction tools may not reach localhost.",
  "- Use `$PAPERCLIP_API_URL`, `$PAPERCLIP_API_KEY`, and `$PAPERCLIP_RUN_ID`; do not hard-code local ports or copy secrets into comments.",
  "- Displayed command logs may redact secrets; rely on environment variables instead of printed token values.",
  "- Include `-H \"Authorization: Bearer $PAPERCLIP_API_KEY\"` on API requests.",
  "- Include `-H \"X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID\"` on mutating issue requests.",
  "- For multiline comments or status updates, preserve newlines with `jq --arg` or a heredoc-fed helper rather than hand-escaping JSON.",
  "",
  "Safe multiline update pattern:",
  "```bash",
  "api=\"${PAPERCLIP_API_URL%/}\"",
  "case \"$api\" in */api) ;; *) api=\"$api/api\" ;; esac",
  "",
  "body=$(cat <<'MD'",
  "Summary line",
  "",
  "- Detail one",
  "- Detail two",
  "MD",
  ")",
  "jq -n --arg status done --arg comment \"$body\" '{status:$status, comment:$comment}' | \\",
  "  curl -sS -X PATCH \"$api/issues/{{context.issueId}}\" \\",
  "    -H \"Authorization: Bearer $PAPERCLIP_API_KEY\" \\",
  "    -H \"X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID\" \\",
  "    -H \"Content-Type: application/json\" \\",
  "    --data-binary @-",
  "```",
  "",
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
].join("\n");

function renderConditionalSections(template: string, vars: Record<string, unknown>): string {
  const isTruthy = (key: string) => {
    if (key === "noTask") return !vars.taskId;
    const value = vars[key];
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  };
  return template.replace(
    /\{\{#([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, key: string, body: string) => (isTruthy(key) ? body : ""),
  );
}

export function buildPrompt(
  ctx: AdapterExecutionContext,
  config: Record<string, unknown>,
  options: { resumedSession?: boolean } = {},
): string {
  const template = cfgString(config.promptTemplate) || HERMES_DEFAULT_PROMPT_TEMPLATE;

  const context = (ctx as any).context || {};
  const taskId = cfgString(context.taskId) || cfgString(context.issueId) || cfgString(ctx.config?.taskId);
  const taskTitle = cfgString(context.taskTitle) || cfgString(ctx.config?.taskTitle) || "";
  const taskBody = cfgString(context.taskBody) || cfgString(ctx.config?.taskBody) || "";
  const commentId = cfgString(context.commentId) || cfgString(context.wakeCommentId) || cfgString(ctx.config?.commentId) || "";
  const wakeReason = cfgString(context.wakeReason) || cfgString(ctx.config?.wakeReason) || "";
  const agentName = ctx.agent?.name || "Hermes Agent";
  const companyName = cfgString(context.companyName) || cfgString(ctx.config?.companyName) || "";
  const projectName = cfgString(context.projectName) || cfgString(ctx.config?.projectName) || "";

  // Build API URL — ensure it has the /api path
  let paperclipApiUrl =
    cfgString(config.paperclipApiUrl) ||
    process.env.PAPERCLIP_API_URL ||
    "http://127.0.0.1:3101/api";
  // Ensure /api suffix
  if (!paperclipApiUrl.endsWith("/api")) {
    paperclipApiUrl = paperclipApiUrl.replace(/\/+$/, "") + "/api";
  }

  const paperclipTaskMarkdown = selectPaperclipTaskMarkdown(context, {
    resumedSession: options.resumedSession === true,
  });
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, {
    resumedSession: options.resumedSession === true,
    // The task-context markdown is the authoritative brief on this lane; keep
    // the wake prompt's description copy out so the prompt carries it once.
    suppressIssueDescription: paperclipTaskMarkdown.length > 0,
  });
  const sessionHandoffMarkdown = cfgString(context.paperclipSessionHandoffMarkdown)?.trim() || "";
  const wakePayloadJson = stringifyPaperclipWakePayload(context.paperclipWake) || "";

  const vars: Record<string, unknown> = {
    agentId: ctx.agent?.id || "",
    agentName,
    companyId: ctx.agent?.companyId || "",
    companyName,
    runId: ctx.runId || "",
    agent: ctx.agent || {},
    company: { id: ctx.agent?.companyId || "", name: companyName },
    run: { id: ctx.runId || "", source: "on_demand" },
    context,
    taskId: taskId || "",
    taskTitle,
    taskBody,
    commentId,
    wakeReason,
    projectName,
    paperclipApiUrl,
    paperclipWakePrompt: wakePrompt,
    paperclipTaskMarkdown,
    taskContext: paperclipTaskMarkdown,
    paperclipWakeJson: wakePayloadJson,
    wakePayloadJson,
    paperclipApiKeyEnv: "PAPERCLIP_API_KEY",
    paperclipRunIdEnv: "PAPERCLIP_RUN_ID",
  };

  const rendered = isPaperclipRecoveryWakePayload(context.paperclipWake)
    ? ""
    : renderTemplate(renderConditionalSections(template, vars), vars);
  return joinPromptSections([
    wakePrompt,
    sessionHandoffMarkdown,
    paperclipTaskMarkdown,
    rendered,
  ]);
}

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

/** Regex to extract session ID from Hermes quiet-mode output: "session_id: <id>" */
export const SESSION_ID_REGEX = /^session_id:\s*(\S+)/m;

/** Regex for legacy session output format */
export const SESSION_ID_REGEX_LEGACY = /session[_ ](?:id|saved)[:\\s]+([a-zA-Z0-9_-]+)/i;

/** Regex to extract token usage from Hermes output. */
export const TOKEN_USAGE_REGEX =
  /tokens?[:\\s]+(\d+)\s*(?:input|in)\\b.*?(\d+)\s*(?:output|out)\\b/i;

/** Regex to extract cost from Hermes output. */
export const COST_REGEX = /(?:cost|spent)[:\\s]*\$?([\d.]+)/i;

export interface ParsedOutput {
  sessionId?: string;
  response?: string;
  usage?: UsageSummary;
  costUsd?: number;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Response cleaning
// ---------------------------------------------------------------------------

/** Strip noise lines from a Hermes response (tool output, system messages, etc.) */
function cleanResponse(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true; // keep blank lines for paragraph separation
      if (t.startsWith("[tool]") || t.startsWith("[hermes]") || t.startsWith("[paperclip]")) return false;
      if (t.startsWith("session_id:")) return false;
      if (/^\[\d{4}-\d{2}-\d{2}T/.test(t)) return false;
      if (/^\[done\]\s*┊/.test(t)) return false;
      if (/^┊\s*[\p{Emoji_Presentation}]/u.test(t) && !/^┊\s*💬/.test(t)) return false;
      if (/^\p{Emoji_Presentation}\s*(Completed|Running|Error)?\s*$/u.test(t)) return false;
      return true;
    })
    .map((line) => {
      let t = line.replace(/^[\s]*┊\s*💬\s*/, "").trim();
      t = t.replace(/^\[done\]\s*/, "").trim();
      return t;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Error extraction
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable error summary from stderr.
 *
 * Strategy — in priority order:
 * 1. Python-style tracebacks: capture the full "Traceback (most recent call last):"
 *    block up to the exception line, so the File/line context is not lost.
 * 2. Generic error/exception lines: collect lines matching common error keywords
 *    (error, exception, traceback, failed), skipping log-level noise, capped at
 *    a reasonable number of lines.
 *
 * Returns null when no error-like content is found.
 */
function extractErrorSummary(stderr: string): string | null {
  const lines = stderr.split("\n");

  // --- 1. Python-style traceback block ----------------------------------
  // Find "Traceback (most recent call last):" and capture everything from
  // there until the actual exception line (the last line that isn't indented
  // with File/line or blank). This preserves the full stack context.
  const tracebackStart = lines.findIndex((l) =>
    /traceback/i.test(l.trim()),
  );
  if (tracebackStart >= 0) {
    // Walk forward from the traceback header to find the exception line.
    // In a Python traceback the frames are indented, and the final exception
    // line (e.g. "RuntimeError: adapter init failed") is at indent 0.
    let end = tracebackStart + 1;
    for (let i = tracebackStart + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed === "") continue; // skip blank lines between frames
      // Indented lines are continuation (File "...", line N, etc.)
      if (/^\s/.test(line)) {
        end = i;
        continue;
      }
      // Non-indented non-empty line after the traceback header: this is the
      // exception type/message line (the terminal line of the traceback).
      end = i;
      break;
    }
    const block = lines.slice(tracebackStart, end + 1).join("\n").trim();
    if (block) return block;
  }

  // --- 2. Generic error keyword lines ------------------------------------
  const errorLines = lines
    .filter((line) => /error|exception|failed/i.test(line))
    .filter((line) => !/INFO|DEBUG|warn/i.test(line.trim()));
  if (errorLines.length > 0) {
    return errorLines.slice(0, 10).join("\n").trim();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

/**
 * Parse Hermes quiet-mode output into structured fields.
 *
 * Quiet mode (-Q) emits a `session_id: <id>` metadata line alongside the
 * model response.  In Hermes 0.18.2 the ordering is not guaranteed —
 * session_id may appear on stdout before or after the response, and
 * cancelled sessions emit session_id on stderr.  The parser must:
 *
 * 1. Accept either ordering (session_id-first or response-first).
 * 2. Normalise CRLF / lone-CR line endings before any slicing.
 * 3. Strip only metadata lines (session_id, timestamps, [hermes], etc.).
 * 4. Preserve the response even when it lives on stderr (cancelled sessions).
 * 5. Retain false-green / provider-exhaustion / traceback error behaviour.
 *
 * The search for session_id spans stdout + stderr (combined), but the
 * response is extracted from whichever stream actually carries prose
 * content — not blindly from stdout alone.
 */
function parseHermesOutput(stdout: string, stderr: string): ParsedOutput {
  // Normalise CRLF early so all downstream slicing is byte-accurate.
  const normStdout = stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const normStderr = stderr.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const combined = normStdout + "\n" + normStderr;
  const result: ParsedOutput = {};

  // ── Extract session ID from combined output ──────────────────────────
  const sessionIdMatch = combined.match(SESSION_ID_REGEX);
  if (sessionIdMatch?.[1]) {
    result.sessionId = sessionIdMatch[1];
  }

  // ── Extract response ──────────────────────────────────────────────────
  //
  // Strategy: find the session_id line boundaries across the combined
  // normalised output, then take the prose that is NOT a metadata line
  // from whichever stream(s) carry it.
  //
  // We search in combined (stdout + stderr) so that cancelled sessions
  // where session_id is on stderr but the response is on stdout (or vice
  // versa) are handled correctly.

  // Remove all session_id lines from combined before extracting the response.
  // This handles both orderings and both streams.
  const responseCandidates: string[] = [];

  // stdout is the primary source of the response
  if (normStdout.trim()) {
    responseCandidates.push(normStdout);
  }
  // stderr may contain the response too (e.g. cancelled sessions where
  // the model output was written to stderr before the session_id line)
  if (normStderr.trim()) {
    responseCandidates.push(normStderr);
  }

  for (const candidate of responseCandidates) {
    // Strip the session_id line from this candidate so it doesn't
    // pollute the response text.
    const withoutSessionId = candidate.replace(/^session_id:.*$/gm, "");
    const cleaned = cleanResponse(withoutSessionId);
    if (cleaned.length > 0) {
      // Use the first non-empty cleaned response.  If stdout already
      // gave us a response, we keep that (primary).  Only fall through
      // to stderr if stdout had no usable response.
      if (result.response === undefined) {
        result.response = cleaned;
      }
    }
  }

  // ── Extract token usage ──────────────────────────────────────────────
  const usageMatch = combined.match(TOKEN_USAGE_REGEX);
  if (usageMatch) {
    result.usage = {
      inputTokens: parseInt(usageMatch[1], 10) || 0,
      outputTokens: parseInt(usageMatch[2], 10) || 0,
    };
  }

  // ── Extract cost ─────────────────────────────────────────────────────
  const costMatch = combined.match(COST_REGEX);
  if (costMatch?.[1]) {
    result.costUsd = parseFloat(costMatch[1]);
  }

  // ── Extract error summary from stderr ────────────────────────────────
  // Extract full traceback blocks rather than only keyword-matching lines,
  // so that traceback context (File "...", line N, raise/return statements)
  // is preserved alongside the exception line.
  if (normStderr.trim()) {
    const extracted = extractErrorSummary(normStderr);
    if (extracted !== null) {
      result.errorMessage = extracted;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main execute
// ---------------------------------------------------------------------------

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const config = (ctx.config ?? ctx.agent?.adapterConfig ?? {}) as Record<string, unknown>;

  // ── Resolve configuration ──────────────────────────────────────────────
  const hermesCmd = resolveHermesCommand(config);
  const model = cfgString(config.model) || DEFAULT_MODEL;
  const timeoutSec = cfgNumber(config.timeoutSec) || DEFAULT_TIMEOUT_SEC;
  const graceSec = cfgNumber(config.graceSec) || DEFAULT_GRACE_SEC;
  const maxTurns = cfgNumber(config.maxTurnsPerRun);
  const toolsets = cfgString(config.toolsets) || cfgStringArray(config.enabledToolsets)?.join(",");
  const extraArgs = cfgStringArray(config.extraArgs);
  const persistSession = cfgBoolean(config.persistSession) !== false;
  const worktreeMode = cfgBoolean(config.worktreeMode) === true;
  const checkpoints = cfgBoolean(config.checkpoints) === true;
  const prevSessionId = cfgString(
    (ctx.runtime?.sessionParams as Record<string, unknown> | null)?.sessionId,
  );

  // ── Resolve provider (defense in depth) ────────────────────────────────
  // Priority chain:
  //   1. Explicit provider in adapterConfig (user override)
  //   2. Provider from ~/.hermes/config.yaml (detected at runtime)
  //   3. Provider inferred from model name prefix
  //   4. "auto" (let Hermes decide)
  //
  // This ensures that even if the agent was created before provider tracking
  // was added, or if the model was changed without updating provider, the
  // correct provider is still used.
  let detectedConfig: Awaited<ReturnType<typeof detectModel>> | null = null;
  const explicitProvider = cfgString(config.provider);

  if (!explicitProvider) {
    try {
      detectedConfig = await detectModel();
    } catch {
      // Non-fatal — detection failure shouldn't block execution
    }
  }

  const { provider: resolvedProvider, resolvedFrom } = resolveProvider({
    explicitProvider,
    detectedProvider: detectedConfig?.provider,
    detectedModel: detectedConfig?.model,
    detectedBaseUrl: detectedConfig?.baseUrl,
    detectedHasApiKey: detectedConfig?.hasApiKey,
    detectedApiMode: detectedConfig?.apiMode,
    model,
  });

  // ── Load agent instructions file (Paperclip instruction bundles) ──────
  // Paperclip can materialize managed instructions into instructionsFilePath;
  // when present, inject that bundle into the Hermes prompt.
  const instructionsFilePath = cfgString(config.instructionsFilePath);
  let agentInstructions = "";
  if (instructionsFilePath) {
    try {
      agentInstructions = await fs.readFile(instructionsFilePath, "utf-8");
      const loadedInstructionsLength = agentInstructions.length;
      const instructionsFileDir = path.dirname(instructionsFilePath);
      agentInstructions += `\nThe above agent instructions were loaded from ${instructionsFilePath}. Resolve any relative file references from ${instructionsFileDir}/.`;
      await ctx.onLog(
        "stdout",
        `[hermes] Loaded agent instructions from ${instructionsFilePath} (${loadedInstructionsLength} chars)\n`,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Non-fatal: log to stdout with an explicit "Warning:" prefix so the
      // Paperclip UI doesn't render this as a red error (stderr output is
      // surfaced as an error signal even when execution continues).
      await ctx.onLog(
        "stdout",
        `[hermes] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }

  // ── Build prompt ───────────────────────────────────────────────────────
  let prompt = buildPrompt(ctx, config, { resumedSession: Boolean(prevSessionId) });
  if (agentInstructions) {
    prompt = agentInstructions + "\n\n---\n\n" + prompt;
  }

  // ── Build command args ─────────────────────────────────────────────────
  // Use -Q (quiet) to get clean output: just response + session_id line
  const useQuiet = cfgBoolean(config.quiet) !== false; // schema default true; explicit false is supported
  const args: string[] = ["chat", "-q", prompt];
  if (useQuiet) args.push("-Q");

  // `auto` is an adapter sentinel: omitting -m lets Hermes resolve its configured model.
  if (model !== "auto") {
    args.push("-m", model);
  }

  // Always pass --provider when we have a resolved one (not "auto").
  // "auto" means Hermes will decide on its own — no need to pass it.
  if (resolvedProvider !== "auto") {
    args.push("--provider", resolvedProvider);
  }

  if (toolsets) {
    args.push("-t", toolsets);
  }

  if (maxTurns && maxTurns > 0) {
    args.push("--max-turns", String(maxTurns));
  }

  if (worktreeMode) args.push("-w");
  if (checkpoints) args.push("--checkpoints");
  if (cfgBoolean(config.verbose) === true) args.push("-v");

  // Tag sessions as "tool" source so they don't clutter the user's session history.
  // Requires hermes-agent >= PR #3255 (feat/session-source-tag).
  args.push("--source", "tool");

  // Bypass Hermes dangerous-command approval prompts.
  // Paperclip agents run as non-interactive subprocesses with no TTY,
  // so approval prompts would always timeout and deny legitimate commands
  // (curl, python3 -c, etc.). Agents operate in a sandbox — the approval
  // system is designed for human-attended interactive sessions.
  args.push("--yolo");

  if (persistSession && prevSessionId) {
    args.push("--resume", prevSessionId);
  }

  if (extraArgs?.length) {
    args.push(...extraArgs);
  }

  // ── Build environment ──────────────────────────────────────────────────
  const userEnv = config.env as Record<string, string> | undefined;
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...(userEnv && typeof userEnv === "object" ? userEnv : {}),
    ...buildPaperclipEnv(ctx.agent),
  };

  if (ctx.runId) env.PAPERCLIP_RUN_ID = ctx.runId;

  // PAPERCLIP_API_KEY is never accepted from config — the harness-minted run
  // token is the only source of Paperclip API identity.
  delete env.PAPERCLIP_API_KEY;
  if ((ctx as any).authToken) env.PAPERCLIP_API_KEY = (ctx as any).authToken;

  // BUG FIX: Read task context from ctx.context (wake context), not ctx.config (adapter config)
  const ctxContext = (ctx as any).context || {};
  const envTaskId = cfgString(ctxContext.taskId) || cfgString(ctxContext.issueId) || cfgString(ctx.config?.taskId);
  if (envTaskId) env.PAPERCLIP_TASK_ID = envTaskId;
  const envWakeReason = cfgString(ctxContext.wakeReason) || cfgString(ctx.config?.wakeReason);
  if (envWakeReason) env.PAPERCLIP_WAKE_REASON = envWakeReason;
  const envCommentId = cfgString(ctxContext.commentId) || cfgString(ctxContext.wakeCommentId) || cfgString(ctx.config?.commentId);
  if (envCommentId) env.PAPERCLIP_WAKE_COMMENT_ID = envCommentId;
  const wakePayloadJson = stringifyPaperclipWakePayload(ctxContext.paperclipWake);
  if (wakePayloadJson) env.PAPERCLIP_WAKE_PAYLOAD_JSON = wakePayloadJson;

  // ── Resolve working directory ──────────────────────────────────────────
  const cwd =
    cfgString(config.cwd) || cfgString(ctx.config?.workspaceDir) || ".";
  try {
    await ensureAbsoluteDirectory(cwd);
  } catch {
    // Non-fatal
  }

  // ── Log start ──────────────────────────────────────────────────────────
  await ctx.onLog(
    "stdout",
    `[hermes] Starting Hermes Agent (model=${model}, provider=${resolvedProvider} [${resolvedFrom}], timeout=${timeoutSec}s${maxTurns ? `, max_turns=${maxTurns}` : ""})\n`,
  );
  if (prevSessionId) {
    await ctx.onLog(
      "stdout",
      `[hermes] Resuming session: ${prevSessionId}\n`,
    );
  }

  // ── Execute ────────────────────────────────────────────────────────────
  // Hermes writes non-error noise to stderr (MCP init, INFO logs, etc).
  // Paperclip renders all stderr as red/error in the UI.
  // Wrap onLog to reclassify benign stderr lines as stdout.
  const wrappedOnLog = async (stream: "stdout" | "stderr", chunk: string) => {
    if (stream === "stderr") {
      const trimmed = chunk.trimEnd();
      // Benign patterns that should NOT appear as errors:
      // - Structured log lines: [timestamp] INFO/DEBUG/WARN: ...
      // - MCP server registration messages
      // - Python import/site noise
      const isBenign = /^\[?\d{4}[-/]\d{2}[-/]\d{2}T/.test(trimmed) || // structured timestamps
        /^[A-Z]+:\s+(INFO|DEBUG|WARN|WARNING)\b/.test(trimmed) || // log levels
        /Successfully registered all tools/.test(trimmed) ||
        /MCP [Ss]erver/.test(trimmed) ||
        /tool registered successfully/.test(trimmed) ||
        /Application initialized/.test(trimmed);
      if (isBenign) {
        return ctx.onLog("stdout", chunk);
      }
    }
    return ctx.onLog(stream, chunk);
  };

  const result = await runChildProcess(ctx.runId, hermesCmd, args, {
    cwd,
    env,
    timeoutSec,
    graceSec,
    onLog: wrappedOnLog,
    onSpawn: ctx.onSpawn,
  });

  // ── Parse output ───────────────────────────────────────────────────────
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const parsed = parseHermesOutput(stdout, stderr);
  const combinedOutput = `${stdout}\n${stderr}`;

  // ── Verify current-result footer for cataloged models ──────────────────
  //
  // When the configured model is an exact catalog entry (e.g. "gemini-3.1-pro-preview"),
  // the adapter requires a structured current-result footer in the Hermes output
  // that proves the exact model was used.  This is the model-catalog authentication
  // gate: the footer's model field must EXACTLY match the catalog entry — never
  // a substring match.
  //
  // When the model is "auto" or not in the catalog, footer verification is skipped
  // (Hermes resolves the model at runtime and there is no catalog entry to authenticate).
  let footerModelVerified: ModelCatalogEntry | null = null;
  let footerAuthError: string | null = null;
  const catalogEntry = authenticateModel(model);
  if (catalogEntry !== null) {
    const footerResult = parseCurrentResultFooter(combinedOutput);

    if (footerResult.malformed) {
      await ctx.onLog(
        "stderr",
        `[hermes] Model catalog gate FAILED: malformed current-result footer. ${footerResult.error}\n`,
      );
      // Surface as an error condition but don't override a successful exit code
      // — the footer gate is an authentication signal, not an execution failure.
      footerAuthError = footerResult.error ?? "Malformed footer.";
    } else if (footerResult.footer === null) {
      await ctx.onLog(
        "stderr",
        `[hermes] Model catalog gate WARNING: no current-result footer found for cataloged model "${model}". Model not proven by footer authentication.\n`,
      );
      footerAuthError = `No current-result footer found for cataloged model "${model}".`;
    } else if (!footerResult.footer.authenticated) {
      await ctx.onLog(
        "stderr",
        `[hermes] Model catalog gate FAILED: footer model "${footerResult.footer.model}" did not match catalog entry "${catalogEntry.id}". ${footerResult.error}\n`,
      );
      footerAuthError = footerResult.error ?? "Footer model authentication failed.";
    } else {
      footerModelVerified = footerResult.footer.catalogEntry;
      await ctx.onLog(
        "stdout",
        `[hermes] Model catalog gate PASSED: footer proves exact model "${footerResult.footer.model}" (provider=${footerResult.footer.provider ?? "unset"}, tier=${catalogEntry.tier ?? "default"}).\n`,
      );
    }
  }

  // Older Hermes releases can return 0 after exhausting every provider. Require
  // the complete terminal envelope so ordinary HTTP-error prose stays successful.
  const terminalProviderExhaustion =
    /API call failed \(attempt \d+\/\d+\)/i.test(combinedOutput) &&
    /model [\s\x27"]*auto[\s\x27"]* is not supported[^\n]*Codex provider/i.test(combinedOutput) &&
    /fallback provider[^\n]*failed[^\n]*(?:HTTP 401 Unauthorized|non-retryable client error)/i.test(combinedOutput) &&
    /(?:all fallback providers failed|no providers remain)/i.test(combinedOutput) &&
    /Resume this session with:/i.test(combinedOutput);
  const effectiveExitCode = result.exitCode === 0 && terminalProviderExhaustion ? 1 : result.exitCode;
  if (terminalProviderExhaustion) {
    parsed.errorMessage = "Provider fallback exhaustion prevented Hermes from completing the request.";
  }

  await ctx.onLog(
    "stdout",
    `[hermes] Exit code: ${effectiveExitCode ?? "null"}, timed out: ${result.timedOut}\n`,
  );
  if (parsed.sessionId) {
    await ctx.onLog("stdout", `[hermes] Session: ${parsed.sessionId}\n`);
  }

  // ── Build result ───────────────────────────────────────────────────────
  const executionResult: AdapterExecutionResult = {
    exitCode: effectiveExitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    provider: resolvedProvider,
    model,
  };

  if (parsed.errorMessage) {
    executionResult.errorMessage = parsed.errorMessage;
  }
  if (footerAuthError) {
    // Append footer auth failure to any existing error message
    executionResult.errorMessage = executionResult.errorMessage
      ? `${executionResult.errorMessage}; Footer auth: ${footerAuthError}`
      : `Footer auth: ${footerAuthError}`;
  }

  if (parsed.usage) {
    executionResult.usage = parsed.usage;
  }

  if (parsed.costUsd !== undefined) {
    executionResult.costUsd = parsed.costUsd;
  }

  // Summary from agent response
  if (parsed.response) {
    executionResult.summary = parsed.response.slice(0, 2000);
  }

  // Set resultJson so Paperclip can persist run metadata (used for UI display + auto-comments)
  executionResult.resultJson = {
    result: parsed.response || "",
    session_id: parsed.sessionId || null,
    usage: parsed.usage || null,
    cost_usd: parsed.costUsd ?? null,
    footer_error: footerAuthError,
    footer_model_verified: footerModelVerified ? footerModelVerified.id : null,
  };

  // Store session ID for next run
  if (persistSession && parsed.sessionId) {
    executionResult.sessionParams = { sessionId: parsed.sessionId };
    executionResult.sessionDisplayId = parsed.sessionId.slice(0, 16);
  }

  return executionResult;
}
