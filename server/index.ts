import { Hono } from "hono";
import { cache } from "./cache";
import conversations from "./routes/conversations";
import memory from "./routes/memory";
import projects from "./routes/projects";
import search from "./routes/search";
import sync, { runSync } from "./routes/sync";

export function createApp() {
  const app = new Hono().basePath("/api");

  // Lazy sync: run on first request if cache is empty. Coalesce concurrent
  // first requests so a burst only triggers one runSync.
  let lazySync: Promise<unknown> | null = null;
  app.use("*", async (_c, next) => {
    if (!cache.get("conversations:list")) {
      if (!lazySync) lazySync = runSync().finally(() => (lazySync = null));
      await lazySync;
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
