# syntax=docker/dockerfile:1.7

# --- Builder ---
FROM node:20-bookworm-slim AS builder
WORKDIR /repo

ENV PNPM_VERSION=9.12.0 COREPACK_ENABLE_DOWNLOAD_PROMPT=0 HUSKY=0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy lockfile + workspace manifests first for better cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

RUN pnpm install --frozen-lockfile

# Copy sources
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/web apps/web

# Build dependencies (db + shared CJS dist) then web
RUN pnpm --filter @news/db exec prisma generate
RUN pnpm --filter @news/db build
RUN pnpm --filter @news/shared build
RUN pnpm --filter @news/web build

# --- Runner ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000

# Next.js standalone output bundles all required deps
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
