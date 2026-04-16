import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

export const PATHS = {
  claudeCode: {
    root: join(HOME, ".claude"),
    projects: join(HOME, ".claude", "projects"),
    history: join(HOME, ".claude", "history.jsonl"),
    globalMemory: join(HOME, ".claude", "CLAUDE.md"),
    settings: join(HOME, ".claude", "settings.json"),
  },
  copilot: {
    workspaceStorage: join(
      HOME,
      "Library",
      "Application Support",
      "Code",
      "User",
      "workspaceStorage",
    ),
  },
  gemini: {
    root: join(HOME, ".gemini"),
    settings: join(HOME, ".gemini", "settings.json"),
    history: join(HOME, ".gemini", "history"),
    conversations: join(HOME, ".gemini", "antigravity", "conversations"),
    implicit: join(HOME, ".gemini", "antigravity", "implicit"),
  },
  codex: {
    root: join(HOME, ".codex"),
    history: join(HOME, ".codex", "history.jsonl"),
    memories: join(HOME, ".codex", "memories"),
    instructions: join(HOME, ".codex", "AGENTS.md"),
  },
} as const;
