import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "hindsight-integrations.paperclip",
  apiVersion: 1,
  displayName: "Hindsight Memory",
  description:
    "Auto-recall relevant memories on heartbeat start; auto-retain session findings on heartbeat completion.",
  categories: ["automation"],
  version: "0.1.0",
  author: "InfraFixer",
  capabilities: ["events.subscribe", "http.outbound", "issues.read", "issue.comments.create"],
  entrypoints: {
    worker: "dist/worker.js",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      hindsightApiUrl: {
        type: "string",
        description: "Base URL for the Hindsight API",
        default: "http://192.168.5.216:18888",
      },
      bankGranularity: {
        type: "string",
        enum: ["company+agent"],
        description: "Bank ID granularity",
        default: "company+agent",
      },
      autoRetain: {
        type: "boolean",
        description: "Retain session context after heartbeat completion",
        default: true,
      },
    },
    required: ["hindsightApiUrl"],
  },
};

export default manifest;
