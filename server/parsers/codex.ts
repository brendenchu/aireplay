import type { Dirent } from "node:fs";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type {
  Conversation,
  ConversationDetail,
  Message,
  ToolCall,
} from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";
import {
  compareLastMessageDesc,
  flattenTextContent,
  isRecord,
  parseJsonlLines,
  truncateTitle,
} from "./_shared";

/**
 * Codex stores the browsable transcript in `~/.codex/sessions/YYYY/MM/DD/*.jsonl`.
 * `~/.codex/history.jsonl` is only a prompt-history index, so it is useful for
 * fallback titles but not enough to reconstruct conversations.
 */

interface HistoryEntry {
  session_id: string;
  ts: number;
  text: string;
}

interface CodexSessionEntry {
  type: string;
  timestamp?: string;
  payload: Record<string, unknown>;
}

interface SessionMeta {
  sessionId: string;
  projectPath: string | null;
  projectName: string | null;
  startedAt: string;
  lastMessageAt: string;
  title: string;
  messages: Message[];
  filePath: string;
}

function toIsoTimestamp(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "number") return "";

  // Codex history currently uses seconds; sqlite state uses seconds/ms depending
  // on column. Accept both so fallback data stays stable across versions.
  const millis = value > 10_000_000_000 ? value : value * 1000;
  return new Date(millis).toISOString();
}

function parseHistoryLines(raw: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const parsed of parseJsonlLines(raw)) {
    if (!isRecord(parsed)) continue;
    if (
      typeof parsed.session_id === "string" &&
      typeof parsed.ts === "number" &&
      typeof parsed.text === "string"
    ) {
      entries.push({
        session_id: parsed.session_id,
        ts: parsed.ts,
        text: parsed.text,
      });
    }
  }
  return entries;
}

async function readHistoryTitleMap(): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (!existsSync(PATHS.codex.history)) return titles;

  try {
    const raw = await readFile(PATHS.codex.history, "utf-8");
    for (const entry of parseHistoryLines(raw)) {
      if (!titles.has(entry.session_id)) {
        titles.set(entry.session_id, truncateTitle(entry.text.trim()) || "Untitled");
      }
    }
  } catch {
    // ignore prompt-history failures; session files are authoritative
  }

  return titles;
}

function parseSessionEntries(raw: string): CodexSessionEntry[] {
  const entries: CodexSessionEntry[] = [];
  for (const parsed of parseJsonlLines(raw)) {
    if (!isRecord(parsed)) continue;
    if (typeof parsed.type !== "string" || !isRecord(parsed.payload)) continue;
    entries.push({
      type: parsed.type,
      timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : undefined,
      payload: parsed.payload,
    });
  }
  return entries;
}

async function findSessionFiles(dir = PATHS.codex.sessions): Promise<string[]> {
  if (!existsSync(dir)) return [];

  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSessionFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
  return files;
}

function sessionIdFromFile(filePath: string): string {
  const file = basename(filePath, ".jsonl");
  const match = file.match(
    /^rollout-.+?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return match?.[1] ?? file;
}

function codexRoleToMessageRole(role: unknown): Message["role"] | null {
  if (role === "user" || role === "assistant" || role === "system") return role;
  if (role === "developer") return "system";
  return null;
}

function parseUserEvent(
  entry: CodexSessionEntry,
  sessionId: string,
  index: number,
): Message | null {
  if (entry.type !== "event_msg" || entry.payload.type !== "user_message") return null;
  const content = typeof entry.payload.message === "string" ? entry.payload.message : "";
  if (!content.trim()) return null;
  return {
    id: `codex:${sessionId}:event:${index}`,
    role: "user",
    content,
    timestamp: entry.timestamp ?? "",
    provider: "codex",
  };
}

function parseResponseMessage(
  entry: CodexSessionEntry,
  sessionId: string,
  index: number,
): Message | null {
  if (entry.type !== "response_item" || entry.payload.type !== "message") return null;

  const role = codexRoleToMessageRole(entry.payload.role);
  if (!role) return null;

  const content = flattenTextContent(entry.payload.content);
  if (!content.trim()) return null;

  return {
    id: `codex:${sessionId}:response:${index}`,
    role,
    content,
    timestamp: entry.timestamp ?? "",
    provider: "codex",
  };
}

function attachToolOutput(
  toolCalls: ToolCall[],
  callIdToTool: Map<string, ToolCall>,
  entry: CodexSessionEntry,
) {
  if (entry.type !== "response_item" || entry.payload.type !== "function_call_output") return;
  const callId = typeof entry.payload.call_id === "string" ? entry.payload.call_id : "";
  const toolCall = callIdToTool.get(callId);
  if (!toolCall) return;
  toolCall.output = typeof entry.payload.output === "string" ? entry.payload.output : "";
  if (!toolCalls.includes(toolCall)) toolCalls.push(toolCall);
}

function summarizeSessionFile(
  filePath: string,
  entries: CodexSessionEntry[],
  historyTitles: Map<string, string>,
): SessionMeta | null {
  const metaEntry = entries.find((entry) => entry.type === "session_meta");
  const sessionId =
    (typeof metaEntry?.payload.id === "string" ? metaEntry.payload.id : null) ??
    sessionIdFromFile(filePath);

  const projectPath = typeof metaEntry?.payload.cwd === "string" ? metaEntry.payload.cwd : null;
  const projectName = projectPath ? basename(projectPath) : null;

  const messages: Message[] = [];
  const toolCallById = new Map<string, ToolCall>();
  let lastAssistant: Message | null = null;
  const hasUserEvents = entries.some(
    (entry) => entry.type === "event_msg" && entry.payload.type === "user_message",
  );

  entries.forEach((entry, index) => {
    const userEvent = parseUserEvent(entry, sessionId, index);
    if (userEvent) {
      messages.push(userEvent);
      return;
    }

    const responseMessage = parseResponseMessage(entry, sessionId, index);
    if (responseMessage) {
      if (hasUserEvents && responseMessage.role === "user") return;
      if (responseMessage.role === "system") return;
      messages.push(responseMessage);
      lastAssistant = responseMessage.role === "assistant" ? responseMessage : null;
      return;
    }

    if (entry.type === "response_item" && entry.payload.type === "function_call") {
      const name = typeof entry.payload.name === "string" ? entry.payload.name : "unknown";
      const input = typeof entry.payload.arguments === "string" ? entry.payload.arguments : "";
      const toolCall: ToolCall = { name, input };
      const callId = typeof entry.payload.call_id === "string" ? entry.payload.call_id : "";
      if (callId) toolCallById.set(callId, toolCall);
      if (lastAssistant) {
        lastAssistant.toolCalls = [...(lastAssistant.toolCalls ?? []), toolCall];
      }
      return;
    }

    if (lastAssistant?.toolCalls) {
      attachToolOutput(lastAssistant.toolCalls, toolCallById, entry);
    }
  });

  if (messages.length === 0) return null;

  const timestamps = messages.map((message) => message.timestamp).filter(Boolean);
  const startedAt =
    timestamps[0] ??
    toIsoTimestamp(metaEntry?.payload.timestamp) ??
    entries.find((entry) => entry.timestamp)?.timestamp ??
    "";
  const lastMessageAt = timestamps[timestamps.length - 1] ?? startedAt;

  const firstUser = messages.find((message) => message.role === "user");
  const title =
    historyTitles.get(sessionId) ?? truncateTitle(firstUser?.content.trim() ?? "") ?? "Untitled";

  return {
    sessionId,
    projectPath,
    projectName,
    title: title || "Untitled",
    startedAt,
    lastMessageAt,
    messages,
    filePath,
  };
}

async function readSession(
  filePath: string,
  historyTitles: Map<string, string>,
): Promise<SessionMeta | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return summarizeSessionFile(filePath, parseSessionEntries(raw), historyTitles);
  } catch {
    return null;
  }
}

async function sessionFileForId(sessionId: string): Promise<string | null> {
  for (const filePath of await findSessionFiles()) {
    if (sessionIdFromFile(filePath) === sessionId) return filePath;
    try {
      const raw = await readFile(filePath, "utf-8");
      const meta = parseSessionEntries(raw).find((entry) => entry.type === "session_meta");
      if (meta?.payload.id === sessionId) return filePath;
    } catch {
      // skip unreadable files
    }
  }
  return null;
}

export async function scanSessions(): Promise<Conversation[]> {
  const historyTitles = await readHistoryTitleMap();
  const sessionFiles = await findSessionFiles();
  const conversations: Conversation[] = [];

  for (const filePath of sessionFiles) {
    const summary = await readSession(filePath, historyTitles);
    if (!summary) continue;
    conversations.push({
      id: `codex:${summary.sessionId}`,
      provider: "codex",
      sessionId: summary.sessionId,
      projectPath: summary.projectPath,
      projectName: summary.projectName,
      title: summary.title,
      startedAt: summary.startedAt,
      lastMessageAt: summary.lastMessageAt,
      messageCount: summary.messages.length,
      filePath,
    });
  }

  if (conversations.length > 0) {
    return conversations.sort(compareLastMessageDesc);
  }

  // Fallback for old installs that only expose prompt history.
  if (!existsSync(PATHS.codex.history)) return [];
  try {
    const raw = await readFile(PATHS.codex.history, "utf-8");
    const bySession = new Map<string, HistoryEntry[]>();
    for (const entry of parseHistoryLines(raw)) {
      bySession.set(entry.session_id, [...(bySession.get(entry.session_id) ?? []), entry]);
    }

    for (const [sessionId, entries] of bySession) {
      entries.sort((a, b) => a.ts - b.ts);
      const startedAt = toIsoTimestamp(entries[0]?.ts);
      const lastMessageAt = toIsoTimestamp(entries[entries.length - 1]?.ts);
      conversations.push({
        id: `codex:${sessionId}`,
        provider: "codex",
        sessionId,
        projectPath: null,
        projectName: null,
        title: truncateTitle(entries[0]?.text.trim() ?? "") || "Untitled",
        startedAt,
        lastMessageAt,
        messageCount: entries.length,
        filePath: PATHS.codex.history,
      });
    }
    return conversations.sort(compareLastMessageDesc);
  } catch {
    return [];
  }
}

export async function parseSession(locator: string): Promise<ConversationDetail | null> {
  const historyTitles = await readHistoryTitleMap();
  const filePath = existsSync(locator) ? locator : await sessionFileForId(locator);

  if (filePath) {
    const summary = await readSession(filePath, historyTitles);
    if (!summary) return null;
    return {
      id: `codex:${summary.sessionId}`,
      provider: "codex",
      sessionId: summary.sessionId,
      projectPath: summary.projectPath,
      projectName: summary.projectName,
      title: summary.title,
      startedAt: summary.startedAt,
      lastMessageAt: summary.lastMessageAt,
      messageCount: summary.messages.length,
      filePath,
      messages: summary.messages,
    };
  }

  // Fallback detail for old prompt-history-only installs.
  if (!existsSync(PATHS.codex.history)) return null;
  try {
    const raw = await readFile(PATHS.codex.history, "utf-8");
    const entries = parseHistoryLines(raw)
      .filter((entry) => entry.session_id === locator)
      .sort((a, b) => a.ts - b.ts);

    if (entries.length === 0) return null;

    const messages: Message[] = entries.map((entry, index) => ({
      id: `codex:${locator}:history:${index}`,
      role: "user",
      content: entry.text,
      timestamp: toIsoTimestamp(entry.ts),
      provider: "codex",
    }));

    return {
      id: `codex:${locator}`,
      provider: "codex",
      sessionId: locator,
      projectPath: null,
      projectName: null,
      title: truncateTitle(entries[0]?.text.trim() ?? "") || "Untitled",
      startedAt: messages[0]?.timestamp ?? "",
      lastMessageAt: messages[messages.length - 1]?.timestamp ?? "",
      messageCount: messages.length,
      filePath: PATHS.codex.history,
      messages,
    };
  } catch {
    return null;
  }
}

export async function scanMemoryFiles(): Promise<MemoryFile[]> {
  const memoryFiles: MemoryFile[] = [];

  const agentsMd = PATHS.codex.instructions;
  if (existsSync(agentsMd)) {
    try {
      const content = await readFile(agentsMd, "utf-8");
      const stats = await stat(agentsMd);
      memoryFiles.push({
        id: "codex:AGENTS.md",
        provider: "codex",
        filePath: agentsMd,
        relativePath: "AGENTS.md",
        projectPath: null,
        projectName: null,
        name: "AGENTS.md",
        content,
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      });
    } catch {
      // skip unreadable files
    }
  }

  if (existsSync(PATHS.codex.memories)) {
    try {
      await scanMemoriesDir(PATHS.codex.memories, memoryFiles);
    } catch {
      // skip corrupt memory trees
    }
  }

  return memoryFiles;
}

async function scanMemoriesDir(dir: string, memoryFiles: MemoryFile[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isFile() && entry.name.endsWith(".md")) {
      try {
        const content = await readFile(fullPath, "utf-8");
        const stats = await stat(fullPath);
        const relativePath = relative(PATHS.codex.root, fullPath);

        memoryFiles.push({
          id: `codex:${relativePath}`,
          provider: "codex",
          filePath: fullPath,
          relativePath,
          projectPath: null,
          projectName: null,
          name: entry.name,
          content,
          updatedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
        });
      } catch {
        // skip unreadable files
      }
    } else if (entry.isDirectory()) {
      await scanMemoriesDir(fullPath, memoryFiles);
    }
  }
}
