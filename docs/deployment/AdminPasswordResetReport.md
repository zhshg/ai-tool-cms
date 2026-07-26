# Admin Password Reset Report

## Goal

Provide a safe manual reset path for the local Docker demo when the seeded admin account is missing or the password no longer matches `Admin123!`.

## Changes

- Added `scripts/database/reset-local-admin.ts`
- Added root command: `pnpm demo:reset-admin`
- Updated `docs/deployment/LocalDockerDemo.md` with the Docker exec command

## Implementation

The reset script:

- requires explicit `ALLOW_DEMO_ADMIN_RESET=true`
- reuses existing `seedRolesAndPermissions()` from `prisma/seeds/rbac.ts`
- reuses existing Prisma client from `prisma/seeds/context.ts`
- reuses the existing password hashing path already used by the seed pipeline
- upserts `admin@ai-tool-cms.local`
- resets the password to `Admin123!`
- ensures the user is active
- ensures the `Administrator` role assignment exists

## Manual demo command

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc "ALLOW_DEMO_ADMIN_RESET=true pnpm demo:reset-admin"
```

## Verification status

- Script implementation: PASS
- Documentation added: PASS
- Docker runtime execution: PASS
- Browser/API login verification: PASS
- `/admin/tools` route reachability: PASS
- Authenticated `/v1/tools?page=1&pageSize=50` verification: PASS

## Notes

This script is intentionally manual and opt-in. It does not change application auth behavior and does not weaken production security defaults.

## Verified commands

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc "cd /app && ALLOW_DEMO_ADMIN_RESET=true pnpm --dir /app run demo:reset-admin"
```

## Verified results

- Reset script output confirmed `admin@ai-tool-cms.local` with role code `admin`
- `POST http://localhost/v1/auth/login` returned `200` with access and refresh tokens
- `GET http://localhost/v1/auth/me` returned the seeded admin profile
- `GET http://localhost/v1/tools?page=1&pageSize=50` returned `200`
- `GET http://localhost/admin/tools` returned `200`

The current local demo database returned `0` tools, so the admin tools page is authenticated and reachable but currently empty rather than failing.
