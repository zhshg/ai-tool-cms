# Auto Discovered Import Runbook

## Scope

This runbook covers importing the reviewed `82` auto-discovered AI tools from:

- `docs/import/auto-discovered-tools-2026-07-08.json`

into the normal project seed pipeline.

It assumes the code changes in:

- `prisma/seeds/auto-discovered-tools.ts`
- `prisma/seed.ts`
- `scripts/auto-update/audit-import-overlaps.mjs`

are already present.

## What Will Be Imported

- Source dataset size: `82`
- Import mode: seed-based upsert
- Tool status: `PUBLISHED`
- Primary category: required
- Tags: upserted if missing
- Pricing plan: created or updated per tool
- FAQ: created or updated per tool
- Tool version: upserted as `v1`

## Duplicate Protection

The importer now matches existing tools using all of the following:

1. `slug`
2. exact `name`
3. `website` host

This prevents obvious duplicate creation when the same product appears in both:

- the original `first-50-ai-tools.json`
- the auto-discovered dataset

## Known Overlaps

Current overlap audit result:

- `ChatGPT`
- `Claude`
- `Frase`
- `Google Gemini`
- `Midjourney`
- `Perplexity`
- `Replit`

These tools should be updated or merged into existing records, not inserted as duplicates.

Run the audit before import:

```bash
pnpm tools:auto-update:audit-overlaps
```

## Pre-Import Checks

Run locally or inside the production API container:

```bash
pnpm db:generate
pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
pnpm tools:auto-update:audit-overlaps
node prisma/seeds/validate-auto-discovered-tools.ts
```

Expected:

- review dataset validation passes
- overlap audit reports `7` known overlaps
- auto-discovered validation passes with `82 tools`

## Local Import Command

```bash
pnpm db:generate
pnpm db:seed
```

Default `demo` profile will now import:

1. default taxonomy
2. curated first 50 tools
3. auto-discovered 82 tools
4. crawl source seed

## Production Import Command

Run from:

```bash
cd /opt/ai-tool-cms
```

Then:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:generate
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm tools:auto-update:validate-review docs/import/auto-discovered-tools-2026-07-08.json
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm tools:auto-update:audit-overlaps
docker compose --env-file .env.production -f docker-compose.prod.yml exec api pnpm db:seed
```

## Post-Import Verification

### Database checks

Total tools:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select count(*) from \"Tool\" where \"deletedAt\" is null;"
```

Published tools:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select status, count(*) from \"Tool\" where \"deletedAt\" is null group by status order by status;"
```

Missing category relations:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select count(*) from \"Tool\" t left join \"ToolCategory\" tc on tc.\"toolId\"=t.id and tc.\"deletedAt\" is null where t.\"deletedAt\" is null and tc.id is null;"
```

Missing summaries:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select count(*) from \"Tool\" where \"deletedAt\" is null and (summary is null or summary='');"
```

Potential duplicate hosts:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
-c "select website, count(*) from \"Tool\" where \"deletedAt\" is null group by website having count(*) > 1;"
```

### Frontend checks

Verify:

- `/en/tools`
- `/en/categories`
- `/en/search`
- `/sitemap.xml`
- tool detail pages for a few imported tools

Recommended spot checks:

- `ChatGPT`
- `Claude`
- `Perplexity`
- `Midjourney`
- `AgentGPT`
- `Consensus`
- `TutorAI`

### API checks

Verify:

- `https://api.toolsdar.io/v1/health`
- tool list endpoints
- category filtered endpoints
- search endpoints

## Rollback Guidance

No destructive rollback command is included here on purpose.

Recommended rollback options:

1. Restore from a database backup taken before import.
2. If needed, mark newly imported tools as non-public through controlled SQL or admin review.
3. Avoid manual bulk delete unless a full backup is available and reviewed.

## Notes

- This import path is seed-based, not a one-off raw SQL patch.
- It is safe to rerun because the importer uses upsert semantics plus overlap matching.
- The current import source is still a reviewed dataset, not a fully automated production apply workflow.
