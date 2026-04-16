import { Hono } from "hono";
import type { Conversation } from "../../src/types/conversation";
import { cache } from "../cache";
import * as claudeCode from "../parsers/claude-code";
import * as copilot from "../parsers/copilot";
import * as gemini from "../parsers/gemini";

const app = new Hono();

async function getAllConversations(): Promise<Conversation[]> {
  const cached = cache.get<Conversation[]>("conversations:list");
  if (cached) return cached;

  const [cc, cp, gm] = await Promise.all([
    claudeCode.scanSessions(),
    copilot.scanSessions(),
    gemini.scanConversations(),
  ]);

  const all = [...cc, ...cp, ...gm].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  cache.set("conversations:list", all, Date.now());
  return all;
}

app.get("/", async (c) => {
  const provider = c.req.query("provider");
  const project = c.req.query("project");
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const offset = parseInt(c.req.query("offset") ?? "0", 10);
  const sort = c.req.query("sort") ?? "recent";

  let conversations = await getAllConversations();

  if (provider) {
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
  const [provider, ...rest] = id.split(":");
  const _sessionId = rest.join(":");

  // Find the conversation to get the file path
  const all = await getAllConversations();
  const convo = all.find((cv) => cv.id === id);
  if (!convo) {
    return c.json({ error: "Conversation not found" }, 404);
  }

  let detail = null;
  if (provider === "claude-code") {
    detail = await claudeCode.parseSession(convo.filePath);
  } else if (provider === "copilot") {
    detail = await copilot.parseSession(convo.filePath);
  } else if (provider === "gemini") {
    detail = await gemini.parseConversation(convo.filePath);
  }

  if (!detail) {
    return c.json({ error: "Failed to parse conversation" }, 500);
  }

  return c.json(detail);
});

export default app;
