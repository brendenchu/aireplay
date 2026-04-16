import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Conversation, ConversationDetail, Message } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { PATHS } from "../paths";

export async function scanConversations(): Promise<Conversation[]> {
  const conversationsDir = PATHS.gemini.conversations;
  if (!existsSync(conversationsDir)) return [];

  const conversations: Conversation[] = [];
  const files = await readdir(conversationsDir, { withFileTypes: true });

  for (const entry of files) {
    const filePath = join(conversationsDir, entry.name);

    try {
      if (entry.isFile()) {
        const raw = await readFile(filePath, "utf-8");
        const stats = await stat(filePath);

        // Attempt JSON parse — format TBD, handle gracefully
        let title = entry.name;
        let messageCount = 0;

        try {
          const data = JSON.parse(raw);
          title = data.title ?? data.name ?? entry.name;
          messageCount = Array.isArray(data.messages) ? data.messages.length : 0;
        } catch {
          // Not JSON — treat as raw text
          const lines = raw.split("\n").filter((l: string) => l.trim());
          title = lines[0]?.slice(0, 80) ?? entry.name;
          messageCount = lines.length;
        }

        conversations.push({
          id: `gemini:${entry.name}`,
          provider: "gemini",
          sessionId: entry.name,
          projectPath: null,
          projectName: null,
          title,
          startedAt: stats.birthtime.toISOString(),
          lastMessageAt: stats.mtime.toISOString(),
          messageCount,
          filePath,
        });
      }
    } catch {
      // skip unreadable
    }
  }

  return conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function parseConversation(filePath: string): Promise<ConversationDetail | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const stats = await stat(filePath);
    const name = basename(filePath);

    const messages: Message[] = [];
    let title = name;

    try {
      const data = JSON.parse(raw);
      title = data.title ?? data.name ?? name;

      if (Array.isArray(data.messages)) {
        for (let i = 0; i < data.messages.length; i++) {
          const msg = data.messages[i];
          messages.push({
            id: `gemini:${name}:${i}`,
            role: msg.role === "model" ? "assistant" : (msg.role ?? "user"),
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content ?? msg.parts ?? ""),
            timestamp: msg.timestamp ?? "",
            provider: "gemini",
          });
        }
      }
    } catch {
      // Raw text fallback
      const lines = raw.split("\n").filter((l: string) => l.trim());
      title = lines[0]?.slice(0, 80) ?? name;
      messages.push({
        id: `gemini:${name}:0`,
        role: "user",
        content: raw,
        timestamp: stats.mtime.toISOString(),
        provider: "gemini",
      });
    }

    return {
      id: `gemini:${name}`,
      provider: "gemini",
      sessionId: name,
      projectPath: null,
      projectName: null,
      title,
      startedAt: stats.birthtime.toISOString(),
      lastMessageAt: stats.mtime.toISOString(),
      messageCount: messages.length,
      filePath,
      messages,
    };
  } catch {
    return null;
  }
}

export async function scanGeminiMdFiles(workspacePaths: string[]): Promise<MemoryFile[]> {
  const memoryFiles: MemoryFile[] = [];

  // Global GEMINI.md in ~/.gemini/
  const globalGemini = join(PATHS.gemini.root, "GEMINI.md");
  if (existsSync(globalGemini)) {
    try {
      const content = await readFile(globalGemini, "utf-8");
      const stats = await stat(globalGemini);
      memoryFiles.push({
        id: "gemini:GEMINI.md",
        provider: "gemini",
        filePath: globalGemini,
        relativePath: "GEMINI.md",
        projectPath: null,
        projectName: null,
        name: "GEMINI.md",
        content,
        updatedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      });
    } catch {
      // skip
    }
  }

  // Per-project GEMINI.md files
  for (const wsPath of workspacePaths) {
    const geminiMd = join(wsPath, "GEMINI.md");
    if (!existsSync(geminiMd)) continue;

    try {
      const content = await readFile(geminiMd, "utf-8");
      const stats = await stat(geminiMd);
      const projectName = wsPath.split("/").pop() ?? wsPath;

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
