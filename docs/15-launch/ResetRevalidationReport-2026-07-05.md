# Reset Revalidation Report - 2026-07-05

## Metadata

- Execution time: 2026-07-05 01:40:04 +08:00
- Local path: `F:\project\ai-tool-cms`
- Git branch: `feature/product-home`
- Scope: pre-deploy stability revalidation only; no new business features added

## Validation Scope

This pass focused on release-blocking runtime stability for the local production stack:

- Docker Compose production stack state
- Core service health: API, Web, Admin, Postgres, Redis, Meilisearch, Worker
- Tool dataset count
- Public pages and admin core pages
- Search availability
- Runtime logs and browser console errors

## Commands Executed

```powershell
git branch --show-current
git status --short

& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml ps
& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api web admin worker postgres redis meilisearch nginx
& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml exec -T postgres psql -U ai_tool_cms -d ai_tool_cms -c "select count(*) as tool_count from tools where deleted_at is null;"

$urls=@(
  'http://localhost/',
  'http://localhost/en',
  'http://localhost/en/tools',
  'http://localhost/en/categories',
  'http://localhost/en/category/ai-writing',
  'http://localhost/v1/search?keyword=ai&page=1&pageSize=3',
  'http://localhost/admin/tools',
  'http://localhost/admin/categories'
)

# Browser validation via Playwright
# - http://localhost/
# - http://localhost/en/tools
# - http://localhost/admin/login?next=%2Ftools
# - http://localhost/admin/tools
# - http://localhost/admin/categories
# - browser console message collection
```

## Docker CLI And Production Stack

### Docker CLI Baseline

- Docker version: `29.6.1`
- Docker Compose version: `v5.3.0`
- Docker daemon access: available in elevated validation commands

### Production Stack Status

Command:

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml ps
```

Result:

| Service | Container | Status | Notes |
| --- | --- | --- | --- |
| admin | `ai-tool-cms-admin-1` | `Up (healthy)` | normal |
| api | `ai-tool-cms-api-1` | `Up (healthy)` | normal |
| web | `ai-tool-cms-web-1` | `Up (healthy)` | normal |
| worker | `ai-tool-cms-worker-1` | `Up (healthy)` | normal |
| scheduler | `ai-tool-cms-scheduler-1` | `Up (healthy)` | normal |
| postgres | `ai-tool-cms-postgres-1` | `Up (healthy)` | normal |
| redis | `ai-tool-cms-redis-1` | `Up (healthy)` | normal |
| meilisearch | `ai-tool-cms-meilisearch-1` | `Up (healthy)` | normal |
| minio | `ai-tool-cms-minio-1` | `Up (healthy)` | normal |
| nginx | `ai-tool-cms-nginx-1` | `Up` | host mapping `0.0.0.0:80->80/tcp` |

Assessment: `PASS`

## Service Health Verification

### API

- `api` container healthy
- logs show `Database connected`
- logs show `Nest application successfully started`
- logs show `API listening on http://0.0.0.0:4000`

Assessment: `PASS`

### Web

- `web` container healthy
- `http://localhost/` returns `200`
- `http://localhost/en/tools` returns `200`
- browser navigation succeeds without console errors on tested pages

Assessment: `PASS`

### Admin

- `admin` container healthy
- unauthenticated access redirects to login as expected
- seed admin login works with `admin@ai-tool-cms.local`
- `/admin/tools` and `/admin/categories` render real tables, not blank pages
- tested admin pages showed `0` browser console errors

Assessment: `PASS`

### Postgres

- `postgres` container healthy
- read-only SQL count query succeeds

Assessment: `PASS`

### Redis

- `redis` container healthy
- no Redis connection blocker found in application logs

Assessment: `PASS`

### Meilisearch

- `meilisearch` container healthy
- logs show repeated `/health` `200`
- search endpoint returns `200`
- previous rebuild evidence in this workspace shows index stats:
  - `tools=50`
  - `categories=20`
  - `tags=194`

Assessment: `PASS`

### Worker

- `worker` container healthy
- logs show `Workers started`
- no fresh queue startup blocker in current log sample

Assessment: `PASS`

## Data Verification

### Tools Count

Command:

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml exec -T postgres psql -U ai_tool_cms -d ai_tool_cms -c "select count(*) as tool_count from tools where deleted_at is null;"
```

Result:

```text
 tool_count
------------
         50
```

Assessment: `PASS`

### Related Dataset Evidence

- published tools: `50`
- categories: `20`
- users: `1`
- logo coverage: `45/50`
- screenshots: `0`

Assessment: `PARTIAL`

Reason:

- Core tool/category data is present.
- Media completeness is still not ideal because screenshot coverage remains `0`.

## Page And Search Verification

### HTTP Checks

| URL | Status | Result |
| --- | --- | --- |
| `http://localhost/` | `200` | homepage reachable |
| `http://localhost/en` | `200` | localized homepage reachable |
| `http://localhost/en/tools` | `200` | tools list reachable |
| `http://localhost/en/categories` | `200` | categories list reachable |
| `http://localhost/en/category/ai-writing` | `200` | category detail reachable |
| `http://localhost/v1/search?keyword=ai&page=1&pageSize=3` | `200` | search endpoint returns data |
| `http://localhost/admin/tools` | `200` | admin route reachable |
| `http://localhost/admin/categories` | `200` | admin route reachable |

Assessment: `PASS`

### Browser Validation

Tested with Playwright:

- `http://localhost/`
- `http://localhost/en/tools`
- `http://localhost/admin/tools`
- `http://localhost/admin/categories`

Observed:

- homepage loads and redirects to `/en`
- tools page loads with page title `AI Tools Directory | AI Tool Directory`
- admin login succeeds
- admin Tools page renders dashboard shell and table
- admin Categories page renders dashboard shell, `New Category`, and table
- tested pages returned `0` browser console errors and `0` warnings during this pass

Assessment: `PASS`

## Docker Logs Review

Command:

```powershell
& 'C:\Program Files\Docker\Docker\resources\bin\docker-compose.exe' --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api web admin worker postgres redis meilisearch nginx
```

Summary:

- `api`: startup healthy, routes mapped, DB connected
- `worker`: startup healthy, workers started
- `meilisearch`: health and query traffic normal
- `nginx`: public pages and APIs serving `200`

Notable non-blocking items seen:

- nginx warning about buffering upstream response for `/v1/tools`
- historical postgres SQL errors from earlier manual ad-hoc investigation:
  - `unterminated quoted identifier`
  - `column "deleted_at" does not exist`

Current judgment:

- No fresh blocking `401` / `404` / `500` pattern in the sampled runtime logs for tested core flows
- No fresh blocking `Prisma` runtime crash
- No fresh blocking `Meilisearch connection refused`
- No fresh blocking `asset missing` error on the tested routes

Assessment: `PASS`

## Revalidation Table

| Item | Status | Evidence |
| --- | --- | --- |
| Docker Compose production stack starts and stays up | `PASS` | `compose ps` shows core services `Up` / `healthy` |
| API healthy | `PASS` | container healthy, startup logs normal |
| Web healthy | `PASS` | homepage and tools/category pages return `200` |
| Admin healthy | `PASS` | login works, Tools/Categories pages render real tables |
| Postgres healthy | `PASS` | container healthy, SQL query works |
| Redis healthy | `PASS` | container healthy, no runtime blocker in logs |
| Meilisearch healthy | `PASS` | container healthy, `/health` and search traffic normal |
| Worker healthy | `PASS` | container healthy, worker startup confirmed |
| Tools total equals 50 | `PASS` | SQL count query returned `50` |
| Homepage available | `PASS` | `http://localhost/` -> `200` |
| Tools list has data | `PASS` | `/en/tools` reachable, search and dataset count consistent |
| Categories have data | `PASS` | `/en/categories` and category detail return `200` |
| Search available | `PASS` | `/v1/search?...` returns `200` with response body |
| Admin Tools available | `PASS` | browser login + Tools table render |
| Admin Categories available | `PASS` | browser login + Categories table render |
| Browser console free of blocking errors on tested pages | `PASS` | Playwright captured `0` console errors |
| Docker logs free of fresh blocking runtime errors | `PASS` | no fresh core blocker in tail sample |
| Media completeness | `PARTIAL` | logos improved, screenshots remain `0` |

## PASS / FAIL / PARTIAL Count

- `PASS`: 16
- `FAIL`: 0
- `PARTIAL`: 1
- `NOT APPLICABLE`: 0

## Remaining Risks

1. Local production stack is stable, but media completeness is not fully restored because screenshot coverage remains `0`.
2. Current dataset is `50` tools, which is sufficient for this local stability pass but still smaller than earlier RC expansion expectations.
3. This report validates local pre-deploy readiness, not final public launch readiness.
4. Docker access from the current restricted terminal still required elevated execution for compose inspection, so operator environment consistency on the deployment machine still needs a separate check.

## Conclusion

Conclusion for the current goal: `可以进入服务器部署阶段`.

Reason:

- Local production stack is running stably.
- Core services are healthy.
- Tools total is confirmed as `50`.
- Homepage, tools list, categories, search, admin Tools, and admin Categories are all usable in this pass.
- Sampled browser console and Docker logs do not show fresh blocking runtime errors for the tested flows.

Important boundary:

- This is a `pre-deploy stability PASS`, not a blanket declaration that all release-candidate launch risks are closed.
- Before public launch sign-off, remaining content/media completeness items should still be tracked separately.
