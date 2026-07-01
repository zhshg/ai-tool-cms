# Deployment Checklist

**Sprint 11 — Commit 109**

## Pre-deploy

- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm test` — passed
- [ ] `pnpm build` — passed
- [ ] `pnpm audit` — no critical/high
- [ ] DB migration reviewed
- [ ] Backup taken (`scripts/backup/backup-postgres.sh`)

## Infrastructure

- [ ] Postgres reachable
- [ ] Redis reachable
- [ ] Meilisearch reachable
- [ ] SMTP / Mail configured
- [ ] `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` set
- [ ] `CORS_ORIGINS` set for production
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` / `SENTRY_DSN` configured

## Security Gate

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are unique production secrets with at least 32 characters.
- [ ] `STORAGE_SECRET_KEY` is a real MinIO/S3 secret, not an example or generated placeholder.
- [ ] `WEBHOOK_SIGNING_SECRET` is a unique production secret with at least 32 characters.
- [ ] `CORS_ORIGINS` is explicitly configured with trusted origins only.
- [ ] `CORS_ORIGINS` does not contain `*`, wildcard subdomains, `true`, or `false`.
- [ ] API rate limiting is enabled for authentication, search, public API, and admin API traffic.

## Deploy

- [ ] Docker image built (`docker build --build-arg APP_NAME=api`)
- [ ] Worker + scheduler deployed
- [ ] `pnpm db:migrate:deploy`
- [ ] Health check: `curl -f $API_URL/v1/health/ready`

## Post-deploy

- [ ] Smoke E2E: `pnpm test:e2e`
- [ ] Metrics: `curl $API_URL/v1/health/metrics`
- [ ] Monitor error rate 15 min
