# RC4 Deployment Report

Date: 2026-07-05
Project: AI Tool CMS
Branch: `feature/product-home`
Scope: Production deployment configuration only

## Summary

This pass fixed the production deployment configuration without touching application business code.

Changed scope:

- `docker-compose.prod.yml`
- `docker/nginx/conf.d/production.conf`
- `.env.production` guidance
- `.env.production.example`

No changes were made to:

- React or NestJS source code
- Prisma schema
- business logic

## Current Findings

Based on the provided server output:

- `web`, `admin`, and `api` containers were running
- `meilisearch` was restarting
- `nginx` service was not running
- the previous production nginx config still routed by path, not by domain
- production env values were still `localhost`-based

This explains the public `502` symptom:

- traffic could not be served correctly because the production nginx service was not up

## Fixes Applied

### Docker Compose

Updated `docker-compose.prod.yml` to ensure:

- nginx maps `80:80`
- nginx maps `443:443`
- nginx mounts production nginx config
- nginx mounts `storage` as read-only
- nginx mounts `/etc/letsencrypt` as read-only so Certbot symlinks under `live/` keep working
- database volumes were left unchanged

### Nginx

Rebuilt `docker/nginx/conf.d/production.conf` into multi-domain production routing:

- `http://*` redirects to `https://$host$request_uri`
- `toolsdar.io` and `www.toolsdar.io` proxy to `web:3000`
- `admins.toolsdar.io` proxies to `admin:3000`
- `api.toolsdar.io` proxies to `api:4000`
- `img.toolsdar.io` serves files directly from `/var/www/storage`

HTTPS settings now use:

- `listen 443 ssl http2;`
- `ssl_certificate /etc/letsencrypt/live/toolsdar.io/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/toolsdar.io/privkey.pem;`

Existing cache behavior for image assets was preserved.

### Healthcheck

Adjusted Meilisearch healthcheck in `docker-compose.prod.yml`:

- use `http://localhost:7700/health`
- increase retries
- add `start_period`

Added nginx healthcheck so `docker compose ps` can report nginx health after startup.

### Environment

The local `.env.production` was updated for deployment use with these values:

- `APP_URL=https://toolsdar.io`
- `ADMIN_URL=https://admins.toolsdar.io`
- `API_URL=https://api.toolsdar.io`
- `NEXT_PUBLIC_APP_URL=https://toolsdar.io`
- `NEXT_PUBLIC_API_URL=https://api.toolsdar.io`
- `PUBLIC_URL=https://toolsdar.io`
- `IMAGE_URL=https://img.toolsdar.io`
- `HTTPS_PORT=443`
- `CORS_ORIGINS=https://toolsdar.io,https://www.toolsdar.io,https://admins.toolsdar.io,https://api.toolsdar.io,https://img.toolsdar.io`

Important:

- `.env.production` is gitignored in this repository
- the same values must be applied manually on the production server

Also updated `.env.production.example` to reflect the same deployment topology.

## Validation Status

### Local Repository Validation

Completed:

- production Compose file inspection
- nginx production config inspection
- env topology alignment
- deployment report generation

Not completed from this environment:

- direct remote `docker compose up -d`
- remote `docker compose ps`
- remote container log inspection after applying the new files
- runtime HTTP verification against the live server

Reason:

- SSH execution from this Codex environment was blocked by remote authentication failure
- returned error: `Permission denied (publickey,password)`

## Required Server-Side Verification

After syncing these config changes to `/opt/ai-tool-cms`, run:

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 nginx meilisearch web admin api
```

Then verify:

```bash
curl -I http://toolsdar.io
curl -I https://toolsdar.io
curl -I https://www.toolsdar.io
curl -I https://admins.toolsdar.io
curl -I https://api.toolsdar.io/v1/health
curl "https://api.toolsdar.io/v1/search?keyword=ai&page=1&pageSize=3"
```

Database verification:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as tool_count from tools where deleted_at is null;"
```

Expected:

- `Tools >= 50`
- nginx `healthy`
- meilisearch `healthy`
- `web`, `admin`, `api` reachable through their target domains

## Final Access Addresses

- Web: [https://toolsdar.io](https://toolsdar.io)
- Web alias: [https://www.toolsdar.io](https://www.toolsdar.io)
- Admin: [https://admins.toolsdar.io](https://admins.toolsdar.io)
- API: [https://api.toolsdar.io/v1/health](https://api.toolsdar.io/v1/health)
- Image host: [https://img.toolsdar.io](https://img.toolsdar.io)

## Remaining Risks

1. The production server still needs the updated tracked files synced from this branch.
2. `.env.production` is not tracked by Git, so domain and CORS changes must be applied manually on the server.
3. Meilisearch restart root cause still requires live server log confirmation after restart with the updated Compose file.
4. Final healthy-state proof could not be captured from this environment because remote SSH execution was not authorized.
