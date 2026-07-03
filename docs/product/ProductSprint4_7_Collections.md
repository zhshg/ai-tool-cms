# Product Sprint 4.7 Collections

## Current Status

Implemented curated Collections using the existing `Collection` and `CollectionItem` Prisma models. No database schema changes or Prisma migrations were introduced.

Collections now support an editorial workflow for grouping published AI tools into public landing pages such as Best AI Writing, Best AI Coding, Best AI Agents, Best AI Video, and Best AI Image.

## Files Modified

- `apps/api/src/app.module.ts`
- `apps/api/src/collections/collections.module.ts`
- `apps/api/src/collections/collections.controller.ts`
- `apps/api/src/collections/collections.service.ts`
- `apps/api/src/collections/dto/collection.dto.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/lib/nav.ts`
- `apps/admin/src/app/(dashboard)/collections/page.tsx`
- `apps/admin/src/app/(dashboard)/collections/new/page.tsx`
- `apps/admin/src/app/(dashboard)/collections/[id]/edit/page.tsx`
- `apps/admin/src/components/collections/collection-editor-form.tsx`
- `apps/web/src/app/[locale]/collections/page.tsx`
- `apps/web/src/app/[locale]/collections/[slug]/page.tsx`
- `docs/product/ProductSprint4_7_Collections.md`

## Admin Capabilities

Implemented Admin Collections operations under `/admin/collections`:

- Create Collection
- Edit Collection
- Soft delete Collection
- Sort tools inside a Collection
- Mark Collection as public or draft
- Mark Collection as featured through metadata
- Configure SEO title and SEO description
- Configure hero intro and SEO summary
- Select tools for editorial curation

Collections are added to the Admin navigation and breadcrumb labels.

## API Capabilities

Added a scoped Collections API module:

- `GET /v1/collections`
- `GET /v1/collections/:id`
- `POST /v1/collections`
- `PUT /v1/collections/:id`
- `DELETE /v1/collections/:id`
- `GET /v1/collections/public`
- `GET /v1/collections/public/:slug`

Admin endpoints reuse existing SEO permissions:

- Read: `PermissionCode.SeoRead`
- Manage: `PermissionCode.SeoManage`

This avoids adding new RBAC primitives during this sprint.

## Public Experience

Added public collection pages:

- `/{locale}/collections`
- `/{locale}/collections/{slug}`

Collection detail pages include:

- Breadcrumbs
- Hero section
- Featured badge
- Tool count
- Updated date
- Curated tool list
- Pricing badges
- Tool logos with existing fallback strategy
- Category links
- Tag chips
- Related collections
- SEO summary sidebar
- JSON-LD structured data

Existing hardcoded SEO landing pages such as `/best-ai-tools` were preserved.

## SEO

Collection pages generate metadata from collection metadata when available:

- `metadata.metaTitle`
- `metadata.metaDescription`
- fallback to collection name and description

Structured data added:

- Collection page JSON-LD
- ItemList JSON-LD
- Breadcrumb JSON-LD

Canonical URL generation uses existing `buildMetadata` and site configuration helpers.

## Data Model Notes

The implementation reuses existing models:

- `Collection`
- `CollectionItem`
- `Tool`

The following editorial fields are stored in `Collection.metadata`:

- `featured`
- `metaTitle`
- `metaDescription`
- `heroIntro`
- `seoSummary`

Only published tools can be synced into a collection through the API service.

## Verification

Completed targeted verification:

- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/admin typecheck`
- `pnpm --filter @ai-tool-cms/web typecheck`
- `pnpm --filter @ai-tool-cms/api lint`
- `pnpm --filter @ai-tool-cms/admin lint`
- `pnpm --filter @ai-tool-cms/web lint`

Full workspace verification should also run before release:

- `pnpm lint`
- `pnpm typecheck`

## Remaining Work

Recommended follow-up items:

- Add collection seed examples for Best AI Writing, Best AI Coding, Best AI Agents, Best AI Video, and Best AI Image.
- Add collection analytics such as views, clicks, and conversion events.
- Add collection preview mode for draft collections.
- Add a searchable tool picker for very large catalogs.
- Add dedicated Collection permissions if RBAC needs more granularity than SEO permissions.