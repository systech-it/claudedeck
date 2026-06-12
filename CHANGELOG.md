# Changelog

All notable changes to ClaudeDeck are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-06-12

First stable public release.

### Added

**Chat interface**
- Real-time response streaming token by token via WebSocket
- Tool use blocks — collapsible panels showing tool name, input and output (Bash, Read, Write, Edit and others)
- Thinking blocks — Claude's internal reasoning shown in collapsible panels
- Permission dialog — approve or deny tool calls directly from the browser
- Per-message token and cost display after each response
- Rate limit usage bars — 5-hour and 7-day usage with live progress bars in the chat header
- File attachments — images (base64 inline) and text documents; paste from clipboard or drag & drop

**Model and parameter selectors**
- Model selector: Default (Sonnet 4.6), Fable 5, Opus 4.8, Haiku 4.5
- Effort selector (thinking intensity): Default, Low, Medium, High, XHigh, Max
- Effort options automatically disabled for Haiku (no extended thinking support)
- Permission mode selector: Ask, Auto-edit, Plan, Auto

**Session management**
- Session list in sidebar with time-since badges
- Session search by title
- Inline session rename
- Session delete with permanent blocklist (`deleted_server_sessions.json`) preventing re-import
- Auto-import of existing Claude Code sessions from the server's `~/.claude/projects/`
- Session history always freshly loaded from JSONL on navigation (never stale from cache)
- Browser crash protection for large JSONL files: max 150 messages displayed, tool output truncated to 2000 chars, thinking to 3000 chars

**Authentication**
- JWT-based login
- First-run admin setup — on first launch (no users in DB) a "Create admin account" form is shown instead of the login form
- After the admin account is created, registration is permanently disabled (endpoint returns 403)
- First registered user automatically receives admin rights

**Layout and UX**
- Dark and light theme with toggle button
- Sidebar width 288px with time badges on session items
- Version number displayed next to the logo in the sidebar (fetched from `/api/system/version`)
- Scrollable settings page
- Visible scrollbars throughout the UI
- Update notification banner when a new GitHub release is available
- Attachment button placed outside the textarea (left side, same height as input)

**Infrastructure**
- npm workspaces monorepo: `packages/shared`, `packages/backend`, `packages/frontend`
- Backend: Fastify, `@fastify/websocket`, node-pty, SQLite + Drizzle ORM
- Frontend: React 18, Vite, Zustand, Tailwind CSS
- Docker multi-stage build (frontend-builder → backend-builder → production)
- GitHub Actions CI: typecheck + lint + Docker build test on branch `dev`
- GitHub Actions Release: Docker image build and push to ghcr.io on `main`

### Fixed

- Browser crash ("Aw Snap") when opening large sessions (7MB+ JSONL files)
- Infinite "Thinking..." animation after response completed — missing `exit` event handler in WebSocket handler
- STOP button did not end streaming — `message_complete` was never sent to frontend on stop
- STOP showed "Error: Process exited with code 129" — SIGHUP (128+1) is a normal signal from `pty.kill()`, not an error
- Session history did not refresh when navigating between sessions — Zustand persist + stale guard
- Deleted sessions reappeared after page refresh — `syncServerSessions` re-imported sessions from JSONL; fixed with blocklist
- Docker CI build: `npm ci` with workspace glob required all 3 workspace `package.json` files to be present in each stage
- Docker CI build: missing `python3 make g++` in `backend-builder` stage prevented `node-pty` native compilation

### Removed

- **Remote Control feature** — `--remote-control` requires an interactive terminal OAuth flow that cannot be completed in a headless node-pty environment
- **Register tab on login page** — replaced by first-run admin setup flow

---

## [0.1.0] — 2026-05-01

Internal / alpha version — first working demo.

### Added
- Basic chat with Claude Code CLI via WebSocket + node-pty
- Response streaming (stream-json output format)
- Session management (create, list)
- JWT authentication with registration and login
- Dark theme
- Basic Dockerfile

---

*This file is updated on every merge to `main` and new release.*
