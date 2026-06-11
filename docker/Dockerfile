# ─── Stage 1: Build frontend ─────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

RUN npm ci --workspace=@claudedeck/shared --workspace=@claudedeck/frontend

COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY tsconfig.base.json ./

RUN npm run build -w @claudedeck/shared
RUN npm run build -w @claudedeck/frontend

# ─── Stage 2: Build backend ──────────────────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /build

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --workspace=@claudedeck/shared --workspace=@claudedeck/backend

COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./

RUN npm run build -w @claudedeck/shared
RUN npm run build -w @claudedeck/backend

# ─── Stage 3: Production image ───────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache python3 make g++ git bash curl

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --workspace=@claudedeck/shared --workspace=@claudedeck/backend --omit=dev

COPY --from=backend-builder /build/packages/shared/dist ./packages/shared/dist
COPY --from=backend-builder /build/packages/backend/dist ./packages/backend/dist
COPY --from=frontend-builder /build/packages/frontend/dist ./packages/frontend/dist

COPY VERSION ./

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data \
    CLAUDE_BIN=/usr/local/bin/claude

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

WORKDIR /app/packages/backend
CMD ["node", "dist/index.js"]
