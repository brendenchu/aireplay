# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
