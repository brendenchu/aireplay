# aireplay

Local web app for browsing, searching, and editing AI conversation history and memory files. Reads data directly from Claude Code, VS Code Copilot, Gemini CLI, and Codex CLI — no cloud, no database, everything stays on your machine.

## Install

```sh
# Run directly (no install needed)
npx aireplay

# Or install globally
npm i -g aireplay
aireplay
```

Or clone and run from source:

```sh
git clone https://github.com/brendenchu/aireplay.git
cd aireplay
bun install
bun run dev
```

Open [http://localhost:4123](http://localhost:4123)

## Features

- **Browse** conversations from multiple AI tools in one UI
- **Search** across all conversations and memory files with fuzzy matching
- **Edit** memory files (CLAUDE.md, GEMINI.md, etc.) directly in the browser
- **Filter** by provider, project, or date
- **Sync** to re-scan provider data on demand

## Supported Providers

| Provider | Conversations | Memory Files |
|----------|:---:|:---:|
| Claude Code | ✓ | ✓ |
| VS Code Copilot | ✓ | — |
| Gemini CLI | ✓ | ✓ |
| Codex CLI | ✓ | ✓ |

## Requirements

- Node.js 20+ or [Bun](https://bun.sh/) 1.x+
- macOS (reads `~/Library/Application Support/Code/` for Copilot, `~/.claude/` for Claude, etc.)
- Linux support is planned — most providers use `~/.config/` paths

## Stack

- **Runtime:** Node.js / Bun
- **Server:** [Hono](https://hono.dev/) (mounted as Vite middleware)
- **Frontend:** Vue 3.5 + TypeScript + Vue Router
- **Search:** [MiniSearch](https://lucaong.github.io/minisearch/) (in-memory fuzzy search)
- **Database:** None — parses source files on-the-fly with in-memory cache

## Project Structure

```
bin/              CLI entry point
server/           Hono API (parsers, routes, cache)
  parsers/        Provider-specific file parsers
  routes/         REST endpoints
src/              Vue frontend
  components/     Reusable UI components
  composables/    Vue composables for data fetching
  pages/          Route page components
  types/          Shared TypeScript types
```

## Options

```
aireplay --port 3000    # Use a custom port (default: 4123)
```

## Contributing

PRs welcome. Run `bun run lint` and `bun run typecheck` before submitting.

## License

[MIT](LICENSE)
