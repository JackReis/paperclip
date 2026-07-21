import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

export const PLUGIN_ID = "paperclipai.plugin-contextforge-sync";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: "0.1.0",
  displayName: "ContextForge Routine/Goal Event Sync",
  description:
    "Subscribes to Routine and Goal domain events via the Paperclip plugin event bus and forwards them " +
    "as structured POST requests to a ContextForge webhook listener for state tracking and lifecycle synchronization.",
  author: "Paperclip",
  categories: ["connector"],
  capabilities: [
    "events.subscribe",
    "http.outbound",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      webhookUrl: {
        type: "string",
        title: "ContextForge Webhook URL",
        description:
          "The ContextForge webhook endpoint to receive Routine/Goal lifecycle events. " +
          "Can also be set via the CONTEXTFORGE_WEBHOOK_URL environment variable.",
        default: "http://127.0.0.1:8090",
      },
      maxRetries: {
        type: "number",
        title: "Maximum Delivery Retries",
        description:
          "Maximum number of retry attempts for failed webhook deliveries (exponential backoff). Default: 3.",
        default: 3,
      },
      retryBaseDelayMs: {
        type: "number",
        title: "Retry Base Delay (ms)",
        description:
          "Base delay in milliseconds for exponential backoff between retries. Default: 1000 (1s).",
        default: 1000,
      },
      requestTimeoutMs: {
        type: "number",
        title: "Request Timeout (ms)",
        description:
          "Timeout for each webhook HTTP request in milliseconds. Default: 10000 (10s).",
        default: 10000,
      },
    },
    required: [],
  },
  entrypoints: {
    worker: "./dist/worker.js",
  },
};

export default manifest;