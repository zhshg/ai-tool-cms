# Production Functional Verification Report

Date: 2026-07-01
Environment: local production Docker Compose (`docker-compose.prod.yml`)
Base URL: `http://localhost`

## Summary

| Area | Result | Notes |
|---|---|---|
| Web | WARN | Core pages work. Dedicated tool list and search pages are not implemented as routes. |
| Admin | PASS | Admin UI routes under `/admin` load successfully and Recovery Sprint A/C pages now use real API data. |
| API | FAIL | Health/docs/auth/admin APIs mostly work, but `/api/health` is not routed and `/v1/search` returns 500 because Meilisearch index `tools` is missing. Recovery Sprint A/C admin APIs pass. |
| Database | WARN | Migrations and seed data exist. `settings` table is empty. |
| Worker / Scheduler | PASS | Containers healthy and logs show workers/scheduler started. |
| External services | WARN | PostgreSQL, Redis, Meilisearch, MinIO, Mailpit are reachable/healthy. Meilisearch has no indexes; MinIO Console is not exposed by production compose. |

## 1. Web

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| Homepage | PASS | `curl -I http://localhost/` | `307` to `/en`; `/en` returns `200` | Root locale redirect works. |
| Tool list | FAIL | `curl http://localhost/en/tools` | `404` | No route exists at `apps/web/src/app/[locale]/tools/page.tsx`. |
| Tool detail | PASS | `curl http://localhost/en/tools/elevenlabs` | `200` | Detail page loads. |
| Category page | PASS | `curl http://localhost/en/category/ai-writing` | `200` | Category page loads. |
| Search | FAIL | `curl http://localhost/en/search?q=ai` | `404` | No route exists at `apps/web/src/app/[locale]/search/page.tsx`. |
| Blog | PASS | `curl http://localhost/en/blog` | `200` | Blog page loads. |
| Sitemap | PASS | `curl http://localhost/sitemap.xml` | `200`, `application/xml` | Sitemap route works. |
| Robots | PASS | `curl http://localhost/robots.txt` | `200`, `text/plain` | Robots route works. |

### Web FAIL Details

| Failure | URL or Command | Error | Affected File | Recommended Fix |
|---|---|---|---|---|
| Tool list route missing | `curl http://localhost/en/tools` | `404 Not Found` | `apps/web/src/app/[locale]/tools/page.tsx` | Add a production route for tool listing or update navigation/docs to use the homepage/category listing if intentional. |
| Search route missing | `curl http://localhost/en/search?q=ai` | `404 Not Found` | `apps/web/src/app/[locale]/search/page.tsx` | Add a search page route or redirect search UI to an implemented route. |

## 2. Admin

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| Login | PASS | `curl http://localhost/admin` | `200` | Admin shell loads. Auth API login also passed. |
| Dashboard | PASS | `curl http://localhost/admin` | `200` | Dashboard route loads. |
| Tools | PASS | `curl http://localhost/admin/tools` | `200`; no `coming soon` content | Page route loads and reads `/v1/tools`. |
| Categories | PASS | `curl http://localhost/admin/categories` | `200`; no `coming soon` content | Page route loads and reads `/v1/categories`. |
| Users | PASS | `curl http://localhost/admin/users` | `200`; no `coming soon` content | Page route loads and reads `/v1/users` plus `/v1/users/summary`. |
| Settings | PASS | `curl http://localhost/admin/settings` | `200`; no `coming soon` content | Page route loads and reads `/v1/settings` plus `/v1/settings/summary`. |
| AI Review | PASS | `curl http://localhost/admin/ai-review` | `200`; no mojibake content | Page route loads and reads `/v1/ai/revisions`. |
| Crawler | PASS | `curl http://localhost/admin/crawler` | `200`; no mojibake content | Page route loads and reads `/v1/crawler/dashboard` plus `/v1/crawler/sources`. |
| SEO Dashboard | PASS | `curl http://localhost/admin/seo` | `200` | Page route loads. |

## 3. API

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| `/api/health` | FAIL | `curl http://localhost/api/health` | `404`, `Cannot GET /api/health` | Actual ready endpoint is `/v1/health/ready`. |
| `/api/docs` | PASS | `curl http://localhost/api/docs` | `200` | Swagger UI loads. |
| `/v1/tools` | WARN | unauthenticated `curl http://localhost/v1/tools` | `401` | This is an authenticated admin API; with admin token it returns `200`. |
| `/v1/categories` | WARN | unauthenticated `curl http://localhost/v1/categories` | `401` | This is an authenticated admin API; with admin token it returns `200`. |
| `/v1/search` | FAIL | `curl http://localhost/v1/search?q=ai` | `500` | API log: Meilisearch index `tools` not found. |
| Auth login | PASS | `POST /v1/auth/login` with seed admin credentials | `200`, token issued | Seed admin account works. |
| Auth profile | PASS | `GET /v1/auth/me` with token | `200` | Token accepted. |
| Admin tools API | PASS | `GET /v1/tools` with token | `200` | Admin API works. |
| Admin categories API | PASS | `GET /v1/categories` with token | `200` | Admin API works. |
| Admin AI review API | PASS | `GET /v1/ai/revisions` with token | `200` | Admin API works. |
| Admin crawler API | PASS | `GET /v1/crawler/dashboard` with token | `200` | Admin API works. |
| Admin SEO API | PASS | `GET /v1/seo/dashboard` with token | `200` | Admin API works. |
| Admin users API | PASS | `GET /v1/users` and `GET /v1/users/summary` with token | `200` | Recovery Sprint A/C read endpoints work. |
| Admin settings API | PASS | `GET /v1/settings` and `GET /v1/settings/summary` with token | `200` | Recovery Sprint A/C read endpoints work. |
| Public API `/v1/api/v1/tools` | WARN | unauthenticated request | `401` | Requires `X-Api-Key` or Bearer `atcms_...`; no seeded API key found during black-box test. |

### API FAIL Details

| Failure | URL or Command | Error | Affected File | Recommended Fix |
|---|---|---|---|---|
| Health alias missing | `curl http://localhost/api/health` | `404 Cannot GET /api/health` | `docker/nginx/conf.d/production.conf`, `apps/api/src/health/health.controller.ts` | Either document `/v1/health/ready` as the production health URL or add an nginx/API alias for `/api/health`. |
| Search endpoint fails | `curl http://localhost/v1/search?q=ai` | `500 Internal server error`; API log shows `MeiliSearchApiError: Index tools not found` | `apps/api/src/search/search.service.ts`, search indexing/seed workflow, Meilisearch bootstrap | Create the `tools` index during deployment/seed or make search gracefully fallback when the index is missing. |

## 4. Database

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| Migrations | PASS | `migrate` container logs / DB count | `9` migrations; `migrate` exited `0` | Prisma migration path works. |
| Seed data | PASS | DB counts | `users=1`, `tools=10`, `categories=5`, `roles=3`, `permissions=37`, `crawl_sources=1` | Demo seed data is present. |
| Users | PASS | DB count / auth login | `1` active user; login works | Seed admin exists. |
| Tools | PASS | DB count / web detail | `10` active tools; detail page works | Demo tools exist. |
| Categories | PASS | DB count / category page | `5` active categories; category page works | Demo categories exist. |
| Settings | WARN | DB count | `0` active settings | Settings page is static/available, but no settings seed/API data was found. |

## 5. Worker / Scheduler

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| Queue connection | PASS | worker logs | `Workers started`, queues registered | Worker started with crawl, AI, growth, search, platform, i18n, automation queues. |
| Worker logs | PASS | `docker compose logs worker` | No startup errors in latest logs | Observability noop mode is expected for local env. |
| Scheduler logs | PASS | `docker compose logs scheduler` | `Crawler scheduler started`, daily automation poll completed | Scheduler running. |
| Redis queue keys | WARN | `redis-cli keys '*'` | empty key list | No pending jobs at verification time; not a failure. |

## 6. External Services

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| Redis | PASS | `redis-cli -a <redacted> ping` | `PONG` | Authenticated ping works. |
| PostgreSQL | PASS | `pg_isready -U ai_tool_cms -d ai_tool_cms` | accepting connections | Database healthy. |
| Meilisearch health | PASS | container-local `GET /health` | `{"status":"available"}` | Service healthy. |
| Meilisearch indexes | FAIL | container-local `GET /indexes` | `results=[]` | `tools` index missing; causes `/v1/search` failure. |
| MinIO API health | PASS | container-local `GET /minio/health/live` | `200 OK` | MinIO API healthy. |
| MinIO Console | WARN | `curl http://localhost:9001` | no host response | Production compose does not publish port `9001`; console is internal only. |
| Mailpit | PASS | `curl http://localhost:8025` | `200 OK` | Mailpit is running as an orphan/dev service, not part of production compose. |

### External Service FAIL Details

| Failure | URL or Command | Error | Affected File | Recommended Fix |
|---|---|---|---|---|
| Meilisearch tools index missing | `GET /indexes` inside `meilisearch` container; `curl http://localhost/v1/search?q=ai` | No indexes exist; API search returns `500` with `Index tools not found` | `packages/search`, `apps/api/src/search/search.service.ts`, deployment seed/index bootstrap scripts | Add an idempotent Meilisearch index bootstrap and seed/index job before enabling production search endpoints. |

## Final Status

| Category | Status |
|---|---|
| Production containers | PASS |
| Web public browsing | WARN |
| Admin UI | PASS |
| Authenticated admin APIs | PASS |
| Public API contract | WARN |
| Search | FAIL |
| Database | WARN |
| Worker / Scheduler | PASS |
| External services | WARN |

## Recovery Sprint A/C Verification

| Item | Status | URL / Command | Result | Notes |
|---|---|---|---|---|
| API typecheck | PASS | `./apps/api/node_modules/.bin/tsc.cmd --noEmit -p apps/api/tsconfig.json` | exit `0` | New `users/settings` modules typecheck. |
| Admin typecheck | PASS | `./apps/admin/node_modules/.bin/tsc.cmd --noEmit -p apps/admin/tsconfig.json` | exit `0` | Updated pages typecheck. |
| API lint | PASS | `./node_modules/.bin/eslint.cmd "apps/api/src/**/*.ts" --config eslint.config.mjs` | exit `0` | No lint errors. |
| Admin lint | PASS | `./apps/admin/node_modules/.bin/eslint.cmd "apps/admin/src/**/*.{ts,tsx}" --config apps/admin/eslint.config.mjs` | exit `0` | No lint errors; Next emitted monorepo pages-directory warning only. |
| API local build | PASS | `.\\node_modules\\.bin\\nest.cmd build` in `apps/api` | exit `0` | Nest build passes. |
| Production Docker build | PASS | `docker compose --env-file .env.production -f docker-compose.prod.yml build api admin` | images built | API and Admin production images build successfully. |
| Production startup | PASS | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` | API/Admin healthy | Stack restarted successfully. |
| Recovery Admin pages | PASS | `/admin/tools`, `/admin/categories`, `/admin/users`, `/admin/settings`, `/admin/ai-review`, `/admin/crawler` | all `200` | No `coming soon` or mojibake content detected. |
| Recovery Admin APIs | PASS | `/v1/tools`, `/v1/categories`, `/v1/users`, `/v1/users/summary`, `/v1/settings`, `/v1/settings/summary`, `/v1/ai/revisions?status=PENDING`, `/v1/crawler/dashboard`, `/v1/crawler/sources` | all `200` with admin token | All target pages have live backend data sources. |
