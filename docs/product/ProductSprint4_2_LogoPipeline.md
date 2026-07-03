# Product Sprint 4.2 - Automatic Tool Logo Pipeline

## Summary

Implemented a production-oriented automatic Tool Logo Pipeline using the existing automation queue, worker runtime, Tool metadata, Admin controls, and public/admin `ToolLogo` fallback components.

## Priority Strategy

1. Stored `Tool.logoUrl`
2. Cached collected logo from `Tool.metadata.collectedLogoUrl`
3. Website favicon and linked favicon assets
4. Website SVG icon assets
5. Apple touch icons
6. Simple Icons CDN candidate
7. OpenGraph / Twitter / visible logo image candidates
8. Generated initials avatar in UI
9. Default AI icon in UI

Stored logos are preserved. Automatic collection writes `metadata.collectedLogoUrl` and only fills `Tool.logoUrl` when the tool has no stored logo.

## Background Worker

The existing `automation-tool-logo-collect` queue is used through BullMQ.

- Job name: `collect-tool-logo`
- Enqueue helper: `enqueueToolLogoCollect`
- Worker handler: `apps/worker/src/automation-worker.ts`
- Retry/backoff: inherited from queue defaults, 3 attempts with exponential backoff

## Manual Refresh

Manual refresh is available through:

- `POST /v1/automation/logos/:toolId`
- Admin tool editor `Refresh Logo` button

## Bulk Refresh

Bulk refresh is available through:

- `POST /v1/tools/bulk/logo-refresh`
- Admin tools list `Bulk Refresh Logos` button for currently loaded tools

## Preview

Logo discovery preview is available through:

- `GET /v1/automation/logos/:toolId/preview`
- Admin tool editor `Preview Logo` button

Preview validates discovered candidates without storing them.

## Logo Cache

The pipeline stores collection metadata in existing `Tool.metadata`:

- `collectedLogoUrl`
- `logoCollection.status`
- `logoCollection.source`
- `logoCollection.storageKey`
- `logoCollection.mimeType`
- `logoCollection.byteLength`
- `logoCollection.width`
- `logoCollection.height`
- `logoCollection.collectedAt`
- failure fields when no valid logo is found

No Prisma migration is required.

## Broken Image Detection

Backend validation rejects:

- non-image responses
- HTML responses
- empty images
- files larger than 2 MB
- tiny raster images below 16px dimensions when dimensions are detectable
- failed HTTP responses

Admin and public `ToolLogo` components already handle runtime broken image events and fall back safely.

## Applied Surfaces

- Admin tools list
- Admin tool editor
- Public tool cards
- Public tool detail page

## Files Modified

- `packages/automation/src/tool-logo.ts`
- `packages/automation/src/index.ts`
- `apps/api/src/automation/automation.controller.ts`
- `apps/api/src/automation/automation.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/(dashboard)/tools/page.tsx`
- `apps/admin/src/components/tools/tool-editor-form.tsx`
- `docs/product/ProductSprint4_2_LogoPipeline.md`

## Notes

- The worker currently records logo jobs under the existing automation run kind because adding a dedicated `TOOL_LOGO` enum would require a Prisma migration.
- Simple Icons is used as a public icon candidate via CDN URL validation. It is not bundled into the repo.
- The pipeline does not scrape copyrighted page content; it only fetches publicly referenced image/icon assets.
