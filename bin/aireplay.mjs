#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");
const serverBundle = resolve(root, "dist", "server", "serve.mjs");

const args = process.argv.slice(2);
const port = args.includes("--port")
  ? Number(args[args.indexOf("--port") + 1])
  : 4123;

if (!existsSync(distDir) || !existsSync(serverBundle)) {
  console.error(
    "aireplay: built assets not found. Run `npm run build` first,\n" +
    "or use `npx aireplay` which includes pre-built assets."
  );
  process.exit(1);
}

const { startServer } = await import(serverBundle);
startServer(distDir, port);
