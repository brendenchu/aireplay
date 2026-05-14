import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type {
  Conversation,
  ConversationDetail,
  Message,
  ToolCall,
} from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";
import type { ClaudeCodeJsonlEntry, ClaudeContentBlock } from "../types";

export function decodePath(encoded: string): string {
  // `-Users-brendenchu-Workspaces` → `/Users/brendenchu/Workspaces`
  // The encoded path starts with `-` which represents the leading `/`
  return encoded.replace(/-/g, "/");
}

export function encodePath(decoded: string): string {
  return decoded.replace(/\//g, "-");
}

function extractTextContent(content: string | ClaudeContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n");
}

function extractToolCalls(content: string | ClaudeContentBlock[]): ToolCall[] {
  if (typeof content === "string") return [];
  return content
    .filter((b) => b.type === "tool_use")
    .map((b) => ({
      name: b.name ?? "unknown",
      input: typeof b.input === "string" ? b.input : JSON.stringify(b.input ?? {}),
      output: typeof b.content === "string" ? b.content : undefined,
    }));
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max).trimEnd()}…`;
}

function parseJsonlLines(raw: string): ClaudeCodeJsonlEntry[] {
  const entries: ClaudeCodeJsonlEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

function isMessageEntry(e: ClaudeCodeJsonlEntry): boolean {
  if (e.type !== "user" && e.type !== "assistant") return false;
  if (e.isSidechain || e.isMeta) return false;
  return true;
}

function latestAiTitle(entries: ClaudeCodeJsonlEntry[]): string | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === "ai-title") {
      return entries[i].aiTitle ?? null;
    }
  }
  return null;
}

function projectFromEntries(entries: ClaudeCodeJsonlEntry[], folderName: string): string {
  for (const e of entries) {
    if (typeof e.cwd === "string" && e.cwd) return e.cwd;
  }
  return decodePath(folderName);
}

export async function scanSessions(): Promise<Conversation[]> {
  const projectsDir = PATHS.claudeCode.projects;
  if (!existsSync(projectsDir)) return [];

  const projectFolders = await readdir(projectsDir, { withFileTypes: true });
  const conversations: Conversation[] = [];

  for (const folder of projectFolders) {
    if (!folder.isDirectory()) continue;

    const folderPath = join(projectsDir, folder.name);
    const files = await readdir(folderPath);
    const jsonlFiles = files.filter((f: string) => f.endsWith(".jsonl"));

    for (const file of jsonlFiles) {
      const filePath = join(folderPath, file);
      const sessionId = basename(file, ".jsonl");

      try {
        const raw = await readFile(filePath, "utf-8");
        const entries = parseJsonlLines(raw);
        const projectPath = projectFromEntries(entries, folder.name);
        const projectName = basename(projectPath);

        const aiTitle = latestAiTitle(entries);
        const messages = entries.filter(isMessageEntry);

        if (messages.length === 0) continue;

        const firstUser = messages.find((e) => e.type === "user");
        const firstUserText = firstUser?.message
          ? extractTextContent(firstUser.message.content)
          : "";

        const title = aiTitle ?? (truncate(firstUserText, 80) || "Untitled");

        const timestamps = messages.map((m) => m.timestamp).filter(Boolean) as string[];

        conversations.push({
          id: `claude-code:${sessionId}`,
          provider: "claude-code",
          sessionId,
          projectPath,
          projectName,
          title,
          startedAt: timestamps[0] ?? "",
          lastMessageAt: timestamps[timestamps.length - 1] ?? "",
          messageCount: messages.length,
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
    const entries = parseJsonlLines(raw);

    const sessionId = basename(filePath, ".jsonl");
    const folderName = basename(join(filePath, ".."));
    const projectPath = projectFromEntries(entries, folderName);
    const projectName = basename(projectPath);

    const aiTitle = latestAiTitle(entries);
    const messageEntries = entries.filter(isMessageEntry);

    if (messageEntries.length === 0) return null;

    const firstUser = messageEntries.find((e) => e.type === "user");
    const firstUserText = firstUser?.message ? extractTextContent(firstUser.message.content) : "";

    const messages: Message[] = messageEntries.map((entry, index) => ({
      id: `claude-code:${sessionId}:${index}`,
      role: entry.message?.role as Message["role"],
      content: entry.message?.content ? extractTextContent(entry.message.content) : "",
      timestamp: entry.timestamp ?? "",
      provider: "claude-code" as const,
      toolCalls:
        entry.type === "assistant" && entry.message?.content
          ? extractToolCalls(entry.message.content)
          : undefined,
    }));

    const timestamps = messageEntries.map((m) => m.timestamp).filter(Boolean) as string[];

    return {
      id: `claude-code:${sessionId}`,
      provider: "claude-code",
      sessionId,
      projectPath,
      projectName,
      title: aiTitle ?? (truncate(firstUserText, 80) || "Untitled"),
      startedAt: timestamps[0] ?? "",
      lastMessageAt: timestamps[timestamps.length - 1] ?? "",
      messageCount: messages.length,
      filePath,
      messages,
    };
  } catch {
    return null;
  }
}

export async function scanMemoryFiles(): Promise<MemoryFile[]> {
  const projectsDir = PATHS.claudeCode.projects;
  if (!existsSync(projectsDir)) return [];

  const memoryFiles: MemoryFile[] = [];
  const projectFolders = await readdir(projectsDir, { withFileTypes: true });

  for (const folder of projectFolders) {
    if (!folder.isDirectory()) continue;

    const memoryDir = join(projectsDir, folder.name, "memory");
    if (!existsSync(memoryDir)) continue;

    const files = await readdir(memoryDir);
    const projectPath = decodePath(folder.name);
    const projectName = projectPath.split("/").pop() ?? projectPath;

    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = join(memoryDir, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const stats = await stat(filePath);

        memoryFiles.push({
          id: `claude-code:projects/${folder.name}/memory/${file}`,
          provider: "claude-code",
          filePath,
          relativePath: `projects/${folder.name}/memory/${file}`,
          projectPath,
          projectName,
          name: file,
          content,
          updatedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  // Also include global CLAUDE.md
  const globalMemory = PATHS.claudeCode.globalMemory;
  if (existsSync(globalMemory)) {
    try {
      const content = await readFile(globalMemory, "utf-8");
      const stats = await stat(globalMemory);
      memoryFiles.push({
        id: "claude-code:CLAUDE.md",
        provider: "claude-code",
        filePath: globalMemory,
        relativePath: "CLAUDE.md",
        projectPath: null,
        projectName: null,
        name: "CLAUDE.md",
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
