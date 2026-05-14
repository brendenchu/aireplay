import type { Dirent } from "node:fs";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import { PATHS } from "../paths";

/**
 * Standalone GitHub Copilot CLI (the new agentic terminal CLI, not `gh copilot`).
 *
 * Storage: `~/.copilot/session-state/{session-id}/`
 *   workspace.yaml — flat key:value with id, cwd, summary, created_at, updated_at
 *   events.jsonl   — typed event stream: session.start, user.message,
 *                    assistant.message, assistant.turn_start/end, session.info,
 *                    session.shutdown, etc.
 *
 * Each event: { type, data, id, timestamp, parentId }
 */

interface WorkspaceMeta {
  id?: string;
  cwd?: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
}

interface CopilotEvent {
  type: string;
  data: Record<string, unknown>;
  id: string;
  timestamp: string;
  parentId: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMessage(value: Message | null): value is Message {
  return value !== null;
}

function extractContentText(value: unknown): string {
  if (typeof value === "string") return value;

  if (isRecord(value)) {
    if (typeof value.text === "string") return value.text;
    if (typeof value.content === "string") return value.content;
    return "";
  }

  if (!Array.isArray(value)) return "";

  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (isRecord(part) && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * workspace.yaml is a small flat document — values are unquoted strings,
 * numbers, or ISO dates. Avoid pulling in a YAML dependency for this shape.
 */
function parseFlatYaml(raw: string): WorkspaceMeta {
  const result: WorkspaceMeta = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (!key) continue;
    (result as Record<string, string>)[key] = value;
  }
  return result;
}

async function readWorkspaceMeta(sessionDir: string): Promise<WorkspaceMeta> {
  const file = join(sessionDir, "workspace.yaml");
  if (!existsSync(file)) return {};
  try {
    return parseFlatYaml(await readFile(file, "utf-8"));
  } catch {
    return {};
  }
}

async function readEvents(sessionDir: string): Promise<CopilotEvent[]> {
  const file = join(sessionDir, "events.jsonl");
  if (!existsSync(file)) return [];
  let raw: string;
  try {
    raw = await readFile(file, "utf-8");
  } catch {
    return [];
  }
  const events: CopilotEvent[] = [];
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
    if (typeof obj.type !== "string" || typeof obj.id !== "string") continue;
    events.push({
      type: obj.type,
      data: isRecord(obj.data) ? obj.data : {},
      id: obj.id,
      timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
      parentId: typeof obj.parentId === "string" ? obj.parentId : null,
    });
  }
  return events;
}

function eventToMessage(event: CopilotEvent, sessionId: string): Message | null {
  if (event.type === "user.message") {
    const content = extractContentText(event.data.content);
    const transformedContent =
      typeof event.data.transformedContent === "string" ? event.data.transformedContent : "";
    const finalContent = content.trim() ? content : transformedContent;
    if (!finalContent.trim()) return null;
    return {
      id: `copilot-cli:${sessionId}:${event.id}`,
      role: "user",
      content: finalContent,
      timestamp: event.timestamp,
      provider: "copilot-cli",
    };
  }
  if (event.type === "assistant.message") {
    const content = extractContentText(event.data.content);
    if (!content.trim()) return null;
    return {
      id: `copilot-cli:${sessionId}:${event.id}`,
      role: "assistant",
      content,
      timestamp: event.timestamp,
      provider: "copilot-cli",
    };
  }
  return null;
}

interface SessionSummary {
  sessionId: string;
  cwd: string | null;
  title: string;
  startedAt: string;
  lastMessageAt: string;
  events: CopilotEvent[];
  sessionDir: string;
}

async function summarizeSession(sessionDir: string): Promise<SessionSummary | null> {
  const meta = await readWorkspaceMeta(sessionDir);
  const events = await readEvents(sessionDir);
  const dirName = basename(sessionDir);
  const sessionId = meta.id || dirName;
  const messages = events.map((event) => eventToMessage(event, sessionId)).filter(isMessage);

  // startedAt: workspace.yaml first, then session.start event timestamp
  const startEvent = events.find((e) => e.type === "session.start");
  const startedAt = meta.created_at || startEvent?.timestamp || "";

  // lastMessageAt: workspace.yaml first, then last parsed message timestamp
  const lastParsedMessageTs = messages.length > 0 ? messages[messages.length - 1].timestamp : "";
  const lastMessageAt = meta.updated_at || lastParsedMessageTs || startedAt;

  // cwd: workspace.yaml first, then session.start data.context.cwd
  let cwd: string | null = meta.cwd ?? null;
  if (!cwd && startEvent && isRecord(startEvent.data.context)) {
    const ctxCwd = (startEvent.data.context as { cwd?: unknown }).cwd;
    if (typeof ctxCwd === "string") cwd = ctxCwd;
  }

  // Title: workspace.yaml summary, else first user message, else "Untitled"
  let title = meta.summary?.trim() || "";
  if (!title) {
    const firstUser = messages.find((message) => message.role === "user");
    if (firstUser) {
      title = firstUser.content.slice(0, 80).trim();
    }
  }
  if (!title) title = "Untitled";

  return { sessionId, cwd, title, startedAt, lastMessageAt, events, sessionDir };
}

export async function scanSessions(): Promise<Conversation[]> {
  if (!existsSync(PATHS.copilotCli.sessionState)) return [];
  let entries: Dirent[];
  try {
    entries = await readdir(PATHS.copilotCli.sessionState, { withFileTypes: true });
  } catch {
    return [];
  }

  const conversations: Conversation[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionDir = join(PATHS.copilotCli.sessionState, entry.name);
    const summary = await summarizeSession(sessionDir);
    if (!summary) continue;

    const messageCount = summary.events
      .map((event) => eventToMessage(event, summary.sessionId))
      .filter(isMessage).length;

    conversations.push({
      id: `copilot-cli:${summary.sessionId}`,
      provider: "copilot-cli",
      sessionId: summary.sessionId,
      projectPath: summary.cwd,
      projectName: summary.cwd ? basename(summary.cwd) : null,
      title: summary.title,
      startedAt: summary.startedAt,
      lastMessageAt: summary.lastMessageAt,
      messageCount,
      filePath: join(sessionDir, "events.jsonl"),
    });
  }

  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function parseSession(filePath: string): Promise<ConversationDetail | null> {
  // filePath is .../session-state/{id}/events.jsonl — session dir is its parent
  const sessionDir = dirname(filePath);
  const summary = await summarizeSession(sessionDir);
  if (!summary) return null;

  const messages: Message[] = [];
  for (const event of summary.events) {
    const msg = eventToMessage(event, summary.sessionId);
    if (msg) messages.push(msg);
  }

  const stats = await stat(filePath).catch(() => null);

  return {
    id: `copilot-cli:${summary.sessionId}`,
    provider: "copilot-cli",
    sessionId: summary.sessionId,
    projectPath: summary.cwd,
    projectName: summary.cwd ? basename(summary.cwd) : null,
    title: summary.title,
    startedAt: summary.startedAt || (stats?.birthtime.toISOString() ?? ""),
    lastMessageAt: summary.lastMessageAt || (stats?.mtime.toISOString() ?? ""),
    messageCount: messages.length,
    filePath,
    messages,
  };
}
