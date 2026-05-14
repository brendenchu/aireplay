import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
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
  const distRoot = resolve(distDir);
  const indexHtmlPath = join(distRoot, "index.html");

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
              try {
                const { done, value } = await reader.read();
                if (done) {
                  this.push(null);
                } else {
                  this.push(Buffer.from(value));
                }
              } catch (err) {
                this.destroy(err instanceof Error ? err : new Error(String(err)));
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

    // Static files from dist/, enforcing that the resolved path stays inside distRoot.
    try {
      const urlPath = url.split("?")[0];
      const html = await serveStatic(distRoot, indexHtmlPath, urlPath);
      res.setHeader("Content-Type", html.contentType);
      res.end(html.content);
    } catch (err) {
      console.error("[aireplay] static", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  server.listen(port, () => {
    console.log(`\n  aireplay running at http://localhost:${port}\n`);
  });

  return server;
}

interface StaticResponse {
  content: Buffer;
  contentType: string;
}

async function serveStatic(
  distRoot: string,
  indexHtmlPath: string,
  urlPath: string,
): Promise<StaticResponse> {
  if (urlPath !== "/") {
    const resolved = resolve(distRoot, `.${urlPath}`);
    if (resolved === distRoot || resolved.startsWith(distRoot + sep)) {
      const fileType = await classify(resolved);
      if (fileType === "file") {
        const content = await readFile(resolved);
        return { content, contentType: MIME_TYPES[extname(resolved)] ?? "application/octet-stream" };
      }
    }
  }
  // SPA fallback: any unmatched route returns index.html so the client router takes over.
  return { content: await readFile(indexHtmlPath), contentType: "text/html" };
}

async function classify(filePath: string): Promise<"file" | "other"> {
  try {
    const stats = await stat(filePath);
    return stats.isFile() ? "file" : "other";
  } catch {
    return "other";
  }
}

function collectBody(req: import("node:http").IncomingMessage): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).buffer as ArrayBuffer));
    req.on("error", reject);
  });
}
