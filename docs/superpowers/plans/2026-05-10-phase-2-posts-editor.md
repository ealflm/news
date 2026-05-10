# Phase 2 — Posts + Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Post entity with full CRUD (admin), TipTap rich-text editor for content, and public-facing pages (homepage list + post detail with `/yyyy/mm/dd/slug` URL pattern). Posts in this phase are TEXT ONLY — image/video upload comes in Phase 3, but external embed URLs (YouTube etc.) and a "cover image URL" plain-text field are supported.

**Architecture:** Extend Prisma schema with Post + PostStatus enum + ScheduledPublish cron. NestJS PostsModule exposes CRUD + slug gen + publish workflow under JWT auth. Next.js homepage uses ISR 60s; post detail uses ISR 300s + on-demand revalidate when admin publishes. SEO: sitemap.xml, RSS, OG/JSON-LD. Admin uses TipTap v2 with text-only extensions (StarterKit + Link + Youtube embed) — Image/Video extensions disabled until Phase 3.

**Tech Stack:** Prisma migration, NestJS Posts module, Zod schemas in @news/shared, TipTap v2 + @tiptap/html for HTML pre-render, slugify for Vietnamese, Recharts NOT required, jose still used in middleware.

---

## File structure created in this plan

```
packages/db/prisma/schema.prisma           (add Post model + PostStatus enum)
packages/db/prisma/migrations/<ts>_posts/  (auto-generated migration)
packages/shared/src/post.schemas.ts        (CreatePost, UpdatePost, PostStatus zod)
packages/shared/src/post.types.ts          (PublicPost, AdminPost types)
packages/shared/src/index.ts               (re-export)

packages/api/src/posts/
├── posts.module.ts
├── posts.controller.ts
├── posts.service.ts
├── slug.util.ts
├── tiptap-render.util.ts                  (server-render TipTap JSON → HTML via @tiptap/html)
└── posts.dto.ts                           (Zod -> Nest pipes adapters)
packages/api/test/posts.e2e-spec.ts        (e2e CRUD)

apps/web/src/app/
├── page.tsx                                (REPLACE placeholder with homepage)
├── [year]/[month]/[day]/[slug]/page.tsx   (public post detail)
├── sitemap.xml/route.ts
├── rss.xml/route.ts
├── robots.txt/route.ts
└── admin/posts/
    ├── page.tsx                            (list + filters)
    ├── new/page.tsx
    ├── [id]/edit/page.tsx
    └── editor/                             (shared TipTap components)
        ├── tiptap-editor.tsx               (client component)
        ├── tiptap-extensions.ts            (configured extensions)
        ├── post-form.tsx                   (form wrapper for new/edit)
        └── publish-controls.tsx
apps/web/src/lib/posts.ts                   (server data fetchers calling Nest)
apps/web/tests/sitemap.test.ts              (route handler unit test)
```

---

## Conventions

- All API endpoints under `/api/posts` require JWT (admin) **except** `GET /api/posts/published/:slug` and `GET /api/posts/published` (public read).
- Public read endpoints return `PublicPost` (no `contentJson`, only `contentHtml`).
- Admin endpoints return `AdminPost` (full record).
- Slug format: lowercase Vietnamese slugify, no diacritics, hyphens. Auto-generated from title; admin can override.
- URL pattern: `/<year>/<month>/<day>/<slug>` where date components come from `publishedAt` (UTC, zero-padded).
- ISR revalidate: homepage 60s, post detail 300s. Plus on-demand revalidate when admin publishes.

---

## Task 1: Extend Prisma schema with Post model

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

- [ ] **Step 1: Edit `packages/db/prisma/schema.prisma`** — append new model + enum after the existing `User` model:

```prisma
enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
}

model Post {
  id            String     @id @default(cuid())
  slug          String     @unique
  title         String
  excerpt       String?    @db.Text
  contentJson   Json
  contentHtml   String     @db.Text
  coverImageUrl String?                   // plain-text URL until Phase 3
  status        PostStatus @default(DRAFT)
  publishedAt   DateTime?
  scheduledAt   DateTime?
  authorId      String
  author        User       @relation(fields: [authorId], references: [id])
  seoTitle      String?
  seoDesc       String?
  ogImageUrl    String?
  viewCount     Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([status, publishedAt])
}
```

Also add reverse relation on `User` model (modify it to add `posts Post[]`):

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  posts        Post[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 2: Generate migration**

```bash
cd /home/ealflm/dev/news
pnpm db:setup    # ensure packages/db/.env exists
pnpm --filter @news/db exec prisma migrate dev --name posts
pnpm --filter @news/db exec prisma generate
pnpm --filter @news/db build
```

Expected: a new migration directory `packages/db/prisma/migrations/<timestamp>_posts/` is created and applied. The CJS `dist/` is rebuilt.

- [ ] **Step 3: Verify in DB**

```bash
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c '\d "Post"'
```

Expected: table with columns id, slug, title, excerpt, contentJson, contentHtml, coverImageUrl, status, publishedAt, scheduledAt, authorId, seoTitle, seoDesc, ogImageUrl, viewCount, createdAt, updatedAt.

- [ ] **Step 4: Commit**

```bash
git add packages/db
git commit -m "feat(db): add Post model with PostStatus and migration"
```

---

## Task 2: Add Post Zod schemas in `@news/shared`

**Files:**

- Create: `packages/shared/src/post.schemas.ts`
- Create: `packages/shared/src/post.types.ts`
- Modify: `packages/shared/src/index.ts` (add new exports)
- Test: `packages/shared/src/post.schemas.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/src/post.schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreatePostInputSchema, UpdatePostInputSchema, PostStatusSchema } from './post.schemas';

describe('CreatePostInputSchema', () => {
  it('accepts minimal valid input (title only)', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'Hello' });
    expect(r.success).toBe(true);
  });

  it('rejects empty title', () => {
    const r = CreatePostInputSchema.safeParse({ title: '' });
    expect(r.success).toBe(false);
  });

  it('accepts full payload with contentJson', () => {
    const r = CreatePostInputSchema.safeParse({
      title: 'Full',
      slug: 'full-post',
      excerpt: 'short summary',
      contentJson: { type: 'doc', content: [] },
      coverImageUrl: 'https://example.com/c.jpg',
      status: 'DRAFT',
      seoTitle: 'SEO',
      seoDesc: 'desc',
      ogImageUrl: 'https://example.com/og.jpg',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'x', status: 'BOGUS' as never });
    expect(r.success).toBe(false);
  });

  it('rejects invalid coverImageUrl', () => {
    const r = CreatePostInputSchema.safeParse({ title: 'x', coverImageUrl: 'not a url' });
    expect(r.success).toBe(false);
  });
});

describe('UpdatePostInputSchema', () => {
  it('accepts partial updates', () => {
    const r = UpdatePostInputSchema.safeParse({ title: 'New Title' });
    expect(r.success).toBe(true);
  });

  it('accepts publishedAt as ISO string', () => {
    const r = UpdatePostInputSchema.safeParse({ publishedAt: '2026-05-10T10:00:00.000Z' });
    expect(r.success).toBe(true);
  });
});

describe('PostStatusSchema', () => {
  it('accepts DRAFT/SCHEDULED/PUBLISHED', () => {
    expect(PostStatusSchema.safeParse('DRAFT').success).toBe(true);
    expect(PostStatusSchema.safeParse('SCHEDULED').success).toBe(true);
    expect(PostStatusSchema.safeParse('PUBLISHED').success).toBe(true);
  });
});
```

Run:

```bash
pnpm --filter @news/shared test
```

Expected: FAIL — `Cannot find module './post.schemas'`.

- [ ] **Step 2: Create `packages/shared/src/post.schemas.ts`**

```ts
import { z } from 'zod';

export const PostStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']);
export type PostStatus = z.infer<typeof PostStatusSchema>;

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreatePostInputSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().regex(slugRegex).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  contentJson: z.unknown().optional(),
  coverImageUrl: z.string().url().optional(),
  status: PostStatusSchema.optional(),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDesc: z.string().max(500).optional(),
  ogImageUrl: z.string().url().optional(),
});
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const UpdatePostInputSchema = CreatePostInputSchema.partial();
export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;

export const ListPostsQuerySchema = z.object({
  status: PostStatusSchema.optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListPostsQuery = z.infer<typeof ListPostsQuerySchema>;
```

- [ ] **Step 3: Create `packages/shared/src/post.types.ts`**

```ts
import type { PostStatus } from './post.schemas';

export interface PublicPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  coverImageUrl: string | null;
  publishedAt: string;
  author: { displayName: string };
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  viewCount: number;
}

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentJson: unknown;
  contentHtml: string;
  coverImageUrl: string | null;
  status: PostStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  authorId: string;
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  status: PostStatus;
}
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

Replace contents with:

```ts
export * from './auth.schemas';
export * from './auth.types';
export * from './post.schemas';
export * from './post.types';
```

- [ ] **Step 5: Build CJS dist**

```bash
pnpm --filter @news/shared build
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @news/shared test
```

Expected: all (3 existing auth + 7 new post) = 10 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add Post zod schemas and admin/public post types"
```

---

## Task 3: NestJS Posts module — service + controller + slug util

**Files:**

- Create: `packages/api/src/posts/slug.util.ts`
- Create: `packages/api/src/posts/tiptap-render.util.ts`
- Create: `packages/api/src/posts/posts.service.ts`
- Create: `packages/api/src/posts/posts.controller.ts`
- Create: `packages/api/src/posts/posts.module.ts`
- Modify: `packages/api/src/app.module.ts` (add PostsModule)
- Modify: `packages/api/package.json` (add `@tiptap/html` and `@tiptap/starter-kit` for server-side render, plus `slugify`)

- [ ] **Step 1: Add deps to api**

```bash
pnpm --filter @news/api add @tiptap/html @tiptap/starter-kit @tiptap/core slugify
```

These get installed and committed via lockfile update. The packages are also available for the editor in apps/web (Task 6).

- [ ] **Step 2: Create `packages/api/src/posts/slug.util.ts`**

```ts
import slugify from 'slugify';

const VIETNAMESE_DIACRITICS_MAP: Record<string, string> = {
  đ: 'd',
  Đ: 'd',
};

export function makeSlug(input: string): string {
  let s = input.trim();
  for (const [k, v] of Object.entries(VIETNAMESE_DIACRITICS_MAP)) {
    s = s.split(k).join(v);
  }
  const base = slugify(s, { lower: true, strict: true, locale: 'vi' });
  return base.slice(0, 200);
}

export function appendDedupeSuffix(slug: string, n: number): string {
  if (n <= 1) return slug;
  return `${slug}-${n}`;
}
```

- [ ] **Step 3: Create `packages/api/src/posts/tiptap-render.util.ts`**

```ts
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

const EXTENSIONS = [StarterKit];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    return generateHTML(json as never, EXTENSIONS);
  } catch {
    return '';
  }
}
```

- [ ] **Step 4: Create `packages/api/src/posts/posts.service.ts`**

```ts
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Post, PostStatus } from '@news/db';
import type { CreatePostInput, UpdatePostInput, ListPostsQuery } from '@news/shared';
import { makeSlug, appendDedupeSuffix } from './slug.util';
import { renderTiptapToHtml } from './tiptap-render.util';

@Injectable()
export class PostsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(authorId: string, input: CreatePostInput): Promise<Post> {
    const slug = await this.uniqueSlug(input.slug ?? makeSlug(input.title));
    const contentJson = input.contentJson ?? { type: 'doc', content: [] };
    const contentHtml = renderTiptapToHtml(contentJson);
    return this.prisma.post.create({
      data: {
        slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        contentJson: contentJson as never,
        contentHtml,
        coverImageUrl: input.coverImageUrl ?? null,
        status: input.status ?? 'DRAFT',
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        seoTitle: input.seoTitle ?? null,
        seoDesc: input.seoDesc ?? null,
        ogImageUrl: input.ogImageUrl ?? null,
        authorId,
      },
    });
  }

  async update(id: string, input: UpdatePostInput): Promise<Post> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('post not found');

    let slug = existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      slug = await this.uniqueSlug(input.slug, existing.id);
    } else if (input.title && !input.slug && existing.status === 'DRAFT') {
      // Regenerate slug from new title only if still draft and slug not user-edited
      slug = await this.uniqueSlug(makeSlug(input.title), existing.id);
    }

    const contentJson = input.contentJson ?? existing.contentJson;
    const contentHtml =
      input.contentJson !== undefined ? renderTiptapToHtml(contentJson) : existing.contentHtml;

    return this.prisma.post.update({
      where: { id },
      data: {
        slug,
        title: input.title ?? existing.title,
        excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt,
        contentJson: contentJson as never,
        contentHtml,
        coverImageUrl:
          input.coverImageUrl !== undefined ? input.coverImageUrl : existing.coverImageUrl,
        status: input.status ?? existing.status,
        publishedAt: input.publishedAt
          ? new Date(input.publishedAt)
          : input.publishedAt === undefined
            ? existing.publishedAt
            : null,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : input.scheduledAt === undefined
            ? existing.scheduledAt
            : null,
        seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        seoDesc: input.seoDesc !== undefined ? input.seoDesc : existing.seoDesc,
        ogImageUrl: input.ogImageUrl !== undefined ? input.ogImageUrl : existing.ogImageUrl,
      },
    });
  }

  async publish(id: string): Promise<Post> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('post not found');
    return this.prisma.post.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: existing.publishedAt ?? new Date() },
    });
  }

  async unpublish(id: string): Promise<Post> {
    return this.prisma.post.update({ where: { id }, data: { status: 'DRAFT' } });
  }

  async getById(id: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('post not found');
    return post;
  }

  async getPublishedBySlug(
    slug: string,
  ): Promise<(Post & { author: { displayName: string } }) | null> {
    return this.prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { author: { select: { displayName: true } } },
    });
  }

  async listAdmin(query: ListPostsQuery) {
    const where: { status?: PostStatus; OR?: unknown[] } = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { slug: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const items = await this.prisma.post.findMany({
      where: where as never,
      orderBy: { updatedAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async listPublished(query: { cursor?: string; limit: number }) {
    const items = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { author: { select: { displayName: true } } },
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async listAllPublishedForSitemap(): Promise<
    { slug: string; publishedAt: Date; updatedAt: Date }[]
  > {
    return this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }) as never;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  async incrementViewCount(slug: string): Promise<void> {
    await this.prisma.post.updateMany({
      where: { slug, status: 'PUBLISHED' },
      data: { viewCount: { increment: 1 } },
    });
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let n = 1;
    while (true) {
      const candidate = appendDedupeSuffix(base, n);
      const existing = await this.prisma.post.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      n += 1;
      if (n > 1000) throw new ConflictException('slug collision exhausted');
    }
  }
}
```

- [ ] **Step 5: Create `packages/api/src/posts/posts.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import {
  CreatePostInputSchema,
  UpdatePostInputSchema,
  ListPostsQuerySchema,
  type CreatePostInput,
  type UpdatePostInput,
  type ListPostsQuery,
} from '@news/shared';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // --- Public read ---
  @Get('published')
  async listPublic(@Query('limit') limitRaw?: string, @Query('cursor') cursor?: string) {
    const limit = Math.min(Math.max(Number(limitRaw ?? 20), 1), 50);
    return this.posts.listPublished({ limit, cursor });
  }

  @Get('published/:slug')
  async getPublic(@Param('slug') slug: string) {
    const post = await this.posts.getPublishedBySlug(slug);
    if (!post) return null;
    void this.posts.incrementViewCount(slug);
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      author: post.author,
      seoTitle: post.seoTitle,
      seoDesc: post.seoDesc,
      ogImageUrl: post.ogImageUrl,
      viewCount: post.viewCount,
    };
  }

  // --- Admin ---
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query(new ZodValidationPipe(ListPostsQuerySchema)) query: ListPostsQuery) {
    return this.posts.listAdmin(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.posts.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(CreatePostInputSchema))
  async create(@Body() body: CreatePostInput, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.posts.create(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UsePipes(new ZodValidationPipe(UpdatePostInputSchema))
  async update(@Param('id') id: string, @Body() body: UpdatePostInput) {
    return this.posts.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id') id: string) {
    return this.posts.publish(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(@Param('id') id: string) {
    return this.posts.unpublish(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.posts.delete(id);
  }

  @Get('sitemap-data')
  async sitemap() {
    const items = await this.posts.listAllPublishedForSitemap();
    return items.map((p) => ({
      slug: p.slug,
      publishedAt: p.publishedAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}
```

- [ ] **Step 6: Create `packages/api/src/posts/posts.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

- [ ] **Step 7: Modify `packages/api/src/app.module.ts`** — register PostsModule:

```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    PostsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

- [ ] **Step 8: Run typecheck**

```bash
pnpm --filter @news/api typecheck
```

Expected: clean. If errors, fix before commit.

- [ ] **Step 9: Commit**

```bash
git add packages/api packages/api/package.json
git commit -m "feat(api): add Posts module with CRUD, slug, and tiptap server-render"
```

---

## Task 4: Posts e2e tests

**Files:**

- Create: `packages/api/test/posts.e2e-spec.ts`

- [ ] **Step 1: Create test**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { prisma } from '@news/db';

let app: INestApplication;
let authCookie: string;
const testEmail = 'e2e-posts@local.test';
const testPassword = 'PostsTest123!';

beforeAll(async () => {
  await prisma.post.deleteMany({ where: { author: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'PostsTester',
      passwordHash: await bcrypt.hash(testPassword, 10),
    },
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  await app.init();

  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: testEmail, password: testPassword });
  const cookies = login.headers['set-cookie'] as unknown as string[];
  authCookie = cookies.find((c) => c.startsWith('access_token='))!;
});

afterAll(async () => {
  await prisma.post.deleteMany({ where: { author: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

describe('Posts CRUD', () => {
  let postId: string;

  it('creates a post (admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/posts')
      .set('Cookie', authCookie)
      .send({ title: 'Tin tức mới hôm nay' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('tin-tuc-moi-hom-nay');
    expect(res.body.status).toBe('DRAFT');
    postId = res.body.id;
  });

  it('rejects create without auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/posts')
      .send({ title: 'should fail' });
    expect(res.status).toBe(401);
  });

  it('lists admin posts', async () => {
    const res = await request(app.getHttpServer()).get('/api/posts').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('updates a post', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/posts/${postId}`)
      .set('Cookie', authCookie)
      .send({ title: 'Tin tức đã sửa', excerpt: 'tóm tắt' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tin tức đã sửa');
    expect(res.body.slug).toBe('tin-tuc-da-sua');
  });

  it('publishes a post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/publish`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    expect(res.body.publishedAt).toBeTruthy();
  });

  it('returns published post on public endpoint', async () => {
    const res = await request(app.getHttpServer()).get('/api/posts/published/tin-tuc-da-sua');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tin tức đã sửa');
  });

  it('does not return draft on public endpoint', async () => {
    const draft = await prisma.post.create({
      data: {
        slug: 'draft-only',
        title: 'Draft only',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'DRAFT',
        author: { connect: { email: testEmail } },
      },
    });
    const res = await request(app.getHttpServer()).get('/api/posts/published/draft-only');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
    await prisma.post.delete({ where: { id: draft.id } });
  });

  it('unpublishes a post', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/posts/${postId}/unpublish`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('deletes a post', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/posts/${postId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(204);
    const check = await request(app.getHttpServer())
      .get(`/api/posts/${postId}`)
      .set('Cookie', authCookie);
    expect(check.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run e2e tests**

```bash
pnpm --filter @news/api test:e2e
```

Expected: all tests pass (auth.e2e-spec 7 + posts.e2e-spec 9 = 16 total).

- [ ] **Step 3: Commit**

```bash
git add packages/api/test/posts.e2e-spec.ts
git commit -m "test(api): add e2e tests for Posts CRUD and publish flow"
```

---

## Task 5: Web data fetcher + admin posts list page

**Files:**

- Create: `apps/web/src/lib/posts.ts`
- Create: `apps/web/src/app/admin/posts/page.tsx`

- [ ] **Step 1: Create `apps/web/src/lib/posts.ts`** — server-side fetchers

```ts
import { cookies } from 'next/headers';
import type { AdminPost, PostListItem, PublicPost } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders() {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listAdminPosts(query: {
  status?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: PostListItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const res = await fetch(`${API_URL}/api/posts?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listAdminPosts failed: ${res.status}`);
  return res.json();
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const res = await fetch(`${API_URL}/api/posts/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getAdminPost failed: ${res.status}`);
  return res.json();
}

export async function listPublishedPosts(opts: { limit?: number; cursor?: string } = {}): Promise<{
  items: (PostListItem & { author: { displayName: string } })[];
  nextCursor: string | null;
}> {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 20));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const res = await fetch(`${API_URL}/api/posts/published?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`listPublishedPosts failed: ${res.status}`);
  return res.json();
}

export async function getPublishedPostBySlug(slug: string): Promise<PublicPost | null> {
  const res = await fetch(`${API_URL}/api/posts/published/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.id) return null;
  return data;
}

export async function listAllPublishedForSitemap(): Promise<
  { slug: string; publishedAt: string; updatedAt: string }[]
> {
  const res = await fetch(`${API_URL}/api/posts/sitemap-data`, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  return res.json();
}
```

- [ ] **Step 2: Create `apps/web/src/app/admin/posts/page.tsx`** — admin list

```tsx
import Link from 'next/link';
import { listAdminPosts } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const sp = await searchParams;
  const data = await listAdminPosts({ status: sp.status, q: sp.q, cursor: sp.cursor });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bài viết</h1>
        <Link
          href="/admin/posts/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + Tạo bài mới
        </Link>
      </div>

      <form className="mb-4 flex gap-2" action="/admin/posts">
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Tìm theo tiêu đề/slug..."
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <button type="submit" className="rounded border px-3 py-2 text-sm">
          Lọc
        </button>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="px-2 py-2">Tiêu đề</th>
            <th className="px-2 py-2">Slug</th>
            <th className="px-2 py-2">Trạng thái</th>
            <th className="px-2 py-2">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2">
                <Link href={`/admin/posts/${p.id}/edit`} className="font-medium text-blue-700">
                  {p.title}
                </Link>
              </td>
              <td className="px-2 py-2 text-gray-500">{p.slug}</td>
              <td className="px-2 py-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{p.status}</span>
              </td>
              <td className="px-2 py-2 text-gray-500">
                {p.publishedAt ? new Date(p.publishedAt).toLocaleString('vi-VN') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.nextCursor && (
        <div className="mt-4">
          <Link
            href={`/admin/posts?cursor=${data.nextCursor}${sp.q ? `&q=${sp.q}` : ''}${
              sp.status ? `&status=${sp.status}` : ''
            }`}
            className="text-sm text-blue-700"
          >
            Trang sau →
          </Link>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Start API + web in background. Login admin via curl + visit `/admin/posts`:

```bash
curl -i -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}'
curl -s -b /tmp/c.txt http://localhost:3000/admin/posts | grep -o "Bài viết\|Tạo bài mới"
```

Expected: page renders. Even if zero posts, table is empty but page works.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/posts.ts apps/web/src/app/admin/posts/page.tsx
git commit -m "feat(web): admin posts list page with filters and pagination"
```

---

## Task 6: TipTap editor + admin new/edit pages

**Files:**

- Create: `apps/web/src/app/admin/posts/editor/tiptap-extensions.ts`
- Create: `apps/web/src/app/admin/posts/editor/tiptap-editor.tsx`
- Create: `apps/web/src/app/admin/posts/editor/post-form.tsx`
- Create: `apps/web/src/app/admin/posts/editor/publish-controls.tsx`
- Create: `apps/web/src/app/admin/posts/new/page.tsx`
- Create: `apps/web/src/app/admin/posts/[id]/edit/page.tsx`
- Create: `apps/web/src/app/api/posts/route.ts` (proxy create)
- Create: `apps/web/src/app/api/posts/[id]/route.ts` (proxy patch + delete)
- Create: `apps/web/src/app/api/posts/[id]/publish/route.ts`
- Create: `apps/web/src/app/api/posts/[id]/unpublish/route.ts`
- Modify: `apps/web/package.json` (add tiptap deps)

- [ ] **Step 1: Add tiptap deps**

```bash
pnpm --filter @news/web add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-youtube @tiptap/core
```

- [ ] **Step 2: Create `apps/web/src/app/admin/posts/editor/tiptap-extensions.ts`**

```ts
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';

export const editorExtensions = [
  StarterKit,
  Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
  Youtube.configure({ controls: true, nocookie: true }),
];
```

- [ ] **Step 3: Create `apps/web/src/app/admin/posts/editor/tiptap-editor.tsx`**

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './tiptap-extensions';
import { useEffect } from 'react';

interface Props {
  content: unknown;
  onChange: (json: unknown) => void;
}

export function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: content ?? { type: 'doc', content: [] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[400px] rounded border bg-white p-4 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content as never);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, label: string, action: () => void) => (
    <button
      type="button"
      onClick={action}
      className={`rounded border px-2 py-1 text-xs ${active ? 'bg-black text-white' : 'bg-white'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {btn(editor.isActive('bold'), 'B', () => editor.chain().focus().toggleBold().run())}
      {btn(editor.isActive('italic'), 'I', () => editor.chain().focus().toggleItalic().run())}
      {btn(editor.isActive('heading', { level: 2 }), 'H2', () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn(editor.isActive('heading', { level: 3 }), 'H3', () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      {btn(editor.isActive('bulletList'), '•', () =>
        editor.chain().focus().toggleBulletList().run(),
      )}
      {btn(editor.isActive('orderedList'), '1.', () =>
        editor.chain().focus().toggleOrderedList().run(),
      )}
      {btn(editor.isActive('blockquote'), '"', () =>
        editor.chain().focus().toggleBlockquote().run(),
      )}
      {btn(false, 'Link', () => {
        const url = window.prompt('URL?');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      })}
      {btn(false, 'YouTube', () => {
        const url = window.prompt('YouTube URL?');
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      })}
      {btn(false, 'Undo', () => editor.chain().focus().undo().run())}
      {btn(false, 'Redo', () => editor.chain().focus().redo().run())}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/src/app/admin/posts/editor/post-form.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './tiptap-editor';
import { PublishControls } from './publish-controls';
import type { AdminPost } from '@news/shared';

interface Props {
  initial?: AdminPost;
}

export function PostForm({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '');
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? '');
  const [seoDesc, setSeoDesc] = useState(initial?.seoDesc ?? '');
  const [contentJson, setContentJson] = useState<unknown>(
    initial?.contentJson ?? { type: 'doc', content: [] },
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const payload = {
      title,
      slug: slug || undefined,
      excerpt: excerpt || undefined,
      coverImageUrl: coverImageUrl || undefined,
      seoTitle: seoTitle || undefined,
      seoDesc: seoDesc || undefined,
      contentJson,
    };
    const url = initial ? `/api/posts/${initial.id}` : '/api/posts';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setErr(`Lưu thất bại (${res.status})`);
      return;
    }
    const post = await res.json();
    if (!initial) router.push(`/admin/posts/${post.id}/edit`);
    else router.refresh();
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bài viết..."
          className="w-full rounded border px-4 py-3 text-2xl font-semibold"
        />
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Tóm tắt..."
          rows={2}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <TiptapEditor content={contentJson} onChange={setContentJson} />
      </div>
      <aside className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-tạo từ tiêu đề"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ảnh cover (URL)</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">SEO</summary>
          <div className="mt-2 space-y-2">
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO title"
              className="w-full rounded border px-3 py-2 text-sm"
            />
            <textarea
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
              placeholder="SEO description"
              rows={3}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </details>
        <button
          type="button"
          onClick={save}
          disabled={saving || !title}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo bài'}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {initial && <PublishControls post={initial} />}
      </aside>
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/app/admin/posts/editor/publish-controls.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminPost } from '@news/shared';

export function PublishControls({ post }: { post: AdminPost }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function callAction(path: string) {
    setBusy(true);
    await fetch(path, { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  async function deletePost() {
    if (!confirm('Xác nhận xóa bài viết?')) return;
    setBusy(true);
    await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    setBusy(false);
    router.push('/admin/posts');
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm">
        Trạng thái: <span className="font-mono">{post.status}</span>
      </p>
      {post.status !== 'PUBLISHED' ? (
        <button
          onClick={() => callAction(`/api/posts/${post.id}/publish`)}
          disabled={busy}
          className="w-full rounded border bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Xuất bản
        </button>
      ) : (
        <button
          onClick={() => callAction(`/api/posts/${post.id}/unpublish`)}
          disabled={busy}
          className="w-full rounded border px-4 py-2 text-sm"
        >
          Bỏ xuất bản
        </button>
      )}
      <button
        onClick={deletePost}
        disabled={busy}
        className="w-full rounded border border-red-300 px-4 py-2 text-sm text-red-600"
      >
        Xóa
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/app/admin/posts/new/page.tsx`**

```tsx
import { PostForm } from '../editor/post-form';

export default function NewPostPage() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Tạo bài mới</h1>
      <PostForm />
    </main>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/app/admin/posts/[id]/edit/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { getAdminPost } from '@/lib/posts';
import { PostForm } from '../../editor/post-form';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài: {post.title}</h1>
      <PostForm initial={post} />
    </main>
  );
}
```

- [ ] **Step 8: Create proxy route handlers**

`apps/web/src/app/api/posts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return passthroughResponse(upstream);
}

async function passthroughResponse(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
```

`apps/web/src/app/api/posts/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function passthrough(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';
  return passthrough(
    await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body,
    }),
  );
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  return passthrough(
    await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { cookie },
    }),
  );
}
```

`apps/web/src/app/api/posts/[id]/publish/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/posts/${id}/publish`, {
    method: 'POST',
    headers: { cookie },
  });
  if (upstream.ok) {
    const post = await upstream.clone().json();
    if (post?.publishedAt && post?.slug) {
      const d = new Date(post.publishedAt);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      revalidatePath(`/${yyyy}/${mm}/${dd}/${post.slug}`);
      revalidatePath('/');
    }
  }
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
```

`apps/web/src/app/api/posts/[id]/unpublish/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/posts/${id}/unpublish`, {
    method: 'POST',
    headers: { cookie },
  });
  if (upstream.ok) {
    revalidatePath('/', 'layout');
  }
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
```

- [ ] **Step 9: Manual smoke test**

Start API + web. With admin cookie, navigate to `/admin/posts/new`, create a bài, then publish.

Verify via curl that the editor page renders:

```bash
curl -s -b /tmp/c.txt http://localhost:3000/admin/posts/new | grep -o "Tạo bài mới\|Tiêu đề"
```

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): tiptap editor and admin post create/edit/publish flow"
```

---

## Task 7: Public homepage replacing placeholder

**Files:**

- Modify: `apps/web/src/app/page.tsx` (replace placeholder)

- [ ] **Step 1: Replace `apps/web/src/app/page.tsx`**

```tsx
import Link from 'next/link';
import { listPublishedPosts } from '@/lib/posts';

export const revalidate = 60;

function postUrl(p: { publishedAt: string | null; slug: string }) {
  if (!p.publishedAt) return '#';
  const d = new Date(p.publishedAt);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `/${yyyy}/${mm}/${dd}/${p.slug}`;
}

export default async function HomePage() {
  const data = await listPublishedPosts({ limit: 12 });
  const posts = data.items;
  const [featured, ...rest] = posts;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          News
        </Link>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">
          Admin
        </Link>
      </header>

      {featured ? (
        <section className="mb-10">
          <Link href={postUrl(featured)} className="block overflow-hidden rounded-lg bg-gray-100">
            {featured.coverImageUrl && (
              <img
                src={featured.coverImageUrl}
                alt={featured.title}
                className="h-80 w-full object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-3xl font-bold">{featured.title}</h2>
              {featured.excerpt && <p className="mt-2 text-gray-600">{featured.excerpt}</p>}
              <p className="mt-3 text-xs text-gray-500">
                {featured.publishedAt && new Date(featured.publishedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </Link>
        </section>
      ) : (
        <p className="mb-10 text-gray-500">Chưa có bài viết nào.</p>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {rest.map((p) => (
          <Link
            key={p.id}
            href={postUrl(p)}
            className="block overflow-hidden rounded-lg border bg-white"
          >
            {p.coverImageUrl && (
              <img src={p.coverImageUrl} alt={p.title} className="h-44 w-full object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-semibold">{p.title}</h3>
              {p.excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.excerpt}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {p.publishedAt && new Date(p.publishedAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Smoke test**

Create + publish at least 1 post via admin, then:

```bash
curl -s http://localhost:3000/ | grep -o "<h1\|<h2\|News"
```

Expected: header "News" + featured h2 if published post exists.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): replace placeholder homepage with published-posts grid"
```

---

## Task 8: Public post detail page + sitemap + robots + RSS

**Files:**

- Create: `apps/web/src/app/[year]/[month]/[day]/[slug]/page.tsx`
- Create: `apps/web/src/app/sitemap.xml/route.ts`
- Create: `apps/web/src/app/rss.xml/route.ts`
- Create: `apps/web/src/app/robots.txt/route.ts`

- [ ] **Step 1: Create post detail page** at `apps/web/src/app/[year]/[month]/[day]/[slug]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublishedPostBySlug } from '@/lib/posts';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: 'Không tìm thấy' };
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDesc ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDesc ?? post.excerpt ?? undefined,
      type: 'article',
      images: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
      publishedTime: post.publishedAt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ year: string; month: string; day: string; slug: string }>;
}) {
  const { year, month, day, slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  // Verify URL date matches publishedAt (avoid duplicate URLs for the same post)
  const d = new Date(post.publishedAt);
  const expected = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
  if (expected !== `${year}/${month}/${day}`) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDesc ?? post.excerpt ?? undefined,
    image: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author.displayName },
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <h1 className="mb-4 text-4xl font-bold leading-tight">{post.title}</h1>
        <p className="mb-6 text-sm text-gray-500">
          ✍ {post.author.displayName} · 📅 {new Date(post.publishedAt).toLocaleDateString('vi-VN')}{' '}
          · 👁 {post.viewCount}
        </p>
        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mb-6 w-full rounded-lg object-cover"
          />
        )}
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </main>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/app/sitemap.xml/route.ts`**

```ts
import { listAllPublishedForSitemap } from '@/lib/posts';

export const revalidate = 600;

export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const posts = await listAllPublishedForSitemap();
  const urls = posts
    .map((p) => {
      const d = new Date(p.publishedAt);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `<url><loc>${baseUrl}/${yyyy}/${mm}/${dd}/${p.slug}</loc><lastmod>${p.updatedAt}</lastmod></url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}</loc></url>${urls}</urlset>`;

  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
```

- [ ] **Step 3: Create `apps/web/src/app/rss.xml/route.ts`**

```ts
import { listPublishedPosts } from '@/lib/posts';

export const revalidate = 600;

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const data = await listPublishedPosts({ limit: 50 });
  const items = data.items
    .filter((p) => p.publishedAt)
    .map((p) => {
      const d = new Date(p.publishedAt!);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const url = `${baseUrl}/${yyyy}/${mm}/${dd}/${p.slug}`;
      return `<item><title>${escape(p.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(
        p.publishedAt!,
      ).toUTCString()}</pubDate>${p.excerpt ? `<description>${escape(p.excerpt)}</description>` : ''}</item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>News</title><link>${baseUrl}</link><description>Latest posts</description>${items}</channel></rss>`;

  return new Response(xml, { headers: { 'content-type': 'application/rss+xml' } });
}
```

- [ ] **Step 4: Create `apps/web/src/app/robots.txt/route.ts`**

```ts
export async function GET() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: ${baseUrl}/sitemap.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
```

- [ ] **Step 5: Create `apps/web/tests/sitemap.test.ts`** — light unit test

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/posts', () => ({
  listAllPublishedForSitemap: async () => [
    { slug: 'one', publishedAt: '2026-05-10T10:00:00.000Z', updatedAt: '2026-05-10T10:00:00.000Z' },
  ],
}));

describe('sitemap.xml', () => {
  it('renders entries with /yyyy/mm/dd/slug url', async () => {
    process.env.PUBLIC_BASE_URL = 'https://example.com';
    const { GET } = await import('../src/app/sitemap.xml/route');
    const res = await GET();
    const text = await res.text();
    expect(res.headers.get('content-type')).toBe('application/xml');
    expect(text).toContain('https://example.com/2026/05/10/one');
  });
});
```

- [ ] **Step 6: Run all tests**

```bash
cd /home/ealflm/dev/news && pnpm test 2>&1 | tail -10
```

Expected: shared 10 + api e2e 16 (auth 7 + posts 9) + web 6 (middleware 5 + sitemap 1) = 32 tests pass.

- [ ] **Step 7: Manual smoke**

Start API + web (after publishing at least 1 post):

```bash
curl -s http://localhost:3000/sitemap.xml | head -1
curl -s http://localhost:3000/rss.xml | head -1
curl -s http://localhost:3000/robots.txt
```

Expected XML headers + `User-agent: *` for robots.

Visit a post URL: `curl -s http://localhost:3000/2026/05/10/<slug> | grep -o "<h1\|JSON-LD"`. (You may need to look up the actual published post slug + date.)

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): public post detail with SEO, sitemap, RSS, robots, JSON-LD"
```

---

## Task 9: Acceptance verification

- [ ] **Step 1: Reset to clean state**

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
sleep 8
pnpm install
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm --filter @news/db build
pnpm --filter @news/shared build
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test 2>&1 | tee /tmp/phase2-test-results.txt
```

Expected: all packages pass with totals shared 10 + api 16 + web 6 = 32.

- [ ] **Step 3: Full manual flow**

Start API + web:

```bash
pnpm --filter @news/api dev > /tmp/api2.log 2>&1 &
pnpm --filter @news/web dev > /tmp/web2.log 2>&1 &
sleep 12
```

Login admin, create + publish a post via API:

```bash
curl -i -c /tmp/c.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}'

# Create
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Bài viết acceptance","excerpt":"abc","contentJson":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}}'

# List & grab id (jq optional; if not available, parse manually)
POST_ID=$(curl -s -b /tmp/c.txt http://localhost:3000/api/posts | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')

# Publish
curl -s -b /tmp/c.txt -X POST http://localhost:3000/api/posts/$POST_ID/publish

# Get slug + date for URL
SLUG=$(curl -s -b /tmp/c.txt http://localhost:3000/api/posts/$POST_ID | python3 -c 'import sys,json;print(json.load(sys.stdin)["slug"])')
DATE=$(curl -s -b /tmp/c.txt http://localhost:3000/api/posts/$POST_ID | python3 -c 'import sys,json,datetime;d=datetime.datetime.fromisoformat(json.load(sys.stdin)["publishedAt"].replace("Z","+00:00"));print(d.strftime("%Y/%m/%d"))')

echo "Post URL: /$DATE/$SLUG"

# Public detail
curl -s "http://localhost:3000/$DATE/$SLUG" | grep -o "Bài viết acceptance"

# Homepage
curl -s http://localhost:3000/ | grep -o "Bài viết acceptance"

# Sitemap, RSS, robots
curl -s http://localhost:3000/sitemap.xml | grep -o "$SLUG"
curl -s http://localhost:3000/rss.xml | grep -o "$SLUG"
curl -s http://localhost:3000/robots.txt | grep "User-agent"
```

Expected: each grep returns the search term.

Stop dev servers:

```bash
pkill -f "next dev" ; pkill -f "nest start"
```

- [ ] **Step 4: Commit acceptance fixes if any**

If you needed to adjust anything, commit with `chore: phase 2 acceptance fixes`. Otherwise nothing to commit.

---

## Acceptance criteria

- [ ] Prisma migration `posts` applied with Post model + PostStatus enum.
- [ ] All 32 tests pass (`pnpm test`).
- [ ] Admin can create/edit/publish/unpublish/delete posts via UI.
- [ ] TipTap editor renders, supports B/I, H2/H3, lists, blockquote, link, YouTube embed, undo/redo.
- [ ] Public homepage lists published posts in grid (featured + 12 cards).
- [ ] Post detail at `/yyyy/mm/dd/slug` renders content from contentHtml + meta tags.
- [ ] sitemap.xml and rss.xml return XML with all published posts.
- [ ] robots.txt returns User-agent + sitemap reference.
- [ ] Publishing triggers ISR revalidate for `/` and `/yyyy/mm/dd/slug`.

When all checked, Phase 2 done. Move to Phase 3 (Media pipeline).
