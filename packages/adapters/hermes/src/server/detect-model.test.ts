import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";

import { parseModelFromConfig, resolveProvider } from "./detect-model.js";
import { testEnvironment } from "./test.js";

const providerEnvKeys = [
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ZAI_API_KEY",
  "KIMI_API_KEY",
  "MINIMAX_API_KEY",
];

const previousEnv = {
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  HOMEDRIVE: process.env.HOMEDRIVE,
  HOMEPATH: process.env.HOMEPATH,
  ...Object.fromEntries(providerEnvKeys.map((key) => [key, process.env[key]])),
};

afterEach(async () => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("parseModelFromConfig tracks api_key presence without exposing the raw secret", () => {
  const parsed = parseModelFromConfig([
    "model:",
    "  default: oca/gpt-5.4",
    "  provider: custom",
    "  base_url: https://example.invalid/litellm",
    "  api_key: super-secret-value",
    "",
  ].join("\n"));

  expect(parsed).toBeTruthy();
  expect(parsed?.hasApiKey).toBe(true);
  expect(Object.hasOwn(parsed ?? {}, "apiKey")).toBe(false);
});

test("resolveProvider does not fall through to model inference when Hermes config provider is unsupported but matches the requested model", () => {
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: "custom",
    detectedModel: "oca/gpt-5.4",
    detectedBaseUrl: "https://example.invalid/litellm",
    detectedHasApiKey: true,
    model: "oca/gpt-5.4",
  })).toEqual({
    provider: "auto",
    resolvedFrom: "hermesConfigUnsupported:custom",
  });
});

test("resolveProvider also defers to Hermes runtime when the matching config omits provider but includes runtime signals", () => {
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: "",
    detectedModel: "oca/gpt-5.4",
    detectedBaseUrl: "https://example.invalid/litellm",
    detectedHasApiKey: true,
    model: "oca/gpt-5.4",
  })).toEqual({
    provider: "auto",
    resolvedFrom: "hermesConfigRuntime",
  });
});

test("resolveProvider still infers from the requested model when Hermes config is for a different model", () => {
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: "custom",
    detectedModel: "oca/gpt-5.4",
    detectedBaseUrl: "https://example.invalid/litellm",
    detectedHasApiKey: true,
    model: "claude-sonnet-4",
  })).toEqual({
    provider: "anthropic",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider extracts explicit provider prefix from model name (e.g. ollama-launch/qwen3-coder:30b)", () => {
  // When the model name includes a recognized provider prefix like
  // "ollama-launch/qwen3-coder:30b", the adapter should use that provider
  // instead of stripping it and falling back to "auto" (which would route
  // to Hermes's config-default provider — openrouter — and get a 404).
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: undefined,
    detectedModel: undefined,
    model: "ollama-launch/qwen3-coder:30b",
  })).toEqual({
    provider: "ollama-launch",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider extracts explicit provider prefix for huggingface models", () => {
  expect(resolveProvider({
    explicitProvider: undefined,
    model: "huggingface/org/model-name",
  })).toEqual({
    provider: "huggingface",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider falls back to prefix inference for bare qwen model names", () => {
  // A bare "qwen3-coder:30b" without a provider prefix resolves to "auto"
  // via the qwen → auto hint. This preserves backward compatibility for
  // cloud-hosted qwen models — the provider prefix must be explicit
  // (e.g. "ollama-launch/qwen3-coder:30b") for local Ollama routing.
  expect(resolveProvider({
    explicitProvider: undefined,
    model: "qwen3-coder:30b",
  })).toEqual({
    provider: "auto",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider handles mixed-case provider prefix in model name", () => {
  expect(resolveProvider({
    explicitProvider: undefined,
    model: "Ollama-Launch/qwen3-coder:30b",
  })).toEqual({
    provider: "ollama-launch",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider resolves ollama-launch/qwen3-coder:30b even when Hermes config has a different model+provider (JAC-4608)", () => {
  // JAC-4608: When NOUS_API_KEY is absent, the Hermes config may have
  // model.default=poolside/laguna-s-2.1:free with provider=openrouter.
  // The adapter uses DEFAULT_MODEL="ollama-launch/qwen3-coder:30b".
  // Since the config model doesn't match the requested model, resolveProvider
  // must NOT use the config's openrouter provider. Instead it should infer
  // "ollama-launch" from the model-name prefix, routing to local Ollama :11434
  // instead of hitting OpenRouter (404).
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: "openrouter",
    detectedModel: "poolside/laguna-s-2.1:free",
    model: "ollama-launch/qwen3-coder:30b",
  })).toEqual({
    provider: "ollama-launch",
    resolvedFrom: "modelInference",
  });
});

test("resolveProvider prefers ollama-launch prefix over a matching Hermes config provider", () => {
  // Even when the config model matches, if the requested model name
  // contains an explicit ollama-launch provider prefix AND the config
  // provider is openrouter, the prefix should win to avoid OpenRouter 404s.
  // This tests that the model name with ollama-launch prefix is distinct
  // from a config that has the same base model under openrouter.
  expect(resolveProvider({
    explicitProvider: undefined,
    detectedProvider: "openrouter",
    detectedModel: "openrouter/qwen3-coder:30b",
    model: "ollama-launch/qwen3-coder:30b",
  })).toEqual({
    provider: "ollama-launch",
    resolvedFrom: "modelInference",
  });
});

async function withHermesHomeConfig(
  configLines: string[],
  fn: (hermesCommand: string) => Promise<void>,
) {
  const tempHome = await mkdtemp(join(tmpdir(), "hermes-paperclip-adapter-"));
  const hermesDir = join(tempHome, ".hermes");
  const configPath = join(hermesDir, "config.yaml");
  const binDir = join(tempHome, "bin");
  const hermesCommand = join(binDir, "hermes");
  const siblingPython = join(binDir, "python3");

  await mkdir(hermesDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await writeFile(configPath, `${configLines.join("\n")}\n`, "utf8");
  await writeFile(hermesCommand, "#!/bin/sh\necho Hermes Agent test\n", "utf8");
  await writeFile(siblingPython, "#!/bin/sh\necho Python 3.11.15\n", "utf8");
  await chmod(hermesCommand, 0o755);
  await chmod(siblingPython, 0o755);
  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;
  delete process.env.HOMEDRIVE;
  delete process.env.HOMEPATH;
  for (const key of providerEnvKeys) {
    delete process.env[key];
  }

  try {
    await fn(hermesCommand);
  } finally {
    await rm(tempHome, { recursive: true, force: true });
  }
}

test("testEnvironment does not warn about missing API keys when Hermes config provides a supported provider api_key", async () => {
  await withHermesHomeConfig([
    "model:",
    "  default: openrouter/gpt-4.1-mini",
    "  provider: openrouter",
    "  api_key: test-secret",
  ], async (hermesCommand) => {
    const result = await testEnvironment({
      companyId: "company-test",
      adapterType: "hermes_local",
      config: {
        hermesCommand,
        model: "openrouter/gpt-4.1-mini",
      },
    });

    const codes = result.checks.map((check) => check.code);

    expect(codes.includes("hermes_no_api_keys")).toBe(false);
    expect(result.status).toBe("pass");
  });
});

test("testEnvironment describes provider-omitted runtime config without inventing provider auto", async () => {
  await withHermesHomeConfig([
    "model:",
    "  default: oca/gpt-5.4",
    "  base_url: https://example.invalid/litellm",
    "  api_key: test-secret",
  ], async (hermesCommand) => {
    const result = await testEnvironment({
      companyId: "company-test",
      adapterType: "hermes_local",
      config: {
        hermesCommand,
        model: "oca/gpt-5.4",
      },
    });

    const apiKeyCheck = result.checks.find((check) => check.code === "hermes_api_key_in_config");
    expect(apiKeyCheck).toBeTruthy();
    expect(apiKeyCheck?.message).toMatch(/without an explicit provider/i);
    expect(apiKeyCheck?.message).not.toMatch(/provider "auto"/i);
  });
});

test("testEnvironment does not warn about missing API keys when Hermes config provides a custom provider base_url and api_key", async () => {
  await withHermesHomeConfig([
    "model:",
    "  default: oca/gpt-5.4",
    "  provider: custom",
    "  base_url: https://example.invalid/litellm",
    "  api_key: test-secret",
  ], async (hermesCommand) => {
    const result = await testEnvironment({
      companyId: "company-test",
      adapterType: "hermes_local",
      config: {
        hermesCommand,
        model: "oca/gpt-5.4",
      },
    });

    const codes = result.checks.map((check) => check.code);

    expect(codes.includes("hermes_no_api_keys")).toBe(false);
    expect(result.status).toBe("pass");
  });
});
