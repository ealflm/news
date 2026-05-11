# Deployment

Production stack: Docker Compose on a single VPS. Services:

- `nginx` (80/443) — reverse proxy + TLS termination + serves `/uploads` static
- `web` (Next.js 16 standalone) — port 3000 internal
- `api` (NestJS 11) — port 4000 internal
- `postgres` (16-alpine) — internal
- `redis` (7-alpine) — internal

## First-time setup

1. Provision a VPS with Docker + Docker Compose installed.

2. Clone the repo:

   ```bash
   git clone <repo> /opt/news
   cd /opt/news
   ```

3. Copy and edit `.env.production`:

   ```bash
   cp .env.production.example .env
   # Edit .env: set POSTGRES_PASSWORD, JWT_*, HMAC_CLICK_SECRET, PUBLIC_BASE_URL
   ```

4. (Optional) Place TLS certificates at `nginx/certs/{fullchain,privkey}.pem` and uncomment the HTTPS server block in `nginx/default.conf`. Or use Cloudflare proxy with origin certs.

5. Build and start:

   ```bash
   docker compose up -d --build
   ```

6. Run database migrations (first time only):

   ```bash
   docker compose exec api node -e "require('node:child_process').execSync('npx prisma migrate deploy', { stdio: 'inherit' })"
   ```

   Or simpler — exec into the api container and run `pnpm db:migrate`. (See "First migration" below.)

7. Seed the admin user:
   ```bash
   docker compose exec api node -e "require('@news/db').prisma.user.upsert({ where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com' }, update: {}, create: { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', displayName: 'Admin', passwordHash: require('bcrypt').hashSync(process.env.SEED_ADMIN_PASSWORD || 'changeme', 12) } })"
   ```

## First migration (recommended approach)

The api Docker image does not include the Prisma CLI. The cleanest path:

1. From the host, after services start the first time:

   ```bash
   # From the repo root, with .env present:
   docker compose run --rm \
     -e DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public \
     api npx -y prisma migrate deploy --schema=/app/node_modules/@news/db/prisma/schema.prisma
   ```

2. After the first migration, future migrations should be applied automatically by re-deploying with the same migration files baked into the image.

## Backups

Daily Postgres dump:

```bash
docker compose exec -T postgres pg_dump -U news news | gzip > /opt/news/backups/db-$(date +%F).sql.gz
```

Add to crontab:

```
0 3 * * * cd /opt/news && docker compose exec -T postgres pg_dump -U news news | gzip > backups/db-$(date +\%F).sql.gz
```

Sync uploads (weekly):

```bash
0 4 * * 0 rsync -a --delete /opt/news/uploads/ user@backup-host:/path/to/news-uploads/
```

## Health & monitoring

- `/api/health` returns `{"status":"ok",...}`. Set up a monitoring agent (Uptime Kuma, healthchecks.io) to watch this.
- Log inspection: `docker compose logs -f api` / `docker compose logs -f web`
- Postgres CLI: `docker compose exec postgres psql -U news -d news`

## Rolling updates

```bash
git pull
docker compose build api web
docker compose up -d api web
```

The `restart: unless-stopped` policy will auto-restart on crashes. Postgres + Redis + Nginx do not need rebuild for code-only changes.

## Security notes

- TLS termination at nginx (or Cloudflare) is required for production. `secure: true` cookies are only sent over HTTPS, and the JWT cookies in this app are set with `secure: process.env.NODE_ENV === 'production'`.
- Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `HMAC_CLICK_SECRET` periodically.
- The popup runtime contains signed HMAC tokens valid for 7 days. Compromised secrets require rotation + invalidation by bumping `Popup.configVersion` (admin can edit any popup to trigger this).

## Operational risk reminder

The popup engine implements aggressive dark-pattern affiliate behavior (cloaking, force-click on close, device-specific link variants). This may violate the affiliate program ToS of Shopee/TikTok/Lazada and could result in affiliate ID bans. Consider:

- Operating multiple affiliate IDs and rotating
- Monitoring affiliate dashboards for sudden drops
- Having a `/chinh-sach` page that discloses affiliate relationships per Vietnamese Luật Quảng cáo

## Continuous Integration

CI runs on every push and PR via `.github/workflows/ci.yml`:

- Lint + typecheck across all 4 packages
- Unit tests (`@news/shared`, `@news/web`)
- e2e tests (`@news/api`) against ephemeral Postgres + Redis containers
- Production Next.js + NestJS builds
- Docker image builds for web + api (cached via GHA cache)

To run the same checks locally:

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Build Summary

This is the production state of the project.

### Features delivered

**Public site (Next.js 16 + Tailwind 4 + React 19):**

- News-style homepage (featured hero + top sidebar + grid)
- Post detail at `/yyyy/mm/dd/slug` with JSON-LD, OG meta, view tracking
- Sitemap.xml, RSS feed, robots.txt
- Affiliate disclosure page `/chinh-sach`
- Mobile-first responsive, Newsreader + Roboto fonts, rose/blue palette

**Affiliate popup engine:**

- Multiple popups per post (global default + per-post ATTACH/DETACH)
- Per-device variant URLs (iOS-FB / iOS-Safari / Android / Desktop fallback)
- Cloaking flags (hide on desktop / hide on bot)
- Force-click on close (configurable)
- Base64-encoded JS runtime injected into public pages
- HMAC-signed click tracking endpoint

**Admin (`/admin`, JWT auth multi-user):**

- Dashboard with shortcuts
- Posts: TipTap editor (text, headings, lists, link, image upload, video upload, YouTube/TikTok/Facebook embed)
- Media library (sharp image variants, ffmpeg video transcoding via BullMQ worker)
- Popup CRUD with per-post override
- Analytics dashboard (KPIs, area chart, top posts/popups, CSV export)
- User management (invite via SMTP or copy URL)
- Audit log (post mutations)

**Stack:**

- Next.js 16.2.6 (App Router, ISR)
- NestJS 11.1.19
- Prisma 7.8.0 + PostgreSQL 16 (driver adapter)
- Tailwind CSS 4.3.0
- React 19.2.6
- Redis 7 (BullMQ + token revocation)

**Quality:**

- Test suite: shared (Zod), api e2e (auth/posts/media/popups), web (middleware/sitemap)
- TypeScript strict mode across all 4 packages
- Pre-commit hooks (Husky + lint-staged + prettier)
- GitHub Actions CI (lint, typecheck, test, build, Docker validation)

**Production deployment:**

- Multi-stage Docker images for web + api
- docker-compose.yml with nginx + postgres + redis + uploads volume
- One-off `migrate` profile for first-time database setup
- TLS-ready nginx config (commented HTTPS block)

### Known limitations / future work

- Token revocation uses in-memory Redis (no persistence across Redis restart unless RDB enabled)
- ffmpeg video transcoding is single-threaded per worker; scale up by running multiple api-worker containers
- Audit log records only Posts mutations; extend to Popups/Media/Users in follow-up
- A/B test popup variants — schema supports `configVersion` but UI not built
- Webhook notifications (Slack/Telegram on click thresholds) deferred
- Bulk import from CSV/markdown deferred
