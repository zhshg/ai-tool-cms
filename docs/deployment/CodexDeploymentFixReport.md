# Codex Deployment Fix Report

Date: 2026-07-01
Branch: main
Scope: P0 deployment blockers only

## Source Report

Requested source: `docs/deployment/CodexDeploymentGapReport.md`

Current repository status: that file does not exist in the local checkout. The closest existing deployment gap report is `docs/11-production/DeploymentGapReport.md`, and the P0 categories requested in the task were used as the implementation scope.

## P0 Fix Summary

### Missing environment variables

Status: fixed for deploy templates and runtime validation.

- Added `.env.production.example` with required production variables for API, web, admin, worker, scheduler, PostgreSQL, Redis, Meilisearch, MinIO, SMTP, JWT, and public URLs.
- Added crawler runtime variables to config parsing:
  - `CRAWLER_CONCURRENCY`
  - `CRAWLER_TIMEOUT_MS`
- Added production environment fail-fast validation in `packages/config/src/parse.ts` for required secrets, URLs, storage, SMTP, queue, cache, and search configuration.
- Build-time Next.js validation can be skipped only through `BUILD_SKIP_ENV_VALIDATION=true` in the controlled build script, so production service startup still validates required configuration.

### Broken build scripts

Status: fixed.

- Replaced platform-specific AI package prompt copy command with `scripts/copy-dir.mjs`.
- Added `scripts/next-build.mjs` to make web/admin builds stable on Windows by using an isolated build home and avoiding local profile permission failures.
- Updated web/admin package build scripts to use the shared Next.js build wrapper.
- Fixed lint/typecheck blockers found during deployment verification:
  - AI JSON regex lint issue.
  - Workflow runner `prefer-const` issue.
  - Feature flag Prisma enum/type exports.
  - i18n country analytics Prisma enum/type exports.
  - Web catalog/tool page implicit `any` issues.

### Broken Docker production config

Status: fixed at configuration level.

- Added `docker-compose.prod.yml` for production topology:
  - `postgres`
  - `redis`
  - `meilisearch`
  - `minio`
  - `migrate`
  - `api`
  - `worker`
  - `scheduler`
  - `web`
  - `admin`
  - `nginx`
- Added `docker/Dockerfile.node` for API, worker, scheduler, and migration execution.
- Added `docker/Dockerfile.next` for web/admin standalone production images.
- Added `docker/nginx/conf.d/production.conf` for public routing to web, admin, and API services.
- Added root production Docker helper scripts:
  - `docker:prod:config`
  - `docker:prod:up`
  - `docker:prod:down`

Follow-up worker Docker build fixes:

- Added `.dockerignore` so host `node_modules`, package-level `node_modules`, `dist`, `.next`, `.turbo`, coverage, generated Prisma client output, and local env files do not pollute Docker build context.
- Updated `docker/Dockerfile.node` builder stage to copy the full deps-stage `/app` tree before overlaying source, preserving pnpm workspace package-level `node_modules` links created inside Linux.
- Updated `docker/Dockerfile.node` build command to use Turbo topology: `pnpm turbo run build --filter=@ai-tool-cms/${APP_NAME}`.
- Updated `docker/Dockerfile.next` with the same pnpm workspace install preservation and Turbo topology build command for web/admin images.

Root cause of the worker failure:

- The Docker context originally included host workspace artifacts because `.dockerignore` was missing.
- The builder stage originally copied only root `node_modules`, but pnpm workspaces also require package/app-level `node_modules` links.
- Worker directly imported `@ai-tool-cms/observability` without declaring it as a dependency, which fails in a clean pnpm workspace.

Root cause of the web failure:

- `docker/Dockerfile.next` copied only root `node_modules` into the builder stage.
- pnpm workspace package-level `node_modules` links were missing in packages such as `packages/config`.
- The first failed package was `@ai-tool-cms/config`, where TypeScript could not resolve Node types, `dotenv`, and `zod`.
- Running Next builds through Turbo ensures workspace dependencies are built in dependency order before `@ai-tool-cms/web`.

### Missing health checks

Status: fixed in production compose.

- API health check uses `/v1/health/ready`.
- Web health check uses `/`.
- Admin health check uses `/admin`.
- PostgreSQL, Redis, Meilisearch, and MinIO health checks are defined.
- Worker and scheduler include lightweight process-level health checks so Docker can supervise restart behavior.
- Nginx depends on healthy web, admin, and API services.

### Prisma migration and seed issues

Status: fixed for production migration startup path.

- Added a one-shot `migrate` service in `docker-compose.prod.yml` that runs `pnpm db:migrate:deploy` before API startup.
- API startup depends on successful migration completion.
- Prisma Client generation now outputs to `packages/database/generated/client`, avoiding fragile package-manager virtual path resolution.
- Database package imports now use the generated client path.
- Generated Prisma client output is ignored in Git.
- Updated `packages/database/prisma.config.ts` to import dotenv loading through `@ai-tool-cms/config/load-dotenv`, avoiding the config package root export during Prisma CLI startup.
- Added a `postgres-bootstrap` one-shot service and `docker/postgres/bootstrap.sh` to create or repair the target production role/database/schema grants before migration runs.
- Added optional `POSTGRES_ADMIN_USER`, `POSTGRES_ADMIN_PASSWORD`, and `POSTGRES_ADMIN_DB` variables for hosts that reuse an existing PostgreSQL volume initialized with a different admin user.

Root cause of the migrate failure:

- Prisma CLI loads `packages/database/prisma.config.ts` before running migrations.
- That config imported `@ai-tool-cms/config`, whose package root eagerly evaluates `env = getEnv()`.
- In `NODE_ENV=production`, this required unrelated runtime variables such as Redis, Meilisearch, JWT, storage, CORS, and newsletter settings even though `prisma migrate deploy` only needs `DATABASE_URL`.
- On the local verification host, the existing PostgreSQL volume had been initialized with an older development role, so the production `POSTGRES_USER` did not exist until bootstrap repaired the role/database grants.

Seed execution was not added to production startup because seed data is not always idempotent production behavior. Production bootstrap should run seed explicitly only when the release process requires it.

### API startup issues

Status: fixed for container dependency order and production validation.

- API container now waits for database, Redis, Meilisearch, MinIO, and migration completion.
- Required production variables are validated before runtime proceeds.
- API health check targets the existing readiness endpoint.
- Docker production image command starts `apps/api/dist/main.js`.

### Web/admin build issues

Status: fixed.

- Web and admin build scripts now use the shared Next.js build wrapper.
- Web locale layout no longer performs build-time static locale enumeration that requires database availability.
- Web TypeScript include/exclude rules now avoid build cache artifacts.
- Docker Next.js builds enable standalone output through `NEXT_STANDALONE=true`.
- Docker Next.js builds now preserve pnpm workspace links and use Turbo dependency ordering.
- Admin supports `ADMIN_BASE_PATH=/admin` for production reverse-proxy routing.

### Worker/scheduler startup issues

Status: fixed for production compose and image startup.

- Worker and scheduler now have dedicated production compose services.
- Both services receive required queue, database, crawler, logging, and external URL configuration.
- Both services use the shared Node production Dockerfile and start from `apps/<service>/dist/main.js`.
- Both services depend on healthy API startup.
- Worker now declares `@ai-tool-cms/observability` as a direct dependency because worker source imports it directly.
- Worker and scheduler production builds now emit CommonJS entrypoints so Node can run `dist/main.js` without ESM extension-resolution failures.
- Runtime env for worker and scheduler now includes the production variables required by the shared config package.

### Runtime package format alignment

Status: fixed for Node production containers.

- Runtime shared packages used by API, worker, scheduler, and server-side web rendering now build CommonJS artifacts for production Node containers.
- `@ai-tool-cms/public-api` now exposes a `require` export and no longer marks the package as ESM-only.
- This fixes production runtime failures such as missing extensionless ESM imports from compiled files:
  - `packages/growth/dist/loop`
  - `apps/worker/dist/ai-pipeline`
  - `packages/crawler-core/dist/Crawler`

### Production compose runtime env and health checks

Status: fixed.

- Web service runtime env now includes Redis, queue, JWT, CORS, storage, and newsletter variables required by server-side shared config validation.
- Worker and scheduler service env now includes the full production config surface required at startup.
- Admin health check now targets the container root path, which is the path served by the current standalone admin image.

## Deployment Workflow

Status: fixed at workflow definition level.

- `.github/workflows/deploy.yml` now builds and pushes production images for:
  - API
  - worker
  - scheduler
  - web
  - admin
- Images are pushed to GHCR.
- Deployment can be triggered by version tags or manual workflow dispatch.
- Workflow supports an external deploy webhook and post-deploy health check URL.

Required GitHub secrets/environment values still need to be configured outside the repository:

- `DEPLOY_WEBHOOK_URL`
- `DEPLOY_WEBHOOK_TOKEN`
- `DEPLOY_HEALTHCHECK_URL`

## Verification

Required commands:

- `pnpm install --config.dangerouslyAllowAllBuilds=true`: passed
- `pnpm lint`: passed
- `pnpm typecheck`: passed
- `pnpm build`: passed

Additional checks:

- `docker compose --env-file .env.production.example -f docker-compose.prod.yml config`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml build worker --no-cache`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web --no-cache`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml build api`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml build web worker scheduler`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml up -d`: passed
- `docker compose --env-file .env.production -f docker-compose.prod.yml ps -a`: passed; `migrate` exited `0`, and API, web, admin, worker, scheduler, PostgreSQL, Redis, Meilisearch, and MinIO were healthy.
- Migration log verification: passed; Prisma loaded `prisma.config.ts`, found 9 migrations, and reported `No pending migrations to apply`.
- GitHub Actions YAML parse check: passed

Not executed:

- Live production health check: requires deployed infrastructure and real secrets.

## Remaining Non-Code Deployment Tasks

These are not code changes and remain required before production launch:

- Replace all placeholder secrets in `.env.production.example` with real production values in the deployment environment.
- Configure GHCR image permissions for the target runtime.
- Configure GitHub deployment secrets.
- Run Docker image build and `docker compose up` on a host with Docker daemon available.
- Run production smoke tests against the deployed URL.
- Confirm backup, rollback, and observability procedures.

## Conclusion

The repository-level P0 deployment blockers identified in the requested categories have been addressed. The project now has production environment validation, production Docker composition, migration-before-start behavior, service health checks, stable web/admin builds, and CI/CD image publishing definitions.

The remaining blockers are environment and infrastructure execution tasks, not missing repository implementation.
