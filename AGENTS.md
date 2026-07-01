# AGENTS.md

## Codex instructions for this repository

This repository is the AI Tool CMS monorepo. It uses pnpm, Turborepo, Node.js 20+, Next.js, NestJS, Prisma, PostgreSQL, Redis, Meilisearch, MinIO, BullMQ, and related internal packages.

Primary apps:

- `apps/web`: public website, Next.js, port 3000.
- `apps/admin`: admin console, Next.js, port 3001.
- `apps/api`: API service, NestJS, port 4000.
- `apps/worker`: background workers.
- `apps/scheduler`: scheduled jobs.
- `packages/*`: shared platform packages.
- `prisma`: schema, migrations, and seed data.

## Working rules

- Prefer reading the existing implementation and documentation before changing code.
- Keep changes scoped to the requested task.
- Do not overwrite user changes unless the user explicitly asks for that.
- Use `rg` when available. On Windows, PowerShell commands are acceptable when `rg` is unavailable or blocked.
- Use `apply_patch` for manual file edits.
- Keep code identifiers, filenames, package names, and commit messages in English.
- User-facing explanations should be in Simplified Chinese unless the user requests otherwise.
- New or changed code comments should be in Chinese.

## Common commands

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Generate Prisma client:

```bash
pnpm db:generate
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

Typecheck:

```bash
pnpm typecheck
```

Unit tests:

```bash
pnpm test:unit
```

All tests:

```bash
pnpm test
```

Start local infrastructure:

```bash
pnpm docker:up
```

Stop local infrastructure:

```bash
pnpm docker:down
```

Run dev stack:

```bash
pnpm dev:stack
```

Run individual apps:

```bash
pnpm dev:web
pnpm dev:admin
pnpm dev:api
```

## Local infrastructure

`docker-compose.yml` starts supporting services such as PostgreSQL, Redis, Meilisearch, MinIO, Mailpit, and nginx. It does not currently start all application services as containers.

Default local ports:

- Web: `http://localhost:3000`
- Admin: `http://localhost:3001`
- API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Meilisearch: `localhost:7700`
- MinIO API: `localhost:9000`
- MinIO console: `localhost:9001`
- Mailpit UI: `localhost:8025`

## Database setup

After dependencies and infrastructure are ready:

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
```

Seed credentials are configured through environment variables documented in `.env.example`.

## Deployment notes

Before production deployment work, inspect:

- `docs/Deployment.md`
- `docs/11-production/DeploymentChecklist.md`
- `docs/11-production/ProductionAcceptance.md`
- `docs/12-release/KnownLimitations.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `docker-compose.yml`
- `docker/Dockerfile`
- `docker/nginx/conf.d/default.conf`

Current deployment materials should be treated as incomplete until the deployment gap report is resolved.
