# Local Docker Build Fix Report

Date: 2026-07-04
Project: AI Tool CMS
Scope: Local demo Docker startup

## Problem

Local demo startup was attempting to pull private application images from GHCR:

- `ghcr.io/zhshg/ai-tool-cms-web:1.0.0`
- `ghcr.io/zhshg/ai-tool-cms-admin:1.0.0`
- `ghcr.io/zhshg/ai-tool-cms-api:1.0.0`
- `ghcr.io/zhshg/ai-tool-cms-worker:1.0.0`
- `ghcr.io/zhshg/ai-tool-cms-scheduler:1.0.0`

This fails in local demo environments with:

- `error from registry: denied`

## Root Cause

`docker-compose.prod.yml` already had `build` definitions, but the application services still used GHCR-based image names by default.

On a fresh local machine, `docker compose up -d` could try to resolve those remote image names before local images existed, which caused private-registry pull failures.

## Fix Applied

Updated `docker-compose.prod.yml` for local demo behavior:

- kept local build configuration from source `context: .`
- kept existing Dockerfiles:
  - `docker/Dockerfile.node`
  - `docker/Dockerfile.next`
- kept correct build args:
  - `APP_NAME=api`
  - `APP_NAME=worker`
  - `APP_NAME=scheduler`
  - `APP_NAME=web`
  - `APP_NAME=admin`
- changed application image tags from GHCR-based defaults to local image names:
  - `ai-tool-cms-api:${IMAGE_TAG:-local}`
  - `ai-tool-cms-worker:${IMAGE_TAG:-local}`
  - `ai-tool-cms-scheduler:${IMAGE_TAG:-local}`
  - `ai-tool-cms-web:${IMAGE_TAG:-local}`
  - `ai-tool-cms-admin:${IMAGE_TAG:-local}`
- added `pull_policy: never` to app services so local demo startup does not pull from GHCR
- added `apps/admin/public/.gitkeep` so the local `admin` image build no longer fails on `COPY /app/apps/admin/public`

Infrastructure services remain public-registry based:

- `postgres`
- `redis`
- `meilisearch`
- `minio`
- `nginx`

## Files Changed

- `docker-compose.prod.yml`
- `docs/deployment/LocalDockerDemo.md`

## Expected Local Commands

Build:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

Start:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

## Verification Notes

- The previous failure mode was reproduced and traced to GHCR-based app image names.
- After this change, the local build path no longer depends on pulling private GHCR app images.
- A subsequent local build surfaced a separate filesystem issue: `apps/admin/public` did not exist for `Dockerfile.next`.
- That issue was fixed by adding an empty `apps/admin/public` directory placeholder.
- In this session, the full `docker compose ... build` run exceeded the interactive timeout window, so the final build was not observed to completion here.
- However, the observed failure mode changed from `error from registry: denied` to normal local build execution, which confirms the GHCR pull blocker was removed.

## Local URLs

- `http://localhost`
- `http://localhost/admin`
- `http://localhost/api/health`

## Notes

- This fix targets local demo startup only.
- It does not redesign deployment architecture.
- Public registry infrastructure images are still expected to pull normally on a fresh machine.
- Private app image pulling is removed from the local demo path.
