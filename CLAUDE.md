# aireplay

Local-only AI conversation and memory browser. No database — parses provider files on-the-fly.

## Stack

- Bun runtime, Vite 8 dev server, Hono API (mounted via `configureServer` plugin), Vue 3.5 + TypeScript
- MiniSearch for server-side full-text search
- Port 4123

## Commands

- `bun run dev` — start dev server
- `bun run build` — type-check + production build
- `bun run preview` — preview production build

## Architecture

- `server/` — Hono routes and provider parsers. Runs inside Vite's Node process, not a separate server.
- `server/parsers/` — one file per AI provider. Each exports `scanSessions()` → Conversation[] and optionally `scanMemoryFiles()` → MemoryFile[].
- `server/routes/` — REST endpoints under `/api`. Conversations, projects, memory (read/write), search, sync.
- `server/cache.ts` — in-memory Map cache with mtime staleness checks.
- `server/paths.ts` — all provider directory paths derived from `homedir()`.
- `src/` — Vue SPA. Pages fetch from `/api/*`. Composables wrap fetch calls.

## Conventions

- No database. All data is read from provider files on disk. Memory files can be written back.
- Provider parsers must handle missing/corrupt files gracefully (return empty arrays, skip bad entries).
- IDs are prefixed with provider name: `claude-code:{sessionId}`, `copilot:{hash}:{sessionId}`.
- Lazy sync: first API request triggers a full scan if cache is empty.
- Path traversal guard on memory PUT — only writes to paths within known provider roots.
