# Content Expansion

Date: 2026-07-04
Project: AI Tool CMS
Phase: Release Candidate Sprint 2 - Batch 1
Scope: Production Content Expansion

## Summary

This batch adds a production dataset management layer for scaling the AI Tool Directory beyond the initial curated dataset.

The implementation does not add fake tools, does not scrape websites, and does not import third-party content. It adds operational visibility and management tools so the catalog can grow from the initial production dataset toward 500+, 2,000+, and 10,000+ real AI tools.

## What Was Implemented

### Production Dataset Manager

A new Admin page is available at `/admin/content`.

It displays:

- Dataset Summary
- Content coverage
- Missing Logo
- Missing Description
- Missing Features
- Missing FAQ
- Broken Links
- Duplicate Groups

### Backend Content API

A new API module exposes:

- `GET /v1/content/dataset`
- `GET /v1/content/duplicates`
- `GET /v1/content/missing-content`
- `GET /v1/content/broken-websites`
- `POST /v1/content/duplicates/merge`

The module uses existing models only:

- `Tool`
- `ToolCategory`
- `ToolTag`
- `PricingPlan`
- `Faq`
- `ToolScreenshot`
- `WebsiteMonitor`
- `Tool.metadata`

No Prisma migration was added for this batch.

## Data Model Coverage

Every tool can be evaluated for:

| Field | Source |
| --- | --- |
| Name | `Tool.name` |
| Slug | `Tool.slug` |
| Website | `Tool.website` |
| Logo | `Tool.logoUrl`, `Tool.metadata.logo`, `Tool.metadata.collectedLogoUrl` |
| Short Description | `Tool.summary` |
| Full Description | `Tool.longDescription` or `Tool.description` |
| Primary Category | `ToolCategory.isPrimary` |
| Secondary Categories | `ToolCategory` |
| Tags | `ToolTag` |
| Pricing | `Tool.pricingModel`, `PricingPlan` |
| Platforms | `Tool.metadata.platforms` or `Tool.metadata.aiPlatforms` |
| Languages | `Tool.metadata.languages` or `Tool.metadata.aiLanguages` |
| API Availability | `Tool.metadata.hasApi` or `Tool.metadata.apiAccess` |
| Open Source flag | `Tool.metadata.openSource` or `Tool.metadata.isOpenSource` |
| Features | `Tool.metadata.features` |
| Use Cases | `Tool.metadata.useCases` |
| Screenshots | `ToolScreenshot`, `Tool.metadata.screenshots` |
| FAQ | `Faq` |
| Alternatives | `Tool.metadata.alternatives` |
| SEO metadata | `Tool.metaTitle`, `Tool.metaDescription` |

## Duplicate Detection

Duplicate detection groups tools by:

- normalized website
- slug
- normalized name

The Admin page shows duplicate groups and allows a duplicate to be merged into the first detected canonical record.

## Duplicate Merge

The merge action:

- copies missing summary, description, full description, logo, and SEO fields from source to target
- merges categories
- merges tags
- copies unique FAQ entries
- merges metadata with target values taking precedence
- archives the source tool
- records merge metadata on both source and target

The merge does not hard-delete tools.

## Missing Content Report

The report identifies tools missing:

- logo
- short or full description
- features
- FAQ
- screenshots
- SEO title or description
- primary category
- tags
- pricing
- use cases
- alternatives

Only the first 50 tools per report are returned to keep the Admin page responsive.

## Broken Website Detection

Broken website detection uses:

- URL syntax validation
- existing `WebsiteMonitor` status and metadata

It does not fetch or scrape website content in this batch.

## Scale Strategy

The architecture is ready for:

- 500+ tools through current paginated Admin/API patterns
- 2,000+ tools by keeping reports summarized and capped
- 10,000+ tools by moving expensive audits to scheduled jobs or cached snapshots later

Recommended future step:

- persist content audit snapshots for trend reporting
- move broken website checks to queue-backed workers
- add CSV export for every missing-content report
- add import-pack validation for 500, 2,000, and 10,000 tool datasets

## Verification

Expected checks:

- `/admin/content` loads for users with `tools:read`
- `GET /v1/content/dataset` returns 200 with summary, coverage, missing content, broken website, and duplicate sections
- duplicate merge archives the source tool and preserves target data
- no fake tools are generated
- no website scraping is performed
- no Prisma migration is required

## Files Changed

- `apps/api/src/content/content.controller.ts`
- `apps/api/src/content/content.service.ts`
- `apps/api/src/content/content.module.ts`
- `apps/api/src/content/dto/content-ops.dto.ts`
- `apps/api/src/app.module.ts`
- `apps/admin/src/app/(dashboard)/content/page.tsx`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/lib/nav.ts`
- `docs/14-production/ContentExpansion.md`

## Remaining Work

- Add real 500+ tool import packs.
- Add background audit snapshots for 10,000+ scale.
- Add exported CSV reports.
- Add queue-backed broken website checks.
- Add richer merge review before archive for high-value records.
