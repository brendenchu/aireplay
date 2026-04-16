import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { createApp } from "./index";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function startServer(distDir: string, port: number) {
  const app = createApp();

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";

    // API requests → Hono
    if (url.startsWith("/api")) {
      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value) {
            headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
        }

        const hasBody = req.method !== "GET" && req.method !== "HEAD";
        const body = hasBody ? await collectBody(req) : undefined;

        const request = new Request(`http://localhost${url}`, {
          method: req.method,
          headers,
          body,
        });

        const response = await app.fetch(request);

        res.statusCode = response.status;
        response.headers.forEach((value: string, key: string) => {
          res.setHeader(key, value);
        });

        if (response.body) {
          const reader = response.body.getReader();
          const stream = new Readable({
            async read() {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            },
          });
          stream.pipe(res);
        } else {
          res.end();
        }
      } catch (err) {
        console.error("[aireplay]", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
      return;
    }

    // Static files from dist/
    const urlPath = url.split("?")[0];
    let filePath = join(distDir, urlPath);

    if (!existsSync(filePath) || urlPath === "/") {
      // SPA fallback
      filePath = join(distDir, "index.html");
    }

    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
      res.end(content);
    } catch {
      // Final fallback to index.html for SPA routes
      const html = readFileSync(join(distDir, "index.html"));
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    }
  });

  server.listen(port, () => {
    console.log(`\n  aireplay running at http://localhost:${port}\n`);
  });

  return server;
}

function collectBody(req: import("node:http").IncomingMessage): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).buffer as ArrayBuffer));
    req.on("error", reject);
  });
}
