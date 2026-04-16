import { Hono } from "hono";
import type { Conversation, Project } from "../../src/types/conversation";
import type { MemoryFile } from "../../src/types/memory";
import { cache } from "../cache";

const app = new Hono();

function encodeProjectId(path: string): string {
  return Buffer.from(path).toString("base64url");
}

function decodeProjectId(id: string): string {
  return Buffer.from(id, "base64url").toString();
}

function buildProjects(conversations: Conversation[], memoryFiles: MemoryFile[]): Project[] {
  const projectMap = new Map<string, Project>();

  for (const convo of conversations) {
    if (!convo.projectPath) continue;

    const existing = projectMap.get(convo.projectPath);
    if (existing) {
      existing.conversationCount++;
      if (!existing.providers.includes(convo.provider)) {
        existing.providers.push(convo.provider);
      }
      if (convo.lastMessageAt > existing.lastActivityAt) {
        existing.lastActivityAt = convo.lastMessageAt;
      }
    } else {
      projectMap.set(convo.projectPath, {
        id: encodeProjectId(convo.projectPath),
        path: convo.projectPath,
        name: convo.projectName ?? convo.projectPath.split("/").pop() ?? convo.projectPath,
        providers: [convo.provider],
        conversationCount: 1,
        memoryFileCount: 0,
        lastActivityAt: convo.lastMessageAt,
      });
    }
  }

  for (const mem of memoryFiles) {
    if (!mem.projectPath) continue;
    const existing = projectMap.get(mem.projectPath);
    if (existing) {
      existing.memoryFileCount++;
    }
  }

  return [...projectMap.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

app.get("/", async (c) => {
  const conversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const memoryFiles = cache.get<MemoryFile[]>("memory:list") ?? [];

  const projects = buildProjects(conversations, memoryFiles);
  return c.json({ data: projects });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const projectPath = decodeProjectId(id);

  const allConversations = cache.get<Conversation[]>("conversations:list") ?? [];
  const allMemory = cache.get<MemoryFile[]>("memory:list") ?? [];

  const conversations = allConversations.filter((cv) => cv.projectPath === projectPath);
  const memoryFiles = allMemory.filter((m) => m.projectPath === projectPath);

  const projects = buildProjects(allConversations, allMemory);
  const project = projects.find((p) => p.path === projectPath);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json({ project, conversations, memoryFiles });
});

export default app;
