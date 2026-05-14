import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import type { Provider, ProviderId } from "../../src/types/provider";
import { cache } from "../cache";
import { PARSERS } from "../parsers";

const app = new Hono();

async function runSync(providerFilter?: ProviderId) {
  const start = Date.now();
  const results: Record<string, { conversations: number; memoryFiles: number; duration: number }> =
    {};

  cache.invalidate("conversations:list");
  cache.invalidate("memory:list");
  cache.invalidate("search:index");

  for (const parser of PARSERS) {
    if (providerFilter && providerFilter !== parser.id) continue;
    if (!parser.available()) continue;

    const s = Date.now();
    const conversations = await parser.scanSessions();
    const memoryFiles = parser.scanMemoryFiles ? await parser.scanMemoryFiles() : [];

    const existing = cache.get<Conversation[]>("conversations:list") ?? [];
    cache.set("conversations:list", [...existing, ...conversations], Date.now());
    if (memoryFiles.length > 0) {
      const existingMem = cache.get<MemoryFile[]>("memory:list") ?? [];
      cache.set("memory:list", [...existingMem, ...memoryFiles], Date.now());
    }

    results[parser.id] = {
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
  const providers: Provider[] = PARSERS.map((p) => ({
    id: p.id,
    name: p.displayName,
    available: p.available(),
    lastSynced: null,
    stats: { conversations: 0, memoryFiles: 0 },
  }));

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
