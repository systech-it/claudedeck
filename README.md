# ClaudeDeck

**Self-hosted web UI for Claude Code CLI**

ClaudeDeck is an open-source web interface that lets you interact with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) through a browser. Install it on any machine that already has Claude Code, open the UI, and get a full-featured chat interface with real-time streaming, tool blocks, permission dialogs, and session management — no API key required from users.

> Created by **SysTech Łukasz Grzywacki** — [github.com/systech-it/claudedeck](https://github.com/systech-it/claudedeck)

---

## How it works

ClaudeDeck runs on the **same machine as Claude Code CLI**. It spawns `claude` as a subprocess on your behalf and streams the output to the browser over WebSocket. Authentication (API key or Claude Pro/Max subscription) is handled by Claude Code itself — ClaudeDeck does not need to know about it.

```
Browser  ──WebSocket──►  ClaudeDeck  ──subprocess──►  claude CLI
```

---

## Features

- **Real-time streaming** — responses stream token by token via WebSocket
- **Tool use blocks** — collapsible panels showing Bash, Read, Write, Edit and other tool calls with inputs and outputs
- **Thinking blocks** — Claude's internal reasoning displayed in collapsed blocks
- **Permission dialogs** — approve or deny tool execution directly from the browser
- **Session management** — list, resume, rename, and delete sessions
- **Multi-user** — each user has their own isolated session history and account
- **Update notifications** — banner appears when a new version is available on GitHub
- **Dark mode** — default dark theme

---

## Requirements

- **Claude Code CLI** installed and configured on the host (`claude --version` must work)
- **Node.js >= 20** + npm >= 10 (for bare deployment)
- Or **Docker + Docker Compose v2** (for containerized deployment)

> **No Anthropic API key needed at registration.** ClaudeDeck uses whatever authentication
> Claude Code already has on the server — subscription credentials or a server-level
> `ANTHROPIC_API_KEY` set once in `.env`.

---

## Quick Start

### Without Docker (simplest)

```bash
git clone https://github.com/systech-it/claudedeck.git
cd claudedeck
npm install

cp .env.example .env
# Edit .env — set JWT_SECRET and CLAUDE_BIN at minimum

npm run build
node packages/backend/dist/index.js
```

Open http://localhost:3000, register your account, start chatting.

### With Docker

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET

docker compose up -d
```

Open http://localhost:3000.

---

## Configuration

All configuration is done via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **yes** | — | Secret key for JWT signing — use `openssl rand -hex 32` |
| `CLAUDE_BIN` | no | `claude` | Path to the `claude` CLI binary |
| `PORT` | no | `3000` | HTTP port to listen on |
| `DATA_DIR` | no | `./data` | Directory for SQLite database and user session profiles |
| `ANTHROPIC_API_KEY` | no | — | Set once here if using API key auth (not needed for subscription users) |
| `GITHUB_TOKEN` | no | — | GitHub token for higher update-check rate limits |
| `CORS_ORIGINS` | no | — | Comma-separated list of allowed CORS origins |

---

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

```bash
npm install
cp .env.example .env   # fill in JWT_SECRET and CLAUDE_BIN
npm run build          # build shared + backend + frontend
npm run dev            # start backend (tsx watch) + frontend (Vite HMR)
```

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions covering:
- Bare Node.js + systemd service
- Docker Compose
- Reverse proxy (Caddy / Nginx) with HTTPS
- Updates and backups

---

## Project Structure

```
claudedeck/
├── packages/
│   ├── shared/     TypeScript types shared between frontend and backend
│   ├── backend/    Fastify server · WebSocket · node-pty · SQLite/Drizzle
│   └── frontend/   React + Vite SPA
├── docker/         Dockerfiles
├── .github/        GitHub Actions (CI + release pipeline)
├── CONTRIBUTING.md
└── DEPLOYMENT.md
```

---

## License

MIT — Copyright (c) 2026 SysTech Łukasz Grzywacki
