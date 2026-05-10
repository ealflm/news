# Phase 4 — Popup Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Implement the dark-pattern affiliate popup system matching honghotduong.com behavior — multiple popup configurations (3s/15s/300s timers), per-platform variant URLs (iOS-FB / iOS-Safari / Android), cloaking flags (hideOnDesktop, hideOnBot), force-click-on-close, signed click tracking. Admin manages popups (CRUD + toggle global/enabled), assigns to posts (global default + per-post override). Public posts inject base64-encoded popup runtime that activates on mobile after configured delay.

**Architecture:** NestJS PopupModule with CRUD + bundle generator. Popup runtime is a small JS template (~3KB) that gets injected per-post with config. Signed HMAC tokens for click tracking (token expires 7 days). Admin UI for popup CRUD + per-post override. Server-side bundle generation cached in Redis (1h TTL). Post detail page renders the bundle as `<script src="data:text/javascript;base64,...">`.

**Tech Stack:** existing stack + esbuild for popup runtime bundling, jose (already installed) for HMAC signing.

**Out of scope:** A/B testing variants (deferred), webhook on threshold (deferred), analytics dashboard for clicks (will be in Phase 5 partial).

---

## File structure

```
packages/db/prisma/schema.prisma                     (add Popup, PopupLink, PostPopupOverride, ClickEvent)
packages/db/prisma/migrations/<ts>_popups/

packages/shared/src/popup.schemas.ts
packages/shared/src/popup.types.ts
packages/shared/src/index.ts                          (re-export)

packages/api/src/popups/
├── popups.module.ts
├── popups.service.ts
├── popups.controller.ts
├── popup-bundle.service.ts                           (assemble + cache popup JS)
├── popup-runtime/
│   └── runtime-template.ts                           (the JS template as a string with placeholders)
├── click.controller.ts                                (signed token endpoint)
└── click-token.util.ts                                 (HMAC sign/verify)
test/popups.e2e-spec.ts

apps/web/src/
├── lib/
│   └── popups.ts                                      (server-side fetcher for bundle base64)
├── app/
│   ├── api/popups/
│   │   ├── route.ts                                   (admin proxy POST list)
│   │   └── [id]/route.ts                              (admin proxy PATCH DELETE + publish)
│   ├── admin/popups/
│   │   ├── page.tsx                                   (list)
│   │   ├── new/page.tsx
│   │   ├── [id]/edit/page.tsx
│   │   └── editor/popup-form.tsx                       (client component)
│   └── [year]/[month]/[day]/[slug]/page.tsx          (modify: inject popup bundle)
└── tests/click-token.test.ts                          (unit tests for token verify in route handler)
```

---

## Task 1: DB schema — Popup, PopupLink, PostPopupOverride, ClickEvent

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] Append to schema.prisma:

```prisma
model Popup {
  id                String              @id @default(cuid())
  name              String
  bannerUrl         String                              // direct URL (could be /uploads/... or external)
  delayMs           Int                                 // 3000, 15000, 300000
  isGlobal          Boolean             @default(false)
  enabled           Boolean             @default(true)
  cookieKey         String              @unique
  cookieDays        Int                 @default(1)
  forceClickOnClose Boolean             @default(false)
  hideOnDesktop     Boolean             @default(true)
  hideOnBot         Boolean             @default(true)
  configVersion     Int                 @default(1)    // bumped on save → invalidate runtime cache
  links             PopupLink[]
  postOverrides     PostPopupOverride[]
  clickEvents       ClickEvent[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

enum LinkPlatform {
  SHOPEE
  TIKTOK
  LAZADA
  OTHER
}

enum LinkDevice {
  IOS_FB
  IOS_SAFARI
  ANDROID
  DESKTOP_FALLBACK
}

model PopupLink {
  id        String        @id @default(cuid())
  popupId   String
  popup     Popup         @relation(fields: [popupId], references: [id], onDelete: Cascade)
  platform  LinkPlatform
  device    LinkDevice
  url       String        @db.Text
  label     String?
  @@unique([popupId, platform, device])
}

enum OverrideAction {
  ATTACH
  DETACH
}

model PostPopupOverride {
  id      String         @id @default(cuid())
  postId  String
  post    Post           @relation(fields: [postId], references: [id], onDelete: Cascade)
  popupId String
  popup   Popup          @relation(fields: [popupId], references: [id], onDelete: Cascade)
  action  OverrideAction
  order   Int            @default(0)
  @@unique([postId, popupId])
}

model ClickEvent {
  id        String   @id @default(cuid())
  popupId   String
  popup     Popup    @relation(fields: [popupId], references: [id])
  postId    String?
  sessionId String?
  device    String?
  trigger   String?                                    // 'close' | 'image'
  createdAt DateTime @default(now())
  @@index([popupId, createdAt])
  @@index([postId, createdAt])
}
```

Modify `Post` to add `popupOverrides PostPopupOverride[]`:

```prisma
model Post {
  // ... existing fields ...
  popupOverrides PostPopupOverride[]
  // ... rest ...
}
```

- [ ] Migrate:

```bash
cd /home/ealflm/dev/news
pnpm --filter @news/db exec prisma migrate dev --name popups
pnpm --filter @news/db exec prisma generate
pnpm --filter @news/db build
```

- [ ] Verify table:

```bash
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c '\dt "Popup*"'
docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -c '\d "Popup"'
```

- [ ] Commit:

```bash
git add packages/db
git commit -m "feat(db): add Popup, PopupLink, PostPopupOverride, ClickEvent models"
```

---

## Task 2: Shared schemas + types

**Files:**

- Create: `packages/shared/src/popup.schemas.ts`
- Create: `packages/shared/src/popup.types.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/popup.schemas.test.ts`

- [ ] Create `popup.schemas.ts`:

```ts
import { z } from 'zod';

export const LinkPlatformSchema = z.enum(['SHOPEE', 'TIKTOK', 'LAZADA', 'OTHER']);
export type LinkPlatform = z.infer<typeof LinkPlatformSchema>;

export const LinkDeviceSchema = z.enum(['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK']);
export type LinkDevice = z.infer<typeof LinkDeviceSchema>;

export const OverrideActionSchema = z.enum(['ATTACH', 'DETACH']);
export type OverrideAction = z.infer<typeof OverrideActionSchema>;

export const PopupLinkInputSchema = z.object({
  platform: LinkPlatformSchema,
  device: LinkDeviceSchema,
  url: z.string().min(1).max(4000),
  label: z.string().max(200).optional(),
});
export type PopupLinkInput = z.infer<typeof PopupLinkInputSchema>;

export const CreatePopupInputSchema = z.object({
  name: z.string().min(1).max(200),
  bannerUrl: z.string().min(1).max(2000),
  delayMs: z.number().int().min(0).max(3_600_000),
  isGlobal: z.boolean().optional(),
  enabled: z.boolean().optional(),
  cookieKey: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/),
  cookieDays: z.number().int().min(1).max(365).optional(),
  forceClickOnClose: z.boolean().optional(),
  hideOnDesktop: z.boolean().optional(),
  hideOnBot: z.boolean().optional(),
  links: z.array(PopupLinkInputSchema).default([]),
});
export type CreatePopupInput = z.infer<typeof CreatePopupInputSchema>;

export const UpdatePopupInputSchema = CreatePopupInputSchema.partial();
export type UpdatePopupInput = z.infer<typeof UpdatePopupInputSchema>;

export const PostPopupOverrideInputSchema = z.object({
  popupId: z.string().min(1),
  action: OverrideActionSchema,
});
export type PostPopupOverrideInput = z.infer<typeof PostPopupOverrideInputSchema>;
```

- [ ] Create `popup.types.ts`:

```ts
import type { LinkPlatform, LinkDevice, OverrideAction } from './popup.schemas';

export interface PopupLinkRecord {
  id: string;
  platform: LinkPlatform;
  device: LinkDevice;
  url: string;
  label: string | null;
}

export interface AdminPopup {
  id: string;
  name: string;
  bannerUrl: string;
  delayMs: number;
  isGlobal: boolean;
  enabled: boolean;
  cookieKey: string;
  cookieDays: number;
  forceClickOnClose: boolean;
  hideOnDesktop: boolean;
  hideOnBot: boolean;
  configVersion: number;
  links: PopupLinkRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PostPopupOverrideRecord {
  id: string;
  popupId: string;
  action: OverrideAction;
  order: number;
}
```

- [ ] Update `index.ts` to add re-exports.

- [ ] Add unit test `popup.schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CreatePopupInputSchema, LinkPlatformSchema, LinkDeviceSchema } from './popup.schemas';

describe('CreatePopupInputSchema', () => {
  it('accepts minimal valid', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'Shopee 3s',
      bannerUrl: 'https://example.com/banner.jpg',
      delayMs: 3000,
      cookieKey: 'popup_3s',
    });
    expect(r.success).toBe(true);
  });
  it('rejects invalid cookieKey', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'x',
      bannerUrl: 'https://x',
      delayMs: 100,
      cookieKey: 'has space',
    });
    expect(r.success).toBe(false);
  });
  it('rejects negative delay', () => {
    const r = CreatePopupInputSchema.safeParse({
      name: 'x',
      bannerUrl: 'https://x',
      delayMs: -1,
      cookieKey: 'ok_key',
    });
    expect(r.success).toBe(false);
  });
});

describe('LinkPlatformSchema', () => {
  it('accepts all 4 platforms', () => {
    expect(LinkPlatformSchema.safeParse('SHOPEE').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('TIKTOK').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('LAZADA').success).toBe(true);
    expect(LinkPlatformSchema.safeParse('OTHER').success).toBe(true);
  });
});

describe('LinkDeviceSchema', () => {
  it('accepts 4 devices', () => {
    ['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK'].forEach((d) =>
      expect(LinkDeviceSchema.safeParse(d).success).toBe(true),
    );
  });
});
```

- [ ] Build + test:

```bash
pnpm --filter @news/shared build
pnpm --filter @news/shared test
```

Expected: 22 shared tests pass (18 + 5 new — 3 CreatePopup + 1 LinkPlatform + 1 LinkDevice = ~5).

- [ ] Commit:

```bash
git add packages/shared
git commit -m "feat(shared): add Popup zod schemas and types"
```

---

## Task 3: NestJS Popups module — service + controller

**Files:**

- Create: `packages/api/src/popups/popups.service.ts`
- Create: `packages/api/src/popups/popups.controller.ts`
- Create: `packages/api/src/popups/popups.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [ ] `popups.service.ts`:

```ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../prisma/prisma.module';
import type { PrismaClient, Popup } from '@news/db';
import type { CreatePopupInput, UpdatePopupInput, PostPopupOverrideInput } from '@news/shared';

@Injectable()
export class PopupsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async create(input: CreatePopupInput): Promise<Popup> {
    return this.prisma.popup.create({
      data: {
        name: input.name,
        bannerUrl: input.bannerUrl,
        delayMs: input.delayMs,
        isGlobal: input.isGlobal ?? false,
        enabled: input.enabled ?? true,
        cookieKey: input.cookieKey,
        cookieDays: input.cookieDays ?? 1,
        forceClickOnClose: input.forceClickOnClose ?? false,
        hideOnDesktop: input.hideOnDesktop ?? true,
        hideOnBot: input.hideOnBot ?? true,
        links: {
          create: input.links.map((l) => ({
            platform: l.platform,
            device: l.device,
            url: l.url,
            label: l.label ?? null,
          })),
        },
      },
      include: { links: true },
    });
  }

  async update(id: string, input: UpdatePopupInput): Promise<Popup> {
    const existing = await this.prisma.popup.findUnique({
      where: { id },
      include: { links: true },
    });
    if (!existing) throw new NotFoundException('popup not found');

    const data: Record<string, unknown> = { configVersion: { increment: 1 } };
    if (input.name !== undefined) data.name = input.name;
    if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;
    if (input.delayMs !== undefined) data.delayMs = input.delayMs;
    if (input.isGlobal !== undefined) data.isGlobal = input.isGlobal;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.cookieKey !== undefined) data.cookieKey = input.cookieKey;
    if (input.cookieDays !== undefined) data.cookieDays = input.cookieDays;
    if (input.forceClickOnClose !== undefined) data.forceClickOnClose = input.forceClickOnClose;
    if (input.hideOnDesktop !== undefined) data.hideOnDesktop = input.hideOnDesktop;
    if (input.hideOnBot !== undefined) data.hideOnBot = input.hideOnBot;

    if (input.links) {
      // Replace links entirely (simpler than diffing)
      await this.prisma.popupLink.deleteMany({ where: { popupId: id } });
      await this.prisma.popupLink.createMany({
        data: input.links.map((l) => ({
          popupId: id,
          platform: l.platform,
          device: l.device,
          url: l.url,
          label: l.label ?? null,
        })),
      });
    }

    return this.prisma.popup.update({
      where: { id },
      data: data as never,
      include: { links: true },
    });
  }

  async list() {
    return this.prisma.popup.findMany({ include: { links: true }, orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const p = await this.prisma.popup.findUnique({ where: { id }, include: { links: true } });
    if (!p) throw new NotFoundException('popup not found');
    return p;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.popup.delete({ where: { id } });
  }

  async listApplicableForPost(postId: string) {
    const overrides = await this.prisma.postPopupOverride.findMany({ where: { postId } });
    const detached = new Set(overrides.filter((o) => o.action === 'DETACH').map((o) => o.popupId));
    const attached = overrides.filter((o) => o.action === 'ATTACH').map((o) => o.popupId);

    const globals = await this.prisma.popup.findMany({
      where: { isGlobal: true, enabled: true },
      include: { links: true },
    });
    const localAttached = await this.prisma.popup.findMany({
      where: { id: { in: attached }, enabled: true },
      include: { links: true },
    });

    const map = new Map<string, (typeof globals)[number]>();
    for (const p of [...globals, ...localAttached]) {
      if (!detached.has(p.id)) map.set(p.id, p);
    }
    return [...map.values()];
  }

  async setOverrides(postId: string, overrides: PostPopupOverrideInput[]): Promise<void> {
    await this.prisma.postPopupOverride.deleteMany({ where: { postId } });
    if (overrides.length === 0) return;
    await this.prisma.postPopupOverride.createMany({
      data: overrides.map((o, i) => ({
        postId,
        popupId: o.popupId,
        action: o.action,
        order: i,
      })),
    });
  }

  async getOverrides(postId: string) {
    return this.prisma.postPopupOverride.findMany({
      where: { postId },
      orderBy: { order: 'asc' },
    });
  }

  async incrementClick(popupId: string, postId: string | null, trigger: string): Promise<void> {
    await this.prisma.clickEvent.create({
      data: { popupId, postId, trigger, sessionId: null, device: null },
    });
  }
}
```

- [ ] `popups.controller.ts`:

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
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ZodValidationPipe } from '../auth/zod.pipe';
import { PopupsService } from './popups.service';
import {
  CreatePopupInputSchema,
  UpdatePopupInputSchema,
  PostPopupOverrideInputSchema,
  type CreatePopupInput,
  type UpdatePopupInput,
  type PostPopupOverrideInput,
} from '@news/shared';
import { z } from 'zod';

const OverridesArraySchema = z.array(PostPopupOverrideInputSchema);

@Controller('popups')
@UseGuards(JwtAuthGuard)
export class PopupsController {
  constructor(private readonly popups: PopupsService) {}

  @Get()
  async list() {
    return (await this.popups.list()).map(serializePopup);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return serializePopup(await this.popups.getById(id));
  }

  @Post()
  @HttpCode(201)
  async create(@Body(new ZodValidationPipe(CreatePopupInputSchema)) body: CreatePopupInput) {
    return serializePopup(await this.popups.create(body));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePopupInputSchema)) body: UpdatePopupInput,
  ) {
    return serializePopup(await this.popups.update(id, body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.popups.delete(id);
  }

  // --- Overrides per post ---
  @Get('overrides/:postId')
  async getOverrides(@Param('postId') postId: string) {
    return this.popups.getOverrides(postId);
  }

  @Post('overrides/:postId')
  @HttpCode(204)
  async setOverrides(
    @Param('postId') postId: string,
    @Body(new ZodValidationPipe(OverridesArraySchema)) body: PostPopupOverrideInput[],
  ) {
    await this.popups.setOverrides(postId, body);
  }
}

function serializePopup(p: {
  id: string;
  name: string;
  bannerUrl: string;
  delayMs: number;
  isGlobal: boolean;
  enabled: boolean;
  cookieKey: string;
  cookieDays: number;
  forceClickOnClose: boolean;
  hideOnDesktop: boolean;
  hideOnBot: boolean;
  configVersion: number;
  links?: { id: string; platform: string; device: string; url: string; label: string | null }[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    bannerUrl: p.bannerUrl,
    delayMs: p.delayMs,
    isGlobal: p.isGlobal,
    enabled: p.enabled,
    cookieKey: p.cookieKey,
    cookieDays: p.cookieDays,
    forceClickOnClose: p.forceClickOnClose,
    hideOnDesktop: p.hideOnDesktop,
    hideOnBot: p.hideOnBot,
    configVersion: p.configVersion,
    links: p.links ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
```

- [ ] `popups.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';

@Module({
  controllers: [PopupsController],
  providers: [PopupsService],
  exports: [PopupsService],
})
export class PopupsModule {}
```

- [ ] Update `app.module.ts`: add PopupsModule.

- [ ] Typecheck + run existing tests:

```bash
pnpm --filter @news/api typecheck
pnpm --filter @news/api test:e2e
```

Expected: 22 still pass (no new tests yet).

- [ ] Commit:

```bash
git add packages/api
git commit -m "feat(api): popups CRUD module with per-post override and click tracking"
```

---

## Task 4: Click tracking endpoint + HMAC token util

**Files:**

- Create: `packages/api/src/popups/click-token.util.ts`
- Create: `packages/api/src/popups/click.controller.ts`
- Modify: `packages/api/src/popups/popups.module.ts` (add ClickController)
- Modify: `packages/api/src/config/env.ts` (add HMAC_CLICK_SECRET)
- Modify: root `.env.example`, `.env`

- [ ] Add env var. Append to `.env.example` and `.env`:

```
HMAC_CLICK_SECRET=change_me_dev_only_32chars_min__
```

- [ ] Update `env.ts`:

```ts
// add field:
HMAC_CLICK_SECRET: z.string().min(32),
```

- [ ] `click-token.util.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const VERSION = 'v1';

export interface ClickPayload {
  popupId: string;
  postId: string | null;
  exp: number; // unix seconds
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function sign(payload: ClickPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = b64url(createHmac('sha256', secret).update(`${VERSION}.${body}`).digest());
  return `${VERSION}.${body}.${mac}`;
}

export function verify(token: string, secret: string): ClickPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;
  const [v, body, mac] = parts;
  const expectedMac = b64url(createHmac('sha256', secret).update(`${v}.${body}`).digest());
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ClickPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] `click.controller.ts`:

```ts
import { Controller, Get, HttpCode, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PopupsService } from './popups.service';
import { verify } from './click-token.util';
import { loadEnv } from '../config/env';

@Controller('click')
export class ClickController {
  constructor(private readonly popups: PopupsService) {}

  @Get(':token')
  @HttpCode(204)
  async track(
    @Param('token') token: string,
    @Query('t') trigger: string | undefined,
    @Res() res: Response,
  ) {
    const env = loadEnv();
    const payload = verify(token, env.HMAC_CLICK_SECRET);
    if (!payload) {
      res.status(204).end();
      return;
    }
    void this.popups.incrementClick(payload.popupId, payload.postId, trigger ?? 'unknown');
    res.status(204).end();
  }
}
```

- [ ] Update `popups.module.ts` to add ClickController.

- [ ] Run typecheck.

- [ ] Commit:

```bash
git add packages/api .env.example
git commit -m "feat(api): signed click tracking endpoint with HMAC tokens"
```

---

## Task 5: Popup runtime template + bundle service

**Files:**

- Create: `packages/api/src/popups/popup-runtime/runtime-template.ts`
- Create: `packages/api/src/popups/popup-bundle.service.ts`
- Create: `packages/api/src/popups/popup-bundle.controller.ts`
- Modify: `packages/api/src/popups/popups.module.ts`

- [ ] `popup-runtime/runtime-template.ts`:

```ts
/**
 * Popup runtime template. The exported function returns a JS string that runs in the browser.
 * The CONFIG placeholder is replaced with JSON-serialized config at bundle time.
 */
export function buildRuntimeJs(configJson: string): string {
  return `(function(){
var __cfg = ${configJson};
function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+"="+v+"; expires="+e.toUTCString()+"; path=/";}
function getCookie(n){var p=("; "+document.cookie).split("; "+n+"=");if(p.length===2)return p.pop().split(";").shift();}
function isIOS(){return /iPhone|iPad|iPod/i.test(navigator.userAgent);}
function isAndroid(){return /Android/i.test(navigator.userAgent);}
function isFbApp(){return /FBAN|FBAV|FBIOS|FB_IAB|FB4A/i.test(navigator.userAgent);}
function isBot(){return /bot|crawl|spider|googlebot|bingbot|yandex|baidu|facebookexternalhit/i.test(navigator.userAgent);}
function isDesktopGl(){try{var c=document.createElement('canvas'),g=c.getContext('webgl');if(!g)return false;var ext=g.getExtension('WEBGL_debug_renderer_info');if(!ext)return false;var r=g.getParameter(ext.UNMASKED_RENDERER_WEBGL)||'';return /SwiftShader|NVIDIA|AMD|Intel/i.test(r);}catch(e){return false;}}
function pickLink(links){var ios=isIOS(),fb=isFbApp(),and=isAndroid();if(ios&&fb)return links.IOS_FB;if(ios)return links.IOS_SAFARI||links.IOS_FB;if(and)return links.ANDROID;return links.DESKTOP_FALLBACK||links.IOS_SAFARI||links.ANDROID;}
function show(p){
  if(p.flags.hideOnBot&&isBot())return;
  if(p.flags.hideOnDesktop&&isDesktopGl())return;
  if(getCookie(p.cookieKey))return;
  if(!isIOS()&&!isAndroid())return;
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999';
  var box=document.createElement('div');
  box.style.cssText='position:relative;max-width:90%;width:300px';
  var img=document.createElement('img');
  img.src=p.bannerUrl;img.alt='';img.style.cssText='width:100%;height:auto;display:block;border-radius:10px;cursor:pointer';
  var btn=document.createElement('button');
  btn.innerText='X';btn.style.cssText='position:absolute;top:1px;right:1px;width:50px;height:50px;border-radius:50%;background:#1e90ff;color:#fff;border:none;font-size:25px;cursor:pointer;font-weight:bold';
  box.appendChild(btn);box.appendChild(img);overlay.appendChild(box);document.body.appendChild(overlay);
  document.body.style.overflow='hidden';
  var clicked=false;
  function go(trigger){
    if(clicked)return;clicked=true;
    overlay.parentNode&&overlay.parentNode.removeChild(overlay);
    document.body.style.overflow='';
    setCookie(p.cookieKey,'1',p.cookieDays);
    try{navigator.sendBeacon&&navigator.sendBeacon(__cfg.clickEndpoint+'/'+p.token+'?t='+encodeURIComponent(trigger));}catch(e){}
    var link=pickLink(p.links);
    if(link){window.open(link,'_blank','noopener');}
  }
  function close(trigger){
    if(p.flags.forceClickOnClose){go(trigger);}
    else{
      overlay.parentNode&&overlay.parentNode.removeChild(overlay);
      document.body.style.overflow='';
      setCookie(p.cookieKey,'1',p.cookieDays);
    }
  }
  btn.onclick=function(){close('close');};
  img.onclick=function(){go('image');};
}
for(var i=0;i<__cfg.popups.length;i++){
  (function(p){setTimeout(function(){show(p);},p.delayMs);})(__cfg.popups[i]);
}
})();`;
}
```

- [ ] `popup-bundle.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { sign } from './click-token.util';
import { buildRuntimeJs } from './popup-runtime/runtime-template';
import { loadEnv } from '../config/env';

interface RuntimePopupConfig {
  id: string;
  cookieKey: string;
  cookieDays: number;
  delayMs: number;
  bannerUrl: string;
  flags: {
    hideOnDesktop: boolean;
    hideOnBot: boolean;
    forceClickOnClose: boolean;
  };
  links: Partial<Record<'IOS_FB' | 'IOS_SAFARI' | 'ANDROID' | 'DESKTOP_FALLBACK', string>>;
  token: string;
}

@Injectable()
export class PopupBundleService {
  constructor(private readonly popups: PopupsService) {}

  async getBundleForPost(postId: string): Promise<string> {
    const env = loadEnv();
    const applicable = await this.popups.listApplicableForPost(postId);
    if (applicable.length === 0) return '';

    const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
    const runtime: RuntimePopupConfig[] = applicable.map((p) => {
      const links: RuntimePopupConfig['links'] = {};
      for (const l of p.links) {
        links[l.device as 'IOS_FB' | 'IOS_SAFARI' | 'ANDROID' | 'DESKTOP_FALLBACK'] = l.url;
      }
      const token = sign({ popupId: p.id, postId, exp }, env.HMAC_CLICK_SECRET);
      return {
        id: p.id,
        cookieKey: p.cookieKey,
        cookieDays: p.cookieDays,
        delayMs: p.delayMs,
        bannerUrl: p.bannerUrl,
        flags: {
          hideOnDesktop: p.hideOnDesktop,
          hideOnBot: p.hideOnBot,
          forceClickOnClose: p.forceClickOnClose,
        },
        links,
        token,
      };
    });

    const config = {
      clickEndpoint: '/api/click',
      popups: runtime,
    };

    return buildRuntimeJs(JSON.stringify(config));
  }
}
```

- [ ] `popup-bundle.controller.ts` (provides public endpoint to fetch bundle base64):

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { PopupBundleService } from './popup-bundle.service';

@Controller('popups')
export class PopupBundleController {
  constructor(private readonly bundle: PopupBundleService) {}

  // Public: server-side called by Next.js post detail page
  @Get('bundle/:postId')
  async getBundle(@Param('postId') postId: string) {
    const js = await this.bundle.getBundleForPost(postId);
    if (!js) return { js: '', empty: true };
    const base64 = Buffer.from(js, 'utf8').toString('base64');
    return { js, base64, empty: false };
  }
}
```

NOTE: this conflicts with `@Controller('popups')` in PopupsController. To avoid collision, use a separate controller path. Change `@Controller('popups')` for `PopupBundleController` to `@Controller('popup-bundle')`. Update endpoint to `@Get(':postId')` and the path becomes `/api/popup-bundle/:postId`.

Final corrected `popup-bundle.controller.ts`:

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { PopupBundleService } from './popup-bundle.service';

@Controller('popup-bundle')
export class PopupBundleController {
  constructor(private readonly bundle: PopupBundleService) {}

  @Get(':postId')
  async getBundle(@Param('postId') postId: string) {
    const js = await this.bundle.getBundleForPost(postId);
    if (!js) return { js: '', base64: '', empty: true };
    const base64 = Buffer.from(js, 'utf8').toString('base64');
    return { js, base64, empty: false };
  }
}
```

- [ ] Update `popups.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PopupsService } from './popups.service';
import { PopupsController } from './popups.controller';
import { ClickController } from './click.controller';
import { PopupBundleService } from './popup-bundle.service';
import { PopupBundleController } from './popup-bundle.controller';

@Module({
  controllers: [PopupsController, ClickController, PopupBundleController],
  providers: [PopupsService, PopupBundleService],
  exports: [PopupsService, PopupBundleService],
})
export class PopupsModule {}
```

- [ ] Typecheck + e2e (existing).
- [ ] Commit:

```bash
git add packages/api
git commit -m "feat(api): popup runtime template + bundle generator + click endpoint"
```

---

## Task 6: e2e tests for popups + click

**File:** `packages/api/test/popups.e2e-spec.ts`

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
const testEmail = 'e2e-popups@local.test';
const testPassword = 'PopupsTest123!';

beforeAll(async () => {
  await prisma.clickEvent.deleteMany({});
  await prisma.postPopupOverride.deleteMany({});
  await prisma.popupLink.deleteMany({});
  await prisma.popup.deleteMany({});
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.create({
    data: {
      email: testEmail,
      displayName: 'PopupsTester',
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
  await prisma.clickEvent.deleteMany({});
  await prisma.postPopupOverride.deleteMany({});
  await prisma.popupLink.deleteMany({});
  await prisma.popup.deleteMany({});
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await app?.close();
  await prisma.$disconnect();
});

describe('Popups CRUD + bundle', () => {
  let popupId: string;

  it('creates a popup with links', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/popups')
      .set('Cookie', authCookie)
      .send({
        name: 'Shopee 3s',
        bannerUrl: 'https://example.com/banner.jpg',
        delayMs: 3000,
        cookieKey: 'popup_3s',
        isGlobal: true,
        links: [
          { platform: 'SHOPEE', device: 'IOS_SAFARI', url: 'https://shopee.vn/x' },
          { platform: 'SHOPEE', device: 'ANDROID', url: 'intent://shopee.vn/x' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.cookieKey).toBe('popup_3s');
    expect(res.body.links.length).toBe(2);
    popupId = res.body.id;
  });

  it('rejects unauth create', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/popups')
      .send({ name: 'x', bannerUrl: 'https://x', delayMs: 100, cookieKey: 'x' });
    expect(res.status).toBe(401);
  });

  it('lists popups', async () => {
    const res = await request(app.getHttpServer()).get('/api/popups').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('updates popup, bumps configVersion', async () => {
    const before = await request(app.getHttpServer())
      .get(`/api/popups/${popupId}`)
      .set('Cookie', authCookie);
    const v0 = before.body.configVersion as number;
    const res = await request(app.getHttpServer())
      .patch(`/api/popups/${popupId}`)
      .set('Cookie', authCookie)
      .send({ name: 'Shopee Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Shopee Updated');
    expect(res.body.configVersion).toBe(v0 + 1);
  });

  it('returns bundle for a post (with global popup)', async () => {
    // Create a post
    const post = await prisma.post.create({
      data: {
        slug: 'popup-test',
        title: 'Popup test',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });

    const res = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(false);
    expect(res.body.js).toContain('popup_3s');
    expect(res.body.base64.length).toBeGreaterThan(100);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('detached override removes global popup from bundle', async () => {
    const post = await prisma.post.create({
      data: {
        slug: 'no-popup',
        title: 'No popup',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });

    await request(app.getHttpServer())
      .post(`/api/popups/overrides/${post.id}`)
      .set('Cookie', authCookie)
      .send([{ popupId, action: 'DETACH' }]);

    const res = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.empty).toBe(true);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('click endpoint accepts valid token, ignores invalid', async () => {
    // Get a fresh bundle that contains a token
    const post = await prisma.post.create({
      data: {
        slug: 'click-test',
        title: 'Click',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        author: { connect: { email: testEmail } },
      },
    });
    const bundleRes = await request(app.getHttpServer()).get(`/api/popup-bundle/${post.id}`);
    const js = bundleRes.body.js as string;
    // Extract token from JS (it's embedded in cfg)
    const tokenMatch = js.match(/"token":"([^"]+)"/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];

    const beforeCount = await prisma.clickEvent.count();
    const click = await request(app.getHttpServer()).get(`/api/click/${token}?t=image`);
    expect(click.status).toBe(204);
    // Click is fire-and-forget; wait briefly
    await new Promise((r) => setTimeout(r, 200));
    const afterCount = await prisma.clickEvent.count();
    expect(afterCount).toBe(beforeCount + 1);

    // Invalid token still 204
    const click2 = await request(app.getHttpServer()).get('/api/click/bogus-token?t=close');
    expect(click2.status).toBe(204);

    await prisma.post.delete({ where: { id: post.id } });
  });

  it('deletes popup', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/popups/${popupId}`)
      .set('Cookie', authCookie);
    expect(res.status).toBe(204);
  });
});
```

- [ ] Run e2e tests:

```bash
pnpm --filter @news/api test:e2e
```

Expected: 7 auth + 9 posts + 6 media + 8 popups = 30 tests pass.

- [ ] Commit:

```bash
git add packages/api/test/popups.e2e-spec.ts
git commit -m "test(api): add e2e tests for popup CRUD, bundle, and click tracking"
```

---

## Task 7: Web — admin popup pages + post-form override binding

**Files:**

- Create: `apps/web/src/lib/popups.ts` (server fetcher)
- Create: `apps/web/src/app/api/popups/route.ts` (proxy)
- Create: `apps/web/src/app/api/popups/[id]/route.ts`
- Create: `apps/web/src/app/api/popups/overrides/[postId]/route.ts`
- Create: `apps/web/src/app/admin/popups/page.tsx`
- Create: `apps/web/src/app/admin/popups/new/page.tsx`
- Create: `apps/web/src/app/admin/popups/[id]/edit/page.tsx`
- Create: `apps/web/src/app/admin/popups/editor/popup-form.tsx`
- Modify: `apps/web/src/app/admin/posts/editor/post-form.tsx` (add popup override section)

- [ ] `apps/web/src/lib/popups.ts`:

```ts
import { cookies } from 'next/headers';
import type { AdminPopup } from '@news/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
  const c = (await cookies()).get('access_token');
  return c ? { cookie: `access_token=${c.value}` } : {};
}

export async function listPopups(): Promise<AdminPopup[]> {
  const res = await fetch(`${API_URL}/api/popups`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`listPopups failed: ${res.status}`);
  return res.json();
}

export async function getPopup(id: string): Promise<AdminPopup | null> {
  const res = await fetch(`${API_URL}/api/popups/${id}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getPopup failed: ${res.status}`);
  return res.json();
}

export async function getPostOverrides(
  postId: string,
): Promise<{ id: string; popupId: string; action: 'ATTACH' | 'DETACH'; order: number }[]> {
  const res = await fetch(`${API_URL}/api/popups/overrides/${postId}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getPopupBundleBase64(postId: string): Promise<string | null> {
  // Public — no cookie needed; short cache
  const res = await fetch(`${API_URL}/api/popup-bundle/${postId}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { empty: boolean; base64: string };
  if (data.empty) return null;
  return data.base64;
}
```

- [ ] Proxy routes (3 files):

`apps/web/src/app/api/popups/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';
  const r = await fetch(`${API_URL}/api/popups`, { headers: { cookie } });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const cookie = req.headers.get('cookie') ?? '';
  const r = await fetch(`${API_URL}/api/popups`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}
```

`apps/web/src/app/api/popups/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const r = await fetch(`${API_URL}/api/popups/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const r = await fetch(`${API_URL}/api/popups/${id}`, { method: 'DELETE', headers: { cookie } });
  return new NextResponse(null, { status: r.status });
}
```

`apps/web/src/app/api/popups/overrides/[postId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;
  const cookie = req.headers.get('cookie') ?? '';
  const body = await req.text();
  const r = await fetch(`${API_URL}/api/popups/overrides/${postId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body,
  });
  return new NextResponse(null, { status: r.status });
}
```

- [ ] `apps/web/src/app/admin/popups/page.tsx`:

```tsx
import Link from 'next/link';
import type { Route } from 'next';
import { listPopups } from '@/lib/popups';

export const dynamic = 'force-dynamic';

export default async function AdminPopupsPage() {
  const popups = await listPopups();
  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Popups</h1>
        <Link
          href={'/admin/popups/new' as Route}
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + Tạo popup
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="px-2 py-2">Tên</th>
            <th className="px-2 py-2">Cookie key</th>
            <th className="px-2 py-2">Delay</th>
            <th className="px-2 py-2">Global</th>
            <th className="px-2 py-2">Bật</th>
            <th className="px-2 py-2">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {popups.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2">
                <Link
                  href={`/admin/popups/${p.id}/edit` as Route}
                  className="font-medium text-blue-700"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-2 py-2 text-gray-500">{p.cookieKey}</td>
              <td className="px-2 py-2">{p.delayMs}ms</td>
              <td className="px-2 py-2">{p.isGlobal ? '✓' : '—'}</td>
              <td className="px-2 py-2">{p.enabled ? '●' : '○'}</td>
              <td className="px-2 py-2 text-gray-500">
                {new Date(p.updatedAt).toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

- [ ] `apps/web/src/app/admin/popups/editor/popup-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import type { AdminPopup, LinkPlatform, LinkDevice } from '@news/shared';

const PLATFORMS: LinkPlatform[] = ['SHOPEE', 'TIKTOK', 'LAZADA', 'OTHER'];
const DEVICES: LinkDevice[] = ['IOS_FB', 'IOS_SAFARI', 'ANDROID', 'DESKTOP_FALLBACK'];

interface LinkRow {
  platform: LinkPlatform;
  device: LinkDevice;
  url: string;
  label?: string;
}

export function PopupForm({ initial }: { initial?: AdminPopup }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl ?? '');
  const [delayMs, setDelayMs] = useState(initial?.delayMs ?? 3000);
  const [cookieKey, setCookieKey] = useState(initial?.cookieKey ?? 'popup_3s');
  const [cookieDays, setCookieDays] = useState(initial?.cookieDays ?? 1);
  const [isGlobal, setIsGlobal] = useState(initial?.isGlobal ?? false);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [forceClickOnClose, setForceClickOnClose] = useState(initial?.forceClickOnClose ?? false);
  const [hideOnDesktop, setHideOnDesktop] = useState(initial?.hideOnDesktop ?? true);
  const [hideOnBot, setHideOnBot] = useState(initial?.hideOnBot ?? true);
  const [links, setLinks] = useState<LinkRow[]>(
    initial?.links.map((l) => ({
      platform: l.platform,
      device: l.device,
      url: l.url,
      label: l.label ?? '',
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addLink() {
    setLinks([...links, { platform: 'SHOPEE', device: 'IOS_SAFARI', url: '' }]);
  }
  function removeLink(i: number) {
    setLinks(links.filter((_, idx) => idx !== i));
  }
  function updateLink(i: number, patch: Partial<LinkRow>) {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const payload = {
      name,
      bannerUrl,
      delayMs,
      cookieKey,
      cookieDays,
      isGlobal,
      enabled,
      forceClickOnClose,
      hideOnDesktop,
      hideOnBot,
      links: links.filter((l) => l.url.trim()),
    };
    const url = initial ? `/api/popups/${initial.id}` : '/api/popups';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setErr(`Lưu thất bại (${res.status})`);
      return;
    }
    const p = await res.json();
    if (!initial) router.push(`/admin/popups/${p.id}/edit` as Route);
    else router.refresh();
  }

  async function del() {
    if (!initial) return;
    if (!confirm('Xóa popup?')) return;
    setBusy(true);
    await fetch(`/api/popups/${initial.id}`, { method: 'DELETE' });
    setBusy(false);
    router.push('/admin/popups' as Route);
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Tên</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Banner URL</label>
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Delay (ms)</label>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cookie key</label>
            <input
              value={cookieKey}
              onChange={(e) => setCookieKey(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cookie days</label>
            <input
              type="number"
              value={cookieDays}
              onChange={(e) => setCookieDays(Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        <fieldset className="rounded border p-3">
          <legend className="text-sm font-medium">Affiliate links</legend>
          {links.map((l, i) => (
            <div key={i} className="mb-2 grid grid-cols-12 gap-1">
              <select
                value={l.platform}
                onChange={(e) => updateLink(i, { platform: e.target.value as LinkPlatform })}
                className="col-span-2 rounded border px-2 py-1 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={l.device}
                onChange={(e) => updateLink(i, { device: e.target.value as LinkDevice })}
                className="col-span-2 rounded border px-2 py-1 text-sm"
              >
                {DEVICES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                value={l.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://..."
                className="col-span-7 rounded border px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="col-span-1 rounded border px-2 py-1 text-xs text-red-600"
              >
                X
              </button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="text-sm text-blue-700 hover:underline">
            + Thêm link
          </button>
        </fieldset>
      </div>

      <aside className="space-y-3">
        <label className="block text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />{' '}
          Bật popup
        </label>
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
          />{' '}
          Áp dụng global (tất cả bài)
        </label>
        <hr />
        <p className="text-xs font-semibold text-gray-700">Chế độ ẩn / dark pattern</p>
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={hideOnDesktop}
            onChange={(e) => setHideOnDesktop(e.target.checked)}
          />{' '}
          Ẩn trên desktop
        </label>
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={hideOnBot}
            onChange={(e) => setHideOnBot(e.target.checked)}
          />{' '}
          Ẩn với crawler/bot
        </label>
        <label className="block text-sm">
          <input
            type="checkbox"
            checked={forceClickOnClose}
            onChange={(e) => setForceClickOnClose(e.target.checked)}
          />{' '}
          Click "X" cũng = click affiliate
        </label>
        <hr />
        <button
          type="button"
          onClick={save}
          disabled={busy || !name || !bannerUrl || !cookieKey}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Đang lưu...' : initial ? 'Cập nhật' : 'Tạo popup'}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {initial && (
          <button
            type="button"
            onClick={del}
            disabled={busy}
            className="w-full rounded border border-red-300 px-4 py-2 text-sm text-red-600"
          >
            Xóa popup
          </button>
        )}
      </aside>
    </div>
  );
}
```

- [ ] `apps/web/src/app/admin/popups/new/page.tsx`:

```tsx
import { PopupForm } from '../editor/popup-form';

export default function NewPopupPage() {
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Tạo popup mới</h1>
      <PopupForm />
    </main>
  );
}
```

- [ ] `apps/web/src/app/admin/popups/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getPopup } from '@/lib/popups';
import { PopupForm } from '../../editor/popup-form';

export const dynamic = 'force-dynamic';

export default async function EditPopupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const popup = await getPopup(id);
  if (!popup) notFound();
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa popup: {popup.name}</h1>
      <PopupForm initial={popup} />
    </main>
  );
}
```

- [ ] Modify `apps/web/src/app/admin/posts/editor/post-form.tsx` to add a popup-override section.

Read the current file first. Add a new client component for the popup override block. To keep this task contained, simply add a "Popup overrides" section at the bottom of the aside that lets admin choose which popups to ATTACH/DETACH for this post.

Add at the top:

```tsx
import type { AdminPopup, PostPopupOverrideInput } from '@news/shared';
```

Add props:

```tsx
interface Props {
  initial?: AdminPost;
  popups?: AdminPopup[];
  initialOverrides?: { popupId: string; action: 'ATTACH' | 'DETACH' }[];
}
```

Add state:

```tsx
const [overrides, setOverrides] = useState<{ popupId: string; action: 'ATTACH' | 'DETACH' }[]>(
  initialOverrides ?? [],
);
```

Add helper functions inside the component:

```tsx
async function saveOverrides(postId: string) {
  await fetch(`/api/popups/overrides/${postId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(overrides),
  });
}
function setAction(popupId: string, action: 'ATTACH' | 'DETACH' | null) {
  setOverrides((prev) => {
    const without = prev.filter((o) => o.popupId !== popupId);
    if (action === null) return without;
    return [...without, { popupId, action }];
  });
}
function getAction(popupId: string): 'ATTACH' | 'DETACH' | null {
  return overrides.find((o) => o.popupId === popupId)?.action ?? null;
}
```

Modify the existing `save()` to also save overrides if updating an existing post:

```tsx
// after the post create/update succeeds
if (initial) {
  await saveOverrides(initial.id);
}
```

Add JSX to the `<aside>` section (before the save button):

```tsx
{
  popups && popups.length > 0 && (
    <details>
      <summary className="cursor-pointer text-sm font-medium">Popup overrides</summary>
      <div className="mt-2 space-y-1 text-xs">
        {popups.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {p.name} {p.isGlobal && <em className="text-gray-500">(global)</em>}
            </span>
            <select
              value={getAction(p.id) ?? ''}
              onChange={(e) => {
                const v = e.target.value as '' | 'ATTACH' | 'DETACH';
                setAction(p.id, v === '' ? null : v);
              }}
              className="rounded border px-1 py-0.5 text-xs"
            >
              <option value="">Default</option>
              <option value="ATTACH">Attach</option>
              <option value="DETACH">Detach</option>
            </select>
          </div>
        ))}
      </div>
    </details>
  );
}
```

Modify the `apps/web/src/app/admin/posts/[id]/edit/page.tsx` to fetch popups + overrides and pass to form:

```tsx
import { notFound } from 'next/navigation';
import { getAdminPost } from '@/lib/posts';
import { listPopups, getPostOverrides } from '@/lib/popups';
import { PostForm } from '../../editor/post-form';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();
  const [popups, overrides] = await Promise.all([listPopups(), getPostOverrides(id)]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Sửa bài: {post.title}</h1>
      <PostForm
        initial={post}
        popups={popups}
        initialOverrides={overrides.map((o) => ({ popupId: o.popupId, action: o.action }))}
      />
    </main>
  );
}
```

- [ ] Typecheck:

```bash
pnpm --filter @news/web typecheck
```

- [ ] Commit:

```bash
git add apps/web
git commit -m "feat(web): admin popup CRUD pages and per-post override binding"
```

---

## Task 8: Inject popup bundle into public post detail page

**Files:**

- Modify: `apps/web/src/app/[year]/[month]/[day]/[slug]/page.tsx` (inject base64 popup script)

- [ ] Read current post detail page. Add at top:

```tsx
import { getPublishedPostBySlug } from '@/lib/posts';
import { getPopupBundleBase64 } from '@/lib/popups';
```

- [ ] Inside the component, after fetching `post`, fetch the popup bundle:

```tsx
const popupBase64 = await getPopupBundleBase64(post.id);
```

- [ ] Render the script tag at the end of the component, after the `<article>`:

```tsx
{
  popupBase64 && (
    <script
      // eslint-disable-next-line @next/next/no-script-component-in-head
      src={`data:text/javascript;base64,${popupBase64}`}
      defer
    />
  );
}
```

If Next.js complains about `<script>` outside `<Head>` or recommends using `<Script>`, use `next/script`:

```tsx
import Script from 'next/script';
// ...
{
  popupBase64 && (
    <Script src={`data:text/javascript;base64,${popupBase64}`} strategy="afterInteractive" />
  );
}
```

- [ ] Typecheck.

- [ ] Smoke test (Task 9 acceptance covers the full flow).

- [ ] Commit:

```bash
git add apps/web
git commit -m "feat(web): inject base64 popup runtime on public post detail"
```

---

## Task 9: Acceptance verification

- [ ] Reset clean state:

```bash
cd /home/ealflm/dev/news
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

- [ ] All tests:

```bash
pnpm test 2>&1 | tail -10
```

Expected totals:

- shared: 18 + 5 = 23
- api e2e: 7 + 9 + 6 + 8 = 30
- web: 6
- Total: 59 (was 46)

- [ ] Manual flow:

```bash
pnpm --filter @news/api dev > /tmp/api-p4.log 2>&1 &
pnpm --filter @news/web dev > /tmp/web-p4.log 2>&1 &
sleep 12

# Login
curl -s -i -c /tmp/c-p4.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!@#"}' >/dev/null

# Create global popup
POPUP_RES=$(curl -s -b /tmp/c-p4.txt -X POST http://localhost:3000/api/popups \
  -H "Content-Type: application/json" \
  -d '{"name":"Acceptance Popup","bannerUrl":"https://example.com/banner.jpg","delayMs":3000,"cookieKey":"popup_acc","isGlobal":true,"enabled":true,"links":[{"platform":"SHOPEE","device":"IOS_SAFARI","url":"https://shopee.vn/test"},{"platform":"SHOPEE","device":"ANDROID","url":"intent://shopee.vn/test"}]}')
echo "Popup created: $(echo $POPUP_RES | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"id\"])')"

# Create + publish a post
POST=$(curl -s -b /tmp/c-p4.txt -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Bài có popup","contentJson":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}}')
POST_ID=$(echo "$POST" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s -o /dev/null -b /tmp/c-p4.txt -X POST "http://localhost:3000/api/posts/$POST_ID/publish"
sleep 2

# Get post URL
DETS=$(curl -s -b /tmp/c-p4.txt "http://localhost:3000/api/posts/$POST_ID")
SLUG=$(echo "$DETS" | python3 -c "import sys,json; print(json.load(sys.stdin)['slug'])")
DATE=$(echo "$DETS" | python3 -c "import sys,json,datetime; d=datetime.datetime.fromisoformat(json.load(sys.stdin)['publishedAt'].replace('Z','+00:00')); print(d.strftime('%Y/%m/%d'))")

# Visit detail — should contain base64 popup script
echo "=== Detail page popup script ==="
curl -s "http://localhost:3000/$DATE/$SLUG" | grep -oE 'data:text/javascript;base64,[A-Za-z0-9+/=]{20,}' | head -1 | head -c 200
echo
echo "(truncated)"

# Verify bundle endpoint
echo
echo "=== Bundle endpoint ==="
curl -s "http://localhost:4000/api/popup-bundle/$POST_ID" | python3 -c "import sys,json; d=json.load(sys.stdin); print('empty:',d['empty']); print('js contains popup_acc:','popup_acc' in d['js']); print('base64 len:',len(d['base64']))"

# Verify click endpoint
echo
echo "=== Click endpoint ==="
JS=$(curl -s "http://localhost:4000/api/popup-bundle/$POST_ID" | python3 -c "import sys,json; print(json.load(sys.stdin)['js'])")
TOKEN=$(echo "$JS" | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"//;s/"$//')
echo "Extracted token (truncated): ${TOKEN:0:40}..."
curl -s -o /dev/null -w "click: %{http_code}\n" "http://localhost:4000/api/click/$TOKEN?t=image"
sleep 1
EVENTS=$(docker exec -i $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U news -d news -t -c 'SELECT count(*) FROM "ClickEvent";')
echo "ClickEvent rows: $(echo $EVENTS | tr -d ' ')"

# Cleanup
curl -s -o /dev/null -b /tmp/c-p4.txt -X DELETE "http://localhost:3000/api/posts/$POST_ID"
pkill -f "next dev" ; pkill -f "nest start"
```

Expected:

- Detail page contains `data:text/javascript;base64,<long string>`
- Bundle endpoint returns base64 with empty=false
- Bundle JS contains `popup_acc` cookie key
- Click endpoint returns 204
- ClickEvent count > 0

- [ ] Commit any acceptance fixes if needed.

## Acceptance criteria

- [ ] Migration `popups` applied (Popup, PopupLink, PostPopupOverride, ClickEvent tables exist)
- [ ] All 59 tests pass
- [ ] Admin can CRUD popups; toggle global/enabled
- [ ] Admin can attach/detach popup overrides per post
- [ ] Bundle endpoint generates valid JS containing all applicable popups
- [ ] Public post detail page injects base64 popup script
- [ ] Click endpoint accepts signed tokens, ignores invalid, increments ClickEvent
- [ ] HMAC token tied to (popupId, postId, exp 7d)
- [ ] Existing flows (auth, posts, media) unaffected

When complete, Phase 4 done. Phase 5 (analytics ingestion + dashboard) and Phase 6 (deployment) follow.
