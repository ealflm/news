# Nginx + TLS (certbot)

How to put a real SSL certificate in front of the News stack. The `deploy.sh`
script renders `nginx/default.conf` for you based on `PUBLIC_BASE_URL`. It does
**not** touch certbot or auto-detect cert files. You issue the cert; you flip
`ENABLE_HTTPS=true` in `.env`; the next deploy renders an HTTPS-enabled config.

## How nginx sees the certs

`docker-compose.yml` bind-mounts the host directory `./nginx/certs/` into the
nginx container at `/etc/nginx/certs/`. The rendered HTTPS config references:

```
ssl_certificate     /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

So whatever you drop into `./nginx/certs/` on the host is what nginx serves.

## Prerequisites

- DNS **A** (and optionally **AAAA**) record for your domain → server's public IP
- TCP `80` and `443` open in the cloud firewall + any UFW rules on the host
- `PUBLIC_BASE_URL` in `.env` matches the domain you'll issue the cert for

Verify DNS first — there is no point running certbot if Let's Encrypt can't reach you:

```bash
dig +short news.example.com           # must return your server's public IP
curl -sI http://news.example.com/     # must reach nginx on port 80
```

---

## Option A — Cloudflare proxy (simplest, no certbot)

If you front the server with Cloudflare's orange-cloud proxy you don't need
certbot at all. Cloudflare terminates TLS at their edge and gives you a free
15-year origin certificate.

1. Cloudflare → **SSL/TLS** → set encryption mode to **Full (strict)**
2. **SSL/TLS → Origin Server → Create Certificate** (default RSA, 15 years)
3. Save the displayed certificate as `nginx/certs/fullchain.pem` and the
   private key as `nginx/certs/privkey.pem`
4. Lock down the key:
   ```bash
   chmod 600 nginx/certs/privkey.pem
   ```
5. Flip the toggle and redeploy:
   ```bash
   sed -i 's/^ENABLE_HTTPS=.*/ENABLE_HTTPS=true/' .env
   ./scripts/deploy.sh
   ```

Renewal: not needed for 15 years. Set a calendar reminder.

---

## Option B — Let's Encrypt with `certbot --standalone` (recommended for DIY)

Standalone mode runs certbot's own HTTP server on port `80` to solve the http-01
challenge. The nginx container must be stopped briefly during issuance and
renewal (visitors will see "connection refused" for ~30 seconds).

### One-time issuance

```bash
# 1. Install certbot (Debian / Ubuntu)
sudo apt update && sudo apt install -y certbot

# 2. Stop nginx so port 80 is free for certbot
cd /opt/news
docker compose stop nginx

# 3. Issue the certificate (change domain + email)
sudo certbot certonly --standalone \
  --non-interactive --agree-tos \
  -m you@example.com \
  -d news.example.com

# 4. Copy the cert into nginx/certs/ (bind mount picks it up)
#    Using `install` so perms are set in one go.
sudo install -m 600 -o "$USER" -g "$USER" \
  /etc/letsencrypt/live/news.example.com/fullchain.pem \
  nginx/certs/fullchain.pem
sudo install -m 600 -o "$USER" -g "$USER" \
  /etc/letsencrypt/live/news.example.com/privkey.pem \
  nginx/certs/privkey.pem

# 5. Flip the HTTPS toggle and redeploy.
#    deploy.sh re-renders nginx/default.conf with the HTTPS server block
#    and brings nginx back up.
sed -i 's/^ENABLE_HTTPS=.*/ENABLE_HTTPS=true/' .env
./scripts/deploy.sh

# 6. Verify
curl -sI https://news.example.com/api/health
```

### Auto-renew (daily cron)

Let's Encrypt certs expire after 90 days. `certbot renew` is idempotent — it
skips certs that aren't due yet — so a daily cron is the standard pattern.

Create `/opt/news/scripts/renew-cert.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/news

DOMAIN="news.example.com"   # change me

# Free port 80, renew, copy fresh files, bring nginx back.
docker compose stop nginx
sudo certbot renew --quiet --standalone

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  sudo install -m 600 -o "$USER" -g "$USER" \
    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/certs/fullchain.pem
  sudo install -m 600 -o "$USER" -g "$USER" \
    "/etc/letsencrypt/live/$DOMAIN/privkey.pem"   nginx/certs/privkey.pem
fi

docker compose up -d nginx
```

```bash
chmod +x /opt/news/scripts/renew-cert.sh

# Install as a root crontab entry (root needed for /etc/letsencrypt).
# Run 03:17 daily — random minute reduces ACME server load.
sudo crontab -e
# Add:
17 3 * * * /opt/news/scripts/renew-cert.sh >> /var/log/news-certbot.log 2>&1
```

---

## Option C — Let's Encrypt with `--webroot` (zero-downtime renewals)

Webroot mode lets certbot write challenge files into a directory that nginx
serves, so nginx never has to stop. The rendered nginx config already includes
a `/.well-known/acme-challenge/` location pointing at `/var/www/certbot`, but
the docker-compose `nginx` service doesn't mount that directory by default —
add it before using this mode.

In `docker-compose.yml`, under the `nginx` service `volumes:`:

```yaml
volumes:
  - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
  - uploads:/var/www/uploads:ro
  - ./nginx/certs:/etc/nginx/certs:ro
  - ./nginx/certbot-webroot:/var/www/certbot:ro # add this
```

Then:

```bash
mkdir -p nginx/certbot-webroot
docker compose up -d nginx   # nginx now serves /var/www/certbot

sudo certbot certonly --webroot \
  -w /opt/news/nginx/certbot-webroot \
  --non-interactive --agree-tos \
  -m you@example.com \
  -d news.example.com

# Copy certs the same way as Option B, flip ENABLE_HTTPS, redeploy.
```

For renewal cron, replace the `docker compose stop nginx ... start nginx`
pattern with a simple `docker compose exec nginx nginx -s reload` after
`certbot renew`.

---

## Troubleshooting

| Symptom                                         | Cause                                       | Fix                                                                                                |
| ----------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Connection refused` on port 80 during issuance | nginx still bound to :80                    | `docker compose stop nginx` first                                                                  |
| Cert issued but browser still shows old cert    | nginx didn't re-read the files              | `docker compose restart nginx`                                                                     |
| nginx exits with `cannot load certificate`      | Files missing or wrong perms                | `ls -l nginx/certs/`; both files must exist + be readable                                          |
| Cert issued for wrong domain                    | `PUBLIC_BASE_URL` ≠ `-d` flag               | They must match; both feed nginx `server_name`                                                     |
| Mixed-content warnings in browser               | `PUBLIC_BASE_URL` still `http://`           | Edit `.env`, re-run deploy (web image rebuild required)                                            |
| `Wrong public IP` from Let's Encrypt            | DNS hasn't propagated                       | `dig +short` should return your IP from a public resolver                                          |
| HSTS sticking after broken cert                 | Browsers honour `Strict-Transport-Security` | Issue a valid cert; HSTS clears on its own once it sees `max-age=0`, or wait out the 1-year header |

## Verifying after the switch

```bash
# 1. Nginx config is valid
docker compose exec nginx nginx -t

# 2. Cert chain matches the served host
curl -vI https://news.example.com 2>&1 | grep -E '^(\*|<)'

# 3. SSL Labs (external)
#    Browse to: https://www.ssllabs.com/ssltest/analyze.html?d=news.example.com
```

## Notes

- The rendered HTTPS config enables HSTS with a 1-year `max-age`. Once a browser
  sees that header, it locks the domain to HTTPS for a year — **do not deploy a
  broken cert** unless you accept the recovery cost (clear HSTS in each user's
  browser by hand).
- The HTTP server block in HTTPS mode keeps `/.well-known/acme-challenge/`
  reachable so webroot renewals don't need a redirect bypass.
- HSTS preload (`includeSubDomains; preload`) is not enabled — add `preload`
  only when you're ready to submit to https://hstspreload.org and never serve
  any subdomain over HTTP again.
