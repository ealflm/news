# Design Spec — News + Affiliate Popup Platform

**Date:** 2026-05-10
**Status:** Draft awaiting review
**Reference site:** honghotduong.com (cloning behavior, not content)

## 1. Mục tiêu & phạm vi

Xây dựng nền tảng tin tức/drama tiếng Việt giống mô hình honghotduong.com:

- **Public site** (Next.js 15) hiển thị bài viết với layout đẹp hơn site tin tức tiêu chuẩn.
- **Admin panel** (cùng app Next, route `/admin`) để CRUD bài viết, popup affiliate, media, và xem analytics.
- **Backend** NestJS cung cấp REST API, xử lý media (ảnh/video nén), tracking click, sinh popup runtime.
- **Popup engine** giữ logic dark-pattern của honghotduong (cloaking desktop/bot, force-click on close, link biến thể theo iOS-FB/iOS-Safari/Android), nhưng cấu hình toggle được từ admin để tắt khi cần.

### Trong phạm vi
- Multi-user admin, single role (mọi user là admin).
- Popup affiliate global + per-post override.
- Ảnh nén (sharp), video nén (ffmpeg), embed YouTube/TikTok/Facebook qua oEmbed.
- Analytics view + click với raw events + nightly rollup.
- Deploy 1 VPS qua Docker Compose.

### Ngoài phạm vi (không làm ở phase đầu)
- Comments người dùng, newsletter, dark mode, đa ngôn ngữ.
- Categories/Tags (chỉ archive theo ngày).
- A/B test popup, webhook notification, audit log, bulk import.
- Cloud storage (R2/S3) — code có abstraction nhưng chỉ implement local.

## 2. Rủi ro vận hành (đã thông báo cho stakeholder)

1. **Vi phạm ToS sàn TMĐT**: cloaking + force-click vi phạm chính sách Shopee/TikTok/Lazada → affiliate ID có thể bị ban. Mitigation: có flag toggle/popup, xoay nhiều tài khoản.
2. **SEO penalty**: Google có thể coi popup là deceptive nếu phát hiện. Mitigation: chỉ chạy JS trên mobile, content render đầy đủ cho bot.
3. **Pháp lý VN**: Luật Quảng cáo điều 8 (quảng cáo lừa dối). Mitigation: trang `/chinh-sach` ghi rõ site có affiliate.
4. **Nghị định 13/2023 (dữ liệu cá nhân)**: hash IP với daily-rotate salt, không lưu IP raw.

## 3. Kiến trúc tổng thể

### 3.1 Topology (Approach A — Monorepo + Docker Compose)

```
news/
├── apps/
│   └── web/                  Next.js 15 (App Router) — public + /admin
├── packages/
│   ├── api/                  NestJS — REST API, auth, analytics, popup builder
│   ├── api-worker/           NestJS worker — BullMQ consumer (sharp/ffmpeg)
│   ├── db/                   Prisma schema + migrations
│   ├── shared/               Types, Zod schemas, DTO
│   └── popup-runtime/        Popup JS template + esbuild bundle script
├── docker-compose.yml
├── nginx/
│   └── default.conf
└── pnpm-workspace.yaml
```

### 3.2 Service runtime

| Service | Port | Image | Vai trò |
|---|---|---|---|
| nginx | 80/443 | nginx:alpine | TLS, reverse proxy, serve `/uploads`, gzip/brotli |
| web | 3000 | node:20-slim (build standalone) | Next public + admin |
| api | 4000 | node:20-slim | NestJS REST API |
| api-worker | — | node:20-slim | BullMQ worker (image/video processing) |
| postgres | 5432 | postgres:16 | DB |
| redis | 6379 | redis:7 | Cache, queue, rate-limit |

### 3.3 Routing nginx

```
/                  → web:3000
/_next/*           → web:3000 (immutable cache)
/api/*             → api:4000
/uploads/*         → static alias /var/www/uploads
```

## 4. Stack & dependencies

### Frontend (`apps/web`)
- Next.js 15 (App Router, Server Components, ISR)
- React 19
- Tailwind CSS v4
- shadcn/ui components
- TipTap v2 editor (extensions: StarterKit, Image, Youtube custom, Video custom, Link, Table)
- React Hook Form + Zod
- TanStack Query
- Recharts (admin analytics)
- Lucide icons
- Be Vietnam Pro + Inter fonts qua next/font

### Backend (`packages/api`)
- NestJS 10
- Prisma 5 (Postgres)
- Passport JWT + refresh
- BullMQ (queue)
- sharp (ảnh)
- fluent-ffmpeg (video)
- node-html-parser + DOMPurify (sanitize TipTap output)
- oembed-parser
- @nestjs/throttler (rate limit)

### Tooling
- pnpm workspaces, Turborepo
- Husky + lint-staged
- ESLint + Prettier + TypeScript strict
- Vitest (unit), Playwright (e2e admin)
- GitHub Actions CI

## 5. Data model (Prisma schema chính)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  createdAt    DateTime @default(now())
  posts        Post[]
}

model Post {
  id            String     @id @default(cuid())
  slug          String     @unique
  title         String
  excerpt       String?    @db.Text
  contentJson   Json
  contentHtml   String     @db.Text
  coverImageId  String?
  coverImage    Media?     @relation("PostCover", fields: [coverImageId], references: [id])
  status        PostStatus @default(DRAFT)
  publishedAt   DateTime?
  scheduledAt   DateTime?
  authorId      String
  author        User       @relation(fields: [authorId], references: [id])
  seoTitle      String?
  seoDesc       String?
  ogImageId     String?
  ogImage       Media?     @relation("PostOgImage", fields: [ogImageId], references: [id])
  popupOverrides PostPopupOverride[]
  viewCount     Int        @default(0)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  @@index([status, publishedAt])
}

enum PostStatus { DRAFT SCHEDULED PUBLISHED }

model Popup {
  id                String   @id @default(cuid())
  name              String
  bannerId          String
  banner            Media    @relation("PopupBanner", fields: [bannerId], references: [id])
  delayMs           Int
  isGlobal          Boolean  @default(false)
  enabled           Boolean  @default(true)
  cookieKey         String   @unique
  cookieDays        Int      @default(1)
  forceClickOnClose Boolean  @default(false)
  hideOnDesktop     Boolean  @default(true)
  hideOnBot         Boolean  @default(true)
  links             PopupLink[]
  postOverrides     PostPopupOverride[]
  clickEvents       ClickEvent[]
  configVersion     Int      @default(1)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model PopupLink {
  id       String        @id @default(cuid())
  popupId  String
  popup    Popup         @relation(fields: [popupId], references: [id], onDelete: Cascade)
  platform LinkPlatform
  device   LinkDevice
  url      String        @db.Text
  label    String?
  @@unique([popupId, platform, device])
}

enum LinkPlatform { SHOPEE TIKTOK LAZADA OTHER }
enum LinkDevice   { IOS_FB IOS_SAFARI ANDROID DESKTOP_FALLBACK }

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

enum OverrideAction { ATTACH DETACH }

model Media {
  id            String     @id @default(cuid())
  kind          MediaKind
  originalPath  String?
  variants      Json?
  width         Int?
  height        Int?
  durationSec   Int?
  sizeBytes     BigInt?
  mimeType      String?
  embedUrl      String?
  embedHtml     String?    @db.Text
  embedProvider String?
  alt           String?
  uploadedById  String?
  postCovers    Post[]     @relation("PostCover")
  postOgImages  Post[]     @relation("PostOgImage")
  popupBanners  Popup[]    @relation("PopupBanner")
  createdAt     DateTime   @default(now())
}

enum MediaKind { IMAGE VIDEO EMBED }

model ViewEvent {
  id        String   @id @default(cuid())
  postId    String
  sessionId String
  ipHash    String
  device    String
  inFbApp   Boolean  @default(false)
  referrer  String?
  createdAt DateTime @default(now())
  @@index([postId, createdAt])
}

model ClickEvent {
  id        String   @id @default(cuid())
  popupId   String
  popup     Popup    @relation(fields: [popupId], references: [id])
  postId    String?
  sessionId String
  device    String
  platform  String
  variant   String
  trigger   String
  createdAt DateTime @default(now())
  @@index([popupId, createdAt])
  @@index([postId, createdAt])
}

model PostStatDaily {
  id        String   @id @default(cuid())
  postId    String
  day       DateTime @db.Date
  views     Int
  clicks    Int
  @@unique([postId, day])
}

model PopupStatDaily {
  id        String   @id @default(cuid())
  popupId   String
  day       DateTime @db.Date
  shown     Int
  clicks    Int
  @@unique([popupId, day])
}
```

### Quy ước
- `Post.contentJson` lưu TipTap JSON; `contentHtml` là HTML đã pre-render server-side (qua `@tiptap/html` + DOMPurify). SSR chỉ cần `dangerouslySetInnerHTML` từ `contentHtml`.
- `Popup.configVersion` tăng mỗi lần admin lưu — dùng làm cache key cho popup runtime bundle.
- `Media.variants` là JSON `{ "320w": "...", "720w": "...", "webp": "...", "avif": "...", "720p": "...", "1080p": "...", "hls": "...", "poster": "..." }` (key tuỳ MediaKind).

## 6. Public site (`apps/web`)

### 6.1 Routes
```
/                                           Homepage (ISR 60s)
/[year]/[month]/[day]/[slug]                Post detail (ISR 300s + on-demand revalidate)
/tim-kiem?q=...                             Search SSR
/sitemap.xml                                Dynamic
/rss.xml                                    Dynamic
/robots.txt                                 Static
/chinh-sach                                 Affiliate disclosure
```

### 6.2 Layout
- Header sticky: logo, nav (Mới nhất / Hot / Drama theo lựa chọn admin sau, hiện tại link tĩnh), search icon, mobile menu.
- Footer: about, RSS, social, link `/chinh-sach`.

### 6.3 Homepage layout
- Hero featured (1 post nổi bật, ảnh 16:9, gradient overlay).
- Side: top 3 hot 7 ngày (sort theo viewCount).
- Grid 4 cột (2 mobile) bài mới nhất, "Tải thêm" cursor pagination.

### 6.4 Post detail layout
- URL pattern `/<yyyy>/<mm>/<dd>/<slug>` (giống honghotduong).
- Tiêu đề h1, meta (author, ngày, view count formatted).
- Cover image responsive (`<picture>` với avif/webp/jpg).
- Article: prose, max-w-720px center, h2/h3 từ TipTap.
- Share buttons (FB, Zalo, copy link) — không theo dõi user.
- Related posts: 4 bài cùng tác giả mới nhất.
- **Popup runtime injection** ở cuối `<body>` (xem section 8).

### 6.5 SEO
- `<title>`, `<meta description>` từ `seoTitle/seoDesc` (fallback `title/excerpt`).
- OG tags với `ogImage` variant 1200x630.
- JSON-LD Article schema.
- `sitemap.xml` chứa tất cả PUBLISHED posts với `lastmod = updatedAt`.
- `robots.txt`: allow all, disallow `/admin`.

### 6.6 Performance budget
- LCP < 2.5s mobile 4G.
- Inline critical CSS dưới 14KB.
- `next/font` swap.
- Lazy-load ảnh dưới fold (`loading="lazy"`).
- Preconnect tới CDN nginx host nếu khác origin.

## 7. Admin panel (`/admin`)

### 7.1 Routes
```
/admin/login
/admin                          Dashboard
/admin/posts                    List
/admin/posts/new
/admin/posts/[id]/edit
/admin/popups                   List
/admin/popups/[id]/edit
/admin/media                    Library
/admin/analytics
/admin/users
/admin/settings
```

### 7.2 Auth
- Login: POST email/password → Nest `/api/auth/login` → trả JWT (15m) + refresh (7d) trong httpOnly cookie SameSite=Lax.
- Next middleware kiểm `auth_token` trên mọi `/admin/*` (trừ `/admin/login`).
- Refresh tự động qua interceptor TanStack Query khi 401.
- User table; invite by email với token signed hết hạn 24h, gửi qua SMTP.

### 7.3 Post editor
- TipTap v2 với toolbar: B/I/U, H2/H3, list, blockquote, code, link, image, video upload, embed (paste URL), table, gallery, HR.
- Image/video drop-upload → POST `/api/media/upload` → trả Media ID; placeholder loading khi processing async.
- Embed: paste URL → backend oEmbed → trả `embedHtml` cached → render iframe.
- Side panel: slug auto-generate (slugify tiếng Việt, có thể sửa), trạng thái, schedule, SEO meta, cover image picker, popup override (checkbox "dùng global", danh sách popup attach/detach).
- Save:
  - "Save draft" → status DRAFT.
  - "Publish" → status PUBLISHED, publishedAt = now.
  - "Schedule" → status SCHEDULED, scheduledAt; cron mỗi phút chuyển sang PUBLISHED khi đến giờ.
- Publish trigger Next on-demand revalidate cho post URL + homepage.

### 7.4 Popup editor
- Form các field theo Popup model.
- Tab "Affiliate links": table 4 dòng (IOS_FB, IOS_SAFARI, ANDROID, DESKTOP_FALLBACK) × N platform.
- Tab "Stats" hiển thị shown/clicks/CTR 7 ngày từ `PopupStatDaily`.
- Save → tăng `configVersion` → invalidate Redis cache popup bundle.

### 7.5 Media library
- Grid thumbnail, lazy-load.
- Modal chi tiết: variants list, replace file, edit alt, delete (chặn nếu đang được reference).

### 7.6 Analytics dashboard
- KPI cards: posts, views, clicks, CTR (7d, so sánh tuần trước).
- Line chart: views theo ngày 30d.
- Top 10 posts theo clicks, top popups theo CTR.
- Filter date range; export CSV.

### 7.7 Settings
- Site title, tagline, base URL.
- Default OG image.
- Popup global defaults (delayMs, cookieDays, flags).
- Footer text.
- SMTP config (test send button).

## 8. Popup engine

### 8.1 Bundle generation
1. Khi post được view (hoặc admin lưu), Nest tính `applicablePopups(postId)`:
   ```
   = Popup(isGlobal=true, enabled=true)
   + override(postId, action=ATTACH).popup(enabled=true)
   − override(postId, action=DETACH)
   ```
2. Render JS template (`packages/popup-runtime/template.js`) với config inject:
   ```js
   const cfg = {
     popups: [
       { id, delayMs, cookieKey, cookieDays, bannerUrl, links, flags, trackingToken },
       ...
     ],
     clickEndpoint: '/api/click',
     viewEndpoint: '/api/view'
   };
   ```
3. esbuild minify → ~3KB.
4. Cache Redis key `popup:bundle:<postId>:v<configVersion>` TTL 1h.
5. Server component Next fetch bundle qua internal call → base64-encode → render `<script src="data:text/javascript;base64,...">` cuối `<body>`.

### 8.2 Tracking token
- HMAC-SHA256 chữ ký với `HMAC_CLICK_SECRET`, payload `{popupId, postId, exp: now+7d}`.
- Token chứa trong bundle, không lộ popupId raw cho client.
- Endpoint `POST /api/click/:token?t=<close|image>` verify token, insert ClickEvent async, return 204.

### 8.3 Runtime logic
Pseudo (template thực thi cho từng popup):
```js
for (const p of cfg.popups) {
  if (p.flags.hideOnDesktop && isDesktop()) continue;
  if (p.flags.hideOnBot && isBot()) continue;
  if (getCookie(p.cookieKey)) continue;
  if (!isMobile()) continue;
  setTimeout(() => showPopup(p), p.delayMs);
}

function showPopup(p) {
  const overlay = createOverlayDOM(p.bannerUrl);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const link = pickLink(p.links);
  const closeAndGo = (trigger) => {
    overlay.remove();
    document.body.style.overflow = '';
    setCookie(p.cookieKey, 'yes', p.cookieDays);
    navigator.sendBeacon(`${cfg.clickEndpoint}/${p.trackingToken}?t=${trigger}`);
    window.open(link, '_blank');
  };

  overlay.querySelector('.btn-close').onclick =
    p.flags.forceClickOnClose ? () => closeAndGo('close') : () => overlay.remove();
  overlay.querySelector('img').onclick = () => closeAndGo('image');
}

function pickLink(links) {
  if (isIOS() && isInFbApp()) return links.IOS_FB;
  if (isIOS())                return links.IOS_SAFARI;
  if (isAndroid())            return links.ANDROID;
  return links.DESKTOP_FALLBACK;
}
```

### 8.4 Detection helpers
- `isDesktop()`: WebGL renderer match `SwiftShader|NVIDIA|AMD|Intel`.
- `isBot()`: UA regex `bot|crawl|spider|googlebot|bingbot|baidu|yandex|facebookexternalhit`.
- `isInFbApp()`: UA chứa `FBAN|FBAV|FBIOS|FB_IAB|FB4A`.

## 9. Analytics

### 9.1 Ingestion
- ViewEvent: client gửi `POST /api/view` sau DOM ready với `postId`, `sessionId` (cookie cuid), device detected client-side.
- ClickEvent: từ popup runtime qua `/api/click/:token`.
- Cả hai dùng `navigator.sendBeacon`.
- IP hash: `sha256(ip + DAILY_SALT)`, salt rotate mỗi 24h.

### 9.2 Aggregation
- Realtime (24h): query trực tiếp Postgres với index.
- Daily rollup: cron Nest 00:30 mỗi ngày tính `PostStatDaily`, `PopupStatDaily` từ events ngày trước, xoá events > 90 ngày để DB không phình.

### 9.3 Dashboard charts
- Recharts; query rollup cho range > 24h, query raw cho 24h gần nhất.

### 9.4 Export
- Endpoint `/api/analytics/export?type=posts|popups&from=&to=` → CSV stream.

## 10. Media pipeline

### 10.1 Upload flow ảnh
1. POST `/api/media/upload` (multipart, max 20MB).
2. Validate mime (allowlist: jpg, jpeg, png, webp, gif).
3. Lưu original `/uploads/orig/<cuid>.<ext>`.
4. Enqueue BullMQ job `image-process`.
5. Worker: sharp resize widths [320, 720, 1280, 1920], encode webp (q82) + avif (q60), thumb 320×320 cover.
6. Update `Media.variants`.
7. Client poll `GET /api/media/:id` mỗi 2s đến khi `variants` không null (hoặc dùng SSE).

### 10.2 Upload flow video
1. POST `/api/media/upload` (max 500MB, mime allowlist mp4/mov/webm).
2. Lưu original.
3. Enqueue `video-process`.
4. Worker: ffmpeg transcode 720p + 1080p (h264 baseline + AAC), poster.jpg ở giây 1; nếu `durationSec > 60` thêm HLS playlist.
5. Update variants.

### 10.3 Embed external
- Editor paste URL, debounce 500ms.
- Backend oEmbed:
  - YouTube: oembed.com/oembed?url=...
  - TikTok: tiktok.com/oembed?url=...
  - Facebook: graph.facebook.com (cần app token; fallback iframe khi thiếu).
- Cache `embedHtml` trong Media row 7 ngày.
- Sanitize qua DOMPurify (jsdom server) — whitelist iframe từ youtube.com/tiktok.com/facebook.com.

### 10.4 Render
- Image: `<picture><source type="image/avif" srcset><source type="image/webp" srcset><img src="...jpg" srcset></picture>`.
- Video: `<video controls poster><source src="720p.mp4"><source src="1080p.mp4"></video>` hoặc `hls.js` nếu HLS.
- Embed: `<div class="embed-wrap" dangerouslySetInnerHTML={{__html: sanitizedEmbedHtml}} />`.

### 10.5 Nginx static
```nginx
location /uploads/ {
  alias /var/www/uploads/;
  expires 30d;
  add_header Cache-Control "public, immutable";
  gzip on;
  brotli on;
  gzip_types image/svg+xml application/json text/html;
}
```

## 11. Auth & security

- JWT access 15m, refresh 7d, httpOnly + Secure + SameSite=Lax.
- Bcrypt cost 12 cho passwordHash.
- Invite token HMAC, expire 24h.
- CSRF: SameSite=Lax + double-submit token cho mutation form admin (Nest interceptor).
- Rate limit: `/api/auth/login` 5/min/IP; `/api/click/*` 100/min/IP; chung 60/min/IP.
- Helmet.js trên Nest.
- DOMPurify cho HTML từ TipTap + oEmbed (whitelist tag/attr).
- File upload validate mime + magic byte (file-type).
- Env secrets: không commit, mount qua docker secret hoặc bind file `.env.production` (chmod 600).

## 12. Deployment

### 12.1 docker-compose.yml services
- web, api, api-worker, postgres, redis, nginx.

### 12.2 Volumes
- `pg_data`, `redis_data`, `uploads` (mount `/var/www/uploads` cho api, worker, nginx).

### 12.3 Env (`.env.production`)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://redis:6379
JWT_SECRET=
JWT_REFRESH_SECRET=
HMAC_CLICK_SECRET=
DAILY_IPHASH_SALT=
ADMIN_INVITE_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
PUBLIC_BASE_URL=https://example.com
NEXT_PUBLIC_API_URL=/api
UPLOADS_DIR=/var/www/uploads
```

### 12.4 TLS
- Certbot container hoặc Cloudflare proxy (origin cert free).

### 12.5 Backup
- Cron daily `pg_dump` → `/backup/db-<date>.sql.gz`, giữ 14 ngày.
- Rsync `/var/www/uploads` weekly sang remote.

### 12.6 CI/CD
- GitHub Actions: lint → typecheck → unit test (vitest) → build images → push registry → SSH deploy `docker compose pull && up -d`.
- Smoke test sau deploy: curl `/api/health`, `/`.

### 12.7 Monitoring (optional, phase sau)
- Prometheus + Grafana hoặc Uptime Kuma cho `/api/health`.
- Sentry cho error tracking.

## 13. Dev workflow

```bash
pnpm install
pnpm db:migrate           # Prisma migrate dev
pnpm db:seed              # tạo admin đầu tiên + sample post + popup
pnpm dev                  # turbo: web + api + api-worker
pnpm test                 # vitest tất cả packages
pnpm test:e2e             # Playwright (admin flow)
pnpm build                # build production tất cả
```

Husky pre-commit: prettier --write, eslint --fix, tsc --noEmit (changed packages).

## 14. Open questions / decisions deferred

- A/B test popup: phase sau, schema có sẵn `configVersion`, có thể thêm `PopupVariant` model.
- Notification webhook (Telegram khi click vượt ngưỡng): phase sau.
- Audit log: phase sau, có thể implement bằng Prisma middleware ghi vào `AuditLog`.
- Categories/Tags: bổ sung sau khi có nhu cầu phân loại nội dung.
- Cloud storage migration: code đã có abstraction `StorageProvider`, swap khi chuyển sang R2/S3.

## 15. Acceptance criteria (cho phase đầu)

- [ ] Public site render homepage + 1 post detail giống mockup (URL `/yyyy/mm/dd/slug`).
- [ ] Admin login multi-user; CRUD post với TipTap editor (image/video/embed).
- [ ] CRUD popup; toggle global/enabled; config dark-pattern flags.
- [ ] Per-post override popup (attach/detach) hoạt động.
- [ ] Popup runtime nhúng base64, chạy đúng theo timer + cookie + device detection.
- [ ] Click tracking ghi nhận sự kiện qua signed token; dashboard hiển thị KPI 7d.
- [ ] Upload ảnh + video, nén async, hiển thị responsive variants.
- [ ] Embed YouTube/TikTok hoạt động.
- [ ] Deploy qua `docker compose up`; nginx serve TLS; uploads accessible.
- [ ] CI green: lint, typecheck, unit test, build.
