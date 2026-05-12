# Deployment

Production stack: Docker Compose on a single VPS.

| Service    | Image                         | Port (internal) | Purpose                                |
| ---------- | ----------------------------- | --------------- | -------------------------------------- |
| `nginx`    | nginx:1.27-alpine             | 80 / 443        | TLS termination + serves `/uploads`    |
| `web`      | apps/web/Dockerfile           | 3000            | Next.js 16 standalone (public + admin) |
| `api`      | packages/api/Dockerfile       | 4000            | NestJS 11 (REST + BullMQ video worker) |
| `postgres` | postgres:16-alpine            | 5432            | Primary database                       |
| `redis`    | redis:7-alpine                | 6379            | BullMQ queue + JWT revocation list     |
| `migrate`  | api Dockerfile target=migrate | —               | One-off; runs `prisma migrate deploy`  |

Persistent volumes: `pg_data`, `redis_data`, `uploads`.

## Server prerequisites

| Item   | Minimum                                                |
| ------ | ------------------------------------------------------ |
| OS     | Ubuntu 24.04 LTS / Debian 12                           |
| CPU    | 2 vCPU                                                 |
| RAM    | 4 GB (sharp + ffmpeg are RAM-heavy)                    |
| Disk   | 40 GB SSD                                              |
| Docker | 24+ with Compose v2 plugin                             |
| Ports  | 80 + 443 inbound; outbound to package registries + DNS |

## First-time setup

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # logout/login to apply

# 2. Clone the repo
sudo mkdir -p /opt/news && sudo chown $USER /opt/news
git clone <repo-url> /opt/news
cd /opt/news

# 3. Configure .env
cp .env.production.example .env
```

### Required `.env` values

```bash
# Database
POSTGRES_USER=news
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=news

# JWT secrets — three independent random strings, ≥32 chars each
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
HMAC_CLICK_SECRET=$(openssl rand -base64 48)
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Public origin — used for CORS, OG meta, sitemap, click HMAC, cookie scope
PUBLIC_BASE_URL=https://news.example.com

# Admin seed (used once, by the seed step below)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<strong-password>
SEED_ADMIN_NAME=Admin
```

Generate each secret separately. **Do not reuse** `JWT_ACCESS_SECRET` for `JWT_REFRESH_SECRET` or `HMAC_CLICK_SECRET`.

### TLS

Pick one:

- **Cloudflare proxy (simplest)**: DNS A record → server IP, orange-cloud on. SSL/TLS mode "Full (strict)". Generate origin cert in Cloudflare dashboard, save as `nginx/certs/fullchain.pem` + `nginx/certs/privkey.pem`.
- **Let's Encrypt**:
  ```bash
  sudo apt install certbot
  sudo certbot certonly --standalone -d news.example.com
  sudo cp /etc/letsencrypt/live/news.example.com/{fullchain,privkey}.pem nginx/certs/
  sudo chown $USER nginx/certs/*.pem
  ```

Then uncomment the HTTPS server block at the bottom of `nginx/default.conf` and set `server_name news.example.com`.

## First boot

```bash
# Build images (5-10 min first time)
docker compose build

# Bring up data layer first
docker compose up -d postgres redis

# Apply all migrations (one-off; profile=migrate)
docker compose --profile migrate up migrate
docker compose ps migrate    # State must be "exited (0)"

# Seed the admin user
docker compose run --rm \
  -e SEED_ADMIN_USERNAME -e SEED_ADMIN_PASSWORD -e SEED_ADMIN_NAME \
  -e DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public \
  migrate node_modules/.bin/tsx prisma/seed.ts

# Start full stack
docker compose up -d

# Verify
docker compose ps
curl -sf https://news.example.com/api/health   # → {"status":"ok",...}
```

Log in at `https://news.example.com/admin/login` using `SEED_ADMIN_USERNAME` + `SEED_ADMIN_PASSWORD`.

> Auth is **username**-based (changed in commit `ea57cd2`). If you find old docs or scripts referring to `email` + `admin@example.com`, they are stale.

## Rolling updates

```bash
cd /opt/news
git pull

# If migrations changed:
docker compose --profile migrate up migrate

# Rebuild + restart only the app containers; postgres/redis/nginx stay up
docker compose build api web
docker compose up -d api web
```

## Backups

```bash
mkdir -p /opt/news/backups
```

Add to `crontab -e`:

```cron
# DB snapshot at 03:00 daily
0 3 * * * cd /opt/news && docker compose exec -T postgres pg_dump -U news news | gzip > backups/db-$(date +\%F).sql.gz

# Prune snapshots older than 30 days
30 3 * * * find /opt/news/backups -name "db-*.sql.gz" -mtime +30 -delete

# Sync uploads volume weekly (adjust host)
0 4 * * 0 rsync -a --delete /var/lib/docker/volumes/news_uploads/_data/ backup-user@backup-host:/srv/news-uploads/
```

### Restore from a snapshot

```bash
docker compose exec -T postgres psql -U news -d news < <(gunzip -c backups/db-2026-05-12.sql.gz)
```

## Operations

```bash
# Logs
docker compose logs -f --tail=200 api
docker compose logs -f --tail=200 web
docker compose logs -f --tail=200 nginx

# Postgres shell
docker compose exec postgres psql -U news -d news

# Redis shell
docker compose exec redis redis-cli

# Disk usage by uploads
du -sh /var/lib/docker/volumes/news_uploads/_data/
```

## Health monitoring

`GET /api/health` returns `{"status":"ok","ts":"..."}` — note it does **not** probe Postgres/Redis. A 200 from this endpoint only means the Nest process is alive. For deeper checks, monitor:

- `docker compose ps` health status of `postgres` (real `pg_isready` check)
- BullMQ queue depth via `redis-cli LLEN bull:media:wait`
- Disk usage on the uploads volume

Set up Uptime Kuma or healthchecks.io to ping `/api/health` and alert on non-200.

## Rollback

```bash
cd /opt/news
git log --oneline -5
git checkout <previous-good-sha>
docker compose build api web
docker compose up -d api web
```

If a schema migration broke things, restore the DB snapshot taken before the deploy, then `git checkout` to the matching code revision.

---

## Production gotchas (read before going live)

### 1. Banner / cover URLs are stored with origin baked in

The codebase stores **absolute** asset URLs (`http://localhost:4000/uploads/…`) in DB columns `Popup.bannerUrl`, `Post.coverImageUrl`, `Post.ogImageUrl`, and inside `Post.contentHtml`. A dev-seeded DB carries those into production unchanged. Run the migration query once after first deploy if you are importing dev data:

```sql
UPDATE "Popup"
   SET "bannerUrl" = REPLACE("bannerUrl", 'http://localhost:4000', 'https://news.example.com');
UPDATE "Post"
   SET "coverImageUrl" = REPLACE("coverImageUrl", 'http://localhost:4000', 'https://news.example.com')
 WHERE "coverImageUrl" IS NOT NULL;
UPDATE "Post"
   SET "ogImageUrl" = REPLACE("ogImageUrl", 'http://localhost:4000', 'https://news.example.com')
 WHERE "ogImageUrl" IS NOT NULL;
UPDATE "Post"
   SET "contentHtml" = REPLACE("contentHtml", 'http://localhost:4000', 'https://news.example.com');
```

A path-only refactor is the proper long-term fix.

### 2. `next.config.mjs` allow-lists `localhost` only

`apps/web/next.config.mjs:6` whitelists only `http://localhost` for `next/image`. The current code uses plain `<img>` tags so it does not block anything today, but if you ever migrate to `<Image>`, update `remotePatterns` to your production domain first.

### 3. Popup compliance — review before exposing to crawlers

Defaults in the popup engine carry policy and SEO risk. Before publishing:

- **Turn off `hideOnBot`** — serving different content to Googlebot than to users is cloaking and can lead to de-indexing.
- **Reconsider `forceClickOnClose`** — clicking X redirecting to an affiliate is a deceptive close button. It violates Shopee Affiliate, Lazada AP, and TikTok Shop Creator policies; expect commission clawback if detected.
- **Add a disclosure** (`#tài-trợ` / "Liên kết tiếp thị") on the banner per Vietnamese Nghị định 38/2021/NĐ-CP.

### 4. Stale e2e tests

After the auth switch (`ea57cd2`), only `packages/api/test/popups.e2e-spec.ts` was updated to use `username`. The other three (`auth`, `media`, `posts`) still reference the removed `email` field and will fail CI. Update them before re-enabling those CI jobs.

### 5. Cookie domain

Cookies are not given an explicit `domain` — they default to the host that issued them. If you ever split `admin.news.example.com` from `news.example.com`, set `domain: '.news.example.com'` in `packages/api/src/auth/auth.controller.ts` and redeploy.

### 6. Health endpoint is shallow

`/api/health` does not check Postgres or Redis. Adding probes there is a small follow-up but worth doing before relying on it for orchestrator liveness in Kubernetes.

### 7. Token revocation needs Redis persistence

Token blacklist lives in Redis with no DB fallback. If Redis restarts without RDB/AOF persistence, every revoked token becomes valid again until expiry. The `redis:7-alpine` image enables AOF by default with `appendonly yes` only if you configure it — add a volume-mounted `redis.conf` if revocation must survive container restarts.

## Pre-flight checklist

- [ ] `.env` contains three independent ≥32-char secrets
- [ ] `PUBLIC_BASE_URL` is the full HTTPS origin
- [ ] DNS A/AAAA record points to the server
- [ ] TLS cert in `nginx/certs/`, HTTPS block in `nginx/default.conf` uncommented
- [ ] `mkdir -p backups nginx/certs`
- [ ] Migration profile run successfully (`docker compose ps migrate` → `exited (0)`)
- [ ] Admin seeded; can log in via username/password
- [ ] Every popup reviewed: `hideOnBot=false`, `forceClickOnClose=false` (or replaced by a separate CTA), disclosure label visible
- [ ] Backup cron installed (`crontab -l`)
- [ ] Monitoring agent pinging `/api/health`
