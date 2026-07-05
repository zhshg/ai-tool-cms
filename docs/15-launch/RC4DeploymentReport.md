# RC4 Deployment Report

Date: 2026-07-05
Project: AI Tool CMS
Branch: `feature/product-home`
Scope: Production deployment configuration only

## Summary

This pass fixed the production deployment configuration on the real server without touching application business code.

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

Initial production findings on `154.48.226.152`:

- `web`, `admin`, and `api` containers were running
- `meilisearch` was restarting because the running container had no `MEILI_MASTER_KEY`
- `nginx` container existed in `Created` state and was not serving traffic
- the production env file still had incomplete public deployment values
- `admins.toolsdar.io` needed root-to-`/admin` handling because the admin image still served from `/admin`

This explained the public `502` symptom:

- the reverse proxy chain was incomplete because nginx was not actually running

## Fixes Applied

### Docker Compose

Updated `docker-compose.prod.yml` to ensure:

- nginx maps `80:80`
- nginx maps `443:443`
- nginx mounts production nginx config
- nginx mounts `storage` as read-only
- nginx mounts `/etc/letsencrypt` as read-only so Certbot symlinks under `live/` keep working
- database volumes were left unchanged
- meilisearch healthcheck uses `127.0.0.1` instead of `localhost` so IPv6 loopback does not break health status
- nginx healthcheck validates config + process without failing on HTTPS certificate self-check behavior

### Nginx

Rebuilt `docker/nginx/conf.d/production.conf` into multi-domain production routing:

- `http://*` redirects to `https://$host$request_uri`
- `www.toolsdar.io` redirects to `toolsdar.io`
- `toolsdar.io` proxies to `web:3000`
- `admins.toolsdar.io` redirects `/` to `/admin`, proxies `/admin/*` to `admin:3000`, and preserves `/v1` + `/api` proxying
- `api.toolsdar.io` proxies to `api:4000`
- `img.toolsdar.io` serves files directly from `/var/www/storage`

HTTPS settings now use:

- `listen 443 ssl http2;`
- `ssl_certificate /etc/letsencrypt/live/toolsdar.io/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/toolsdar.io/privkey.pem;`

Existing cache behavior for image assets was preserved.

### Healthcheck

Adjusted Meilisearch healthcheck in `docker-compose.prod.yml`:

- use `http://127.0.0.1:7700/health`
- keep retries high enough for cold startup
- add `start_period`

Adjusted nginx healthcheck so it no longer fails by following the HTTP redirect into local TLS verification.

### Environment

The production `.env.production` on the server was updated in place with these values:

- `APP_URL=https://toolsdar.io`
- `ADMIN_URL=https://admins.toolsdar.io`
- `API_URL=https://api.toolsdar.io`
- `NEXT_PUBLIC_APP_URL=https://toolsdar.io`
- `NEXT_PUBLIC_API_URL=https://api.toolsdar.io`
- `PUBLIC_URL=https://toolsdar.io`
- `IMAGE_URL=https://img.toolsdar.io`
- `HTTPS_PORT=443`
- `CORS_ORIGINS=https://toolsdar.io,https://www.toolsdar.io,https://admins.toolsdar.io,https://api.toolsdar.io,https://img.toolsdar.io`

Also updated `.env.production.example` to reflect the same deployment topology.

## Validation Status

### Production Server Validation

Completed:

- connected to `root@154.48.226.152`
- synced updated `docker-compose.prod.yml`
- synced updated `docker/nginx/conf.d/production.conf`
- repaired `.env.production` formatting and deployment values
- recreated `meilisearch`, `api`, `web`, and `nginx`
- verified database tool count
- verified live API health
- verified live search responses
- verified live web and admin domain responses

## Final Access Addresses

- Web: [https://toolsdar.io](https://toolsdar.io)
- Web alias: [https://www.toolsdar.io](https://www.toolsdar.io)
- Admin: [https://admins.toolsdar.io/admin](https://admins.toolsdar.io/admin)
- API: [https://api.toolsdar.io/v1/health](https://api.toolsdar.io/v1/health)
- Image host: [https://img.toolsdar.io](https://img.toolsdar.io)

## Remaining Risks

1. `img.toolsdar.io` is serving the mounted storage root, but the current server only has `storage/public/` and no top-level `storage/logos/` directory yet, so specific logo URLs depend on actual stored media paths.
2. The admin image currently still serves from `/admin`, so `admins.toolsdar.io/` redirects to `/admin` by nginx design.
3. `.env.production` is gitignored, so server-side env changes remain an operational state and are not preserved by Git alone.

## Validation Evidence

Docker:

- `postgres`, `redis`, `minio`, `meilisearch`, `api`, `web`, `admin`, `worker`, `scheduler` were all running
- `meilisearch` became `healthy` after the healthcheck fix
- `nginx` was running with `80` and `443` host bindings after recreate

HTTPS:

- `https://toolsdar.io` returned `307` to `/en`
- `https://www.toolsdar.io` resolved successfully
- `https://admins.toolsdar.io` returned `302` to `/admin`
- `https://admins.toolsdar.io/admin` returned `200`
- `https://api.toolsdar.io/v1/health` returned `200`

Database:

- `select count(*) as tool_count from tools where deleted_at is null;` returned `50`

Search:

- `https://api.toolsdar.io/v1/search?keyword=ai&page=1&pageSize=3` returned normal JSON results

Meilisearch:

- root cause was missing runtime master key on the existing container
- after recreate with corrected compose/env, Meilisearch reported `A master key has been set`
- health endpoint returned `{"status":"available"}`
