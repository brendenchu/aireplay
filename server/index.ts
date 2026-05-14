import { Hono } from "hono";
import { cache } from "./cache";
import conversations from "./routes/conversations";
import memory from "./routes/memory";
import projects from "./routes/projects";
import search from "./routes/search";
import sync from "./routes/sync";
import { runSync } from "./sync-engine";

export function createApp() {
  const app = new Hono().basePath("/api");

  // Lazy sync: kick off a scan on first request if cache is empty.
  // `runSync` itself coalesces concurrent callers.
  app.use("*", async (_c, next) => {
    if (!cache.get("conversations:list")) {
      await runSync();
    }
    await next();
  });

  app.route("/conversations", conversations);
  app.route("/projects", projects);
  app.route("/memory", memory);
  app.route("/search", search);
  app.route("/sync", sync);

  return app;
}
