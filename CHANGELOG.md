# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.2.3] - 2026-05-14

### Added

- Typed API client at `src/api/client.ts` with `ApiError` (carries `status`, `isNotFound`, `isTransient`) and `AbortSignal` support on every request
- `useAsyncResource` composable + `AsyncState` component encapsulate loading / error / empty UX; in-flight fetches abort on unmount or reload
- List pages (conversations, memory, projects, dashboard) now distinguish loading, error (with Retry), and empty states; previously a failed fetch silently rendered an empty page
- Detail pages (conversation, project, memory edit) distinguish 404 (resource missing) from transient errors (Retry surfaced)

### Changed

- All page-level `fetch()` calls replaced with typed-client functions; response interfaces colocated with the client module
- Memory save errors no longer throw on non-JSON responses — the typed-client error path falls back to `statusText`

### Developer Experience

- `apiClient.spec.ts` covers query-string assembly, JSON/non-JSON error paths, network rejection, and `ApiError` status helpers

## [0.2.2] - 2026-05-14

### Developer Experience

- `bun test` suite covering parser contracts, `_shared` helpers, and per-provider `parseSession` fixtures (Claude Code, Codex, Copilot, Copilot CLI, Gemini) — valid + malformed inputs both asserted
- Vitest + `@vue/test-utils` + `happy-dom` set up for frontend smoke tests; covers `ProviderBadge`, `MessageBubble`, `ConversationCard`, `MemoryFileCard`, plus a `ConversationListPage` loading-to-success transition
- `bun run test` runs both suites; `bun run check` now includes them so the CI workflow enforces tests automatically

## [0.2.1] - 2026-05-14

### Added

- Unsaved-changes guard on the memory edit page: navigating away or closing the tab with edits in the textarea now prompts before discarding

### Fixed

- Search "Conversations" type filter — frontend value now matches the server's singular `conversation` stored type; the server also accepts the old plural form and 400s on unknown types
- `ProviderBadge` renders Copilot CLI with a teal accent instead of falling back to unbranded shadcn default styling

### Developer Experience

- GitHub Actions workflow runs `bun run check` and `bun run build` on push to `main` and on pull requests

## [0.2.0] - 2026-05-14

### Added

- Copilot CLI provider — parses the standalone agentic Copilot CLI's `~/.copilot/session-state/{id}/events.jsonl` event streams (distinct from VS Code Copilot)
- Codex CLI session-file parser — reads `~/.codex/sessions/YYYY/MM/DD/*.jsonl` rollouts with role/tool-call reconstruction; `~/.codex/history.jsonl` retained as fallback for older installs
- VS Code Copilot per-workspace memory files (`memory-tool/memories/`) included in the memory list
- `GET /api/sync/status` reports `lastSyncedAt` per provider and overall (previously always null)
- `limit`/`offset` query params on conversations and `limit` on search validate input and return 400 on bad values instead of returning silently empty pages

### Changed

- Provider parsers register a uniform `ProviderParser` interface in `server/parsers/index.ts`; routes iterate the registry instead of hardcoding per-provider switches
- Cross-platform provider-path detection covers macOS, Windows, Linux, and WSL (reads Windows env vars through `/mnt/c/...`)
- Gemini parser rewritten against the actual on-disk schema: both JSON and JSONL session formats, project-root resolution via `.project_root`, workspace discovery under `~/.gemini/tmp/`
- Static-file handler in `serve.ts` uses async I/O, enforces that resolved paths stay under `dist/`, and surfaces stream errors to the client instead of dropping them
- Sync orchestration extracted to `server/sync-engine.ts`; concurrent lazy-bootstrap and explicit `POST /sync` callers share one in-flight promise so the cache only rebuilds once
- `memory.ts` PUT invalidates `memory:list` after writing the file instead of mutating cached objects in place
- Memory PUT accepts empty content; clearing a memory file is now possible through the UI

### Fixed

- Merged conversation cache stays sorted by `lastMessageAt` after `runSync` (previously grouped by parser registration order on the explicit-sync path)
- Per-parser errors during `runSync` no longer abort the entire run; failures surface in the response and other parsers continue
- Codex title fallback uses `||` so empty `truncateTitle` results fall through to `"Untitled"`
- `pickExistingPath` no longer returns `undefined` when all platform candidates are empty (WSL with no `APPDATA`/`USERPROFILE`)
- Claude Code project path read from session entries when available, falling back to the encoded folder name

### Removed

- Unused `Cache.isStale`, `mtime`, and `cachedAt` fields (cache API trimmed to two-arg `set`)
- Unused `CopilotSessionWrapper`/`CopilotRequest`/`CopilotResponse` types from `server/types.ts`

### Developer Experience

- Shared parser helpers in `server/parsers/_shared.ts`: `parseJsonlLines`, `flattenTextContent`, `truncateTitle`, `compareLastMessageDesc`, `isRecord`, `isMessageRole`, `readGlobalMemoryFile`, `walkMarkdownFiles`
- Per-parser conversation sort removed in favour of a single post-merge sort
- Copilot workspace map memoized for the duration of a sync run; reset between runs

## [0.1.1] - 2026-04-16

### Added

- Dashboard now shows a combined activity feed (conversations + memory files) sorted by date
- Provider filter dropdown on Dashboard, Conversations, and Memory pages
- Color-coded left borders on cards: blue for conversations, amber for memory files

### Changed

- Conversations and memory pages sort by date across all providers instead of grouping by provider

### Fixed

- Copilot parser now handles the incremental changelog JSONL format used by newer VS Code Copilot sessions (kind 0/1/2 operations), which were previously invisible
- Copilot session titles now use `customTitle` when available instead of truncating the first message
- Copilot message extraction supports both old format (plain strings) and new format (`{text}` objects for user messages, array-of-parts for assistant responses)

## [0.1.0] - 2026-04-16

### Added

- Local web app for browsing AI conversation history and memory files
- Hono API server embedded in Vite via `configureServer`/`configurePreviewServer` middleware
- Parsers for Claude Code (`.jsonl` sessions + memory files), VS Code Copilot (`.jsonl` chat sessions via `workspace.json` mapping), Gemini CLI (history, antigravity conversations, `GEMINI.md`), and Codex CLI (`history.jsonl` sessions + memory files)
- API routes: conversations, projects, memory files, search, sync status
- Full-text search across conversations and memory files via MiniSearch with contextual excerpts
- In-memory cache with on-demand file parsing (no database)
- Vue 3.5 + TypeScript frontend with Vue Router
- 9 pages: Dashboard, Conversation List/Detail, Project List/Detail, Memory List/Edit, Search, Settings
- Dashboard with stats bar (total conversations, memory files, providers) and two-column layout
- Light/dark/system theme switcher with `localStorage` persistence and no-FOUC inline script
- Markdown rendering in assistant messages via `marked` + `DOMPurify`
- Custom XML tags (e.g. `<ide_opened_file>`) rendered as collapsible blocks in conversation messages
- Blank messages (empty content, no tool calls) filtered from conversation view
- Memory file edit/preview with tabbed interface (shadcn-vue Tabs)
- Frontmatter metadata displayed above memory editor
- CLI entry point (`bin/aireplay.mjs`) for `npx aireplay`
- Standalone server build via `build-server.mjs`
- Cross-platform Copilot path detection (macOS, Linux, Windows)
- Base64url-encoded project IDs for safe URL routing
- Error handling on all page data fetches
- 404 catch-all route redirecting to dashboard
- Favicon and meta tags (description, theme-color)

### Changed

- Color scheme: indigo accent (`#4f46e5` light / `#818cf8` dark) on zinc neutrals
- Accent color picker in Settings (indigo, violet, blue, amber, rose, emerald, cyan) with localStorage persistence
- Default port changed from 4641 to 4123
- UI rebuilt with shadcn-vue primitives (Card, Badge, Button, Input, Select, Textarea, Separator, Collapsible, Skeleton, Tooltip, Breadcrumb, Sheet, Tabs)
- All scoped `<style>` blocks replaced with Tailwind utility classes
- CSS migrated from hand-written custom properties to Tailwind CSS v4 theme tokens
- Thin themed scrollbars across the app
- Custom hostname support via `HOST` env var (default: localhost)

### Developer Experience

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- shadcn-vue (reka-nova style, neutral base, lucide icons)
- `cn()` utility for conditional class merging
- Biome 2.x for linting and formatting
- `vue-tsc` typecheck script
- Shared `formatDate()` utility to avoid duplication
