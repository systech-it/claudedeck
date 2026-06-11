# Deployment Guide

This guide covers production deployment of ClaudeDeck using Docker.

> ClaudeDeck by **SysTech Łukasz Grzywacki**

## Prerequisites

- Docker + Docker Compose v2
- Claude Code CLI installed on the host machine
- A domain name (optional, but recommended for HTTPS)

## Basic Deployment

### 1. Prepare environment

```bash
mkdir claudedeck && cd claudedeck
curl -o docker-compose.yml https://raw.githubusercontent.com/systech-it/claudedeck/main/docker-compose.yml
curl -o .env.example https://raw.githubusercontent.com/systech-it/claudedeck/main/.env.example
cp .env.example .env
```

Edit `.env`:
```bash
JWT_SECRET=$(openssl rand -hex 32)   # generate a strong secret
CLAUDE_BIN=/usr/local/bin/claude     # path to claude binary on host
```

### 2. Verify the Claude binary path

```bash
which claude
# e.g. /usr/local/bin/claude
```

Update `CLAUDE_BIN` in `.env` accordingly. The binary must be executable inside the container.

### 3. Start

```bash
docker compose up -d
docker compose logs -f   # watch startup logs
```

Open http://localhost:3000 — register your first account (it will be given admin rights automatically).

---

## Reverse Proxy with HTTPS

### Caddy (recommended)

```caddyfile
claudedeck.yourdomain.com {
    reverse_proxy localhost:3000
}
```

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
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";   # required for WebSocket
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;   # long timeout for streaming responses
    }
}
```

> **Important:** WebSocket requires `Connection: upgrade` header. Make sure your reverse proxy passes it through.

---

## Updating ClaudeDeck

### Option A: Manual update (recommended)

```bash
docker compose pull
docker compose up -d
```

### Option B: Watchtower (automatic)

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 86400 \
  claudedeck
```

### Option C: Update script

Create `/usr/local/bin/claudedeck-update.sh`:

```bash
#!/bin/bash
set -e
cd /opt/claudedeck   # path to your docker-compose.yml
docker compose pull
docker compose up -d
echo "ClaudeDeck updated at $(date)"
```

Schedule with cron:
```
0 3 * * 0 /usr/local/bin/claudedeck-update.sh >> /var/log/claudedeck-update.log 2>&1
```

---

## Data Persistence

All data is stored in the Docker volume `claudedeck-data`, which maps to `/app/data` inside the container:

```
/app/data/
├── claudedeck.db          # SQLite database (users, session metadata)
└── profiles/
    └── {userId}/
        └── claude/        # Per-user Claude Code profile directory
            └── projects/  # JSONL session files (created by Claude Code)
```

### Backup

```bash
docker compose stop
tar czf claudedeck-backup-$(date +%Y%m%d).tar.gz $(docker volume inspect claudedeck_claudedeck-data --format '{{.Mountpoint}}')
docker compose start
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **yes** | — | JWT signing secret — must be random and kept private |
| `PORT` | no | `3000` | HTTP listen port |
| `HOST` | no | `0.0.0.0` | HTTP listen host |
| `DATA_DIR` | no | `/app/data` | Persistent data directory |
| `CLAUDE_BIN` | no | `/usr/local/bin/claude` | Path to `claude` binary |
| `GITHUB_OWNER` | no | `systech-it` | GitHub owner for update checks |
| `GITHUB_REPO` | no | `claudedeck` | GitHub repo for update checks |
| `GITHUB_TOKEN` | no | — | GitHub token (increases update check rate limit) |
| `CORS_ORIGINS` | no | — | Allowed CORS origins (comma-separated) |
| `NODE_ENV` | no | `production` | Node environment |

---

## Troubleshooting

### WebSocket connection fails

- Check that your reverse proxy forwards the `Upgrade` and `Connection` headers
- Increase `proxy_read_timeout` in Nginx (streaming can take minutes)

### "claude: command not found" inside container

- Verify the `CLAUDE_BIN` path points to the actual binary on the host
- Make sure the volume mount in `docker-compose.yml` is correct: `-/usr/local/bin/claude:/usr/local/bin/claude:ro`

### Sessions not persisting after restart

- Make sure the `claudedeck-data` volume is mounted correctly
- Check `DATA_DIR` environment variable

### Permission denied on claude binary

```bash
chmod +x /usr/local/bin/claude
```
