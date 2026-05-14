# aireplay Copilot Instructions

## Build, test, and lint commands

- `bun run dev` — start the Vite dev server on `localhost:4123` with the Hono API mounted in-process.
- `bun run build` — run `vue-tsc --noEmit`, build the client, then build the SSR server entry (`dist/server/serve.mjs`).
- `bun run preview` — preview the production client build.
- `bun run lint` — run Biome checks.
- `bun run lint:fix` — apply Biome autofixes.
- `bun run typecheck` — run TypeScript checks only.

There is currently no automated test runner configured in this repository, so there is no single-test command yet.

## High-level architecture

- This app is intentionally **local-only** and **database-free**. It parses provider files from disk on demand (`~/.claude`, VS Code workspace storage, `~/.copilot`, `~/.gemini`, `~/.codex`) and caches results in memory.
- API and frontend run in one process during development: `vite.config.ts` mounts Hono under `/api` via `configureServer` and `configurePreviewServer`; there is no separate API service.
- Production packaging is split:
  - Vite client assets in `dist/`
  - SSR server bundle at `dist/server/serve.mjs` (built by `build-server.mjs` from `server/serve.ts`)
- Server flow:
  - `server/index.ts` builds the Hono app with `/api/*` routes.
  - A lazy-sync middleware triggers `runSync()` on first request if conversation cache is empty.
  - `server/routes/sync.ts` scans providers and refreshes conversation/memory/search caches.
  - `server/routes/search.ts` builds an in-memory MiniSearch index from cached conversations and memory files.
- Frontend flow:
  - Vue SPA routes are in `src/router.ts`.
  - Route pages in `src/pages/*` call `/api/*` directly with `fetch`.
  - Shared domain types live in `src/types/*` and are imported by both server and frontend.

## Key repository conventions

- Keep the project database-free: new features should read provider files and use cache updates, not persistent app storage.
- Provider parser contract in `server/parsers/*`:
  - each provider exports session scanning + detail parsing functions (naming differs by provider, e.g. `scanSessions`, `scanConversations`, `parseSession`, `parseConversation`);
  - memory-capable providers export memory scanning functions;
  - missing or malformed files are handled defensively (skip bad entries, return `[]`/`null` instead of throwing).
- IDs are provider-prefixed strings and are treated as cross-route stable identifiers (for conversations/messages/memory files), e.g. `claude-code:...`, `copilot:...`, `copilot-cli:...`, `gemini:...`, `codex:...`.
- Memory writes are restricted to known provider roots (`server/routes/memory.ts` path traversal guard). Keep this guard intact when adding writable file locations.
- Cache invalidation expectations:
  - sync endpoints invalidate `conversations:list`, `memory:list`, and `search:index`;
  - search results depend on those cached lists, so schema changes in conversations/memory often require search indexing updates too.
- Project grouping is path-based and encoded as base64url IDs (`server/routes/projects.ts`); preserve `encodeProjectId`/`decodeProjectId` behavior for route compatibility.
