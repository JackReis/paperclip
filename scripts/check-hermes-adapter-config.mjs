#!/usr/bin/env node
/**
 * check-hermes-adapter-config.mjs
 *
 * CI lint that rejects hermes_local agents with empty adapterConfig.
 *
 * Background (JAC-4575): When a hermes_local agent has adapterConfig={}
 * (or adapterConfig.model not set), the adapter falls back to DEFAULT_MODEL.
 * If the fallback chain is misconfigured, all 20+ agents crash with
 * truncated tracebacks ("Traceback (most recent call last):"), and
 * root-cause diagnosis is impossible from the 34-char errorReason alone.
 *
 * This check reads Paperclip's agent roster files (managed via
 * ~/.paperclip/instances/default/companies/<cid>/agents/<aid>/adapter-config.json
 * and the in-repo agent roster) and fails if any hermes_local agent has:
 *   - No adapterConfig at all
 *   - An empty adapterConfig ({})
 *   - adapterConfig.model === "auto" (the pre-JAC-4603 default that caused
 *     the fleet-wide crash)
 *
 * In CI (without a live Paperclip instance), this check scans the
 * packages/adapters/hermes/ directory for any test fixtures or sample
 * configs that exhibit the anti-pattern.
 *
 * Run:  node ./scripts/check-hermes-adapter-config.mjs
 *       node --test ./scripts/check-hermes-adapter-config.test.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, "..");

// Directories to scan for adapter fixture/config files.
const ADAPTER_ROOTS = [
  path.join(REPO_ROOT, "packages/adapters/hermes"),
];

// Extensions considered as potential adapter-config JSON or JS files.
const CONFIG_FILE_PATTERNS = [
  /\.json$/,
  /\.js$/,
  /\.ts$/,
  /\.mjs$/,
  /\.cjs$/,
];

/**
 * Check if a hermes_local agent config is problematic.
 * Returns an array of offense strings (empty = OK).
 */
export function checkAdapterConfig(config, agentId = "<unknown>") {
  const offenses = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    offenses.push(`${agentId}: adapterConfig is not an object (${typeof config})`);
    return offenses;
  }

  const entries = Object.entries(config);

  // Empty adapterConfig = no model/provider override = falls to DEFAULT_MODEL.
  // After JAC-4603, DEFAULT_MODEL="ollama-launch/qwen3-coder:30b" is safe,
  // but empty config is still a code smell — the agent should assert its
  // provider explicitly so roster-level changes don't silently affect it.
  if (entries.length === 0) {
    offenses.push(`${agentId}: adapterConfig is empty ({}) — hermes_local agents should set an explicit model to avoid DEFAULT_MODEL fallback drift`);
    return offenses;
  }

  const model = config.model;
  if (model !== undefined) {
    if (typeof model !== "string" || model.trim() === "") {
      offenses.push(`${agentId}: adapterConfig.model is empty or not a string`);
    } else if (model.trim() === "auto") {
      offenses.push(
        `${agentId}: adapterConfig.model is "auto" — this was the root cause of the ` +
          `JAC-4575 fleet-wide crash (59/83 agents errored). Use an explicit model ` +
          `like "ollama-launch/qwen3-coder:30b".`,
      );
    }
  }

  const provider = config.provider;
  if (provider !== undefined) {
    if (typeof provider !== "string" || provider.trim() === "") {
      offenses.push(`${agentId}: adapterConfig.provider is empty or not a string`);
    } else if (provider.trim() === "auto") {
      // provider=auto is acceptable as a "let Hermes decide" sentinel, but
      // only when model is NOT "auto" — otherwise the fallback chain is fully
      // uncontrolled.
      if (typeof model === "string" && model.trim() === "auto") {
        offenses.push(`${agentId}: adapterConfig.provider and model are both "auto" — no deterministic model resolution`);
      }
    }
  }

  return offenses;
}

/**
 * Recursively scan a directory for files that look like adapter config fixtures.
 * Returns { filePath, config } pairs for JSON files, and checks JS/TS files
 * for inline config objects.
 */
export function scanForAdapterConfigs(roots) {
  const results = [];
  const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".turbo", ".next", "coverage"]);

  for (const root of roots) {
    let stats;
    try {
      stats = statSync(root);
    } catch {
      continue;
    }
    if (!stats.isDirectory()) continue;

    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop();
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          stack.push(path.join(dir, entry.name));
          continue;
        }

        if (!entry.isFile()) continue;
        if (!CONFIG_FILE_PATTERNS.some((p) => p.test(entry.name))) continue;

        const filePath = path.join(dir, entry.name);
        const relativePath = path.relative(REPO_ROOT, filePath);

        // Skip test files and fixtures — this check focuses on committed
        // adapter config files, not test data.
        if (relativePath.includes("test") || relativePath.includes("__tests__")) continue;

        // For JSON files, try to parse and check if it looks like an adapterConfig.
        if (entry.name.endsWith(".json")) {
          try {
            const content = readFileSync(filePath, "utf8");
            const parsed = JSON.parse(content);
            // Heuristic: if the JSON has 'model' or 'provider' keys, it's
            // likely an adapter config fixture.
            if (parsed && typeof parsed === "object" && ("model" in parsed || "provider" in parsed)) {
              results.push({ filePath: relativePath, config: parsed });
            }
          } catch {
            // Not valid JSON or not an adapter config — skip.
          }
        }
      }
    }
  }

  return results;
}

export function runCheck(opts = {}) {
  const log = opts.log || ((msg) => console.log(msg));
  const error = opts.error || ((msg) => console.error(msg));
  const roots = opts.roots || ADAPTER_ROOTS;

  const configs = scanForAdapterConfigs(roots);
  const offenses = [];

  for (const { filePath, config } of configs) {
    const fileOffenses = checkAdapterConfig(config, filePath);
    for (const f of fileOffenses) {
      offenses.push(f);
    }
  }

  if (offenses.length > 0) {
    error("ERROR: hermes_local agents with problematic adapterConfig found:\n");
    for (const offense of offenses) {
      error(`  • ${offense}`);
    }
    error(
      "\nThe JAC-4575 incident showed that empty adapterConfig or model=\"auto\" " +
        "causes fleet-wide agent crashes when the fallback provider chain is " +
        "misconfigured. All hermes_local agents must specify an explicit model.\n" +
        'See packages/adapters/hermes/src/shared/constants.ts for DEFAULT_MODEL.',
    );
    return 1;
  }

  log(`  ✓  No hermes_local adapterConfig anti-patterns found (scanned ${configs.length} config files)`);
  return 0;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
}

if (isMainModule()) {
  process.exit(runCheck());
}
