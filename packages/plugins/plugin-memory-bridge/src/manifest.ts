import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import { DEFAULT_CONFIG, PLUGIN_ID, PLUGIN_VERSION, TOOL_NAMES } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Memory Bridge",
  description:
    "Wires Paperclip agents to the fleet memory substrate (OBn, Holographic, Hindsight) through the local-turn-sync CLI. Adds memory_search for turn-start recall and memory_note for capturing durable facts.",
  author: "Jack Reis",
  categories: ["connector"],
  capabilities: ["agent.tools.register", "activity.log.write"],
  entrypoints: {
    worker: "./dist/worker.js",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      localTurnSyncPath: {
        type: "string",
        title: "local-turn-sync CLI Path",
        description: "Absolute path to the local-turn-sync executable on the host machine.",
        default: DEFAULT_CONFIG.localTurnSyncPath,
      },
    },
  },
  tools: [
    {
      name: TOOL_NAMES.memorySearch,
      displayName: "Memory Search",
      description:
        "Search the fleet memory substrate for evidence relevant to a topic. Use at the start of a task to recall durable facts, prior decisions, and related work.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Topic or question to recall memory evidence for.",
          },
          limit: {
            type: "number",
            description: "Maximum number of memory rows to return (default 5).",
          },
        },
        required: ["query"],
      },
    },
    {
      name: TOOL_NAMES.memoryNote,
      displayName: "Memory Note",
      description:
        "Capture one durable fact to the fleet memory substrate. Use for decisions, outcomes, and facts with multi-day value — not ephemeral state.",
      parametersSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The durable fact to capture (max 4000 characters).",
          },
          kind: {
            type: "string",
            description: 'Fact kind label, e.g. "fact", "done", "decision" (default "fact").',
          },
          taskId: {
            type: "string",
            description: 'Task identifier to attribute the fact to (default "paperclip/manual").',
          },
        },
        required: ["text"],
      },
    },
  ],
};

export default manifest;
