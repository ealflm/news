# syntax=docker/dockerfile:1.7

# --- Builder ---
FROM node:20-bookworm-slim AS builder
WORKDIR /repo

ENV PNPM_VERSION=9.12.0 NODE_ENV=production COREPACK_ENABLE_DOWNLOAD_PROMPT=0
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

# --- Runner ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000

# System deps for sharp + libvips runtime
RUN apt-get update && apt-get install -y --no-install-recommends libvips42 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app
# We also need the compiled prisma client + db module
COPY --from=builder /repo/packages/db/dist /app/node_modules/@news/db/dist
COPY --from=builder /repo/packages/db/prisma /app/node_modules/@news/db/prisma
COPY --from=builder /repo/packages/shared/dist /app/node_modules/@news/shared/dist

EXPOSE 4000
CMD ["node", "dist/main.js"]
