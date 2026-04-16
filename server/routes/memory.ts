import { existsSync } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { Hono } from "hono";
import type { MemoryFile } from "../../src/types/memory";
import { cache } from "../cache";
import * as claudeCode from "../parsers/claude-code";
import * as codex from "../parsers/codex";
import * as gemini from "../parsers/gemini";
import { PATHS } from "../paths";

const app = new Hono();

async function getAllMemoryFiles(): Promise<MemoryFile[]> {
  const cached = cache.get<MemoryFile[]>("memory:list");
  if (cached) return cached;

  const [cc, gm, cx] = await Promise.all([
    claudeCode.scanMemoryFiles(),
    gemini.scanGeminiMdFiles([]), // TODO: pass discovered workspace paths for per-project GEMINI.md
    codex.scanMemoryFiles(),
  ]);

  const all = [...cc, ...gm, ...cx];
  cache.set("memory:list", all, Date.now());
  return all;
}

// Known provider root directories for path traversal guard
const ALLOWED_ROOTS = [PATHS.claudeCode.root, PATHS.gemini.root, PATHS.codex.root];

function isWithinAllowedRoot(filePath: string): boolean {
  return ALLOWED_ROOTS.some((root) => filePath.startsWith(`${root}/`));
}

app.get("/", async (c) => {
  const provider = c.req.query("provider");
  let files = await getAllMemoryFiles();

  if (provider) {
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

  // Update cached entry
  file.content = body.content;
  file.updatedAt = stats.mtime.toISOString();
  file.sizeBytes = stats.size;

  return c.json({ success: true, updatedAt: file.updatedAt });
});

export default app;
