import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();
const GEMINI_ROOT = process.env.GEMINI_CLI_HOME ?? join(HOME, ".gemini");

function windowsPathToWsl(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const driveMatch = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (!driveMatch) return normalized;
  return `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
}

function isWsl(): boolean {
  return process.platform === "linux" && typeof process.env.WSL_DISTRO_NAME === "string";
}

function pickExistingPath(...candidates: string[]): string | undefined {
  const nonEmpty = candidates.filter(Boolean);
  const existing = nonEmpty.find((candidate) => existsSync(candidate));
  return existing ?? nonEmpty[0];
}

function copilotStoragePath(): string {
  const envOverride = process.env.COPILOT_WORKSPACE_STORAGE;

  const darwin = join(HOME, "Library", "Application Support", "Code", "User", "workspaceStorage");
  const windows = join(
    process.env.APPDATA ?? join(HOME, "AppData", "Roaming"),
    "Code",
    "User",
    "workspaceStorage",
  );
  const linux = join(HOME, ".config", "Code", "User", "workspaceStorage");
  const wslWindows = process.env.APPDATA
    ? join(windowsPathToWsl(process.env.APPDATA), "Code", "User", "workspaceStorage")
    : process.env.USERPROFILE
      ? join(
          windowsPathToWsl(join(process.env.USERPROFILE, "AppData", "Roaming")),
          "Code",
          "User",
          "workspaceStorage",
        )
      : "";

  if (process.platform === "darwin") return pickExistingPath(envOverride ?? "", darwin) ?? darwin;
  if (process.platform === "win32") return pickExistingPath(envOverride ?? "", windows) ?? windows;
  if (isWsl()) return pickExistingPath(envOverride ?? "", linux, wslWindows) ?? linux;
  return pickExistingPath(envOverride ?? "", linux) ?? linux;
}

function copilotCliRootPath(): string {
  const envOverride = process.env.COPILOT_CLI_HOME;
  const native = join(HOME, ".copilot");

  if (process.platform !== "linux" || !isWsl()) {
    return pickExistingPath(envOverride ?? "", native) ?? native;
  }

  const wslWindows = process.env.USERPROFILE
    ? join(windowsPathToWsl(process.env.USERPROFILE), ".copilot")
    : "";
  return pickExistingPath(envOverride ?? "", native, wslWindows) ?? native;
}

const COPILOT_CLI_ROOT = copilotCliRootPath();

const COPILOT_ROOT = copilotStoragePath();

export const PATHS = {
  claudeCode: {
    root: join(HOME, ".claude"),
    projects: join(HOME, ".claude", "projects"),
    globalMemory: join(HOME, ".claude", "CLAUDE.md"),
  },
  copilot: {
    root: COPILOT_ROOT,
  },
  copilotCli: {
    root: COPILOT_CLI_ROOT,
    sessionState: join(COPILOT_CLI_ROOT, "session-state"),
  },
  gemini: {
    root: GEMINI_ROOT,
    tmp: join(GEMINI_ROOT, "tmp"),
    globalMemory: join(GEMINI_ROOT, "GEMINI.md"),
  },
  codex: {
    root: join(HOME, ".codex"),
    sessions: join(HOME, ".codex", "sessions"),
    history: join(HOME, ".codex", "history.jsonl"),
    memories: join(HOME, ".codex", "memories"),
    globalMemory: join(HOME, ".codex", "AGENTS.md"),
  },
} as const;
