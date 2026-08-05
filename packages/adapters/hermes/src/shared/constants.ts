/**
 * Shared constants for the Hermes Agent adapter.
 */

/** Adapter type identifier registered with Paperclip. */
export const ADAPTER_TYPE = "hermes_local";

/** Human-readable label shown in the Paperclip UI. */
export const ADAPTER_LABEL = "Hermes Agent";

/** Default CLI binary name. */
export const HERMES_CLI = "hermes";

/** Default timeout for a single execution run (seconds). */
export const DEFAULT_TIMEOUT_SEC = 1800;

/** Grace period after SIGTERM before SIGKILL (seconds). */
export const DEFAULT_GRACE_SEC = 10;

/**
 * Default model to use if none specified in adapterConfig.
 *
 * Set to "openrouter/poolside/laguna-s-2.1:free" so that hermes_local
 * agents with empty adapterConfig (the fleet-wide default) resolve to a
 * model on a provider whose API key is known to be valid — OpenRouter.
 *
 * The "openrouter/" prefix is a recognized VALID_PROVIDERS entry, so
 * inferProviderFromModel() extracts it directly and the adapter passes
 * both `-m openrouter/poolside/laguna-s-2.1:free` and
 * `--provider openrouter` to the Hermes CLI. The CLI normalizes the
 * "openrouter/" model-name prefix at runtime (same path that strips
 * "openai/" etc.), yielding the bare model name expected by the API.
 *
 * Previous value "ollama-launch/qwen3-coder:30b" was a JAC-4603 stopgap
 * that routed through provider=nous (from config.yaml fallback) because
 * the Hermes CLI does not recognize "ollama-launch" as a provider alias
 * — producing truncated tracebacks and server disconnects (RemoteProtocolError).
 * The NOUS_API_KEY in the active fleet profile is also invalid (401), so
 * any fallback to provider=nous is a dead end. OpenRouter is verified
 * working with OPENROUTER_API_KEY present in ~/.hermes/.env.
 */
export const DEFAULT_MODEL = "openrouter/poolside/laguna-s-2.1:free";

/**
 * Valid --provider choices for the hermes CLI.
 * Must stay in sync with `hermes chat --help`.
 */
export const VALID_PROVIDERS = [
  "auto",
  "openrouter",
  "nous",
  "openai-codex",
  "copilot",
  "copilot-acp",
  "anthropic",
  "huggingface",
  "zai",
  "kimi-coding",
  "minimax",
  "minimax-cn",
  "kilocode",
  "ollama-cloud",
] as const;

/**
 * Model-name prefix → provider hint mapping.
 * Used when no explicit provider is configured and we need to infer
 * the correct provider from the model string alone.
 *
 * Keys are lowercased prefix patterns; values must be valid provider names.
 * Longer prefixes are matched first (order matters).
 */
export const MODEL_PREFIX_PROVIDER_HINTS: [string, string][] = [
  // OpenAI-native models
  ["gpt-4", "openai-codex"],
  ["gpt-5", "copilot"],
  ["o1-", "openai-codex"],
  ["o3-", "openai-codex"],
  ["o4-", "openai-codex"],
  // Anthropic models
  ["claude", "anthropic"],
  // Google models (via openrouter or direct)
  ["gemini", "auto"],
  // Nous models
  ["hermes-", "nous"],
  // Z.AI / GLM models
  ["glm-", "zai"],
  // Kimi / Moonshot
  ["moonshot", "kimi-coding"],
  ["kimi", "kimi-coding"],
  // MiniMax
  ["minimax", "minimax"],
  // DeepSeek
  ["deepseek", "auto"],
  // Meta Llama
  ["llama", "auto"],
  // Qwen
  ["qwen", "auto"],
  // Ollama Cloud (Ollama Cloud provider — distinct from local ollama-launch)
  ["ollama-cloud/", "ollama-cloud"],
  // Mistral
  ["mistral", "auto"],
  // HuggingFace models (org/model format)
  ["huggingface/", "huggingface"],
];

/** Regex to extract session ID from Hermes CLI output. */
export const SESSION_ID_REGEX = /session[_ ](?:id|saved)[:\s]+([a-zA-Z0-9_-]+)/i;

/** Regex to extract token usage from Hermes output. */
export const TOKEN_USAGE_REGEX =
  /tokens?[:\s]+(\d+)\s*(?:input|in)\b.*?(\d+)\s*(?:output|out)\b/i;

/** Regex to extract cost from Hermes output. */
export const COST_REGEX = /(?:cost|spent)[:\s]*\$?([\d.]+)/i;

/** Prefix used by Hermes for tool output lines. */
export const TOOL_OUTPUT_PREFIX = "┊";

/** Prefix for Hermes thinking blocks. */
export const THINKING_PREFIX = "💭";

// ---------------------------------------------------------------------------
// Ollama Cloud admission semaphore (hermes-04ps.1.3.1)
// ---------------------------------------------------------------------------

/**
 * Provider name for Ollama Cloud — the metered concurrent-model ceiling
 * (Max plan = 10 concurrent). When this provider is resolved, the adapter
 * may wrap the Hermes invocation with the cloud admission semaphore if the
 * state directory is configured.
 */
export const OLLAMA_CLOUD_PROVIDER = "ollama-cloud";

/**
 * Environment variable pointing to the cloud admission semaphore state dir.
 * When set, the adapter wraps `ollama-cloud` routed Hermes commands with
 * `ollama_cloud_admission.py run cloud_ollama ...` to cap concurrency.
 */
export const OLLAMA_CLOUD_ADMISSION_STATE_DIR_ENV = "PAPERCLIP_OLLAMA_CLOUD_ADMISSION_STATE_DIR";

/**
 * Environment variable pointing to the cloud admission policy file.
 * Optional; defaults to the policy bundled in the agentic-os repo.
 */
export const OLLAMA_CLOUD_ADMISSION_POLICY_ENV = "PAPERCLIP_OLLAMA_CLOUD_ADMISSION_POLICY";

/**
 * Environment variable for the cloud admission wrapper path.
 * Optional; defaults to the canonical agentic-os path.
 */
export const OLLAMA_CLOUD_ADMISSION_WRAPPER_ENV = "PAPERCLIP_OLLAMA_CLOUD_ADMISSION_WRAPPER";

/**
 * Default path to the cloud admission wrapper script.
 * Resolves relative to the Paperclip repo root.
 */
export const DEFAULT_CLOUD_ADMISSION_WRAPPER = "/Users/hermes/Projects/agentic-os/ops/ollama-cloud-admission/ollama_cloud_admission.py";

/** How the cloud admission wrapper is invoked. */
export const CLOUD_ADMISSION_ROUTE_CLASS = "cloud_ollama";
