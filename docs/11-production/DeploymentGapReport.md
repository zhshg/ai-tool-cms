# Deployment Gap Report

**Date:** 2026-07-01  
**Branch baseline:** GitHub `main`  
**Status:** P0 deployment assets added; live environment deployment is still pending.

## Executive Summary

The repository now has a concrete production deployment baseline:

- `docker-compose.prod.yml` runs PostgreSQL, Redis, Meilisearch, MinIO, API, Worker, Scheduler, Web, Admin, migration, and nginx.
- `docker/Dockerfile.node` builds Node runtime services: API, Worker, Scheduler, and migration.
- `docker/Dockerfile.next` builds standalone Next.js services: Web and Admin.
- `docker/nginx/conf.d/production.conf` uses container service names instead of `host.docker.internal`.
- `.env.production.example` defines the required production environment surface.
- `.github/workflows/deploy.yml` now builds and pushes per-app images, then calls a deployment webhook and verifies a live healthcheck URL.

The remaining blocker is no longer missing repository deployment assets. The remaining blocker is **environment integration**: a real staging or production host must provide secrets, a deployment webhook, DNS/TLS, persistent volumes, backup policy, and healthcheck endpoints.

## Completed Work

### P0-1: Production compose does not deploy application services

Status: **Closed in repository assets**.

Implemented:

- Added `docker-compose.prod.yml`.
- Added services for `web`, `admin`, `api`, `worker`, `scheduler`, and `migrate`.
- Added app health checks where applicable.
- Added dependency ordering so API starts after infrastructure and migrations.

Remaining external work:

- Provision real host or orchestrator.
- Create `.env.production` with real secrets.
- Decide persistent volume backup location.

### P0-2: `deploy.yml` is not a real deployment pipeline

Status: **Partially closed**.

Implemented:

- Builds image matrix for API, Worker, Scheduler, Web, and Admin.
- Pushes images to GHCR.
- Supports tag and manual workflow image tags.
- Calls `DEPLOY_WEBHOOK_URL`.
- Verifies `DEPLOY_HEALTHCHECK_URL`.

Remaining external work:

- Implement the receiver behind `DEPLOY_WEBHOOK_URL`.
- Configure GitHub environment secrets.
- Define production promotion and rollback behavior in the target platform.

### P0-3: Generic Dockerfile is API-oriented and not suitable for all apps

Status: **Closed in repository assets**.

Implemented:

- Added `docker/Dockerfile.node`.
- Added `docker/Dockerfile.next`.
- Enabled `output: "standalone"` in Web and Admin Next.js configs.

Remaining external work:

- Run image builds in CI or a deployment host and verify runtime behavior with real environment variables.

### P0-4: Deployment documentation and runtime assets disagree

Status: **Mostly closed**.

Implemented:

- Added production compose, production nginx config, production env example, and this report.

Remaining work:

- Rewrite corrupted legacy deployment docs.
- Add provider-specific instructions once the deployment target is final.

## Remaining P1 Work

### P1-1: Production secret validation

Status: **Open**.

Need:

- Fail app startup when production runs with placeholder secrets.
- Validate `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, database, Redis, Meilisearch, storage, and SMTP settings.

Estimated effort: **1-2 days**.

### P1-2: Release rollback

Status: **Open**.

Need:

- Define rollback command for the selected deployment target.
- Preserve previous image tag.
- Document restore behavior when migrations are involved.

Estimated effort: **1-2 days**.

### P1-3: CI security checks are non-blocking

Status: **Open**.

Need:

- Make critical vulnerability checks release-blocking.
- Decide whether high severity blocks production or only opens issues.

Estimated effort: **0.5-1 day**.

### P1-4: Production smoke tests

Status: **Open**.

Need:

- Add smoke tests that run against `DEPLOY_HEALTHCHECK_URL` and core Web/Admin/API endpoints.

Estimated effort: **2-4 days**.

## Remaining P2 Work

### P2-1: Corrupted docs

Status: **Open**.

Several legacy Markdown files contain mojibake. They should be restored or rewritten before operator handoff.

Estimated effort: **1-2 days**.

### P2-2: Local versus production compose naming

Status: **Open**.

The root `docker-compose.yml` is still local-development oriented. This is acceptable now that `docker-compose.prod.yml` exists, but docs should make the split explicit.

Estimated effort: **0.5 day**.

## Verification

Completed locally:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"
docker compose --env-file .env.production.example -f docker-compose.prod.yml config
```

Still required:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --wait
curl -f http://localhost/v1/health/ready
```

## Final Readiness Classification

Repository deployment asset readiness: **Improved, P0 repository gaps closed or partially closed**.

Live production readiness: **Not complete until a real deployment environment is configured and verified**.

Minimum remaining effort before go-live: **5-10 engineering days**, mostly environment integration, secret validation, rollback, smoke tests, and documentation cleanup.
