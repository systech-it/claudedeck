# Deployment Guide

> ClaudeDeck by **SysTech Łukasz Grzywacki**

ClaudeDeck can be deployed in two ways:
- **With Docker** (recommended for production — isolated, easy to update)
- **Without Docker** (direct Node.js — good for development or single-user local use)

---

## Option A: Docker (recommended)

### Prerequisites
- Docker + Docker Compose v2
- Claude Code CLI installed on the host (`which claude`)
- A domain name (optional, but recommended for HTTPS)

### 1. Prepare environment

```bash
mkdir claudedeck && cd claudedeck
curl -o docker-compose.yml https://raw.githubusercontent.com/systech-it/claudedeck/main/docker-compose.yml
curl -o .env.example https://raw.githubusercontent.com/systech-it/claudedeck/main/.env.example
cp .env.example .env
```

Edit `.env`:
```bash
# Required — generate a random secret:
JWT_SECRET=$(openssl rand -hex 32)

# Path to claude CLI on the host (will be bind-mounted into container):
CLAUDE_BIN=/usr/local/bin/claude
```

### 2. Start

```bash
docker compose up -d
docker compose logs -f   # watch startup logs
```

Open http://localhost:3000 — on first launch you will be prompted to create an admin account.

---

## Option B: Without Docker (bare Node.js)

This is the simplest option if Claude Code is already installed on the same machine.

### Prerequisites
- Node.js >= 20
- npm >= 10
- Claude Code CLI (`claude --version` should work)

### 1. Clone and install

```bash
git clone https://github.com/systech-it/claudedeck.git
cd claudedeck
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` — minimum required:
```bash
JWT_SECRET=your-random-secret-here   # use: openssl rand -hex 32
CLAUDE_BIN=/path/to/your/claude      # find with: which claude
DATA_DIR=./data                       # directory for database and user profiles
```

### 3. Build

```bash
npm run build
```

This builds shared types → backend → frontend. The compiled frontend is placed in
`packages/frontend/dist/` and served automatically by the backend.

### 4. Run

**Manual (foreground):**
```bash
node packages/backend/dist/index.js
```

**As a systemd service (recommended for always-on deployments):**

Create `/etc/systemd/system/claudedeck.service`:
```ini
[Unit]
Description=ClaudeDeck — Self-hosted web UI for Claude Code
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/claudedeck/packages/backend
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
EnvironmentFile=/path/to/claudedeck/.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=claudedeck

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable claudedeck
systemctl start claudedeck
systemctl status claudedeck
```

---

## Accessing ClaudeDeck

After starting, ClaudeDeck listens on `PORT` (default: **3000**).

| Setup | URL |
|-------|-----|
| Local | http://localhost:3000 |
| Server (no proxy) | http://your-server-ip:3000 |
| With reverse proxy | https://claudedeck.yourdomain.com |

### First launch — admin setup

The first time you open the UI you will see a **"Pierwsze uruchomienie" (First run)** screen
prompting you to create an admin account. Enter a username and password — that's all.
After the account is created, the registration endpoint is permanently disabled.

No API key is needed. ClaudeDeck uses Claude Code's own authentication
(subscription credentials stored by `claude` on the server, or `ANTHROPIC_API_KEY` from `.env`).

---

## Reverse Proxy with HTTPS

### Caddy (recommended — automatic TLS)

```caddyfile
claudedeck.yourdomain.com {
    reverse_proxy localhost:3000 {
        flush_interval -1
        transport http {
            response_header_timeout 300s
        }
    }
}
```

`flush_interval -1` is required for streaming responses and WebSocket to work correctly.

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name claudedeck.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/your.crt;
    ssl_certificate_key /etc/ssl/private/your.key;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support — required
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";

        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
```

> **Important:** `Upgrade` and `Connection` headers must be passed through — without them
> WebSocket connections (streaming, permission dialogs) will not work.

---

## Updating ClaudeDeck

### Docker

```bash
docker compose pull
docker compose up -d
```

### Bare Node.js

```bash
git pull origin main
npm install
npm run build
systemctl restart claudedeck
```

> **Note:** After an update, restart the service manually if running via systemd.
> Never restart via the ClaudeDeck web UI itself — it would break the active WebSocket session.

---

## Data Persistence

All user data is stored in `DATA_DIR` (default: `./data`):

```
data/
├── claudedeck.db                   # SQLite database (users, session metadata)
├── deleted_server_sessions.json    # Blocklist of explicitly deleted server sessions
└── profiles/
    └── {userId}/
        └── claude/                 # Per-user Claude Code profile + JSONL session files
```

### Backup

```bash
systemctl stop claudedeck
tar czf claudedeck-backup-$(date +%Y%m%d).tar.gz ./data
systemctl start claudedeck
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **yes** | — | Random secret for JWT signing |
| `PORT` | no | `3000` | HTTP listen port |
| `HOST` | no | `0.0.0.0` | HTTP listen host |
| `DATA_DIR` | no | `./data` | Persistent data directory |
| `CLAUDE_BIN` | no | `claude` | Path to `claude` CLI binary |
| `GITHUB_OWNER` | no | `systech-it` | GitHub owner for update checks |
| `GITHUB_REPO` | no | `claudedeck` | GitHub repo for update checks |
| `GITHUB_TOKEN` | no | — | GitHub token (increases rate limits) |
| `CORS_ORIGINS` | no | — | Allowed CORS origins (comma-separated) |
| `NODE_ENV` | no | `production` | Node environment |

---

## Troubleshooting

**WebSocket connection fails / streaming doesn't work**
- Ensure your reverse proxy passes `Upgrade` and `Connection` headers
- Increase proxy timeout (streaming responses can take minutes)
- Check browser console for WebSocket errors

**"claude: command not found" or permission errors**
- Verify `CLAUDE_BIN` points to the correct binary: `which claude`
- Make sure the binary is executable: `chmod +x /path/to/claude`
- If running as a non-root user, ensure that user can execute `claude`

**Sessions not persisting after restart**
- Check `DATA_DIR` is writable by the process user
- Verify the path exists: `ls -la $DATA_DIR`

**Deleted sessions reappear after refresh**
- This is fixed in v1.0.0 via `deleted_server_sessions.json` blocklist
- If upgrading from an older version, verify `DATA_DIR` is writable

**First login shows only login form, not admin setup**
- An admin account already exists — use the login form with existing credentials
- If you need to reset: delete `data/claudedeck.db` (loses all sessions and users)
