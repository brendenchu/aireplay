# aireplay

Local-only AI conversation and memory browser. No database: provider files are parsed on demand and cached in memory.

## Stack

- Bun runtime, Vite 8 dev server, Hono API mounted through the Vite plugin, Vue 3.5 + TypeScript
- MiniSearch for server-side full-text search
- Default dev port: 4123

## Commands

- `bun run dev` - start the Vite dev server
- `bun run check` - run Biome checks and TypeScript checks
- `bun run lint` - run Biome checks only
- `bun run typecheck` - run `vue-tsc --noEmit`
- `bun run build` - type-check, build client/server bundles, and run `build-server.mjs`
- `bun run preview` - preview the production build

Prefer `bun run check` for normal verification and `bun run build` before finishing changes that affect routing, bundling, server imports, or package output.

## Architecture

- `server/` - Hono API and provider parsers. It runs inside Vite's Node process in development.
- `server/index.ts` - creates the `/api` app and performs lazy sync when conversation cache is empty.
- `server/parsers/` - one adapter per AI provider plus shared helpers.
- `server/parsers/_shared.ts` - shared parser helpers and the `ProviderParser` interface.
- `server/parsers/index.ts` - provider registry. Routes should iterate `PARSERS` or call `findParserById()` instead of hardcoding provider switches.
- `server/routes/` - REST endpoints for conversations, projects, memory, search, and sync.
- `server/cache.ts` - in-memory cache. There is no persistent app database.
- `server/paths.ts` - all provider filesystem paths derived from `homedir()` and environment overrides.
- `src/` - Vue SPA. Pages fetch from `/api/*`; shared response/domain types live in `src/types/`.

## Provider Model

- Provider IDs are defined once in `src/types/provider.ts` as `PROVIDER_IDS`.
- Use `ProviderId` for persisted/provider-owned data and `ProviderFilter` for UI filters that may include `"all"`.
- Validate untrusted provider strings with `isProviderId()` before filtering or dispatching.
- Use `ProviderStatus` for `/api/sync/status` UI data. Do not call it `Provider`; the backend adapter is `ProviderParser`.
- Every provider parser exports `parser: ProviderParser`.
- Parser method names should stay uniform:
  - `scanSessions(): Promise<Conversation[]>`
  - `parseSession(filePath: string): Promise<ConversationDetail | null>`
  - optional `scanMemoryFiles(knownProjectPaths?: string[]): Promise<MemoryFile[]>`

## Provider Paths

- Keep provider root names consistent in `PATHS`:
  - `root` - provider root or storage root
  - `globalMemory` - provider-level memory/instructions file
  - provider-specific subpaths such as `projects`, `sessions`, `history`, `memories`, or `sessionState`
- Do not rederive `homedir()` paths inside parsers or routes. Add names to `server/paths.ts` and consume `PATHS`.

## Parser Conventions

- Provider parsers must handle missing/corrupt files gracefully: return empty arrays, `null`, or skip bad entries.
- Keep provider-specific file format knowledge inside the provider parser.
- Prefer helpers from `_shared.ts` for JSONL parsing, record guards, content flattening, title truncation, message-role validation, and recency sorting.
- Avoid `any` for provider data. Parse as `unknown`, narrow with guards, and keep fallback behavior tolerant.
- Conversation IDs are prefixed with provider ID: `claude-code:{sessionId}`, `copilot:{sessionId}`, `copilot-cli:{sessionId}`, `gemini:{sessionId}`, `codex:{sessionId}`.
- `filePath` on `Conversation` should point to the source transcript file that `parseSession()` can read.

## Route Conventions

- Routes should use the provider registry rather than importing individual provider parsers.
- Query/body provider values are untrusted strings. Validate with `isProviderId()`.
- Lazy sync is intentional: first API request triggers a scan if the conversation cache is empty.
- Memory writes must keep the path traversal guard. Only write files under known provider roots.
- Search currently indexes conversation titles and memory file content. Do not assume full conversation body search exists unless implemented.

## Frontend Conventions

- Reuse domain types from `src/types/`.
- Use `ProviderFilter` for select state that includes `"all"`.
- Use `ProviderBadge` for provider display names rather than duplicating labels.
- Keep shadcn-vue/reka UI wrapper components formatted by Biome; avoid manual style divergence.

## Safety

- This is a local tool with no authentication. Keep server binding local unless the user explicitly changes it.
- Do not introduce a database or background persistence layer. The product premise is reading provider files on disk.
- Memory files are writable by design, but conversation files should remain read-only.
- Do not log conversation or memory contents during diagnostics unless the user explicitly asks.
