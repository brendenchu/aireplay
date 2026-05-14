import type { Dirent } from "node:fs";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";
import {
  flattenTextContent,
  isRecord,
  type ProviderParser,
  readGlobalMemoryFile,
  truncateTitle,
} from "./_shared";

/**
 * Gemini CLI / Antigravity stores chat sessions under
 * `~/.gemini/tmp/{workspace-name}/chats/session-*.{json,jsonl}`.
 *
 * `.json` (older): one object with { sessionId, projectHash, startTime,
 *   lastUpdated, kind, messages: [{ id, timestamp, type, content }] }.
 * `.jsonl` (newer): first non-empty line is the header (no `messages` field);
 *   subsequent lines are either messages or `{"$set": {...}}` mutations.
 *
 * `type` values observed: "user", "model" (assistant), "info" (system).
 * `content` is either a string or an array of `{ text }` parts.
 *
 * Workspace → project path is resolved via `../.project_root`, a text file
 * whose first non-empty line is the absolute workspace path.
 */

interface SessionHeader {
  sessionId: string;
  projectHash?: string;
  startTime: string;
  lastUpdated: string;
  kind?: string;
}

interface RawMessage {
  id: string;
  timestamp: string;
  type: string;
  content: unknown;
}

interface ParsedSession {
  header: SessionHeader;
  messages: RawMessage[];
}

function normalizeRole(type: string): Message["role"] {
  if (type === "user") return "user";
  if (type === "model" || type === "assistant") return "assistant";
  return "system";
}

function toRawMessage(obj: Record<string, unknown>): RawMessage | null {
  if (typeof obj.id !== "string" || typeof obj.type !== "string") return null;
  return {
    id: obj.id,
    timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
    type: obj.type,
    content: obj.content,
  };
}

function toHeader(obj: Record<string, unknown>): SessionHeader | null {
  if (typeof obj.sessionId !== "string" || typeof obj.startTime !== "string") return null;
  return {
    sessionId: obj.sessionId,
    projectHash: typeof obj.projectHash === "string" ? obj.projectHash : undefined,
    startTime: obj.startTime,
    lastUpdated: typeof obj.lastUpdated === "string" ? obj.lastUpdated : obj.startTime,
    kind: typeof obj.kind === "string" ? obj.kind : undefined,
  };
}

function parseJsonSession(raw: string): ParsedSession | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const header = toHeader(data);
  if (!header) return null;
  const messages: RawMessage[] = [];
  if (Array.isArray(data.messages)) {
    for (const m of data.messages) {
      if (!isRecord(m)) continue;
      const parsed = toRawMessage(m);
      if (parsed) messages.push(parsed);
    }
  }
  return { header, messages };
}

function parseJsonlSession(raw: string): ParsedSession | null {
  let header: SessionHeader | null = null;
  const messages: RawMessage[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(obj)) continue;

    if ("$set" in obj || "$unset" in obj || "$push" in obj) continue;

    const looksLikeHeader =
      typeof obj.sessionId === "string" &&
      typeof obj.startTime === "string" &&
      !("id" in obj && "type" in obj);

    if (looksLikeHeader) {
      const parsed = toHeader(obj);
      if (!parsed) continue;
      if (!header) {
        header = parsed;
      } else if (parsed.lastUpdated > header.lastUpdated) {
        header.lastUpdated = parsed.lastUpdated;
      }
      continue;
    }

    const msg = toRawMessage(obj);
    if (msg) messages.push(msg);
  }

  if (!header) return null;

  const latestTs = messages.reduce(
    (acc, m) => (m.timestamp && m.timestamp > acc ? m.timestamp : acc),
    header.lastUpdated,
  );
  header.lastUpdated = latestTs;

  return { header, messages };
}

async function parseSessionFile(filePath: string): Promise<ParsedSession | null> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
  return extname(filePath).toLowerCase() === ".jsonl"
    ? parseJsonlSession(raw)
    : parseJsonSession(raw);
}

async function readProjectRoot(workspaceDir: string): Promise<string | null> {
  const file = join(workspaceDir, ".project_root");
  if (!existsSync(file)) return null;
  try {
    const raw = await readFile(file, "utf-8");
    const first = raw
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);
    return first ?? null;
  } catch {
    return null;
  }
}

function deriveTitle(messages: RawMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.type === "user");
  if (firstUser) {
    const text = flattenTextContent(firstUser.content).trim();
    if (text) return truncateTitle(text);
  }
  const firstNonInfo = messages.find((m) => m.type !== "info");
  if (firstNonInfo) {
    const text = flattenTextContent(firstNonInfo.content).trim();
    if (text) return truncateTitle(text);
  }
  return fallback || "Untitled";
}

interface WorkspaceInfo {
  name: string;
  projectPath: string | null;
}

async function discoverWorkspaces(): Promise<WorkspaceInfo[]> {
  if (!existsSync(PATHS.gemini.tmp)) return [];
  let entries: Dirent[];
  try {
    entries = await readdir(PATHS.gemini.tmp, { withFileTypes: true });
  } catch {
    return [];
  }
  const workspaces: WorkspaceInfo[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const wsDir = join(PATHS.gemini.tmp, entry.name);
    const projectPath = await readProjectRoot(wsDir);
    workspaces.push({ name: entry.name, projectPath });
  }
  return workspaces;
}

export async function scanSessions(): Promise<Conversation[]> {
  const workspaces = await discoverWorkspaces();
  const conversations: Conversation[] = [];

  for (const ws of workspaces) {
    const chatsDir = join(PATHS.gemini.tmp, ws.name, "chats");
    if (!existsSync(chatsDir)) continue;

    let files: Dirent[];
    try {
      files = await readdir(chatsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.isFile()) continue;
      const ext = extname(file.name).toLowerCase();
      if (ext !== ".json" && ext !== ".jsonl") continue;

      const filePath = join(chatsDir, file.name);
      const parsed = await parseSessionFile(filePath);
      if (!parsed) continue;

      const stats = await stat(filePath).catch(() => null);
      const sessionId = parsed.header.sessionId || file.name;
      const projectName = ws.projectPath ? basename(ws.projectPath) : ws.name;

      conversations.push({
        id: `gemini:${sessionId}`,
        provider: "gemini",
        sessionId,
        projectPath: ws.projectPath,
        projectName,
        title: deriveTitle(parsed.messages, sessionId),
        startedAt: parsed.header.startTime || (stats?.birthtime.toISOString() ?? ""),
        lastMessageAt: parsed.header.lastUpdated || (stats?.mtime.toISOString() ?? ""),
        messageCount: parsed.messages.length,
        filePath,
      });
    }
  }

  return conversations;
}

export async function parseSession(filePath: string): Promise<ConversationDetail | null> {
  const parsed = await parseSessionFile(filePath);
  if (!parsed) return null;

  // Path shape: .../tmp/{workspace}/chats/{file}
  const chatsDir = dirname(filePath);
  const wsDir = dirname(chatsDir);
  const wsName = basename(wsDir);
  const projectPath = await readProjectRoot(wsDir);
  const stats = await stat(filePath).catch(() => null);

  const messages: Message[] = parsed.messages
    .map((m) => ({
      id: `gemini:${parsed.header.sessionId}:${m.id}`,
      role: normalizeRole(m.type),
      content: flattenTextContent(m.content),
      timestamp: m.timestamp,
      provider: "gemini" as const,
    }))
    .filter((m) => m.content.trim());

  const sessionId = parsed.header.sessionId || basename(filePath);

  return {
    id: `gemini:${sessionId}`,
    provider: "gemini",
    sessionId,
    projectPath,
    projectName: projectPath ? basename(projectPath) : wsName,
    title: deriveTitle(parsed.messages, sessionId),
    startedAt: parsed.header.startTime || (stats?.birthtime.toISOString() ?? ""),
    lastMessageAt: parsed.header.lastUpdated || (stats?.mtime.toISOString() ?? ""),
    messageCount: messages.length,
    filePath,
    messages,
  };
}

export async function scanMemoryFiles(workspacePaths?: string[]): Promise<MemoryFile[]> {
  const memoryFiles: MemoryFile[] = [];

  const globalGemini = await readGlobalMemoryFile("gemini", PATHS.gemini.globalMemory);
  if (globalGemini) memoryFiles.push(globalGemini);

  // Default to workspaces Gemini already knows about (discovered via tmp/{name}/.project_root).
  // Callers can pass an explicit list to extend or override.
  const paths =
    workspacePaths ??
    (await discoverWorkspaces()).map((ws) => ws.projectPath).filter((p): p is string => p !== null);

  for (const wsPath of paths) {
    const geminiMd = join(wsPath, "GEMINI.md");
    if (!existsSync(geminiMd)) continue;
    try {
      const content = await readFile(geminiMd, "utf-8");
      const stats = await stat(geminiMd);
      const projectName = basename(wsPath);
      memoryFiles.push({
        id: `gemini:${wsPath}/GEMINI.md`,
        provider: "gemini",
        filePath: geminiMd,
        relativePath: `${projectName}/GEMINI.md`,
        projectPath: wsPath,
        projectName,
        name: "GEMINI.md",
        content,
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      });
    } catch {
      // skip
    }
  }

  return memoryFiles;
}

export const parser: ProviderParser = {
  id: "gemini",
  displayName: "Gemini CLI",
  roots: [PATHS.gemini.root],
  available: () => existsSync(PATHS.gemini.root),
  scanSessions,
  parseSession,
  scanMemoryFiles,
};
