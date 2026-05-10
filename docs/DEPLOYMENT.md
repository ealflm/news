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
