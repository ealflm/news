# Phase 3a — Media Images + Library + Editor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image upload pipeline (Multer → sharp variants → local disk), media library admin page, TipTap Image extension integrated in editor and server-side renderer, replace cover-image plain-URL input with upload picker. Outcome: admin can drag-drop images in editor, upload cover image, browse media library; public posts render responsive `<picture>` with avif/webp/jpg variants.

**Architecture:** NestJS Media module with `StorageProvider` interface (currently `LocalStorageProvider` writing to `/uploads/*`). Multer middleware on upload endpoint validates mime/size, sharp pipeline produces 320/720/1280/1920 widths × jpg+webp+avif. NestJS `ServeStaticModule` serves `/uploads` in dev; nginx will serve in prod (Phase 6). Editor uses `@tiptap/extension-image` with custom upload handler. Server renderer registers Image extension for `generateHTML` parity with client.

**Tech Stack:** sharp, multer, @nestjs/serve-static, @tiptap/extension-image (both api + web), file-type for mime sniffing, cuid for filenames.

**Out of scope (Phase 3b):** video upload, ffmpeg transcoding, BullMQ worker, oEmbed for TikTok/Facebook, HLS streaming.

---

## File structure created in this plan

```
packages/db/prisma/schema.prisma                     (add Media model)
packages/db/prisma/migrations/<ts>_media/
packages/shared/src/media.schemas.ts                 (UploadResponse, ImageVariants, MediaListItem)
packages/shared/src/media.types.ts
packages/shared/src/index.ts                          (re-export)

packages/api/
├── package.json                                      (add sharp, multer, file-type, @nestjs/serve-static, @tiptap/extension-image, types)
└── src/
    ├── media/
    │   ├── media.module.ts
    │   ├── media.service.ts
    │   ├── media.controller.ts
    │   ├── storage/
    │   │   ├── storage.interface.ts
    │   │   └── local-storage.provider.ts
    │   ├── sharp.util.ts                             (image variant pipeline)
    │   └── upload.config.ts                           (multer config)
    ├── posts/tiptap-render.util.ts                    (modify: add Image + Link + Youtube)
    └── app.module.ts                                  (add MediaModule + ServeStaticModule)
test/media.e2e-spec.ts                                  (e2e upload + list + delete)

apps/web/
├── package.json                                      (add @tiptap/extension-image)
└── src/
    ├── app/
    │   ├── api/media/
    │   │   ├── route.ts                              (proxy POST upload, GET list)
    │   │   └── [id]/route.ts                          (proxy DELETE)
    │   ├── admin/media/
    │   │   ├── page.tsx                              (library grid)
    │   │   └── media-grid.tsx                         (client component for delete)
    │   └── admin/posts/editor/
    │       ├── tiptap-extensions.ts                   (modify: add Image extension + uploadHandler)
    │       ├── tiptap-editor.tsx                      (modify: hook drop + paste, add Image button)
    │       ├── post-form.tsx                          (modify: cover image is now an upload picker)
    │       └── cover-image-picker.tsx                 (new client component)
    └── lib/
        ├── posts.ts                                   (modify: PublicPost cover + image variants)
        └── media.ts                                   (new — upload helper, list helper)
```

---

## Conventions

- All `Media` rows have `kind` enum: `IMAGE` for now, `VIDEO`/`EMBED` reserved for Phase 3b.
- Image variants stored as JSON: `{ "320w": "p1.jpg", "720w": "p2.jpg", "1280w": "p3.jpg", "1920w": "p4.jpg", "webp_320w": "...", "avif_320w": "...", ... }` — keys are `<format>_<width>w`.
- Original kept at `/uploads/orig/<id>.<ext>` (immutable).
- Variants at `/uploads/variants/<id>/<format>-<width>w.<ext>`.
- Public URL prefix: `/uploads/...` — served by NestJS ServeStatic (dev) or nginx (prod).
- Max image size: 20MB. Allowed mime: `image/jpeg`, `image/png`, `image/webp`, `image/gif` (gif treated as IMAGE without animation processing for now — use original as-is for "320w/720w/etc").

---

## Task 1: Media model + migration + shared schemas

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: migration `<ts>_media`
- Create: `packages/shared/src/media.schemas.ts`
- Create: `packages/shared/src/media.types.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/media.schemas.test.ts`

- [ ] **Step 1: Edit `packages/db/prisma/schema.prisma`** — add Media model + MediaKind enum

Append after `Post` model:

```prisma
enum MediaKind {
  IMAGE
  VIDEO
  EMBED
}

model Media {
  id            String    @id @default(cuid())
  kind          MediaKind @default(IMAGE)
  originalPath  String?                     // /uploads/orig/<id>.<ext>
  variants      Json?                       // { "320w": "...", ... }
  width         Int?
  height        Int?
  sizeBytes     BigInt?
  mimeType      String?
  alt           String?
  uploadedById  String?
  uploadedBy    User?     @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime  @default(now())

  @@index([uploadedById, createdAt])
}
```

Modify `User` model — add reverse relation:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  posts        Post[]
  media        Media[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 2: Generate migration**

```bash
cd /home/ealflm/dev/news
pnpm --filter @news/db exec prisma migrate dev --name media
pnpm --filter @news/db exec prisma generate
pnpm --filter @news/db build
```

- [ ] **Step 3: Verify table**

```bash
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c '\d "Media"'
```

Expected: table with all columns, MediaKind enum.

- [ ] **Step 4: Create `packages/shared/src/media.schemas.ts`**

```ts
import { z } from 'zod';

export const MediaKindSchema = z.enum(['IMAGE', 'VIDEO', 'EMBED']);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const ImageVariantsSchema = z.record(z.string());
export type ImageVariants = z.infer<typeof ImageVariantsSchema>;

export const ListMediaQuerySchema = z.object({
  kind: MediaKindSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});
export type ListMediaQuery = z.infer<typeof ListMediaQuerySchema>;
```

- [ ] **Step 5: Create `packages/shared/src/media.types.ts`**

```ts
import type { MediaKind, ImageVariants } from './media.schemas';

export interface MediaRecord {
  id: string;
  kind: MediaKind;
  originalPath: string | null;
  variants: ImageVariants | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  alt: string | null;
  createdAt: string;
}

export interface UploadResponse {
  media: MediaRecord;
}

export interface MediaListResponse {
  items: MediaRecord[];
  nextCursor: string | null;
}
```

- [ ] **Step 6: Update `packages/shared/src/index.ts`**

Append:

```ts
export * from './media.schemas';
export * from './media.types';
```

- [ ] **Step 7: Add unit test `packages/shared/src/media.schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { MediaKindSchema, ImageVariantsSchema, ListMediaQuerySchema } from './media.schemas';

describe('MediaKindSchema', () => {
  it('accepts IMAGE/VIDEO/EMBED', () => {
    expect(MediaKindSchema.safeParse('IMAGE').success).toBe(true);
    expect(MediaKindSchema.safeParse('VIDEO').success).toBe(true);
    expect(MediaKindSchema.safeParse('EMBED').success).toBe(true);
  });
  it('rejects other values', () => {
    expect(MediaKindSchema.safeParse('AUDIO').success).toBe(false);
  });
});

describe('ImageVariantsSchema', () => {
  it('accepts string-record', () => {
    expect(ImageVariantsSchema.safeParse({ '320w': 'a.jpg', avif_720w: 'b.avif' }).success).toBe(
      true,
    );
  });
  it('rejects non-string values', () => {
    expect(ImageVariantsSchema.safeParse({ '320w': 123 }).success).toBe(false);
  });
});

describe('ListMediaQuerySchema', () => {
  it('coerces limit string to number', () => {
    const r = ListMediaQuerySchema.safeParse({ limit: '50' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.limit).toBe(50);
  });
  it('caps limit at 100', () => {
    expect(ListMediaQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
  it('defaults limit to 40', () => {
    const r = ListMediaQuerySchema.safeParse({});
    expect(r.success && r.data.limit).toBe(40);
  });
});
```

- [ ] **Step 8: Build + run tests**

```bash
pnpm --filter @news/shared build
pnpm --filter @news/shared test
```

Expected: all tests pass (11 existing post+auth + 7 new media = 18 tests in shared).

- [ ] **Step 9: Commit**

```bash
git add packages/db packages/shared
git commit -m "feat(media): add Media model, MediaKind enum, and shared schemas"
```

---

## Task 2: NestJS Media module — storage, sharp, upload endpoint

**Files:**

- Create: `packages/api/src/media/storage/storage.interface.ts`
- Create: `packages/api/src/media/storage/local-storage.provider.ts`
- Create: `packages/api/src/media/sharp.util.ts`
- Create: `packages/api/src/media/upload.config.ts`
- Create: `packages/api/src/media/media.service.ts`
- Create: `packages/api/src/media/media.controller.ts`
- Create: `packages/api/src/media/media.module.ts`
- Modify: `packages/api/src/app.module.ts` (register MediaModule + ServeStaticModule)
- Modify: `packages/api/package.json` (add deps)

- [ ] **Step 1: Add api deps**

```bash
pnpm --filter @news/api add sharp @nestjs/serve-static @nestjs/platform-express multer file-type @tiptap/extension-image
pnpm --filter @news/api add -D @types/multer
```

Note: `multer` ships with `@nestjs/platform-express` already; explicit install ensures correct version.

- [ ] **Step 2: Create uploads directory**

```bash
mkdir -p /home/ealflm/dev/news/uploads/orig /home/ealflm/dev/news/uploads/variants
echo "*" > /home/ealflm/dev/news/uploads/.gitignore
echo "!.gitignore" >> /home/ealflm/dev/news/uploads/.gitignore
```

This makes `uploads/` exist in checkout (with .gitignore inside) but git ignores all files in it. The .env loaders point to this path via `UPLOADS_DIR`.

- [ ] **Step 3: Add UPLOADS_DIR to env files**

Edit `.env.example` (append):

```
# Media uploads
UPLOADS_DIR=/home/ealflm/dev/news/uploads
PUBLIC_UPLOADS_PREFIX=/uploads
```

Same to `.env` and `packages/db/.env` (the latter for compatibility, though db doesn't need UPLOADS_DIR).

- [ ] **Step 4: Update env validator** in `packages/api/src/config/env.ts`:

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
  UPLOADS_DIR: z.string().default('/home/ealflm/dev/news/uploads'),
  PUBLIC_UPLOADS_PREFIX: z.string().default('/uploads'),
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

- [ ] **Step 5: Create `packages/api/src/media/storage/storage.interface.ts`**

```ts
import { Readable } from 'node:stream';

export interface StoredFile {
  /** Public URL path (e.g., /uploads/orig/abc.jpg) */
  publicPath: string;
  /** Bytes written */
  size: number;
}

export interface StorageProvider {
  /** Save buffer/stream and return public path */
  saveBuffer(category: string, filename: string, data: Buffer): Promise<StoredFile>;
  saveStream(category: string, filename: string, stream: Readable): Promise<StoredFile>;
  /** Delete file by public path */
  delete(publicPath: string): Promise<void>;
  /** Returns absolute filesystem path for a public path (for sharp/ffmpeg to read) */
  resolveFsPath(publicPath: string): string;
}
```

- [ ] **Step 6: Create `packages/api/src/media/storage/local-storage.provider.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Readable } from 'node:stream';
import { promises as fs, createWriteStream } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { loadEnv } from '../../config/env';
import type { StorageProvider, StoredFile } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly prefix: string;

  constructor() {
    const env = loadEnv();
    this.root = resolve(env.UPLOADS_DIR);
    this.prefix = env.PUBLIC_UPLOADS_PREFIX.replace(/\/$/, '');
  }

  private joinPublic(category: string, filename: string): string {
    return `${this.prefix}/${category}/${filename}`.replace(/\\+/g, '/');
  }

  async saveBuffer(category: string, filename: string, data: Buffer): Promise<StoredFile> {
    const fsPath = join(this.root, category, filename);
    await fs.mkdir(dirname(fsPath), { recursive: true });
    await fs.writeFile(fsPath, data);
    return { publicPath: this.joinPublic(category, filename), size: data.byteLength };
  }

  async saveStream(category: string, filename: string, stream: Readable): Promise<StoredFile> {
    const fsPath = join(this.root, category, filename);
    await fs.mkdir(dirname(fsPath), { recursive: true });
    await pipeline(stream, createWriteStream(fsPath));
    const stat = await fs.stat(fsPath);
    return { publicPath: this.joinPublic(category, filename), size: stat.size };
  }

  async delete(publicPath: string): Promise<void> {
    if (!publicPath.startsWith(this.prefix + '/')) return;
    const rel = publicPath.slice(this.prefix.length + 1);
    const fsPath = resolve(this.root, rel);
    if (!fsPath.startsWith(this.root + sep)) return; // safety
    await fs.rm(fsPath, { force: true, recursive: true });
  }

  resolveFsPath(publicPath: string): string {
    const rel = publicPath.startsWith(this.prefix + '/')
      ? publicPath.slice(this.prefix.length + 1)
      : publicPath;
    return resolve(this.root, rel);
  }
}

export const STORAGE = Symbol('STORAGE');
```

- [ ] **Step 7: Create `packages/api/src/media/sharp.util.ts`**

```ts
import sharp from 'sharp';

export interface ImageProcessOutput {
  variants: Record<string, Buffer>; // { "320w": <jpg>, webp_320w: <webp>, avif_320w: <avif>, ... }
  width: number;
  height: number;
}

const TARGET_WIDTHS = [320, 720, 1280, 1920] as const;

export async function processImage(input: Buffer): Promise<ImageProcessOutput> {
  const meta = await sharp(input).metadata();
  const origW = meta.width ?? 1920;
  const origH = meta.height ?? 1080;

  const out: Record<string, Buffer> = {};

  for (const w of TARGET_WIDTHS) {
    if (w > origW) continue; // don't upscale
    const base = sharp(input).resize({ width: w, withoutEnlargement: true });

    out[`${w}w`] = await base.clone().jpeg({ quality: 82, progressive: true }).toBuffer();
    out[`webp_${w}w`] = await base.clone().webp({ quality: 82 }).toBuffer();
    out[`avif_${w}w`] = await base.clone().avif({ quality: 60 }).toBuffer();
  }

  // Always include the original as the largest variant if no width matched
  if (Object.keys(out).length === 0) {
    out['orig'] = await sharp(input).jpeg({ quality: 90 }).toBuffer();
    out['webp_orig'] = await sharp(input).webp({ quality: 88 }).toBuffer();
  }

  return { variants: out, width: origW, height: origH };
}

export function variantFilename(format: string, width: string, ext: string): string {
  return `${format}-${width}.${ext}`;
}
```

- [ ] **Step 8: Create `packages/api/src/media/upload.config.ts`**

```ts
import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type Options } from 'multer';

export const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB

export const imageUploadOptions: Options = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(new BadRequestException(`Mime type not allowed: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
};
```

- [ ] **Step 9: Create `packages/api/src/media/media.service.ts`**

```ts
import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { createId } from '@paralleldrive/cuid2'; // already in @prisma/client deps; otherwise use cuid
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Media } from '@news/db';
import { processImage } from './sharp.util';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { ALLOWED_IMAGE_MIME } from './upload.config';

@Injectable()
export class MediaService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: LocalStorageProvider,
  ) {}

  async uploadImage(uploaderId: string, file: Express.Multer.File): Promise<Media> {
    if (!file?.buffer) throw new BadRequestException('no file');

    // Magic-byte validation (defense beyond multer mimetype)
    const detected = await fileTypeFromBuffer(file.buffer);
    if (!detected || !ALLOWED_IMAGE_MIME.has(detected.mime)) {
      throw new BadRequestException(
        `File content does not match expected image mime: ${detected?.mime ?? 'unknown'}`,
      );
    }

    const id = createId();
    const ext = detected.ext;
    const origPublic = `/uploads/orig/${id}.${ext}`;

    // Save original
    await this.storage.saveBuffer('orig', `${id}.${ext}`, file.buffer);

    // Generate variants
    const result = await processImage(file.buffer);
    const variants: Record<string, string> = {};

    for (const [key, buf] of Object.entries(result.variants)) {
      // key like "320w", "webp_320w", "avif_320w"
      const isOrig = key === 'orig';
      const format = key.includes('webp') ? 'webp' : key.includes('avif') ? 'avif' : 'jpg';
      const width = isOrig ? 'orig' : key.replace(/^(webp_|avif_)/, '');
      const filename = `${format}-${width}.${format === 'jpg' ? 'jpg' : format}`;
      const stored = await this.storage.saveBuffer(`variants/${id}`, filename, buf);
      variants[key] = stored.publicPath;
    }

    return this.prisma.media.create({
      data: {
        kind: 'IMAGE',
        originalPath: origPublic,
        variants: variants as never,
        width: result.width,
        height: result.height,
        sizeBytes: BigInt(file.size),
        mimeType: detected.mime,
        uploadedById: uploaderId,
      },
    });
  }

  async getById(id: string): Promise<Media> {
    const m = await this.prisma.media.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('media not found');
    return m;
  }

  async list(query: { cursor?: string; limit: number; kind?: string }) {
    const where: { kind?: 'IMAGE' | 'VIDEO' | 'EMBED' } = {};
    if (query.kind) where.kind = query.kind as never;
    const items = await this.prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const nextCursor = items.length > query.limit ? (items[query.limit]?.id ?? null) : null;
    return { items: items.slice(0, query.limit), nextCursor };
  }

  async delete(id: string): Promise<void> {
    const m = await this.getById(id);
    if (m.originalPath) await this.storage.delete(m.originalPath);
    if (m.variants && typeof m.variants === 'object') {
      for (const v of Object.values(m.variants as Record<string, string>)) {
        await this.storage.delete(v);
      }
      // Also remove the variants dir
      await this.storage.delete(`/uploads/variants/${id}`);
    }
    await this.prisma.media.delete({ where: { id } });
  }
}
```

NOTE on `@paralleldrive/cuid2`: Prisma's `cuid()` default uses `@paralleldrive/cuid2` internally. Adding direct import requires `pnpm --filter @news/api add @paralleldrive/cuid2`. Alternative: use Node's `crypto.randomUUID()` for filenames since they don't need Prisma's CUID guarantees. **Use `crypto.randomUUID()` instead** to avoid extra dep:

Replace the cuid line with:

```ts
import { randomUUID } from 'node:crypto';
// ...
const id = randomUUID();
```

(adjust import at top of media.service.ts)

- [ ] **Step 10: Create `packages/api/src/media/media.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { imageUploadOptions } from './upload.config';
import { ListMediaQuerySchema, type ListMediaQuery } from '@news/shared';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const user = req.user as { sub: string };
    const m = await this.media.uploadImage(user.sub, file);
    return { media: serializeMedia(m) };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query(new ZodValidationPipe(ListMediaQuerySchema)) q: ListMediaQuery) {
    const result = await this.media.list({ cursor: q.cursor, limit: q.limit, kind: q.kind });
    return {
      items: result.items.map(serializeMedia),
      nextCursor: result.nextCursor,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return serializeMedia(await this.media.getById(id));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.media.delete(id);
  }
}

function serializeMedia(m: {
  id: string;
  kind: string;
  originalPath: string | null;
  variants: unknown;
  width: number | null;
  height: number | null;
  sizeBytes: bigint | null;
  mimeType: string | null;
  alt: string | null;
  createdAt: Date;
}) {
  return {
    id: m.id,
    kind: m.kind,
    originalPath: m.originalPath,
    variants: m.variants,
    width: m.width,
    height: m.height,
    sizeBytes: m.sizeBytes != null ? Number(m.sizeBytes) : null,
    mimeType: m.mimeType,
    alt: m.alt,
    createdAt: m.createdAt.toISOString(),
  };
}
```

- [ ] **Step 11: Create `packages/api/src/media/media.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  controllers: [MediaController],
  providers: [MediaService, LocalStorageProvider],
  exports: [MediaService, LocalStorageProvider],
})
export class MediaModule {}
```

- [ ] **Step 12: Update `packages/api/src/app.module.ts`** — add MediaModule + ServeStaticModule

```ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { loadEnv } from './config/env';

const env = loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ServeStaticModule.forRoot({
      rootPath: resolve(env.UPLOADS_DIR),
      serveRoot: env.PUBLIC_UPLOADS_PREFIX,
      serveStaticOptions: { maxAge: '30d', immutable: true },
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PostsModule,
    MediaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

NOTE: `ServeStaticModule` needs to be set up BEFORE the global `setGlobalPrefix('api')` to avoid conflict. The `serveRoot: '/uploads'` already namespaces it correctly. Verify uploads work at `http://localhost:4000/uploads/...` — NOT `/api/uploads/...`. If conflict, set `serveRoot` to `/api/uploads` and update the `PUBLIC_UPLOADS_PREFIX` env var to match.

- [ ] **Step 13: Run typecheck**

```bash
pnpm --filter @news/api typecheck
```

If errors, fix before next step. Common: `Express.Multer.File` may need `import { Multer } from 'multer'` adjustment depending on version.

- [ ] **Step 14: Verify dev startup + serve uploads**

```bash
pnpm --filter @news/api dev > /tmp/api-mediadev.log 2>&1 &
sleep 8
echo "test content" > /home/ealflm/dev/news/uploads/orig/test.txt
curl -s http://localhost:4000/uploads/orig/test.txt
rm /home/ealflm/dev/news/uploads/orig/test.txt
pkill -f "nest start"
```

Expected: curl returns "test content".

- [ ] **Step 15: Commit**

```bash
git add packages/api .env.example .env
git commit -m "feat(api): media upload module with sharp variants and local storage"
```

(Don't commit .env. Verify status before commit; .env should be gitignored.)

---

## Task 3: Media e2e tests

**Files:**

- Create: `packages/api/test/media.e2e-spec.ts`

- [ ] **Step 1: Create test file**

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { prisma } from '@news/db';

let app: INestApplication;
let authCookie: string;
const testEmail = 'e2e-media@local.test';
const testPassword = 'MediaTest123!';

beforeAll(async () => {
  await prisma.media.deleteMany({ where: { uploadedBy: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'MediaTester',
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
  await prisma.media.deleteMany({ where: { uploadedBy: { email: testEmail } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

async function makeTestPng(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe('Media upload', () => {
  let uploadedId: string;

  it('rejects upload without auth', async () => {
    const buf = await makeTestPng();
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .attach('file', buf, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('uploads PNG and returns variants', async () => {
    const buf = await makeTestPng();
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', buf, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.media.id).toBeDefined();
    expect(res.body.media.kind).toBe('IMAGE');
    expect(res.body.media.width).toBe(800);
    expect(res.body.media.height).toBe(600);
    expect(res.body.media.originalPath).toMatch(/^\/uploads\/orig\/.+\.png$/);
    expect(res.body.media.variants).toBeDefined();
    expect(Object.keys(res.body.media.variants).length).toBeGreaterThan(0);
    uploadedId = res.body.media.id;
  });

  it('rejects oversized file', async () => {
    // 21MB buffer claiming to be PNG (will fail mime sniff anyway)
    const tooBig = Buffer.alloc(21 * 1024 * 1024, 0);
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', tooBig, { filename: 'big.png', contentType: 'image/png' });
    // Multer returns 413 or BadRequest depending on config
    expect([400, 413]).toContain(res.status);
  });

  it('rejects non-image file by content', async () => {
    const txt = Buffer.from('not an image at all');
    const res = await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Cookie', authCookie)
      .attach('file', txt, { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('lists uploaded media', async () => {
    const res = await request(app.getHttpServer()).get('/api/media').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.find((i: { id: string }) => i.id === uploadedId)).toBeTruthy();
  });

  it('deletes uploaded media and removes files', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    const orig = before.body.originalPath as string;

    const del = await request(app.getHttpServer())
      .delete(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    expect(del.status).toBe(204);

    const check = await request(app.getHttpServer())
      .get(`/api/media/${uploadedId}`)
      .set('Cookie', authCookie);
    expect(check.status).toBe(404);

    // File should be gone
    const fsPath = resolve(
      process.env.UPLOADS_DIR ?? '/home/ealflm/dev/news/uploads',
      orig.replace(/^\/uploads\//, ''),
    );
    let exists = true;
    try {
      await fs.access(fsPath);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
});
```

- [ ] **Step 2: Run e2e tests**

```bash
pnpm --filter @news/api test:e2e
```

Expected: 7 auth + 9 posts + 6 media = 22 e2e tests pass. If any fail, debug.

- [ ] **Step 3: Commit**

```bash
git add packages/api/test/media.e2e-spec.ts
git commit -m "test(api): add e2e tests for media upload pipeline"
```

---

## Task 4: Web media helpers + admin media library

**Files:**

- Create: `apps/web/src/lib/media.ts`
- Create: `apps/web/src/app/admin/media/page.tsx`
- Create: `apps/web/src/app/admin/media/media-grid.tsx`
- Create: `apps/web/src/app/api/media/route.ts` (proxy POST upload, GET list)
- Create: `apps/web/src/app/api/media/[id]/route.ts` (proxy DELETE)

- [ ] **Step 1: Create `apps/web/src/lib/media.ts`**

```ts
import { cookies } from 'next/headers';
import type { MediaListResponse, MediaRecord } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listMedia(
  opts: { cursor?: string; limit?: number } = {},
): Promise<MediaListResponse> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit) params.set('limit', String(opts.limit));
  const res = await fetch(`${API_URL}/api/media?${params}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listMedia failed: ${res.status}`);
  return res.json();
}

export async function getMedia(id: string): Promise<MediaRecord | null> {
  const res = await fetch(`${API_URL}/api/media/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getMedia failed: ${res.status}`);
  return res.json();
}

/** Pick the smallest image variant URL ≥ desired width */
export function pickImageSrc(
  variants: Record<string, string> | null,
  desiredWidth = 720,
): string | null {
  if (!variants) return null;
  const widths = Object.keys(variants)
    .filter((k) => /^\d+w$/.test(k))
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  const w = widths.find((x) => x >= desiredWidth) ?? widths[widths.length - 1];
  return w ? (variants[`${w}w`] ?? null) : null;
}

export function buildResponsiveSrcset(
  variants: Record<string, string> | null,
  format: 'jpg' | 'webp' | 'avif',
): string | null {
  if (!variants) return null;
  const prefix = format === 'jpg' ? '' : `${format}_`;
  const entries: { w: number; url: string }[] = [];
  for (const [key, url] of Object.entries(variants)) {
    const m = key.match(/^(?:webp_|avif_)?(\d+)w$/);
    if (!m) continue;
    if (format === 'jpg' && key.startsWith('webp_')) continue;
    if (format === 'jpg' && key.startsWith('avif_')) continue;
    if (format === 'webp' && !key.startsWith('webp_')) continue;
    if (format === 'avif' && !key.startsWith('avif_')) continue;
    entries.push({ w: parseInt(m[1]!, 10), url });
  }
  if (entries.length === 0) return null;
  return entries
    .sort((a, b) => a.w - b.w)
    .map((e) => `${e.url} ${e.w}w`)
    .join(', ');
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/media/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  // Forward multipart body as-is
  const upstream = await fetch(`${API_URL}/api/media/upload`, {
    method: 'POST',
    headers: {
      cookie,
      'content-type': req.headers.get('content-type') ?? 'application/octet-stream',
    },
    body: req.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const search = req.nextUrl.search;
  const upstream = await fetch(`${API_URL}/api/media${search}`, {
    headers: { cookie },
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
```

- [ ] **Step 3: Create `apps/web/src/app/api/media/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const upstream = await fetch(`${API_URL}/api/media/${id}`, {
    method: 'DELETE',
    headers: { cookie },
  });
  return new NextResponse(null, { status: upstream.status });
}
```

- [ ] **Step 4: Create `apps/web/src/app/admin/media/page.tsx`**

```tsx
import { listMedia } from '@/lib/media';
import { MediaGrid } from './media-grid';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const data = await listMedia({ limit: 60 });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Thư viện ảnh</h1>
      <MediaGrid initial={data.items} apiUrl={apiUrl} />
    </main>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/app/admin/media/media-grid.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@news/shared';

interface Props {
  initial: MediaRecord[];
  apiUrl: string;
}

export function MediaGrid({ initial, apiUrl }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/media', { method: 'POST', body: fd });
    if (!res.ok) {
      alert(`Upload failed: ${res.status}`);
      return;
    }
    const data = (await res.json()) as { media: MediaRecord };
    setItems((prev) => [data.media, ...prev]);
    e.target.value = '';
  }

  async function onDelete(id: string) {
    if (!confirm('Xóa ảnh này?')) return;
    const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert(`Delete failed: ${res.status}`);
      return;
    }
    setItems((prev) => prev.filter((m) => m.id !== id));
    router.refresh();
  }

  return (
    <div>
      <label className="mb-4 inline-block cursor-pointer rounded bg-black px-4 py-2 text-sm text-white">
        + Upload ảnh
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>

      {items.length === 0 ? (
        <p className="text-gray-500">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => {
            const thumbKey =
              m.variants && typeof m.variants === 'object'
                ? '320w' in m.variants
                  ? '320w'
                  : '720w' in m.variants
                    ? '720w'
                    : Object.keys(m.variants)[0]
                : null;
            const thumbPath =
              thumbKey && m.variants ? (m.variants as Record<string, string>)[thumbKey] : null;
            const src = thumbPath ? `${apiUrl}${thumbPath}` : null;
            return (
              <div key={m.id} className="group relative overflow-hidden rounded border bg-gray-50">
                {src ? (
                  <img src={src} alt={m.alt ?? ''} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square bg-gray-200" />
                )}
                <button
                  onClick={() => onDelete(m.id)}
                  className="absolute top-1 right-1 hidden rounded bg-red-600 px-2 py-0.5 text-xs text-white group-hover:block"
                >
                  Xóa
                </button>
                <div className="p-1 text-xs text-gray-500">
                  {m.width}×{m.height}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Manual smoke**

Start API + web. Login admin. Upload an image:

```bash
# Get a sample PNG
curl -L -o /tmp/sample.png 'https://picsum.photos/seed/test/800/600' 2>/dev/null || \
  python3 -c "import struct,zlib;w,h=800,600;data=b'\\x00\\x80\\x80\\x80'*w*h;
import io;img=io.BytesIO();
def chunk(t,d):
  return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
img.write(b'\\x89PNG\\r\\n\\x1a\\n')
img.write(chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0)))
raw=b''
for _ in range(h):raw+=b'\\x00'+b'\\x80'*(w*3)
img.write(chunk(b'IDAT',zlib.compress(raw)))
img.write(chunk(b'IEND',b''))
open('/tmp/sample.png','wb').write(img.getvalue())"

curl -i -c /tmp/c-media.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}' >/dev/null 2>&1

curl -i -b /tmp/c-media.txt -X POST http://localhost:3000/api/media \
  -F "file=@/tmp/sample.png" 2>&1 | grep -E "HTTP|variants|width" | head -5

curl -s -b /tmp/c-media.txt http://localhost:3000/admin/media | grep -oE "Thư viện ảnh|Upload ảnh"
```

Expected: upload returns 201 + media body with variants; admin page renders.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): media library admin page + upload proxy + helpers"
```

---

## Task 5: TipTap Image extension + server-side render parity

**Files:**

- Modify: `apps/web/package.json` (add @tiptap/extension-image)
- Modify: `apps/web/src/app/admin/posts/editor/tiptap-extensions.ts` (add Image)
- Modify: `apps/web/src/app/admin/posts/editor/tiptap-editor.tsx` (add image button + drop/paste handler)
- Modify: `packages/api/src/posts/tiptap-render.util.ts` (add Image, Link, Youtube extensions)

- [ ] **Step 1: Add tiptap-extension-image to web**

```bash
pnpm --filter @news/web add @tiptap/extension-image
pnpm --filter @news/api add @tiptap/extension-link @tiptap/extension-youtube
```

(api needs Image which was added in Task 2 step 1; verify it's listed.)

- [ ] **Step 2: Update `apps/web/src/app/admin/posts/editor/tiptap-extensions.ts`**

```ts
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

export const editorExtensions = [
  StarterKit,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener', target: '_blank' },
  }),
  Youtube.configure({ controls: true, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
];
```

- [ ] **Step 3: Update `packages/api/src/posts/tiptap-render.util.ts`** for SSR parity

```ts
import { generateHTML } from '@tiptap/html/server';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';

const EXTENSIONS = [
  StarterKit,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener', target: '_blank' },
  }),
  Youtube.configure({ controls: true, nocookie: true }),
  Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
];

export function renderTiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  try {
    return generateHTML(json as never, EXTENSIONS);
  } catch {
    return '';
  }
}
```

- [ ] **Step 4: Update `apps/web/src/app/admin/posts/editor/tiptap-editor.tsx`** — add Image button + drop handler

Replace the existing toolbar `Image button` and add drop handler. Final file:

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { editorExtensions } from './tiptap-extensions';
import { useEffect } from 'react';
import type { MediaRecord } from '@news/shared';

interface Props {
  content: unknown;
  onChange: (json: unknown) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/media', { method: 'POST', body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { media: MediaRecord };
  // Pick the largest variant under 1280w, fall back to original
  if (data.media.variants && typeof data.media.variants === 'object') {
    const v = data.media.variants as Record<string, string>;
    const path = v['1280w'] ?? v['720w'] ?? v['320w'] ?? data.media.originalPath;
    return path ? `${API_URL}${path}` : null;
  }
  return data.media.originalPath ? `${API_URL}${data.media.originalPath}` : null;
}

export function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: (content ?? { type: 'doc', content: [] }) as never,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[400px] rounded border bg-white p-4 focus:outline-none',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const dt = event.dataTransfer;
        if (!dt || dt.files.length === 0) return false;
        const file = dt.files[0];
        if (!file || !file.type.startsWith('image/')) return false;
        event.preventDefault();
        void uploadImage(file).then((url) => {
          if (url) {
            const { schema } = view.state;
            const node = schema.nodes.image?.create({ src: url });
            if (node) {
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            }
          }
        });
        return true;
      },
      handlePaste: (view, event) => {
        const dt = event.clipboardData;
        if (!dt || dt.files.length === 0) return false;
        const file = dt.files[0];
        if (!file || !file.type.startsWith('image/')) return false;
        event.preventDefault();
        void uploadImage(file).then((url) => {
          if (url) {
            const { schema } = view.state;
            const node = schema.nodes.image?.create({ src: url });
            if (node) {
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            }
          }
        });
        return true;
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

  async function pickAndInsert() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      const url = await uploadImage(f);
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    };
    inp.click();
  }

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
    <div>
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
        {btn(false, 'Image', pickAndInsert)}
        {btn(false, 'YouTube', () => {
          const url = window.prompt('YouTube URL?');
          if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
        })}
        {btn(false, 'Undo', () => editor.chain().focus().undo().run())}
        {btn(false, 'Redo', () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
```

- [ ] **Step 5: Run typecheck on both packages**

```bash
pnpm --filter @news/api typecheck && pnpm --filter @news/web typecheck
```

Expected: clean.

- [ ] **Step 6: Verify e2e tests still pass (server-side render shouldn't break)**

```bash
pnpm --filter @news/api test:e2e
```

Expected: 22 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/posts/tiptap-render.util.ts apps/web
git commit -m "feat(editor): TipTap Image extension with drop/paste/picker + SSR parity"
```

---

## Task 6: Cover image picker in post-form

**Files:**

- Create: `apps/web/src/app/admin/posts/editor/cover-image-picker.tsx`
- Modify: `apps/web/src/app/admin/posts/editor/post-form.tsx`

The cover image input is currently a plain text URL field. Replace with an upload+preview component that submits the URL to the underlying state.

- [ ] **Step 1: Create `cover-image-picker.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { MediaRecord } from '@news/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export function CoverImagePicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', f);
    const res = await fetch('/api/media', { method: 'POST', body: fd });
    setBusy(false);
    e.target.value = '';
    if (!res.ok) {
      alert(`Upload failed: ${res.status}`);
      return;
    }
    const data = (await res.json()) as { media: MediaRecord };
    const v = data.media.variants as Record<string, string> | null;
    const path = (v && (v['1280w'] ?? v['720w'] ?? v['320w'])) ?? data.media.originalPath ?? null;
    onChange(path ? `${API_URL}${path}` : null);
  }

  return (
    <div>
      {value ? (
        <div className="mb-2">
          <img src={value} alt="cover" className="w-full rounded border object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 text-xs text-red-600 underline"
          >
            Xóa ảnh cover
          </button>
        </div>
      ) : (
        <label className="block cursor-pointer rounded border border-dashed bg-gray-50 px-3 py-6 text-center text-sm text-gray-500 hover:bg-gray-100">
          {busy ? 'Đang upload...' : 'Click để upload ảnh cover'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
            disabled={busy}
          />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `post-form.tsx`** — replace the cover-image input with CoverImagePicker

In the `<aside>` section, find the block:

```tsx
<div>
  <label className="mb-1 block text-sm font-medium">Ảnh cover (URL)</label>
  <input
    value={coverImageUrl ?? ''}
    onChange={(e) => setCoverImageUrl(e.target.value)}
    placeholder="https://..."
    className="w-full rounded border px-3 py-2 text-sm"
  />
</div>
```

Replace with:

```tsx
<div>
  <label className="mb-1 block text-sm font-medium">Ảnh cover</label>
  <CoverImagePicker value={coverImageUrl || null} onChange={(u) => setCoverImageUrl(u ?? '')} />
</div>
```

Add the import at top of post-form.tsx:

```tsx
import { CoverImagePicker } from './cover-image-picker';
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @news/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/posts/editor
git commit -m "feat(web): cover image picker uploads via media pipeline"
```

---

## Task 7: Acceptance verification

- [ ] **Step 1: Reset clean state**

```bash
cd /home/ealflm/dev/news
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
sleep 8
rm -rf uploads/orig/* uploads/variants/* 2>/dev/null
pnpm install
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm --filter @news/db build
pnpm --filter @news/shared build
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test 2>&1 | tee /tmp/phase3a-tests.txt
```

Expected totals: shared 18 (11 + 7 media) + api e2e 22 (7 auth + 9 posts + 6 media) + web 6 = 46 tests pass.

- [ ] **Step 3: Manual flow**

```bash
pnpm --filter @news/api dev > /tmp/api-final3.log 2>&1 &
pnpm --filter @news/web dev > /tmp/web-final3.log 2>&1 &
sleep 12

# Login
curl -s -i -c /tmp/c-acc.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}' >/dev/null

# Make a small PNG
python3 -c "
import struct, zlib, io
w, h = 200, 150
img = io.BytesIO()
img.write(b'\\x89PNG\\r\\n\\x1a\\n')
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)
img.write(chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)))
raw = b''
for _ in range(h): raw += b'\\x00' + b'\\x80\\x40\\x20' * w
img.write(chunk(b'IDAT', zlib.compress(raw)))
img.write(chunk(b'IEND', b''))
open('/tmp/test.png', 'wb').write(img.getvalue())
print('PNG ready')
"

# Upload
echo "=== Upload ==="
UP_RES=$(curl -s -b /tmp/c-acc.txt -X POST http://localhost:3000/api/media -F "file=@/tmp/test.png")
echo "$UP_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); m=d['media']; print('id:',m['id']); print('variants keys:',list(m['variants'].keys())[:6])"
MEDIA_ID=$(echo "$UP_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['media']['id'])")
ORIG=$(echo "$UP_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['media']['originalPath'])")

# Verify static serve
echo
echo "=== Static serve original ==="
curl -s -o /tmp/served.png -w "%{http_code} size=%{size_download}\n" "http://localhost:4000$ORIG"

# Verify static serve variant
V_320=$(echo "$UP_RES" | python3 -c "import sys,json; v=json.load(sys.stdin)['media']['variants']; print(v.get('320w', list(v.values())[0]))")
echo
echo "=== Static serve 320w variant ==="
curl -s -o /tmp/served-variant.jpg -w "%{http_code} size=%{size_download}\n" "http://localhost:4000$V_320"

# Library page
echo
echo "=== Media library page ==="
curl -s -b /tmp/c-acc.txt http://localhost:3000/admin/media | grep -oE "Thư viện ảnh|Upload ảnh"

# Create post with image inserted
echo
echo "=== Create post with image ==="
IMG_FULL_URL="http://localhost:4000$V_320"
POST_RES=$(curl -s -b /tmp/c-acc.txt -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Bài có ảnh\",\"contentJson\":{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Trước ảnh\"}]},{\"type\":\"image\",\"attrs\":{\"src\":\"$IMG_FULL_URL\"}},{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Sau ảnh\"}]}]}}")
echo "$POST_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print('contentHtml has img:',('<img' in d['contentHtml'])); print('html:', d['contentHtml'][:200])"
POST_ID=$(echo "$POST_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Publish + verify detail
curl -s -o /dev/null -b /tmp/c-acc.txt -X POST "http://localhost:3000/api/posts/$POST_ID/publish"
sleep 2
DETAILS=$(curl -s -b /tmp/c-acc.txt "http://localhost:3000/api/posts/$POST_ID")
SLUG=$(echo "$DETAILS" | python3 -c "import sys,json; print(json.load(sys.stdin)['slug'])")
DATE=$(echo "$DETAILS" | python3 -c "import sys,json,datetime; d=datetime.datetime.fromisoformat(json.load(sys.stdin)['publishedAt'].replace('Z','+00:00')); print(d.strftime('%Y/%m/%d'))")

echo
echo "=== Public post detail with image ==="
curl -s "http://localhost:3000/$DATE/$SLUG" | grep -oE "<img|Trước ảnh|Sau ảnh|$IMG_FULL_URL" | head -5

# Cleanup
echo
echo "=== Cleanup ==="
curl -s -o /dev/null -b /tmp/c-acc.txt -X DELETE "http://localhost:3000/api/posts/$POST_ID"
curl -s -o /dev/null -b /tmp/c-acc.txt -X DELETE "http://localhost:3000/api/media/$MEDIA_ID"
pkill -f "next dev" ; pkill -f "nest start"
```

Expected:

- Upload returns variants with multiple keys (320w, 720w, 1280w, webp*\*, avif*\*)
- Static serve: 200 with non-zero size for both original and variant
- Library page renders
- Post create returns contentHtml containing `<img`
- Public detail shows the img tag with the variant URL
- Cleanup succeeds

- [ ] **Step 4: Commit any acceptance fixes**

If issues found, fix and commit `chore: phase 3a acceptance fixes`. Otherwise no commit.

---

## Acceptance criteria

- [ ] Media migration applied (3 migrations total: init, posts, media).
- [ ] All 46 tests pass (shared 18 + api 22 + web 6).
- [ ] Admin can upload ≥1 image; sharp produces variants for 320/720/1280/1920 widths × jpg/webp/avif.
- [ ] Static `/uploads/*` URLs serve the files with 200.
- [ ] Admin media library page renders with grid and delete works.
- [ ] TipTap editor accepts drag-drop and paste of images, uploads them, inserts `<img>`.
- [ ] Cover image picker uploads via media pipeline (no plain URL).
- [ ] Public post detail renders `<img>` from contentHtml (server render works).
- [ ] Existing flows (auth, posts CRUD, sitemap, RSS) unaffected.

When complete, Phase 3a done. Phase 3b (video + ffmpeg + BullMQ + oEmbed for non-YouTube) is next.
