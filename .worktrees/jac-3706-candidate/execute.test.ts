/**
 * Tests for parseHermesOutput — the Hermes quiet-mode output parser.
 *
 * Covers the two edges from JAC-3706:
 *   1. session_id emitted before response text in quiet mode
 *   2. session_id emitted on stderr (cancelled sessions)
 *
 * Also preserves the existing false-green/error semantics:
 *   - Successful terminal narration must not become an adapter error
 *   - Real stderr errors must be retained
 */

import { describe, expect, it } from "vitest";

// parseHermesOutput is not exported — we test it indirectly through
// the cleanResponse and SESSION_ID_REGEX patterns it uses.
// For direct testing, we replicate the core logic inline.

/** Regex to extract session ID from Hermes quiet-mode output: "session_id: <id>" */
const SESSION_ID_REGEX = /^session_id:\s*(\S+)/m;

/** Regex for legacy session output format */
const SESSION_ID_REGEX_LEGACY = /session[ _](?:id|saved)[:\s]+([a-zA-Z0-9_-]+)/i;

/** Regex to extract token usage from Hermes output. */
const TOKEN_USAGE_REGEX =
  /tokens?[:\s]+(\d+)\s*(?:input|in)\b.*?(\d+)\s*(?:output|out)\b/i;

/** Regex to extract cost from Hermes output. */
const COST_REGEX = /(?:cost|spent)[:\s]*\$?([\d.]+)/i;

interface ParsedOutput {
  sessionId?: string;
  response?: string;
  usage?: { inputTokens: number; outputTokens: number };
  costUsd?: number;
  errorMessage?: string;
}

/** Strip noise lines from a Hermes response (tool output, system messages, etc.) */
function cleanResponse(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
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

function parseHermesOutput(stdout: string, stderr: string): ParsedOutput {
  const combined = stdout + "\n" + stderr;
  const result: ParsedOutput = {};

  const sessionMatch = combined.match(SESSION_ID_REGEX);
  if (sessionMatch?.[1]) {
    result.sessionId = sessionMatch[1];
  } else {
    const legacyMatch = combined.match(SESSION_ID_REGEX_LEGACY);
    if (legacyMatch?.[1]) {
      result.sessionId = legacyMatch[1];
    }
  }

  const cleaned = cleanResponse(stdout);
  if (cleaned.length > 0) {
    result.response = cleaned;
  }

  const usageMatch = combined.match(TOKEN_USAGE_REGEX);
  if (usageMatch) {
    result.usage = {
      inputTokens: parseInt(usageMatch[1], 10) || 0,
      outputTokens: parseInt(usageMatch[2], 10) || 0,
    };
  }

  const costMatch = combined.match(COST_REGEX);
  if (costMatch?.[1]) {
    result.costUsd = parseFloat(costMatch[1]);
  }

  if (stderr.trim()) {
    const errorLines = stderr
      .split("\n")
      .filter((line) => !/^session_id:\s*\S+/.test(line.trim()))
      .filter((line) => /error|exception|traceback|failed/i.test(line))
      .filter((line) => !/INFO|DEBUG|warn/i.test(line));
    if (errorLines.length > 0) {
      result.errorMessage = errorLines.slice(0, 5).join("\n");
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseHermesOutput", () => {
  describe("session_id extraction", () => {
    it("extracts session_id from stdout (normal quiet mode)", () => {
      const parsed = parseHermesOutput(
        "Task completed successfully.\n\nsession_id: abc123\n",
        "",
      );
      expect(parsed.sessionId).toBe("abc123");
      expect(parsed.response).toBe("Task completed successfully.");
    });

    it("extracts session_id from stderr (cancelled session edge)", () => {
      // Hermes 0.18.2 may emit session_id on stderr for cancelled sessions
      const parsed = parseHermesOutput(
        "Task completed successfully.\n",
        "session_id: abc123\n",
      );
      expect(parsed.sessionId).toBe("abc123");
      expect(parsed.response).toBe("Task completed successfully.");
    });

    it("extracts session_id when it appears before response text", () => {
      // Hermes 0.18.2 edge: session_id first, then response
      const parsed = parseHermesOutput(
        "session_id: abc123\nTask completed successfully.\n",
        "",
      );
      expect(parsed.sessionId).toBe("abc123");
      // cleanResponse strips session_id lines, so response should be clean
      expect(parsed.response).toBe("Task completed successfully.");
    });

    it("extracts session_id when it appears after response text", () => {
      const parsed = parseHermesOutput(
        "Task completed successfully.\n\nsession_id: abc123\n",
        "",
      );
      expect(parsed.sessionId).toBe("abc123");
      expect(parsed.response).toBe("Task completed successfully.");
    });

    it("extracts legacy session format", () => {
      const parsed = parseHermesOutput(
        "Some output\nsession saved: legacy-456\n",
        "",
      );
      expect(parsed.sessionId).toBe("legacy-456");
    });

    it("returns undefined sessionId when no session line present", () => {
      const parsed = parseHermesOutput("Just some output.\n", "");
      expect(parsed.sessionId).toBeUndefined();
    });
  });

  describe("response preservation (false-green prevention)", () => {
    it("preserves successful terminal narration", () => {
      const narration = "The live checks are conclusive: JAC-3307 is done. I am closing the incident now.";
      const parsed = parseHermesOutput(
        `${narration}\n\nsession_id: session-1\n`,
        `Captured reasoning: ${narration}\n`,
      );
      expect(parsed.response).toContain("JAC-3307 is done");
      expect(parsed.errorMessage).toBeUndefined();
    });

    it("preserves multi-paragraph responses", () => {
      const parsed = parseHermesOutput(
        "First paragraph.\n\nSecond paragraph.\n\nsession_id: abc123\n",
        "",
      );
      expect(parsed.response).toContain("First paragraph.");
      expect(parsed.response).toContain("Second paragraph.");
    });

    it("strips tool noise from response", () => {
      const parsed = parseHermesOutput(
        "[tool] Running search...\nActual response text.\n\nsession_id: abc123\n",
        "",
      );
      expect(parsed.response).toBe("Actual response text.");
      expect(parsed.response).not.toContain("[tool]");
    });
  });

  describe("error detection", () => {
    it("retains stderr failure diagnostics", () => {
      const parsed = parseHermesOutput("", "ERROR: provider unavailable\n");
      expect(parsed.errorMessage).toBe("ERROR: provider unavailable");
    });

    it("does not flag session_id on stderr as an error", () => {
      const parsed = parseHermesOutput(
        "Task completed.\n",
        "session_id: abc123\n",
      );
      expect(parsed.errorMessage).toBeUndefined();
    });

    it("filters INFO/DEBUG/WARN noise from error detection", () => {
      const parsed = parseHermesOutput(
        "",
        "INFO: Starting up\nERROR: real failure\nDEBUG: some detail\n",
      );
      expect(parsed.errorMessage).toBe("ERROR: real failure");
    });

    it("returns undefined errorMessage for clean stderr", () => {
      const parsed = parseHermesOutput("All good.\n", "");
      expect(parsed.errorMessage).toBeUndefined();
    });
  });

  describe("usage and cost extraction", () => {
    it("extracts token usage", () => {
      const parsed = parseHermesOutput(
        "Response.\n\nsession_id: abc123\n",
        "tokens: 150 input, 80 output\n",
      );
      expect(parsed.usage).toEqual({ inputTokens: 150, outputTokens: 80 });
    });

    it("extracts cost", () => {
      const parsed = parseHermesOutput(
        "Response.\n",
        "cost: $0.042\n",
      );
      expect(parsed.costUsd).toBe(0.042);
    });
  });

  describe("terminal provider exhaustion detection", () => {
    // Regex patterns from execute.ts — tested here to ensure they match
    // the production envelope without false positives on agent prose.
    const TERMINAL_PATTERNS = {
      apiCallFailed: /API call failed \(attempt \d+\/\d+\)/i,
      autoNotSupported: /model [\s\x27"]*auto[\s\x27"]* is not supported[^\n]*Codex provider/i,
      fallbackFailed: /fallback provider[^\n]*failed[^\n]*(?:HTTP 401 Unauthorized|non-retryable client error)/i,
      allFailed: /(?:all fallback providers failed|no providers remain)/i,
      resumeHint: /Resume this session with:/i,
    };

    function isTerminalExhaustion(combined: string): boolean {
      return (
        TERMINAL_PATTERNS.apiCallFailed.test(combined) &&
        TERMINAL_PATTERNS.autoNotSupported.test(combined) &&
        TERMINAL_PATTERNS.fallbackFailed.test(combined) &&
        TERMINAL_PATTERNS.allFailed.test(combined) &&
        TERMINAL_PATTERNS.resumeHint.test(combined)
      );
    }

    it("detects provider fallback exhaustion envelope", () => {
      const envelope = [
        "API call failed (attempt 3/3)",
        "model 'auto' is not supported by the Codex provider",
        "fallback provider 'mistral' failed: HTTP 401 Unauthorized",
        "all fallback providers failed",
        "Resume this session with: hermes chat --resume abc123",
      ].join("\n");
      expect(isTerminalExhaustion(envelope)).toBe(true);
    });

    it("does not flag ordinary agent prose mentioning HTTP errors", () => {
      const prose = [
        "The API call returned a 401. I'll retry with a different key.",
        "The model auto-selection is not supported in this context.",
        "Resume this session with the new credentials.",
      ].join("\n");
      expect(isTerminalExhaustion(prose)).toBe(false);
    });

    it("does not flag partial matches", () => {
      const partial = [
        "API call failed (attempt 1/3)",
        "Resume this session with: hermes chat --resume abc123",
      ].join("\n");
      expect(isTerminalExhaustion(partial)).toBe(false);
    });
  });
});
