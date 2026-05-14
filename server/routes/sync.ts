import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { isProviderId, type ProviderStatus } from "../../src/types/provider";
import { cache } from "../cache";
import { PARSERS } from "../parsers";
import { getLastSyncedAt, getLastSyncedByProvider, runSync } from "../sync-engine";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json<{ provider?: string }>().catch((): { provider?: string } => ({}));
  if (body.provider && !isProviderId(body.provider)) {
    return c.json({ error: "Unknown provider" }, 400);
  }
  const provider = isProviderId(body.provider) ? body.provider : undefined;
  const result = await runSync(provider);
  return c.json(result);
});

app.get("/status", (c) => {
  const perProvider = getLastSyncedByProvider();
  const providers: ProviderStatus[] = PARSERS.map((p) => ({
    id: p.id,
    name: p.displayName,
    available: p.available(),
    lastSynced: perProvider.get(p.id) ?? null,
    stats: { conversations: 0, memoryFiles: 0 },
  }));

  const conversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const memoryFiles = cache.get<MemoryFile[]>("memory:list") ?? [];

  for (const p of providers) {
    p.stats.conversations = conversations.filter((cv) => cv.provider === p.id).length;
    p.stats.memoryFiles = memoryFiles.filter((m) => m.provider === p.id).length;
  }

  return c.json({ lastSyncedAt: getLastSyncedAt(), providers });
});

export default app;
