import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

function copilotStoragePath(): string {
  switch (process.platform) {
    case "darwin":
      return join(HOME, "Library", "Application Support", "Code", "User", "workspaceStorage");
    case "win32":
      return join(
        process.env.APPDATA ?? join(HOME, "AppData", "Roaming"),
        "Code",
        "User",
        "workspaceStorage",
      );
    default:
      return join(HOME, ".config", "Code", "User", "workspaceStorage");
  }
}

export const PATHS = {
  claudeCode: {
    root: join(HOME, ".claude"),
    projects: join(HOME, ".claude", "projects"),
    history: join(HOME, ".claude", "history.jsonl"),
    globalMemory: join(HOME, ".claude", "CLAUDE.md"),
    settings: join(HOME, ".claude", "settings.json"),
  },
  copilot: {
    workspaceStorage: copilotStoragePath(),
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
