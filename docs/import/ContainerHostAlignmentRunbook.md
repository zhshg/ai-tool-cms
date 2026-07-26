# Container Host Alignment Runbook

## Why This Matters

In production, the `api`, `worker`, `scheduler`, `web`, and `admin` services are image-based services.

They are built from the host repository, but the running containers do **not** live-read most source files from `/opt/ai-tool-cms`.

For example:

- `api` mounts `./storage:/app/storage`
- `web` mounts `./storage:/app/storage`
- `worker` mounts `./storage:/app/storage`
- `scheduler` has no source-code bind mount
- `admin` has no source-code bind mount

That means:

1. updating files on the host does **not** automatically update the running container code
2. a container rebuild or recreate is required for code changes to become durable runtime state
3. copying files directly into a running container is acceptable for emergency repair, but it should be followed by a normal rebuild path later

## What Happened In This Import

The reviewed `82` auto-discovered tools were successfully imported into production.

However, the final successful import path required:

1. syncing updated seed files to the host repository
2. copying the same files into the running `api` container
3. re-running `pnpm db:seed` inside the running container

This was valid for a fast production fix, but it is not the preferred long-term steady-state workflow.

## Durable Alignment Goal

After any production code-sync that affects runtime behavior, the goal is:

- host repository is updated
- rebuilt container image contains the same code
- running service is recreated from that image
- runtime behavior matches the host repository without manual `docker cp`

## Recommended Standard Procedure

Run from:

```bash
cd /opt/ai-tool-cms
```

### 1. Verify host code is correct

Check the critical files you changed:

```bash
git status --short
head -n 40 prisma/seed.ts
head -n 20 prisma/seeds/auto-discovered-tools.ts
python3 - <<'PY'
import json
obj=json.load(open('package.json','r',encoding='utf-8'))
for k,v in obj.get('scripts',{}).items():
    if 'tools:auto-update' in k or k == 'db:seed':
        print(f'{k}={v}')
PY
```

### 2. Rebuild the affected image only

For seed, API logic, or Prisma runtime changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build api
```

If the same code is used by dependent runtime services, also rebuild:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build worker scheduler
```

### 3. Recreate the affected containers

For API-only runtime changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api
```

For shared backend package changes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api worker scheduler
```

### 4. Re-run seed only after the rebuilt API is healthy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
```

### 5. Verify the running container now matches the host flow

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'head -n 20 /app/prisma/seed.ts'
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'node scripts/ops/query-tool-stats.mjs'
```

## Emergency Procedure

Use this only when:

- production data must be fixed immediately
- rebuild is blocked or too slow
- the change scope is small and well understood

Emergency path:

1. sync corrected files to the host repository
2. `docker cp` corrected files into the running container
3. execute the minimal corrective command inside the running container
4. record exactly what was copied
5. later rebuild the image normally

This is what was used for the `82`-tool import.

## When Rebuild Is Required

Rebuild is required if you changed any of these:

- `apps/api/**`
- `apps/worker/**`
- `apps/scheduler/**`
- `packages/**`
- `prisma/**`
- `scripts/**` used inside container runtime
- `package.json`
- lockfile or workspace dependency graph
- Dockerfile behavior

Rebuild is usually **not** required for:

- `storage/**` content only
- nginx-only config changes when only `nginx` uses them
- Let’s Encrypt certificates on the host

## Minimal Post-Rebuild Acceptance

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=50 api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:generate
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'node scripts/ops/query-tool-stats.mjs'
```

Expected for the current import state:

- total tools: `125`
- published tools: `125`

## Current Practical Recommendation

For the current production environment, the next clean-up step should be:

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'node scripts/ops/query-tool-stats.mjs'
```

If shared backend packages were changed and you want full alignment:

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build api worker scheduler
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api worker scheduler
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
docker compose --env-file .env.production -f docker-compose.prod.yml exec api sh -lc 'node scripts/ops/query-tool-stats.mjs'
```
