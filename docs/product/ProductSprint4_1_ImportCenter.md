# Product Sprint 4.1 - Batch 1 Import Center

## Current Status

Implemented an Admin Import Center at `/admin/import` for bulk AI tool imports. The page supports CSV and JSON upload, local file preview, row-level validation, API dry-run preview, duplicate detection, skip-duplicates workflow, real import execution, import progress, and result reporting.

## Files Modified

- `apps/admin/src/app/(dashboard)/import/page.tsx`
- `apps/admin/src/lib/nav.ts`
- `apps/api/src/tools/tools.service.ts`
- `docs/product/ProductSprint4_1_ImportCenter.md`

## Import Workflow

1. Upload CSV or JSON file by drag-and-drop or file picker.
2. Parse and preview the file in Admin.
3. Run Preview / Dry Run against `POST /v1/tools/import/preview`.
4. Review row validation, warnings, and duplicate slug/website records.
5. Keep Dry Run enabled for safe validation, or disable it for Real Import.
6. Run Real Import through `POST /v1/tools/import/execute`.
7. Review imported and skipped records in the Summary report.

## Supported Fields

- `name`
- `slug`
- `website`
- `logo`
- `description`
- `category`
- `tags`
- `pricing`
- `language`
- `platform`

The backend import normalizer now also accepts `category`, `pricing`, `language`, and `platform` aliases. `language` and `platform` are stored in existing `Tool.metadata` fields, so no schema migration is required.

## Validation Strategy

- Local Admin validation checks required fields before import.
- Website values must start with `http://` or `https://`.
- API preview checks duplicate slug or website records.
- API preview returns warnings for missing summary, description, logo, category, or pricing.
- Real Import keeps existing backend duplicate skipping behavior.

## UX Improvements

- Added `/admin/import` navigation entry.
- Added drag-and-drop upload area.
- Added file preview table.
- Added import progress state.
- Added Dry Run mode and Real Import mode.
- Added result report for imported and skipped rows.

## Notes

- This batch does not scrape websites.
- This batch does not import hundreds of tools by default.
- This batch does not modify Prisma schema or add migrations.
- CSV parsing remains intentionally lightweight and should be replaced with a hardened parser before accepting arbitrary large production CSV files.

## Remaining Work

- Add server-side validation for unknown category/tag slugs.
- Add downloadable error report CSV.
- Add import job persistence for long-running imports.
- Add background worker import execution for files larger than the initial 200-500 tool dataset.
