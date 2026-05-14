import type { Dirent } from "node:fs";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";
import {
  compareLastMessageDesc,
  flattenTextContent,
  isRecord,
  type ProviderParser,
  truncateTitle,
} from "./_shared";

interface WorkspaceJson {
  folder?: string;
  workspace?: string;
}

type SessionData = Record<string, unknown>;

/**
 * Replay a Copilot JSONL changelog to reconstruct the full session state.
 *
 * Format:
 *  - Line 0 (kind: 0): initial state with `v` containing session metadata
 *  - kind: 1 lines: SET value at JSON path `k`
 *  - kind: 2 lines: PUSH/extend array at JSON path `k`
 *
 * Falls back to returning the first-line session if it already has requests
 * populated (old single-line format).
 */
function replayChangelog(raw: string): SessionData {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return {};

  const first: unknown = JSON.parse(lines[0]);
  const firstObject = isRecord(first) ? first : {};
  const session: SessionData = isRecord(firstObject.v) ? firstObject.v : firstObject;

  // Old format: single line with requests already populated
  if (lines.length === 1 || getRequests(session).length > 0) {
    return session;
  }

  // New incremental changelog format
  for (let i = 1; i < lines.length; i++) {
    const entry: unknown = JSON.parse(lines[i]);
    if (!isRecord(entry)) continue;
    const kind = typeof entry.kind === "number" ? entry.kind : null;
    const k = Array.isArray(entry.k) ? entry.k.filter(isPathSegment) : undefined;
    const v = entry.v;

    if (!Array.isArray(k) || k.length === 0) continue;

    if (kind === 1) {
      // SET: traverse path and set value at last key
      let obj: unknown = session;
      for (let j = 0; j < k.length - 1; j++) {
        const key = k[j];
        if (typeof key === "number") {
          if (!Array.isArray(obj)) break;
          while (obj.length <= key) obj.push(null);
          if (obj[key] == null) obj[key] = typeof k[j + 1] === "number" ? [] : {};
          obj = obj[key];
        } else if (isRecord(obj)) {
          if (!(key in obj)) obj[key] = typeof k[j + 1] === "number" ? [] : {};
          obj = obj[key];
        } else {
          break;
        }
      }
      const last = k[k.length - 1];
      if (Array.isArray(obj) && typeof last === "number") {
        while (obj.length <= last) obj.push(null);
        obj[last] = v;
      } else if (isRecord(obj) && typeof last === "string") {
        obj[last] = v;
      }
    } else if (kind === 2) {
      // PUSH: traverse path to target array, extend with v items
      let obj: unknown = session;
      for (const key of k) {
        if (typeof key === "number" && Array.isArray(obj)) {
          while (obj.length <= key) obj.push(null);
          obj = obj[key];
        } else if (isRecord(obj) && typeof key === "string") {
          if (!(key in obj)) obj[key] = [];
          obj = obj[key];
        }
      }
      if (Array.isArray(obj) && Array.isArray(v)) {
        obj.push(...v);
      }
    }
  }

  return session;
}

function isPathSegment(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function getRequests(session: SessionData): SessionData[] {
  return Array.isArray(session.requests) ? session.requests.filter(isRecord) : [];
}

/**
 * Extract user message text from a request object.
 * Old format: `message` is a string.
 * New format: `message` is `{ text: string }`.
 */
function extractMessageText(req: SessionData): string {
  return flattenTextContent(req.message);
}

/**
 * Extract assistant response text from a request object.
 * Old format: `response` is a string or `{ message: string }`.
 * New format: `response` is an array of parts — concatenate `value` from
 * parts that have no `kind` (markdown content) and `kind: 'thinking'`.
 */
function extractResponseText(req: SessionData): string {
  const resp = req.response;
  if (!resp) return "";
  if (typeof resp === "string") return resp;

  if (Array.isArray(resp)) {
    // New format: array of response parts
    const textParts: string[] = [];
    for (const part of resp) {
      if (typeof part !== "object" || part === null) continue;
      // Markdown content parts have `value` but no `kind`
      if (!("kind" in part) && "value" in part && typeof part.value === "string") {
        textParts.push(part.value);
      }
    }
    return textParts.join("");
  }

  // Old format: object with message field
  if (isRecord(resp) && resp.message) return flattenTextContent(resp.message);
  return JSON.stringify(resp);
}

function decodeWorkspacePath(path: string): string {
  if (!path.startsWith("file://")) return path;
  try {
    return fileURLToPath(path);
  } catch {
    return decodeURIComponent(path.replace("file://", ""));
  }
}

export async function resolveWorkspaces(): Promise<Map<string, string>> {
  const baseDir = PATHS.copilot.root;
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
        map.set(entry.name, decodeWorkspacePath(path));
      }
    } catch {
      // skip malformed workspace.json
    }
  }

  return map;
}

export async function scanSessions(): Promise<Conversation[]> {
  const baseDir = PATHS.copilot.root;
  if (!existsSync(baseDir)) return [];

  const workspaces = await resolveWorkspaces();
  const conversations: Conversation[] = [];
  const hashes = await readdir(baseDir, { withFileTypes: true });

  for (const entry of hashes) {
    if (!entry.isDirectory()) continue;

    const sessionsDir = join(baseDir, entry.name, "chatSessions");
    if (!existsSync(sessionsDir)) continue;

    const workspacePath = workspaces.get(entry.name) ?? null;
    const projectName = workspacePath ? basename(workspacePath) : null;

    const files = await readdir(sessionsDir);
    const jsonlFiles = files.filter((f: string) => f.endsWith(".jsonl"));

    for (const file of jsonlFiles) {
      const filePath = join(sessionsDir, file);
      const sessionId = basename(file, ".jsonl");

      try {
        const raw = await readFile(filePath, "utf-8");
        const session = replayChangelog(raw);

        const requests = getRequests(session);
        if (requests.length === 0) continue;

        const title =
          (typeof session.customTitle === "string" ? session.customTitle : "") ||
          truncateTitle(extractMessageText(requests[0])) ||
          "Untitled";

        const creationDate =
          typeof session.creationDate === "number"
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

  return conversations.sort(compareLastMessageDesc);
}

/**
 * Recursively walk a directory collecting markdown files into the memory list.
 * Used for Copilot's per-workspace `memory-tool/memories/` tree.
 */
async function walkMemories(
  dir: string,
  rootDir: string,
  workspacePath: string | null,
  out: MemoryFile[],
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMemories(full, rootDir, workspacePath, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    try {
      const content = await readFile(full, "utf-8");
      const stats = await stat(full);
      const projectName = workspacePath ? basename(workspacePath) : null;
      const rel = relative(rootDir, full);
      out.push({
        id: `copilot:${full}`,
        provider: "copilot",
        filePath: full,
        relativePath: projectName ? `${projectName}/${rel}` : rel,
        projectPath: workspacePath,
        projectName,
        name: entry.name,
        content,
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      });
    } catch {
      // skip unreadable
    }
  }
}

export async function scanMemoryFiles(): Promise<MemoryFile[]> {
  const baseDir = PATHS.copilot.root;
  if (!existsSync(baseDir)) return [];

  const workspaces = await resolveWorkspaces();
  const memoryFiles: MemoryFile[] = [];

  let hashes: Dirent[];
  try {
    hashes = await readdir(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of hashes) {
    if (!entry.isDirectory()) continue;
    const memoriesDir = join(baseDir, entry.name, "GitHub.copilot-chat", "memory-tool", "memories");
    if (!existsSync(memoriesDir)) continue;
    const workspacePath = workspaces.get(entry.name) ?? null;
    await walkMemories(memoriesDir, memoriesDir, workspacePath, memoryFiles);
  }

  return memoryFiles;
}

export async function parseSession(filePath: string): Promise<ConversationDetail | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const session = replayChangelog(raw);
    const sessionId =
      typeof session.sessionId === "string" ? session.sessionId : basename(filePath, ".jsonl");

    const requests = getRequests(session);
    if (requests.length === 0) return null;

    // Resolve workspace path from parent directories
    const hashDir = basename(join(filePath, "..", ".."));
    const workspaces = await resolveWorkspaces();
    const workspacePath = workspaces.get(hashDir) ?? null;
    const projectName = workspacePath ? basename(workspacePath) : null;

    const messages: Message[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      if (!req || typeof req !== "object") continue;

      const userText = extractMessageText(req);
      messages.push({
        id: `copilot:${sessionId}:${i * 2}`,
        role: "user",
        content: userText,
        timestamp: typeof req.timestamp === "number" ? new Date(req.timestamp).toISOString() : "",
        provider: "copilot",
      });

      const responseText = extractResponseText(req);
      if (responseText) {
        messages.push({
          id: `copilot:${sessionId}:${i * 2 + 1}`,
          role: "assistant",
          content: responseText,
          timestamp: typeof req.timestamp === "number" ? new Date(req.timestamp).toISOString() : "",
          provider: "copilot",
        });
      }
    }

    const title =
      (typeof session.customTitle === "string" ? session.customTitle : "") ||
      truncateTitle(extractMessageText(requests[0])) ||
      "Untitled";

    const creationDate =
      typeof session.creationDate === "number" ? new Date(session.creationDate).toISOString() : "";

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

export const parser: ProviderParser = {
  id: "copilot",
  displayName: "VS Code Copilot",
  available: () => existsSync(PATHS.copilot.root),
  scanSessions,
  parseSession,
  scanMemoryFiles,
};
