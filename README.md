# ClaudeDeck

**Self-hosted web UI for Claude Code CLI**

ClaudeDeck is an open-source web interface that lets you interact with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) through a browser. Install it once, connect your own Anthropic API key, and get a full-featured chat interface with real-time streaming, tool use display, and session management — all running on your own infrastructure.

> Created by **SysTech Łukasz Grzywacki** — [github.com/systech-it/claudedeck](https://github.com/systech-it/claudedeck)

---

## Features

- **Real-time streaming** — responses stream token by token via WebSocket
- **Tool use blocks** — collapsible panels showing Bash, Read, Write, Edit and other tool calls with inputs and outputs
- **Thinking blocks** — Claude's reasoning displayed in collapsed blocks
- **Permission dialogs** — approve or deny tool execution from the browser
- **Session management** — list, resume, rename, and delete sessions
- **Multi-user** — each user has their own isolated profile and API key
- **Update notifications** — banner appears when a new version is available on GitHub
- **Dark mode** — default dark theme

## Requirements

- Docker (for the containerized deployment)
- Claude Code CLI installed on the host (`claude` binary)
- Anthropic API key (one per user, entered at registration)

## Quick Start

```bash
# 1. Create your .env file
cp .env.example .env
# Edit .env and set JWT_SECRET to a random string

# 2. Start
docker compose up -d

# 3. Open http://localhost:3000 and register your account
```

The first registered user is automatically granted admin rights.

## Configuration

All configuration is done via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **yes** | — | Secret key for JWT signing (use `openssl rand -hex 32`) |
| `PORT` | no | `3000` | HTTP port to listen on |
| `DATA_DIR` | no | `/app/data` | Path to persistent data directory |
| `CLAUDE_BIN` | no | `/usr/local/bin/claude` | Path to the `claude` CLI binary |
| `GITHUB_TOKEN` | no | — | GitHub token for higher update-check rate limits |
| `CORS_ORIGINS` | no | — | Comma-separated list of allowed CORS origins |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

```bash
# Install dependencies
npm install

# Start backend (hot-reload) + frontend (Vite HMR)
npm run dev
```

Or with Docker:

```bash
docker compose -f docker-compose.dev.yml up
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including reverse proxy configuration, HTTPS setup, and update procedures.

## Project Structure

```
claudedeck/
├── packages/
│   ├── shared/     TypeScript types shared between frontend and backend
│   ├── backend/    Fastify API server + WebSocket + node-pty process manager
│   └── frontend/   React SPA with Vite
├── docker/         Dockerfiles
├── .github/        GitHub Actions workflows
├── CONTRIBUTING.md
└── DEPLOYMENT.md
```

## License

MIT — Copyright (c) 2026 SysTech Łukasz Grzywacki
