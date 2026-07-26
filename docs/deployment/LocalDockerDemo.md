# Local Docker Demo

## Purpose

Use the local production Compose file to build app images from the current workspace instead of pulling private GHCR images.

## Required environment

Make sure `.env.production` exists and includes at least:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `REDIS_PASSWORD`
- `MEILI_MASTER_KEY`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

For local demo, the app URLs can stay:

- `APP_URL=http://localhost`
- `ADMIN_URL=http://localhost/admin`
- `API_URL=http://localhost`
- `NEXT_PUBLIC_APP_URL=http://localhost`
- `NEXT_PUBLIC_API_URL=http://localhost`

## Build

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

## Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## Status

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## URLs

- Public: `http://localhost`
- Admin: `http://localhost/admin`
- API health: `http://localhost/api/health`

## Reset local admin password

If login returns `401` for `admin@ai-tool-cms.local / Admin123!`, run the demo-only reset command inside the running `api` container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc "cd /app && ALLOW_DEMO_ADMIN_RESET=true pnpm run demo:reset-admin"
```

Expected account after reset:

- Email: `admin@ai-tool-cms.local`
- Password: `Admin123!`
- Role: `Administrator`

This command only runs when `ALLOW_DEMO_ADMIN_RESET=true` is provided explicitly.

## Notes

- App images are built locally from `.` using:
  - `docker/Dockerfile.node`
  - `docker/Dockerfile.next`
- Infrastructure images still come from public registries:
  - `postgres`
  - `redis`
  - `meilisearch`
  - `minio`
  - `nginx`
- If Docker was freshly reinstalled, the first build/start may take longer because base images and dependencies need to be initialized locally.
