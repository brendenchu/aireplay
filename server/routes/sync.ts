import { existsSync } from "node:fs";
import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import type { Provider, ProviderId } from "../../src/types/provider";
import { cache } from "../cache";
import * as claudeCode from "../parsers/claude-code";
import * as codex from "../parsers/codex";
import * as copilot from "../parsers/copilot";
import * as gemini from "../parsers/gemini";
import { PATHS } from "../paths";

const app = new Hono();

async function runSync(providerFilter?: ProviderId) {
  const start = Date.now();
  const results: Record<string, { conversations: number; memoryFiles: number; duration: number }> =
    {};

  // Clear relevant caches
  cache.invalidate("conversations:list");
  cache.invalidate("memory:list");
  cache.invalidate("search:index");

  const shouldSync = (id: ProviderId) => !providerFilter || providerFilter === id;

  if (shouldSync("claude-code") && existsSync(PATHS.claudeCode.root)) {
    const s = Date.now();
    const conversations = await claudeCode.scanSessions();
    const memoryFiles = await claudeCode.scanMemoryFiles();

    // Merge into cache
    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations], Date.now());
    const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
    cache.set("memory:list", [...existingMem, ...memoryFiles], Date.now());

    results["claude-code"] = {
      conversations: conversations.length,
      memoryFiles: memoryFiles.length,
      duration: Date.now() - s,
    };
  }

  if (shouldSync("copilot") && existsSync(PATHS.copilot.workspaceStorage)) {
    const s = Date.now();
    const conversations = await copilot.scanSessions();
    const memoryFiles = await copilot.scanMemoryFiles();

    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations], Date.now());
    const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
    cache.set("memory:list", [...existingMem, ...memoryFiles], Date.now());

    results.copilot = {
      conversations: conversations.length,
      memoryFiles: memoryFiles.length,
      duration: Date.now() - s,
    };
  }

  if (shouldSync("gemini") && existsSync(PATHS.gemini.root)) {
    const s = Date.now();
    const conversations = await gemini.scanConversations();
    const memoryFiles = await gemini.scanGeminiMdFiles();

    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations], Date.now());
    const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
    cache.set("memory:list", [...existingMem, ...memoryFiles], Date.now());

    results.gemini = {
      conversations: conversations.length,
      memoryFiles: memoryFiles.length,
      duration: Date.now() - s,
    };
  }

  if (shouldSync("codex") && existsSync(PATHS.codex.root)) {
    const s = Date.now();
    const conversations = await codex.scanSessions();
    const memoryFiles = await codex.scanMemoryFiles();

    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations], Date.now());
    const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
    cache.set("memory:list", [...existingMem, ...memoryFiles], Date.now());

    results.codex = {
      conversations: conversations.length,
      memoryFiles: memoryFiles.length,
      duration: Date.now() - s,
    };
  }

  return { providers: results, duration: Date.now() - start };
}

app.post("/", async (c) => {
  const body = await c.req
    .json<{ provider?: ProviderId }>()
    .catch((): { provider?: ProviderId } => ({}));
  const result = await runSync(body.provider);
  return c.json(result);
});

app.get("/status", (c) => {
  const providers: Provider[] = [
    {
      id: "claude-code",
      name: "Claude Code",
      available: existsSync(PATHS.claudeCode.root),
      lastSynced: null,
      stats: { conversations: 0, memoryFiles: 0 },
    },
    {
      id: "copilot",
      name: "VS Code Copilot",
      available: existsSync(PATHS.copilot.workspaceStorage),
      lastSynced: null,
      stats: { conversations: 0, memoryFiles: 0 },
    },
    {
      id: "gemini",
      name: "Gemini CLI",
      available: existsSync(PATHS.gemini.root),
      lastSynced: null,
      stats: { conversations: 0, memoryFiles: 0 },
    },
    {
      id: "codex",
      name: "Codex CLI",
      available: existsSync(PATHS.codex.root),
      lastSynced: null,
      stats: { conversations: 0, memoryFiles: 0 },
    },
  ];

  // Fill in stats from cache
  const conversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const memoryFiles = cache.get<MemoryFile[]>("memory:list") ?? [];

  for (const p of providers) {
    p.stats.conversations = conversations.filter((cv) => cv.provider === p.id).length;
    p.stats.memoryFiles = memoryFiles.filter((m) => m.provider === p.id).length;
  }

  return c.json({ lastSyncedAt: null, providers });
});

export { runSync };
export default app;
