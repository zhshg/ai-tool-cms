# Production Import Acceptance - 2026-07-08

## Scope

This note records the production import acceptance for the reviewed `82` auto-discovered AI tools.

## Production Result

- production import completed: `yes`
- reviewed auto-discovered dataset: `82`
- overlap updates: `7`
- expected net new tools: `75`
- final production tool total: `125`
- final production status distribution:
  - `PUBLISHED`: `125`

## Commands Executed

The production path was executed in this order:

```bash
docker exec ai-tool-cms-api-1 sh -lc 'cd /app && node scripts/auto-update/validate-review-dataset.mjs docs/import/auto-discovered-tools-2026-07-08.json'
docker exec ai-tool-cms-api-1 sh -lc 'cd /app && node scripts/auto-update/audit-import-overlaps.mjs'
docker exec ai-tool-cms-api-1 sh -lc 'cd /app && pnpm db:seed'
docker exec ai-tool-cms-api-1 sh -lc 'cd /app && node scripts/ops/query-tool-stats.mjs'
```

## Validation Observed

- review dataset validation: passed
- overlap audit: `curated=50 auto=82 overlaps=7`
- seed output included:
  - `public catalog: 20 categories, 189 tags, 50 tools`
  - `auto discovered catalog: 4 tags, 82 tools`

## Important Implementation Note

The production database import succeeded, but the import was finalized by syncing the updated seed files into the running `api` container before re-running `pnpm db:seed`.

That means the database result is correct now, but future container rebuilds should still be verified against the host repository state before relying on the same import path again.

## Host State Confirmed

These host files were confirmed as updated on the production server:

- `/opt/ai-tool-cms/package.json`
- `/opt/ai-tool-cms/prisma/seed.ts`
- `/opt/ai-tool-cms/prisma/seeds/auto-discovered-tools.ts`
- `/opt/ai-tool-cms/docs/import/auto-discovered-tools-2026-07-08.json`
- `/opt/ai-tool-cms/scripts/auto-update/validate-review-dataset.mjs`
- `/opt/ai-tool-cms/scripts/auto-update/audit-import-overlaps.mjs`

## Follow-up Items

- Rebuild or refresh the production `api` image from the updated host repository when convenient, so the running container and host code are fully aligned.
- Review the imported tool pages on:
  - `/en/tools`
  - `/en/categories`
  - `/en/search`
- Clean up stray root-level server files only after manual confirmation.
- Use `docs/import/ContainerHostAlignmentRunbook.md` as the standard follow-up procedure for durable host/container alignment after emergency in-container fixes.

## Stray Files To Review Manually

These files were observed at `/opt/ai-tool-cms` root and were not removed automatically:

- `/opt/ai-tool-cms/seed.ts`
- `/opt/ai-tool-cms/-remote --tags origin`
- `/opt/ai-tool-cms/admin-rebuild.log`
- `/opt/ai-tool-cms/scheduler-build.log`
