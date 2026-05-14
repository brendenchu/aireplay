# aireplay

Local web app for browsing, searching, and editing AI conversation history and memory files. Reads data directly from Claude Code, VS Code Copilot, Copilot CLI, Gemini CLI, and Codex CLI — no cloud, no database, everything stays on your machine.

> **aireplay is a local development tool — not intended for production or public deployment.** It has no authentication and binds to `localhost` by default. Do not expose it to the internet.

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
- **Edit** memory files with markdown preview (CLAUDE.md, GEMINI.md, etc.)
- **Render** assistant messages as formatted markdown with syntax highlighting
- **Collapse** custom XML context tags (e.g. `<ide_opened_file>`) into expandable blocks
- **Filter** by provider, project, or date
- **Sync** to re-scan provider data on demand
- **Theme** — light, dark, or follow system preference with 7 accent colors

## Supported Providers

| Provider | Conversations | Memory Files |
|----------|:---:|:---:|
| Claude Code | ✓ | ✓ |
| VS Code Copilot | ✓ | ✓ |
| Copilot CLI | ✓ | — |
| Gemini CLI | ✓ | ✓ |
| Codex CLI | ✓ | ✓ |

## Requirements

- Node.js 20+ or [Bun](https://bun.sh/) 1.x+
- macOS, Linux, and Windows supported (auto-detects provider paths per platform)

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
  components/     Reusable UI components (+ shadcn-vue primitives)
  pages/          Route page components
  types/          Shared TypeScript types
  utils/          Shared utilities
```

## Options

```
aireplay --port 3000              # Use a custom port (default: 4123)
HOST=aireplay.local bun dev       # Custom hostname (add to /etc/hosts first)
```

## Security

aireplay runs a local HTTP server with **no authentication**. Conversations are read-only, but memory files are writable (editable from the browser). Keep it bound to `localhost` — do not expose it on a public network or deploy it to a server.

## Contributing

PRs welcome. Run `bun run lint` and `bun run typecheck` before submitting.

## License

[MIT](LICENSE)
