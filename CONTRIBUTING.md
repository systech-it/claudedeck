# Contributing to ClaudeDeck

Thank you for your interest in contributing to ClaudeDeck!

> Created by **SysTech Łukasz Grzywacki** — contributions are welcome from the community.

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- Claude Code CLI installed (`claude --version` should work)
- Git

### Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/systech-it/claudedeck.git
cd claudedeck

# 2. Install all dependencies (npm workspaces)
npm install

# 3. Copy the example env file
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 4. Start the dev servers (backend + frontend with hot-reload)
npm run dev
```

- Backend runs at: http://localhost:3000
- Frontend (Vite dev server) runs at: http://localhost:5173
- The Vite proxy forwards `/api` and `/ws` to the backend automatically

### Project Structure

```
packages/
  shared/     Shared TypeScript types — edit this first when adding new WS events or API shapes
  backend/    Fastify server, routes, services, WebSocket handler
  frontend/   React SPA — components, stores, pages
```

### Useful Commands

```bash
npm run typecheck        # Type-check all packages
npm run lint             # ESLint all packages
npm run lint:fix         # Auto-fix lint issues
npm run build            # Build all packages
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — only merged from `dev` after testing |
| `dev`  | Development — PRs target this branch |

**All PRs must target `dev`.** Direct pushes to `main` are not allowed.

## Commit Messages

Use conventional commits:

```
feat: add session rename via double-click
fix: prevent duplicate WS connections on HMR reload
docs: update DEPLOYMENT.md with nginx example
chore: bump fastify to 4.28.1
```

## Adding a New Feature

1. Create a branch from `dev`: `git checkout -b feat/my-feature dev`
2. Make changes — if you add new WebSocket events, update `packages/shared/src/types/ws.ts` first
3. Run `npm run typecheck && npm run lint` before committing
4. Open a PR targeting `dev`

## Code Style

- TypeScript strict mode everywhere
- No `any` types without justification
- Prefer named exports over default exports (exception: page components)
- All documentation, comments, and commit messages in English

## Reporting Issues

Open an issue at [github.com/systech-it/claudedeck/issues](https://github.com/systech-it/claudedeck/issues) with:
- ClaudeDeck version
- Node.js version
- Claude Code CLI version (`claude --version`)
- Steps to reproduce
- Expected vs actual behavior
