export const PLUGIN_ID = "paperclip-memory-bridge";
export const PLUGIN_VERSION = "0.1.0";

export const TOOL_NAMES = {
  memorySearch: "memory_search",
  memoryNote: "memory_note",
} as const;

export const DEFAULT_CONFIG = {
  localTurnSyncPath: "/Users/jack.reis/Documents/=notes/bin/local-turn-sync",
} as const;

/** Hard cap on free-text sent to the CLI (query or captured fact). */
export const MAX_TEXT_LENGTH = 4000;

export const DEFAULT_SEARCH_LIMIT = 5;
export const MAX_SEARCH_LIMIT = 50;

export const DEFAULT_NOTE_KIND = "fact";
export const DEFAULT_NOTE_TASK_ID = "paperclip/manual";
export const NOTE_SOURCE = "paperclip";

export const CLI_TIMEOUT_MS = 30_000;
