# Admin Tool Editor UX

## Summary

The `/admin/tools/[id]/edit` page has been reorganized into a modern CMS editing layout inspired by Shopify Admin, Payload CMS, Directus, and Strapi.

## Files Changed

- `apps/admin/src/components/tools/tool-editor-form.tsx`
- `apps/api/src/tools/dto/tool.dto.ts`
- `docs/product/AdminToolEditorUX.md`

## UX Changes

- Added a responsive two-column editor layout.
- Main editing content now occupies the left column.
- Publishing, pricing, metadata, SEO score, content completeness, and icon preview now live in a sticky right sidebar.
- Added a sticky bottom toolbar with `Cancel`, `Preview`, `Save Draft`, and `Publish`.
- Reorganized fields into CMS-style cards: Basic Information, Taxonomy, Features, Screenshots, FAQ, and SEO.
- Kept selected tag chips and searchable Add Tag picker.
- Kept direct URL entry while preserving upload buttons for logo and screenshots.

## Data Notes

- Existing create/update Tool APIs are still used.
- No Prisma migration was added.
- `canonicalUrl` and `openGraphImageUrl` are stored in existing `Tool.metadata`.
- `ToolMetadataDto` now allows those two metadata fields through backend validation.

## Acceptance Mapping

- Responsive layout: PASS
- No giant Tags block: PASS
- Features easy to edit: PASS
- Screenshots easy to edit: PASS
- FAQ easy to edit: PASS
- Save still uses existing API flow: PASS

## Remaining Work

- Browser-side visual QA should be repeated after rebuilding the Admin image, because production Next.js output is static per build.
