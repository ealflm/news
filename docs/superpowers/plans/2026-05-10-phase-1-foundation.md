# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo (pnpm + turbo) with Next.js web app, NestJS API, Prisma + Postgres, Redis, and JWT auth (multi-user single-role). Outcome: developer can `docker compose up`, log in to admin at `/admin/login`, and see an authenticated dashboard placeholder.

**Architecture:** Monorepo with `apps/web` (Next 15 App Router) and `packages/{api, db, shared}`. Postgres + Redis run in Docker. Auth uses JWT (15m access in httpOnly cookie) + refresh (7d). Both web and api validate the same JWT secret. Admin routes `/admin/*` are gated by Next middleware reading the auth cookie.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript strict, Next.js 15, NestJS 10, Prisma 5, Postgres 16, Redis 7, Docker Compose, Vitest, ESLint + Prettier, Husky.

---

## File structure created in this plan

```
news/
├── package.json                       (root, workspace declarations)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── .prettierrc
├── .eslintrc.cjs
├── .env.example
├── docker-compose.yml
├── docker-compose.dev.yml
├── .husky/pre-commit
│
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs
│       ├── postcss.config.mjs
│       ├── tailwind.config.ts
│       ├── Dockerfile
│       ├── src/
│       │   ├── middleware.ts          (gate /admin/*)
│       │   ├── lib/
│       │   │   ├── auth.ts            (JWT verify helper)
│       │   │   └── api-client.ts      (fetch wrapper)
│       │   └── app/
│       │       ├── layout.tsx
│       │       ├── page.tsx           (placeholder homepage)
│       │       ├── globals.css
│       │       └── admin/
│       │           ├── layout.tsx
│       │           ├── page.tsx       (dashboard placeholder)
│       │           └── login/page.tsx
│       └── tests/
│           └── middleware.test.ts
│
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma          (User model only in this phase)
│   │   │   └── seed.ts
│   │   └── src/
│   │       └── index.ts               (export PrismaClient singleton)
│   │
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── auth.schemas.ts        (Zod login DTO)
│   │       └── auth.types.ts          (JWT payload interface)
│   │
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       ├── Dockerfile
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   └── env.ts             (Zod-validated env loader)
│       │   ├── prisma/
│       │   │   └── prisma.module.ts
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── jwt-refresh.strategy.ts
│       │   │   └── guards/jwt.guard.ts
│       │   ├── users/
│       │   │   ├── users.module.ts
│       │   │   └── users.service.ts
│       │   └── health/
│       │       └── health.controller.ts
│       └── test/
│           ├── auth.e2e-spec.ts
│           └── jest-e2e.json
│
└── nginx/
    └── default.conf                   (used by docker-compose for dev/prod)
```

---

## Conventions (engineer must read first)

- **Package manager:** pnpm only. Do NOT run `npm install` or `yarn`.
- **Run scripts via turbo from root:** `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `test:`). Commit after each task's last step.
- **TDD:** write the failing test first, run it (must fail), then implement, run test again (must pass), then commit. Skip writing test only when explicitly noted in the task.
- **Database during dev:** Postgres runs in Docker via `docker compose -f docker-compose.dev.yml up -d`. Do NOT install Postgres locally.

---

## Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.prettierrc`
- Create: `.eslintrc.cjs`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "news",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.11.0" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:migrate": "pnpm --filter @news/db prisma migrate dev",
    "db:generate": "pnpm --filter @news/db prisma generate",
    "db:seed": "pnpm --filter @news/db tsx prisma/seed.ts",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "prettier": "^3.3.3",
    "eslint": "^9.10.0",
    "@typescript-eslint/parser": "^8.6.0",
    "@typescript-eslint/eslint-plugin": "^8.6.0",
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10"
  }
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": { "dependsOn": ["^build"], "outputs": [] },
    "lint": { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  }
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
.next
.turbo
.env
.env.local
.env.production
*.log
coverage
.DS_Store
.vscode
uploads/
prisma/migrations/dev.db*
```

- [ ] **Step 6: Create `.editorconfig`**

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 7: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 8: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['node_modules', 'dist', '.next', '.turbo', 'prisma/generated'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
};
```

- [ ] **Step 9: Create `.env.example`**

```
# Database
POSTGRES_USER=news
POSTGRES_PASSWORD=newsdev
POSTGRES_DB=news
DATABASE_URL=postgresql://news:newsdev@localhost:5433/news?schema=public

# Redis
REDIS_URL=redis://localhost:6380

# JWT
JWT_ACCESS_SECRET=change_me_dev_only_32chars_min__
JWT_REFRESH_SECRET=change_me_dev_only_32chars_min__
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Public
PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000

# Seed admin (only used by db:seed)
SEED_ADMIN_EMAIL=admin@local.test
SEED_ADMIN_PASSWORD=Admin123!@#
SEED_ADMIN_NAME=Admin
```

- [ ] **Step 10: Run install and commit**

```bash
pnpm install
git add .
git commit -m "chore: scaffold monorepo root with pnpm workspaces and turbo"
```

Expected: `pnpm install` completes without errors. Git tree clean after commit.

---

## Task 2: Docker Compose for development services (Postgres + Redis)

**Files:**
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create `docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-news}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-newsdev}
      POSTGRES_DB: ${POSTGRES_DB:-news}
    ports:
      - "5433:5432"
    volumes:
      - pg_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-news}"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6380:6379"
    volumes:
      - redis_dev_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pg_dev_data:
  redis_dev_data:
```

- [ ] **Step 2: Copy `.env.example` to `.env` and start services**

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: Both `postgres` and `redis` services show `healthy`.

- [ ] **Step 3: Smoke test connections**

```bash
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c "SELECT 1;"
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q redis) redis-cli PING
```

Expected: psql returns `1`, redis returns `PONG`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "chore: add docker compose dev services for postgres and redis"
```

---

## Task 3: Create `packages/db` with Prisma + User model + seed

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/seed.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@news/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "echo 'no tests' && exit 0"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.0",
    "bcrypt": "^5.1.1",
    "@types/bcrypt": "^5.0.2",
    "dotenv": "^16.4.5"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/db/prisma/schema.prisma`** (Phase 1: User only)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 4: Create `packages/db/src/index.ts`** (singleton client)

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
```

- [ ] **Step 5: Create `packages/db/prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!@#';
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, displayName: name },
  });

  console.log(`Seeded user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 6: Add seed script reference to root `package.json`**

The root `db:seed` script already references `pnpm --filter @news/db tsx prisma/seed.ts`. Verify it works after migrate.

- [ ] **Step 7: Install deps, generate client, migrate, seed**

```bash
pnpm install
pnpm --filter @news/db prisma migrate dev --name init
pnpm --filter @news/db prisma generate
pnpm db:seed
```

Expected: migration `init` created in `packages/db/prisma/migrations/`. Seed prints `Seeded user: admin@local.test`.

- [ ] **Step 8: Verify in DB**

```bash
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c "SELECT email, display_name FROM \"User\";"
```

Expected: row `admin@local.test | Admin`.

- [ ] **Step 9: Commit**

```bash
git add packages/db
git commit -m "feat(db): add prisma schema with User model and admin seed"
```

---

## Task 4: Create `packages/shared` with auth schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/auth.schemas.ts`
- Create: `packages/shared/src/auth.types.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@news/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^2.1.1",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/shared/src/auth.schemas.ts`**

```ts
import { z } from 'zod';

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;
```

- [ ] **Step 4: Create `packages/shared/src/auth.types.ts`**

```ts
export interface JwtAccessPayload {
  sub: string;        // user id
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
```

- [ ] **Step 5: Create `packages/shared/src/index.ts`**

```ts
export * from './auth.schemas.js';
export * from './auth.types.js';
```

- [ ] **Step 6: Add a unit test for the schema**

Create `packages/shared/src/auth.schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LoginInputSchema } from './auth.schemas.js';

describe('LoginInputSchema', () => {
  it('accepts valid email + password', () => {
    const result = LoginInputSchema.safeParse({ email: 'a@b.co', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = LoginInputSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = LoginInputSchema.safeParse({ email: 'not-email', password: 'pass1234' });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @news/shared test
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add auth Zod schemas and JWT payload types"
```

---

## Task 5: NestJS API skeleton with health endpoint

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/nest-cli.json`
- Create: `packages/api/src/main.ts`
- Create: `packages/api/src/app.module.ts`
- Create: `packages/api/src/config/env.ts`
- Create: `packages/api/src/health/health.controller.ts`
- Create: `packages/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: Create `packages/api/package.json`**

```json
{
  "name": "@news/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main.js",
    "test": "vitest run",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "lint": "eslint src test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/config": "^3.2.3",
    "@nestjs/throttler": "^6.2.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.7",
    "helmet": "^7.1.0",
    "rxjs": "^7.8.1",
    "reflect-metadata": "^0.2.2",
    "zod": "^3.23.8",
    "@news/db": "workspace:*",
    "@news/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.4",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `packages/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create `packages/api/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: Create `packages/api/src/config/env.ts`** (Zod-validated env)

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  PUBLIC_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment');
  }
  return parsed.data;
}
```

- [ ] **Step 5: Create `packages/api/src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { prisma } from '@news/db';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({
  providers: [{ provide: PRISMA, useValue: prisma }],
  exports: [PRISMA],
})
export class PrismaModule {}
```

- [ ] **Step 6: Create `packages/api/src/health/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
```

- [ ] **Step 7: Create `packages/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 8: Create `packages/api/src/main.ts`**

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: env.PUBLIC_BASE_URL,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');

  await app.listen(env.PORT);
  console.log(`API listening on :${env.PORT}`);
}

bootstrap();
```

- [ ] **Step 9: Install deps and start the API**

```bash
pnpm install
pnpm --filter @news/api dev
```

In another terminal, smoke test:

```bash
curl -s http://localhost:4000/api/health
```

Expected: JSON `{"status":"ok","ts":"..."}`.

Stop the dev server with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add packages/api
git commit -m "feat(api): bootstrap nestjs with health endpoint and env validation"
```

---

## Task 6: Auth module (login + refresh) — TDD with e2e test

**Files:**
- Create: `packages/api/src/users/users.module.ts`
- Create: `packages/api/src/users/users.service.ts`
- Create: `packages/api/src/auth/auth.module.ts`
- Create: `packages/api/src/auth/auth.service.ts`
- Create: `packages/api/src/auth/auth.controller.ts`
- Create: `packages/api/src/auth/jwt.strategy.ts`
- Create: `packages/api/src/auth/jwt-refresh.strategy.ts`
- Create: `packages/api/src/auth/guards/jwt.guard.ts`
- Create: `packages/api/test/auth.e2e-spec.ts`
- Create: `packages/api/vitest.e2e.config.ts`
- Modify: `packages/api/src/app.module.ts` (add UsersModule + AuthModule)

- [ ] **Step 1: Write the failing e2e test**

Create `packages/api/vitest.e2e.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    environment: 'node',
    globals: true,
  },
});
```

Create `packages/api/test/auth.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { prisma } from '@news/db';
import bcrypt from 'bcrypt';

let app: INestApplication;

const testEmail = 'e2e-auth@local.test';
const testPassword = 'Password123!';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'E2E',
      passwordHash: await bcrypt.hash(testPassword, 10),
    },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('returns 200 with cookies on valid creds', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user with valid cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });
    const cookie = (login.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('access_token='),
    )!;

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new access token from refresh cookie', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });
    const refreshCookie = (login.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('refresh_token='),
    )!;

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookies', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/logout');
    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('access_token=;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test — must fail**

```bash
pnpm --filter @news/api test:e2e
```

Expected: FAIL — `Cannot find module './auth/auth.module'` or routes 404. Use this failure as the starting point.

- [ ] **Step 3: Create `packages/api/src/users/users.service.ts`**

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module.js';
import type { PrismaClient, User } from '@news/db';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }
}
```

- [ ] **Step 4: Create `packages/api/src/users/users.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Create `packages/api/src/auth/jwt.strategy.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env.js';
import type { JwtAccessPayload } from '@news/shared';

const cookieExtractor = (req: Request): string | null =>
  (req?.cookies?.['access_token'] as string | undefined) ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_ACCESS_SECRET,
    });
  }

  validate(payload: JwtAccessPayload): JwtAccessPayload {
    if (payload.type !== 'access') throw new UnauthorizedException('wrong token type');
    return payload;
  }
}
```

- [ ] **Step 6: Create `packages/api/src/auth/jwt-refresh.strategy.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env.js';
import type { JwtRefreshPayload } from '@news/shared';

const refreshCookieExtractor = (req: Request): string | null =>
  (req?.cookies?.['refresh_token'] as string | undefined) ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: refreshCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_REFRESH_SECRET,
    });
  }

  validate(payload: JwtRefreshPayload): JwtRefreshPayload {
    if (payload.type !== 'refresh') throw new UnauthorizedException('wrong token type');
    return payload;
  }
}
```

- [ ] **Step 7: Create `packages/api/src/auth/guards/jwt.guard.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
```

- [ ] **Step 8: Create `packages/api/src/auth/auth.service.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { loadEnv } from '../config/env.js';
import type { JwtAccessPayload, JwtRefreshPayload } from '@news/shared';
import type { User } from '@news/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateCreds(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    return user;
  }

  signAccessToken(user: User): string {
    const env = loadEnv();
    const payload: JwtAccessPayload = { sub: user.id, email: user.email, type: 'access' };
    return this.jwt.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    });
  }

  signRefreshToken(user: User): string {
    const env = loadEnv();
    const payload: JwtRefreshPayload = { sub: user.id, type: 'refresh' };
    return this.jwt.sign(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_TTL,
    });
  }
}
```

- [ ] **Step 9: Create `packages/api/src/auth/auth.controller.ts`**

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from './zod.pipe.js';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtAuthGuard, JwtRefreshGuard } from './guards/jwt.guard.js';
import { LoginInputSchema, type LoginInput } from '@news/shared';
import { loadEnv } from '../config/env.js';

const baseCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginInputSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCreds(body.email, body.password);
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);

    res.cookie('access_token', access, { ...baseCookie, maxAge: ACCESS_MS });
    res.cookie('refresh_token', refresh, { ...baseCookie, maxAge: REFRESH_MS });

    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const payload = req.user as { sub: string };
    const user = await this.users.findByIdOrThrow(payload.sub);
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as { sub: string };
    const user = await this.users.findByIdOrThrow(payload.sub);
    const access = this.auth.signAccessToken(user);
    res.cookie('access_token', access, { ...baseCookie, maxAge: ACCESS_MS });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { ...baseCookie });
    res.clearCookie('refresh_token', { ...baseCookie });
  }
}
```

- [ ] **Step 10: Create `packages/api/src/auth/zod.pipe.ts`**

```ts
import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return parsed.data;
  }
}
```

- [ ] **Step 11: Create `packages/api/src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
```

- [ ] **Step 12: Modify `packages/api/src/app.module.ts` — register modules**

Replace the file with:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 13: Run e2e tests — must pass**

```bash
pnpm --filter @news/api test:e2e
```

Expected: all 6 tests in `auth.e2e-spec.ts` pass. If any fail, fix before proceeding.

- [ ] **Step 14: Manual smoke test**

In one terminal:

```bash
pnpm --filter @news/api dev
```

In another:

```bash
curl -i -c /tmp/c.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}'

curl -s -b /tmp/c.txt http://localhost:4000/api/auth/me
```

Expected: first curl shows `200 OK` + `Set-Cookie: access_token=...; refresh_token=...`. Second curl returns `{"id":"...","email":"admin@local.test","displayName":"Admin"}`.

Stop dev server.

- [ ] **Step 15: Commit**

```bash
git add packages/api packages/shared
git commit -m "feat(api): add JWT auth with login, refresh, logout, me endpoints"
```

---

## Task 7: Next.js web app skeleton

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@news/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "19.0.0-rc.1",
    "react-dom": "19.0.0-rc.1",
    "jose": "^5.9.3",
    "@news/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.5.4",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.10.0",
    "eslint-config-next": "15.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "allowJs": false,
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { typedRoutes: true },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create `apps/web/postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 5: Create `apps/web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: 'Inter', system-ui, sans-serif;
}

html, body {
  font-family: var(--font-sans);
}
```

- [ ] **Step 7: Create `apps/web/src/app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'News',
  description: 'News site',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `apps/web/src/app/page.tsx`** (placeholder homepage)

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">News (placeholder)</h1>
      <p className="mt-2 text-gray-600">
        Foundation phase. Visit <a className="underline" href="/admin">/admin</a> for admin.
      </p>
    </main>
  );
}
```

- [ ] **Step 9: Install and run dev**

```bash
pnpm install
pnpm --filter @news/web dev
```

Visit `http://localhost:3000` — should render the placeholder.

Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold next.js 15 app with tailwind and placeholder homepage"
```

---

## Task 8: Web auth — login page + middleware gate + dashboard placeholder

**Files:**
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/app/admin/login/page.tsx`
- Create: `apps/web/src/app/admin/login/login-form.tsx`
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/tests/middleware.test.ts`
- Create: `apps/web/vitest.config.ts`

The web app proxies auth calls to the Nest API so cookies are set on the same origin (avoids cross-origin cookie issues in dev).

- [ ] **Step 1: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Create `apps/web/src/lib/auth.ts`**

```ts
import { jwtVerify } from 'jose';

export interface AccessPayload {
  sub: string;
  email: string;
  type: 'access';
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.type !== 'access') return null;
    return payload as unknown as AccessPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Write failing middleware test**

Create `apps/web/tests/middleware.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware.js';

vi.mock('../src/lib/auth.js', () => ({
  verifyAccessToken: async (token: string) =>
    token === 'valid' ? { sub: 'u1', email: 'a@b.co', type: 'access' } : null,
}));

function makeReq(path: string, cookie?: string) {
  const url = `http://localhost${path}`;
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(url, { headers });
}

describe('admin middleware', () => {
  it('lets /admin/login through unauthenticated', async () => {
    const res = await middleware(makeReq('/admin/login'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects /admin to /admin/login when no cookie', async () => {
    const res = await middleware(makeReq('/admin'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('redirects /admin to /admin/login when token invalid', async () => {
    const res = await middleware(makeReq('/admin', 'access_token=bad'));
    expect(res.status).toBe(307);
  });

  it('passes /admin through with valid token', async () => {
    const res = await middleware(makeReq('/admin', 'access_token=valid'));
    expect(res.status).toBe(200);
  });

  it('does not gate /', async () => {
    const res = await middleware(makeReq('/'));
    expect(res.status).toBe(200);
  });
});
```

Run:

```bash
pnpm --filter @news/web test
```

Expected: FAIL — `Cannot find module '../src/middleware'`.

- [ ] **Step 4: Create `apps/web/src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './lib/auth.js';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));

  const payload = await verifyAccessToken(token);
  if (!payload) return NextResponse.redirect(new URL('/admin/login', req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
```

- [ ] **Step 5: Run test again — must pass**

```bash
pnpm --filter @news/web test
```

Expected: 5 tests pass.

- [ ] **Step 6: Create `apps/web/src/lib/api-client.ts`**

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}
```

- [ ] **Step 7: Create `apps/web/src/app/api/auth/login/route.ts`** (proxy to Nest, forward cookies)

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });

  // Forward Set-Cookie headers from Nest to the browser
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) res.headers.append('set-cookie', c);
  return res;
}
```

- [ ] **Step 8: Create `apps/web/src/app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST() {
  const upstream = await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
  const res = new NextResponse(null, { status: 204 });
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) res.headers.append('set-cookie', c);
  return res;
}
```

- [ ] **Step 9: Create `apps/web/src/app/admin/login/login-form.tsx`** (client component)

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.status === 401 ? 'Email hoặc mật khẩu sai' : 'Đăng nhập thất bại');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm">Mật khẩu</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}
```

- [ ] **Step 10: Create `apps/web/src/app/admin/login/page.tsx`**

```tsx
import { LoginForm } from './login-form.js';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">Đăng nhập admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 11: Create `apps/web/src/app/admin/layout.tsx`**

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
```

- [ ] **Step 12: Create `apps/web/src/app/admin/page.tsx`** (dashboard placeholder)

```tsx
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function getMe(): Promise<{ email: string; displayName: string } | null> {
  const cookie = (await cookies()).get('access_token');
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `access_token=${cookie.value}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as { email: string; displayName: string };
}

export default async function AdminDashboard() {
  const me = await getMe();
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 text-gray-600">
        Xin chào, {me?.displayName ?? '...'} ({me?.email ?? '...'})
      </p>
      <form action="/api/auth/logout" method="post" className="mt-4">
        <button type="submit" className="rounded border px-3 py-1 text-sm">
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 13: Update `apps/web/.env.local`** (or use root `.env`)

Add to root `.env` (used by Next via `loadEnv`):

```
API_URL=http://localhost:4000
JWT_ACCESS_SECRET=change_me_dev_only_32chars_min__
```

(Same secret as Nest, so middleware can verify the access token.)

- [ ] **Step 14: Manual end-to-end test**

Terminal 1: `pnpm --filter @news/api dev`
Terminal 2: `pnpm --filter @news/web dev`

Browser:

1. Visit `http://localhost:3000/admin` — should redirect to `/admin/login`.
2. Log in with `admin@local.test` / `Admin123!@#` — should land on `/admin` dashboard with greeting.
3. Click logout — should redirect/refresh and accessing `/admin` again redirects to login.

Expected: all 3 steps work.

- [ ] **Step 15: Run all tests**

```bash
pnpm test
```

Expected: shared (3), api e2e (6), web (5) all pass.

- [ ] **Step 16: Commit**

```bash
git add apps/web
git commit -m "feat(web): admin login, middleware gate, dashboard placeholder"
```

---

## Task 9: Husky + lint-staged + ESLint setup

**Files:**
- Create: `.husky/pre-commit`
- Modify: root `package.json` (add `lint-staged` config + `prepare` script)

- [ ] **Step 1: Init husky**

```bash
pnpm dlx husky init
```

This creates `.husky/pre-commit` with `pnpm test` by default. Replace it with:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm lint-staged
```

- [ ] **Step 2: Modify root `package.json` — add lint-staged config and prepare script**

Replace the existing `scripts` and add `lint-staged`:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:migrate": "pnpm --filter @news/db prisma migrate dev",
    "db:generate": "pnpm --filter @news/db prisma generate",
    "db:seed": "pnpm --filter @news/db tsx prisma/seed.ts",
    "format": "prettier --write .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

- [ ] **Step 3: Test the hook**

```bash
echo "// trivial" >> apps/web/src/app/page.tsx
git add apps/web/src/app/page.tsx
git commit -m "chore: trigger hook"
```

Expected: hook runs prettier; commit succeeds.

- [ ] **Step 4: Commit hook config**

```bash
git add .husky package.json
git commit -m "chore: add husky pre-commit with lint-staged prettier"
```

---

## Task 10: Verify everything from a clean state (acceptance check)

This task asserts the foundation works end-to-end from a fresh checkout.

- [ ] **Step 1: Reset volumes to simulate clean state**

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

- [ ] **Step 2: Reinstall and re-migrate**

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

Expected: migration applies, seed prints `Seeded user: admin@local.test`.

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: every package's tests pass. Capture output to a scratch file:

```bash
pnpm test 2>&1 | tee /tmp/foundation-test-results.txt
```

- [ ] **Step 4: Manual flow**

Start API and web in two terminals:

```bash
pnpm --filter @news/api dev
pnpm --filter @news/web dev
```

Verify in browser:
1. `http://localhost:3000/` → placeholder homepage.
2. `http://localhost:3000/admin` → redirected to `/admin/login`.
3. Log in `admin@local.test` / `Admin123!@#` → dashboard greets the admin.
4. Logout → cookies cleared, `/admin` redirects again.

- [ ] **Step 5: Commit acceptance log**

If all pass, no changes needed. If you adjusted anything to make tests pass, commit:

```bash
git add .
git commit -m "chore: foundation acceptance verified"
```

---

## Acceptance criteria for Phase 1

After completing all tasks above, the following must be true:

- [ ] `docker compose -f docker-compose.dev.yml up -d` brings up Postgres + Redis healthy.
- [ ] `pnpm install` succeeds with no peer-dep errors.
- [ ] `pnpm db:migrate && pnpm db:seed` creates User table and seeds admin.
- [ ] `pnpm test` passes (shared schemas, api e2e auth, web middleware).
- [ ] `pnpm --filter @news/api dev` exposes `/api/health` and `/api/auth/*`.
- [ ] `pnpm --filter @news/web dev` exposes `/`, `/admin/login`, gated `/admin`.
- [ ] Browser flow: login → dashboard → logout → redirect-to-login works end-to-end.
- [ ] Husky pre-commit runs prettier on staged files.

When all boxes are checked, Phase 1 is done. Move to Phase 2 (Posts + Editor) plan.
