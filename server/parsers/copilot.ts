import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import { PATHS } from "../paths";

interface WorkspaceJson {
  folder?: string;
  workspace?: string;
}

// biome-ignore lint: flexible session shape from JSONL replay
type SessionData = Record<string, any>;

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

  const first = JSON.parse(lines[0]);
  const session: SessionData = first.v ?? first;

  // Old format: single line with requests already populated
  if (lines.length === 1 || (session.requests?.length ?? 0) > 0) {
    return session;
  }

  // New incremental changelog format
  for (let i = 1; i < lines.length; i++) {
    const entry = JSON.parse(lines[i]);
    const kind: number = entry.kind;
    const k: (string | number)[] | undefined = entry.k;
    const v: unknown = entry.v;

    if (!Array.isArray(k) || k.length === 0) continue;

    if (kind === 1) {
      // SET: traverse path and set value at last key
      let obj: SessionData = session;
      for (let j = 0; j < k.length - 1; j++) {
        const key = k[j];
        if (typeof key === "number") {
          if (!Array.isArray(obj)) break;
          while (obj.length <= key) obj.push(null);
          if (obj[key] == null) obj[key] = typeof k[j + 1] === "number" ? [] : {};
          obj = obj[key];
        } else {
          if (!(key in obj)) obj[key] = typeof k[j + 1] === "number" ? [] : {};
          obj = obj[key];
        }
      }
      const last = k[k.length - 1];
      if (Array.isArray(obj) && typeof last === "number") {
        while (obj.length <= last) obj.push(null);
        obj[last] = v;
      } else if (typeof obj === "object" && obj !== null) {
        (obj as Record<string, unknown>)[last as string] = v;
      }
    } else if (kind === 2) {
      // PUSH: traverse path to target array, extend with v items
      let obj: unknown = session;
      for (const key of k) {
        if (typeof key === "number" && Array.isArray(obj)) {
          while (obj.length <= key) obj.push(null);
          obj = obj[key];
        } else if (typeof obj === "object" && obj !== null) {
          const rec = obj as Record<string, unknown>;
          if (!(key as string in rec)) rec[key as string] = [];
          obj = rec[key as string];
        }
      }
      if (Array.isArray(obj) && Array.isArray(v)) {
        obj.push(...v);
      }
    }
  }

  return session;
}

/**
 * Extract user message text from a request object.
 * Old format: `message` is a string.
 * New format: `message` is `{ text: string }`.
 */
function extractMessageText(req: SessionData): string {
  const msg = req.message;
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object" && msg.text) return msg.text;
  return "";
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
      if (!("kind" in part) && part.value) {
        textParts.push(part.value);
      }
    }
    return textParts.join("");
  }

  // Old format: object with message field
  if (typeof resp === "object" && resp.message) return resp.message;
  return JSON.stringify(resp);
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
        const session = replayChangelog(raw);

        const requests = session.requests ?? [];
        if (requests.length === 0) continue;

        const title =
          session.customTitle ||
          (() => {
            const text = extractMessageText(requests[0]);
            return text.length > 80 ? `${text.slice(0, 80)}…` : text || "Untitled";
          })();

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
    const session = replayChangelog(raw);
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
      if (!req || typeof req !== "object") continue;

      const userText = extractMessageText(req);
      messages.push({
        id: `copilot:${sessionId}:${i * 2}`,
        role: "user",
        content: userText,
        timestamp: req.timestamp ? new Date(req.timestamp).toISOString() : "",
        provider: "copilot",
      });

      const responseText = extractResponseText(req);
      if (responseText) {
        messages.push({
          id: `copilot:${sessionId}:${i * 2 + 1}`,
          role: "assistant",
          content: responseText,
          timestamp: req.timestamp ? new Date(req.timestamp).toISOString() : "",
          provider: "copilot",
        });
      }
    }

    const title =
      session.customTitle ||
      (() => {
        const text = extractMessageText(requests[0]);
        return text.length > 80 ? `${text.slice(0, 80)}…` : text || "Untitled";
      })();

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
