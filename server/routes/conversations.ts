import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import { isProviderId } from "../../src/types/provider";
import { cache } from "../cache";
import { findParserById, PARSERS } from "../parsers";
import { compareLastMessageDesc } from "../parsers/_shared";

function parseIntInRange(raw: string | undefined, fallback: number, min: number, max: number) {
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

const app = new Hono();

async function getAllConversations(): Promise<Conversation[]> {
  const cached = cache.get<Conversation[]>("conversations:list");
  if (cached) return cached;

  const groups = await Promise.all(PARSERS.map((p) => p.scanSessions()));
  const all = groups.flat().sort(compareLastMessageDesc);

  cache.set("conversations:list", all);
  return all;
}

app.get("/", async (c) => {
  const provider = c.req.query("provider");
  const project = c.req.query("project");
  const limit = parseIntInRange(c.req.query("limit"), 50, 1, 200);
  const offset = parseIntInRange(c.req.query("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const sort = c.req.query("sort") ?? "recent";

  if (limit === null) return c.json({ error: "Invalid limit (1-200)" }, 400);
  if (offset === null) return c.json({ error: "Invalid offset" }, 400);

  let conversations = await getAllConversations();

  if (provider) {
    if (!isProviderId(provider)) {
      return c.json({ error: "Unknown provider" }, 400);
    }
    conversations = conversations.filter((cv) => cv.provider === provider);
  }
  if (project) {
    conversations = conversations.filter((cv) => cv.projectPath === project);
  }
  if (sort === "oldest") {
    conversations = [...conversations].reverse();
  }

  const total = conversations.length;
  const data = conversations.slice(offset, offset + limit);

  return c.json({ data, total });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [provider] = id.split(":");

  const all = await getAllConversations();
  const convo = all.find((cv) => cv.id === id);
  if (!convo) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  const parser = findParserById(provider);
  const detail = await parser?.parseSession(convo.filePath);

  if (!detail) {
    return c.json({ error: "Failed to parse conversation" }, 500);
  }

  return c.json(detail);
});

export default app;
