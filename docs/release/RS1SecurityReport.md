# RS1 Security Report

Date: 2026-07-02
Scope: Release security hardening for production readiness

## Summary

| Item | Status | Result |
| --- | --- | --- |
| API rate limiting | PASS | `@nestjs/throttler` is enabled globally with route-specific limits |
| Authentication rate limit | PASS | `POST /v1/auth/login` returns 429 after the configured burst limit |
| Search rate limit | PASS | Search controller has a stricter public traffic limit |
| Public API rate limit | PASS | Developer public API has route-level throttling and existing API key quota checks |
| Admin API rate limit | PASS | Admin APIs are protected by the global throttler limit |
| Health probes | PASS | Health endpoints skip throttling to avoid probe instability |
| Production secret validation | PASS | Required production secrets reject missing, weak, and placeholder values |
| CORS validation | PASS | Production rejects wildcard, boolean-like, invalid, and path-based origins |
| `.env.production.example` | PASS | Updated with secure generation guidance |
| Deployment docs | PASS | Production checklist now includes security gate checks |

## Changes Verified

| Area | Files | Status |
| --- | --- | --- |
| Rate limiting dependency | `apps/api/package.json`, `pnpm-lock.yaml` | PASS |
| Global throttler | `apps/api/src/app.module.ts` | PASS |
| Auth throttling | `apps/api/src/auth/auth.controller.ts` | PASS |
| Search throttling | `apps/api/src/search/search.controller.ts` | PASS |
| Public API throttling | `apps/api/src/public-api/public-api.controller.ts` | PASS |
| Health probe exemption | `apps/api/src/health/health.controller.ts` | PASS |
| Production env validation | `packages/config/src/parse.ts` | PASS |
| Production compose env injection | `docker-compose.prod.yml` | PASS |
| Example env | `.env.production.example` | PASS |
| Deployment checklist | `docs/11-production/DeploymentChecklist.md` | PASS |

## Verification Evidence

| Check | Command or Test | Status | Result |
| --- | --- | --- | --- |
| API typecheck | `pnpm --filter @ai-tool-cms/api typecheck` | PASS | Exit 0 |
| API lint | `pnpm --filter @ai-tool-cms/api lint` | PASS | Exit 0 |
| API build | `pnpm --filter @ai-tool-cms/api build` | PASS | Exit 0 |
| Full typecheck | `pnpm typecheck` | PASS | 66 successful tasks |
| Full lint | `pnpm lint` | PASS | 66 successful tasks on rerun |
| Compose config | `docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet` | PASS | Exit 0 |
| Production rebuild | `docker compose --env-file .env.production -f docker-compose.prod.yml build` | PASS | All production images built |
| Production restart | `docker compose --env-file .env.production -f docker-compose.prod.yml up -d` | PASS | App services healthy |
| Auth throttling | 12 invalid login requests | PASS | Requests 11 and 12 returned 429 |
| CORS allowlist | `Origin: http://localhost` | PASS | `Access-Control-Allow-Origin: http://localhost` |
| CORS rejection | `Origin: http://evil.example` | PASS | No `Access-Control-Allow-Origin` returned |
| JWT auth | Login and `/v1/auth/me` | PASS | Login succeeded; profile returned 200 |
| Secret status | Sanitized `.env.production` scan | PASS | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `STORAGE_SECRET_KEY`, `WEBHOOK_SIGNING_SECRET`, `CORS_ORIGINS` all valid |

## Rate Limits

| Surface | Limit | Status |
| --- | --- | --- |
| Auth login | 10 requests / 60 seconds | PASS |
| Auth refresh | 20 requests / 60 seconds | PASS |
| Public search | 60 requests / 60 seconds | PASS |
| Developer public API | 120 requests / 60 seconds | PASS |
| Admin APIs | 300 requests / 60 seconds | PASS |
| Health probes | Not throttled | PASS |

## WARN

| Item | Detail |
| --- | --- |
| Mailpit orphan | Compose still reports `ai-tool-cms-mailpit` as an orphan container. It is healthy and does not block production readiness. |
| Prisma update notice | Build logs show Prisma 6.19.3 to 7.8.0 update notice. This is not a release blocker. |

## FAIL

| Item | Detail |
| --- | --- |
| None | No RS1 security blocker remains. |
