import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";

/**
 * Codex CLI stores all history in a single `~/.codex/history.jsonl`.
 * Each line is: {"session_id":"<uuid>","ts":<unix_seconds>,"text":"<message>"}
 * Messages are grouped by session_id to form conversations.
 */

interface HistoryEntry {
  session_id: string;
  ts: number;
  text: string;
}

function parseHistoryLines(raw: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.session_id && typeof parsed.ts === "number" && typeof parsed.text === "string") {
        entries.push(parsed);
      }
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max).trimEnd()}…`;
}

function groupBySession(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.session_id);
    if (group) {
      group.push(entry);
    } else {
      groups.set(entry.session_id, [entry]);
    }
  }
  return groups;
}

export async function scanSessions(): Promise<Conversation[]> {
  const historyFile = PATHS.codex.history;
  if (!existsSync(historyFile)) return [];

  try {
    const raw = await readFile(historyFile, "utf-8");
    const entries = parseHistoryLines(raw);
    const sessions = groupBySession(entries);

    const conversations: Conversation[] = [];

    for (const [sessionId, messages] of sessions) {
      if (messages.length === 0) continue;

      // Sort messages by timestamp within each session
      messages.sort((a, b) => a.ts - b.ts);

      const firstText = messages[0].text;
      const title = truncate(firstText, 80) || "Untitled";

      const startedAt = new Date(messages[0].ts * 1000).toISOString();
      const lastMessageAt = new Date(messages[messages.length - 1].ts * 1000).toISOString();

      conversations.push({
        id: `codex:${sessionId}`,
        provider: "codex",
        sessionId,
        projectPath: null,
        projectName: null,
        title,
        startedAt,
        lastMessageAt,
        messageCount: messages.length,
        filePath: historyFile,
      });
    }

    return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  } catch {
    return [];
  }
}

export async function parseSession(sessionId: string): Promise<ConversationDetail | null> {
  const historyFile = PATHS.codex.history;
  if (!existsSync(historyFile)) return null;

  try {
    const raw = await readFile(historyFile, "utf-8");
    const entries = parseHistoryLines(raw);
    const sessionEntries = entries.filter((e) => e.session_id === sessionId);

    if (sessionEntries.length === 0) return null;

    sessionEntries.sort((a, b) => a.ts - b.ts);

    const firstText = sessionEntries[0].text;
    const title = truncate(firstText, 80) || "Untitled";

    // Codex doesn't store roles — messages alternate user/assistant
    const messages: Message[] = sessionEntries.map((entry, index) => ({
      id: `codex:${sessionId}:${index}`,
      role: (index % 2 === 0 ? "user" : "assistant") as Message["role"],
      content: entry.text,
      timestamp: new Date(entry.ts * 1000).toISOString(),
      provider: "codex" as const,
    }));

    const startedAt = new Date(sessionEntries[0].ts * 1000).toISOString();
    const lastMessageAt = new Date(
      sessionEntries[sessionEntries.length - 1].ts * 1000,
    ).toISOString();

    return {
      id: `codex:${sessionId}`,
      provider: "codex",
      sessionId,
      projectPath: null,
      projectName: null,
      title,
      startedAt,
      lastMessageAt,
      messageCount: messages.length,
      filePath: historyFile,
      messages,
    };
  } catch {
    return null;
  }
}

export async function scanMemoryFiles(): Promise<MemoryFile[]> {
  const memoryFiles: MemoryFile[] = [];

  // Global AGENTS.md instructions file
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
      // skip
    }
  }

  // Memories directory — may contain MEMORY.md, raw_memories.md, rollout_summaries/
  const memoriesDir = PATHS.codex.memories;
  if (existsSync(memoriesDir)) {
    try {
      await scanMemoriesDir(memoriesDir, memoryFiles);
    } catch {
      // skip
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
        const relativePath = fullPath.replace(`${PATHS.codex.root}/`, "");

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
        // skip unreadable
      }
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories like rollout_summaries/
      await scanMemoriesDir(fullPath, memoryFiles);
    }
  }
}
