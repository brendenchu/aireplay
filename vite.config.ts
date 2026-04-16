import type { IncomingMessage } from "node:http";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { createApp } from "./server";

function collectBody(req: IncomingMessage): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).buffer as ArrayBuffer));
    req.on("error", reject);
  });
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: "aireplay-api",
      configureServer(server) {
        const app = createApp();

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api")) {
            return next();
          }

          try {
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) {
                headers.set(key, Array.isArray(value) ? value.join(", ") : value);
              }
            }

            const hasBody = req.method !== "GET" && req.method !== "HEAD";
            const body = hasBody ? await collectBody(req) : undefined;

            const request = new Request(`http://localhost${req.url}`, {
              method: req.method,
              headers,
              body,
            });

            const response = await app.fetch(request);

            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
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
            console.error("[aireplay-api]", err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      },
      configurePreviewServer(server) {
        const app = createApp();

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api")) {
            return next();
          }

          try {
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) {
                headers.set(key, Array.isArray(value) ? value.join(", ") : value);
              }
            }

            const hasBody = req.method !== "GET" && req.method !== "HEAD";
            const body = hasBody ? await collectBody(req) : undefined;

            const request = new Request(`http://localhost${req.url}`, {
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
            console.error("[aireplay-api]", err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 4123,
  },
});
