import { existsSync } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { isProviderId } from "../../src/types/provider";
import { cache } from "../cache";
import { PARSERS } from "../parsers";

const app = new Hono();

async function getAllMemoryFiles(): Promise<MemoryFile[]> {
  const cached = cache.get<MemoryFile[]>("memory:list");
  if (cached) return cached;

  // Per-project memory files (e.g. gemini's project-level GEMINI.md) need the
  // workspace paths to be discoverable. Use whatever conversation cache has
  // already populated; parsers fall back to their own discovery when empty.
  const conversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const knownProjectPaths = Array.from(
    new Set(conversations.map((c) => c.projectPath).filter((p): p is string => p !== null)),
  );

  const groups = await Promise.all(
    PARSERS.map((p) => p.scanMemoryFiles?.(knownProjectPaths) ?? []),
  );
  const all = groups.flat();
  cache.set("memory:list", all, Date.now());
  return all;
}

const ALLOWED_ROOTS = PARSERS.flatMap((p) => p.roots).map((r) => resolve(r));

function isWithinAllowedRoot(filePath: string): boolean {
  const resolvedFile = resolve(filePath);
  return ALLOWED_ROOTS.some((root) => {
    const rel = relative(root, resolvedFile);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  });
}

app.get("/", async (c) => {
  const provider = c.req.query("provider");
  let files = await getAllMemoryFiles();

  if (provider) {
    if (!isProviderId(provider)) {
      return c.json({ error: "Unknown provider" }, 400);
    }
    files = files.filter((f) => f.provider === provider);
  }

  return c.json({ data: files });
});

app.get("/:id{.+}", async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const files = await getAllMemoryFiles();
  const file = files.find((f) => f.id === id);

  if (!file) {
    return c.json({ error: "Memory file not found" }, 404);
  }

  return c.json(file);
});

app.put("/:id{.+}", async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const files = await getAllMemoryFiles();
  const file = files.find((f) => f.id === id);

  if (!file) {
    return c.json({ error: "Memory file not found" }, 404);
  }

  if (!existsSync(file.filePath)) {
    return c.json({ error: "File no longer exists on disk" }, 404);
  }

  if (!isWithinAllowedRoot(file.filePath)) {
    return c.json({ error: "Write denied — path outside allowed directories" }, 403);
  }

  const body = await c.req.json<{ content: string }>();

  if (!body.content || typeof body.content !== "string") {
    return c.json({ error: "Content must be a non-empty string" }, 400);
  }

  await writeFile(file.filePath, body.content, "utf-8");
  const stats = await stat(file.filePath);

  file.content = body.content;
  file.updatedAt = stats.mtime.toISOString();
  file.sizeBytes = stats.size;

  // Search index embeds memory content; rebuild on next query.
  cache.invalidate("search:index");

  return c.json({ success: true, updatedAt: file.updatedAt });
});

export default app;
