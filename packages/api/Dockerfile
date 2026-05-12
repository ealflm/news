# syntax=docker/dockerfile:1.7

# --- Builder ---
FROM node:20-bookworm-slim AS builder
WORKDIR /repo

ENV PNPM_VERSION=9.12.0 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

RUN pnpm install --frozen-lockfile

# Sources
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY packages/api packages/api

RUN pnpm --filter @news/db exec prisma generate
RUN pnpm --filter @news/db build
RUN pnpm --filter @news/shared build
RUN pnpm --filter @news/api build

# Prune dev deps for runtime
RUN pnpm --filter @news/api --prod deploy /app

# Copy prisma generated client into the deployed node_modules
# pnpm deploy doesn't carry the .prisma/client generated artifacts, so we sync them manually
RUN src=$(find /repo/node_modules/.pnpm -maxdepth 2 -type d -name "@prisma+client*" | head -1) && \
    dst=$(find /app/node_modules/.pnpm  -maxdepth 2 -type d -name "@prisma+client*" | head -1) && \
    if [ -n "$src" ] && [ -n "$dst" ]; then \
      cp -r "$src/node_modules/.prisma" "$dst/node_modules/.prisma"; \
    fi

# --- Migrator (separate target for running prisma migrate deploy) ---
# Keep WORKDIR as /repo to preserve pnpm symlinks from the builder stage
FROM node:20-bookworm-slim AS migrator
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
# Copy the full workspace keeping the /repo path intact
COPY --from=builder /repo /repo
WORKDIR /repo/packages/db
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# --- Runner ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=6001

# System deps for sharp + libvips runtime
RUN apt-get update && apt-get install -y --no-install-recommends libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app
# We also need the compiled prisma client + db module
COPY --from=builder /repo/packages/db/dist /app/node_modules/@news/db/dist
COPY --from=builder /repo/packages/db/prisma /app/node_modules/@news/db/prisma
COPY --from=builder /repo/packages/shared/dist /app/node_modules/@news/shared/dist

EXPOSE 6001
CMD ["node", "dist/main.js"]
