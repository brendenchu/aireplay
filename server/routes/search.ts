import { Hono } from "hono";
import MiniSearch from "minisearch";
import type { Conversation } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { isProviderId } from "../../src/types/provider";
import type { SearchResult } from "../../src/types/search";
import { cache } from "../cache";

const app = new Hono();

function generateExcerpt(content: string, query: string, maxLen = 120): string {
  if (!content) return "";
  const lower = content.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/);
  let bestPos = -1;
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) {
      bestPos = idx;
      break;
    }
  }
  if (bestPos === -1) return content.slice(0, maxLen).trim();
  const start = Math.max(0, bestPos - 40);
  const slice = content
    .slice(start, start + maxLen)
    .replace(/\n/g, " ")
    .trim();
  return (start > 0 ? "…" : "") + slice + (start + maxLen < content.length ? "…" : "");
}

function getOrBuildIndex(): MiniSearch {
  const cached = cache.get<MiniSearch>("search:index");
  if (cached) return cached;

  const index = new MiniSearch({
    fields: ["title", "content", "name"],
    storeFields: ["type", "provider", "title"],
    idField: "id",
  });

  const conversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const memoryFiles = cache.get<MemoryFile[]>("memory:list") ?? [];

  // Index conversations (title only for now — full content indexing deferred)
  for (const convo of conversations) {
    index.add({
      id: convo.id,
      type: "conversation",
      provider: convo.provider,
      title: convo.title,
      content: "",
      name: "",
    });
  }

  // Index memory files (name + content)
  for (const mem of memoryFiles) {
    index.add({
      id: mem.id,
      type: "memory",
      provider: mem.provider,
      title: mem.name,
      content: mem.content,
      name: mem.name,
    });
  }

  cache.set("search:index", index);
  return index;
}

app.get("/", (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ results: [] });
  }

  const provider = c.req.query("provider");
  const type = c.req.query("type") ?? "all";
  const limitRaw = c.req.query("limit");
  const limit = limitRaw === undefined ? 20 : Number.parseInt(limitRaw, 10);

  if (provider && !isProviderId(provider)) {
    return c.json({ error: "Unknown provider" }, 400);
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    return c.json({ error: "Invalid limit (1-200)" }, 400);
  }

  try {
    const index = getOrBuildIndex();
    let rawResults = index.search(q, { fuzzy: 0.2 });

    if (provider) {
      rawResults = rawResults.filter((r) => r.provider === provider);
    }
    if (type !== "all") {
      rawResults = rawResults.filter((r) => r.type === type);
    }

    // Build a lookup for memory file content (for excerpts)
    const memoryFiles = cache.get<MemoryFile[]>("memory:list") ?? [];
    const memoryMap = new Map(memoryFiles.map((m) => [m.id, m.content]));

    const results: SearchResult[] = rawResults.slice(0, limit).map((r) => ({
      type: r.type as "conversation" | "memory",
      id: r.id,
      title: r.title ?? "",
      provider: r.provider,
      excerpt: r.type === "memory" ? generateExcerpt(memoryMap.get(r.id) ?? "", q) : "",
      score: r.score,
      matchedField: r.match ? Object.keys(r.match).join(", ") : "",
    }));

    return c.json({ results });
  } catch (err) {
    console.error("[search] error:", err);
    return c.json({ error: "Search failed" }, 500);
  }
});

export default app;
