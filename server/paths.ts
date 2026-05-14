import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const GEMINI_ROOT = process.env.GEMINI_CLI_HOME ?? join(HOME, ".gemini");

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
  copilotCli: {
    root: join(HOME, ".copilot"),
    sessionState: join(HOME, ".copilot", "session-state"),
  },
  gemini: {
    root: GEMINI_ROOT,
    settings: join(GEMINI_ROOT, "settings.json"),
    projects: join(GEMINI_ROOT, "projects.json"),
    tmp: join(GEMINI_ROOT, "tmp"),
    implicit: join(GEMINI_ROOT, "antigravity", "implicit"),
  },
  codex: {
    root: join(HOME, ".codex"),
    history: join(HOME, ".codex", "history.jsonl"),
    memories: join(HOME, ".codex", "memories"),
    instructions: join(HOME, ".codex", "AGENTS.md"),
  },
} as const;
