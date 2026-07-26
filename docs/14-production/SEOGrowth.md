# Product Sprint RC2 Batch 7 - SEO Growth Landing Pages

## Summary

This batch adds SEO growth landing pages for the public AI Tool Directory without changing the database schema or importing synthetic content. The implementation generates crawlable pages from existing published tools, categories, tags, and structured tool metadata.

## Pages Added

| Page Type | Route | Purpose |
| --- | --- | --- |
| Top AI Tools | `/[locale]/top-ai-tools` | High-intent discovery page for top tools. |
| Best AI Tools | `/[locale]/best-ai-tools` | Existing landing page preserved as the main editorial best-tools page. |
| AI by Industry | `/[locale]/ai/industry` | Industry-oriented discovery from tool metadata, with tag fallback. |
| AI by Job | `/[locale]/ai/job` | Role and target-user discovery from tool metadata, with tag fallback. |
| AI by Category | `/[locale]/ai/category` | Category taxonomy discovery using the existing category hierarchy. |
| AI by Country | `/[locale]/ai/country` | Regional discovery from verified metadata where available, with tag fallback. |
| AI by Language | `/[locale]/ai/language` | Language and localization discovery from metadata, with tag fallback. |

## Dynamic SEO

Each new page uses shared SEO infrastructure from `@ai-tool-cms/seo`:

- Metadata generated with `buildMetadata`.
- Canonical URLs generated from the configured production site URL.
- `hreflang` entries generated for configured locales.
- OpenGraph and Twitter metadata inherited from the shared metadata builder.
- JSON-LD generated for `CollectionPage`, `ItemList`, `FAQPage`, and `BreadcrumbList`.

## Schema Strategy

The SEO Growth pages emit a JSON-LD graph containing:

- `CollectionPage` for the landing page entity.
- `ItemList` for ranked tools or discovery facets.
- `BreadcrumbList` for crawl context.
- `FAQPage` for editorial support content.

The pages do not invent facts about tools. They only use existing published catalog records and metadata fields.

## Canonical Strategy

Canonical paths follow localized public routes:

- `/en/top-ai-tools`
- `/en/ai/industry`
- `/en/ai/job`
- `/en/ai/category`
- `/en/ai/country`
- `/en/ai/language`

The same pattern applies to other configured locales.

## Breadcrumb Strategy

Visible breadcrumbs and JSON-LD breadcrumbs are included on every SEO Growth page:

Home -> Landing Page

This keeps crawl hierarchy shallow and reinforces the relationship between the homepage and long-tail SEO discovery pages.

## Sitemap Strategy

The API sitemap service now includes the new growth routes in locale sitemaps:

- `top-ai-tools`
- `ai/industry`
- `ai/job`
- `ai/category`
- `ai/country`
- `ai/language`

No new sitemap chunk type was introduced, avoiding changes to the sitemap contract.

## Content Source Rules

- Tools: only `PUBLISHED` tools are listed.
- Categories: existing category records and counts are used.
- Industry, job, country, and language facets: generated from existing `Tool.metadata` fields when present.
- Fallback: if metadata facets are not available, published tag pages are used as safe discovery paths.
- No fake tools, fake rankings, copied descriptions, or scraped content are generated.

## Files Changed

- `apps/web/src/lib/seo-growth.ts`
- `apps/web/src/components/seo/growth-landing-page.tsx`
- `apps/web/src/app/[locale]/top-ai-tools/page.tsx`
- `apps/web/src/app/[locale]/ai/[segment]/page.tsx`
- `apps/api/src/seo/seo.service.ts`
- `docs/14-production/SEOGrowth.md`

## Acceptance Notes

- SEO landing routes are implemented.
- Dynamic metadata, canonical, OpenGraph/Twitter metadata, schema, and breadcrumbs are supported through shared SEO helpers.
- Sitemap locale entries include the new routes.
- Existing `best-ai-tools` route remains unchanged.
- No database schema changes were introduced.
