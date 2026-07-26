# Auto Discovered Import Summary

## Outcome

The project now includes a reviewed import path for `82` auto-discovered AI tools.

This import path is:

- validated
- overlap-audited
- connected to the normal seed flow
- documented for local and production execution

## Added or Updated Data Assets

- `docs/import/auto-discovered-tools-2026-07-08.json`
- `docs/import/auto-discovered-tools-2026-07-08.md`

## Main Code Changes

### Auto-update and review pipeline

- `packages/auto-update/src/cli.ts`
- `packages/auto-update/src/sources.ts`
- `packages/auto-update/src/utils.ts`
- `scripts/auto-update/export-review-dataset.mjs`
- `scripts/auto-update/validate-review-dataset.mjs`
- `scripts/auto-update/review-overrides.mjs`
- `scripts/auto-update/audit-import-overlaps.mjs`

### Database seed integration

- `prisma/seed.ts`
- `prisma/seeds/auto-discovered-tools.ts`
- `prisma/seeds/validate-auto-discovered-tools.ts`

### Import documentation

- `docs/import/AutoDiscoveredImportRunbook.md`
- `docs/import/AutoDiscoveredMergeChecklist.md`
- `docs/import/AutoDiscoveredImportSummary.md`

## Import Behavior

The `82` reviewed tools are now imported through the normal seed flow.

Duplicate protection is applied using:

1. `slug`
2. exact `name`
3. `website` host

This protects against duplicate creation when the same product already exists in the curated first-50 dataset.

## Known Overlap Set

The current overlap audit identifies `7` records that should update existing tools instead of creating duplicates:

- `ChatGPT`
- `Claude`
- `Frase`
- `Google Gemini`
- `Midjourney`
- `Perplexity`
- `Replit`

## Latest Local Execution Status

The full local seed flow now runs successfully:

```bash
pnpm db:seed
```

Observed result:

- curated catalog seeded: `50` tools
- auto-discovered catalog seeded: `82` tools
- total import path executed without Prisma client errors

During validation, an older blocker in `docs/import/first-50-ai-tools.json` was corrected:

- duplicate canonical secondary categories on a small subset of curated tools
- category-like tags such as `AI Coding`, `AI Agents`, and `AI Writing`

These fixes were limited to dataset normalization and were required for the standard curated seed to pass.

## Final Dataset Status

- reviewed dataset count: `82`
- review validation: passed
- auto-discovered validation: passed
- duplicate hosts inside reviewed dataset: none
- duplicate slugs inside reviewed dataset: none

## Execution Commands

### Pre-import checks

```bash
pnpm db:generate
pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
pnpm tools:auto-update:audit-overlaps
node prisma/seeds/validate-auto-discovered-tools.ts
```

### Local import

```bash
pnpm db:generate
pnpm db:seed
```

### Production Docker import

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:generate
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm tools:auto-update:audit-overlaps
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
```

## Post-import Verification

### Database

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select count(*) from \"Tool\" where \"deletedAt\" is null;"

docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select status, count(*) from \"Tool\" where \"deletedAt\" is null group by status order by status;"

docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select count(*) from \"Tool\" t left join \"ToolCategory\" tc on tc.\"toolId\"=t.id and tc.\"deletedAt\" is null where t.\"deletedAt\" is null and tc.id is null;"
```

### Frontend

Verify:

- `/en/tools`
- `/en/categories`
- `/en/search`
- several imported tool detail pages
- sitemap output

### API

Verify:

- `https://api.toolsdar.io/v1/health`
- list endpoints
- category endpoints
- search endpoints

## Recommendation

If the team wants the fastest route to launch:

- run the overlap audit
- run `pnpm db:seed`
- verify the main frontend and API pages

If the team wants the highest editorial quality:

- import all `82`
- then manually review the smaller subset listed in `AutoDiscoveredMergeChecklist.md`

## Reference Documents

- `docs/import/AutoDiscoveredImportRunbook.md`
- `docs/import/AutoDiscoveredMergeChecklist.md`
