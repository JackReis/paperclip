import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

export const PLUGIN_ID = "paperclipai.plugin-linear-sync";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Linear Read-Only Project Map",
  description:
    "Projects Paperclip Goals, Projects, and Labels onto Linear as a read-only project map via labels. " +
    "No write-back from Linear to Paperclip. Syncs on goal/project/label mutations with 15-minute batch reconciliation.",
  author: "Paperclip",
  categories: ["connector"],
  capabilities: [
    "events.subscribe",
    "http.outbound",
    "secrets.read-ref",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "goals.read",
    "companies.read",
    "projects.read",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      linearApiTokenRef: {
        type: "string",
        title: "Linear API Token Secret Reference",
        description:
          "Secret reference name for the Linear API token (stored in Paperclip company secrets).",
      },
      linearTeamId: {
        type: "string",
        title: "Linear Team ID",
        description:
          "The Linear team ID to project Paperclip goals and labels onto.",
      },
      syncIntervalMinutes: {
        type: "number",
        title: "Batch Reconciliation Interval (minutes)",
        description: "How often to run full batch reconciliation. Default: 15 minutes.",
        default: 15,
      },
    },
    required: ["linearApiTokenRef", "linearTeamId"],
  },
  entrypoints: {
    worker: "./dist/worker.js",
  },
  jobs: [
    {
      jobKey: "full-reconcile",
      displayName: "Full Linear Reconciliation",
      description: "Full batch reconciliation of Paperclip goals/projects/labels to Linear.",
      schedule: "*/15 * * * *",
    },
  ],
};

export default manifest;