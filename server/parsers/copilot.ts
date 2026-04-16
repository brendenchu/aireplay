import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import { PATHS } from "../paths";

interface WorkspaceJson {
  folder?: string;
  workspace?: string;
}

export async function resolveWorkspaces(): Promise<Map<string, string>> {
  const baseDir = PATHS.copilot.workspaceStorage;
  if (!existsSync(baseDir)) return new Map();

  const map = new Map<string, string>();
  const hashes = await readdir(baseDir, { withFileTypes: true });

  for (const entry of hashes) {
    if (!entry.isDirectory()) continue;

    const wsFile = join(baseDir, entry.name, "workspace.json");
    if (!existsSync(wsFile)) continue;

    try {
      const raw = await readFile(wsFile, "utf-8");
      const ws: WorkspaceJson = JSON.parse(raw);
      const path = ws.folder ?? ws.workspace ?? null;
      if (path) {
        // Convert file:// URI to path
        const decoded = path.startsWith("file://")
          ? decodeURIComponent(path.replace("file://", ""))
          : path;
        map.set(entry.name, decoded);
      }
    } catch {
      // skip malformed workspace.json
    }
  }

  return map;
}

export async function scanSessions(): Promise<Conversation[]> {
  const baseDir = PATHS.copilot.workspaceStorage;
  if (!existsSync(baseDir)) return [];

  const workspaces = await resolveWorkspaces();
  const conversations: Conversation[] = [];
  const hashes = await readdir(baseDir, { withFileTypes: true });

  for (const entry of hashes) {
    if (!entry.isDirectory()) continue;

    const sessionsDir = join(baseDir, entry.name, "chatSessions");
    if (!existsSync(sessionsDir)) continue;

    const workspacePath = workspaces.get(entry.name) ?? null;
    const projectName = workspacePath?.split("/").pop() ?? null;

    const files = await readdir(sessionsDir);
    const jsonlFiles = files.filter((f: string) => f.endsWith(".jsonl"));

    for (const file of jsonlFiles) {
      const filePath = join(sessionsDir, file);
      const sessionId = basename(file, ".jsonl");

      try {
        const raw = await readFile(filePath, "utf-8");
        // Copilot JSONL is typically a single line with the full session
        const firstLine = raw.split("\n").find((l: string) => l.trim());
        if (!firstLine) continue;

        const wrapper = JSON.parse(firstLine);
        const session = wrapper.v ?? wrapper;

        const requests = session.requests ?? [];
        if (requests.length === 0) continue;

        const firstMessage = requests[0]?.message ?? "";
        const title =
          typeof firstMessage === "string"
            ? (firstMessage.length > 80 ? `${firstMessage.slice(0, 80)}…` : firstMessage) ||
              "Untitled"
            : "Untitled";

        const creationDate = session.creationDate
          ? new Date(session.creationDate).toISOString()
          : "";

        const stats = await stat(filePath);

        conversations.push({
          id: `copilot:${sessionId}`,
          provider: "copilot",
          sessionId,
          projectPath: workspacePath,
          projectName,
          title,
          startedAt: creationDate,
          lastMessageAt: stats.mtime.toISOString(),
          messageCount: requests.length * 2, // user + assistant pairs
          filePath,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function parseSession(filePath: string): Promise<ConversationDetail | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const firstLine = raw.split("\n").find((l: string) => l.trim());
    if (!firstLine) return null;

    const wrapper = JSON.parse(firstLine);
    const session = wrapper.v ?? wrapper;
    const sessionId = session.sessionId ?? basename(filePath, ".jsonl");

    const requests = session.requests ?? [];
    if (requests.length === 0) return null;

    // Resolve workspace path from parent directories
    const hashDir = basename(join(filePath, "..", ".."));
    const workspaces = await resolveWorkspaces();
    const workspacePath = workspaces.get(hashDir) ?? null;
    const projectName = workspacePath?.split("/").pop() ?? null;

    const messages: Message[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];

      messages.push({
        id: `copilot:${sessionId}:${i * 2}`,
        role: "user",
        content: typeof req.message === "string" ? req.message : JSON.stringify(req.message),
        timestamp: req.timestamp ? new Date(req.timestamp).toISOString() : "",
        provider: "copilot",
      });

      if (req.response) {
        messages.push({
          id: `copilot:${sessionId}:${i * 2 + 1}`,
          role: "assistant",
          content:
            typeof req.response === "string"
              ? req.response
              : (req.response.message ?? JSON.stringify(req.response)),
          timestamp: req.response.timestamp ? new Date(req.response.timestamp).toISOString() : "",
          provider: "copilot",
        });
      }
    }

    const firstMessage = typeof requests[0]?.message === "string" ? requests[0].message : "";
    const title =
      firstMessage.length > 80 ? `${firstMessage.slice(0, 80)}…` : firstMessage || "Untitled";

    const creationDate = session.creationDate ? new Date(session.creationDate).toISOString() : "";

    const stats = await stat(filePath);

    return {
      id: `copilot:${sessionId}`,
      provider: "copilot",
      sessionId,
      projectPath: workspacePath,
      projectName,
      title,
      startedAt: creationDate,
      lastMessageAt: stats.mtime.toISOString(),
      messageCount: messages.length,
      filePath,
      messages,
    };
  } catch {
    return null;
  }
}
