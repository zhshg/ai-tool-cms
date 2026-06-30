# AGENTS.md

## Cursor Cloud specific instructions

This is the **AI Tool CMS** monorepo — a pnpm + Turborepo workspace (Node ≥ 20, pnpm 9.15.4) for an AI-tools directory CMS. Surfaces: `web` (public site, Next.js, :3000), `admin` (Next.js, :3001), `api` (NestJS, :4000), plus `worker`/`scheduler` (BullMQ) and a `mcp-server`. Standard commands live in `package.json` and `docs/GettingStarted.md` — reference those rather than re-deriving them.

### Infrastructure must be started manually each session
The update script only refreshes JS deps; it does **not** start services. Infra (Postgres, Redis, Meilisearch, MinIO, Mailpit, nginx) runs via Docker Compose, and **the Docker daemon does not auto-start** in this VM. At session start:

```bash
sudo dockerd > /tmp/dockerd.log 2>&1 &   # if `docker info` fails
sudo docker compose up -d --wait          # or: pnpm docker:up (needs sudo for docker here)
```

Docker was installed with the `fuse-overlayfs` storage driver and legacy iptables (see `/etc/docker/daemon.json`); this is required for Docker-in-Docker to work in the Cloud VM. The `docker` CLI needs `sudo`. The Postgres/Redis defaults in `.env.example` already match `docker-compose.yml`, so `cp .env.example .env` is sufficient — no secrets needed for local dev (AI providers, embeddings, and crawlers all default to mock).

### Database setup is not idempotent-free
After infra is healthy, build first (Prisma config + seed depend on built internal packages), then migrate and seed:

```bash
pnpm build                 # or at least build @ai-tool-cms/config, database, auth, common
pnpm db:migrate:deploy
pnpm db:seed               # seeds admin + demo data (5 categories, 10 tools)
```

`pnpm db:migrate:deploy` / `pnpm db:seed` fail with "Cannot find module @ai-tool-cms/config/dist/index.js" if packages aren't built yet — run `pnpm build` (or the targeted package builds) first. Seed admin creds come from `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, default `admin@ai-tool-cms.local` / `Admin123!`).

### Running the apps (dev)
- `pnpm dev:stack` → web (:3000) + api (:4000) via turbo. `pnpm dev:web` / `pnpm dev:api` / `pnpm dev:admin` run individually.
- The public site browses fine on :3000 reading Postgres directly via Prisma (no API needed for browsing).
- Next.js dev compiles routes on-demand; the first hit to a route can be slow.

### Known pre-existing issues (NOT environment problems — do not "fix" as setup)
- **`api` fails to boot**: `packages/growth/dist/index.js` uses extensionless relative ESM imports (`from "./loop"`), which Node ESM rejects (`ERR_MODULE_NOT_FOUND`). The repo is mid-migration to `.js` extensions (see commit `2d1894d`); `growth` (and possibly other packages) are unfixed. This blocks `pnpm dev:api` / `dev:stack`'s api process and the production `web` build path that imports it.
- **`@ai-tool-cms/worker` typecheck fails**: it imports `@ai-tool-cms/observability` but does not declare it in `apps/worker/package.json` dependencies, so pnpm doesn't link it. Build (different tsconfig) and `tsx` dev runtime tolerate it; `pnpm typecheck` does not.
- **`@ai-tool-cms/workflow` lint fails**: `prefer-const` error in `packages/workflow/src/runner.ts`. The lint tooling itself is fine.
- **`web` tool-detail route** (`/[locale]/tools/[slug]`) renders without the site layout/CSS while sharing the same `[locale]/layout.tsx` as the (correctly styled) homepage and category pages — an app-code quirk, not an env/CSS-pipeline issue.

### Tests
- `pnpm test:unit` (vitest) — passes (66 tests). `pnpm test:integration` has no test files. `pnpm test:e2e` is Playwright and needs the dev stack running.
