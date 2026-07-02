# Product Sprint 2 - Batch 4B.1 Logo Collection Pipeline

## Goal

Build an automated and production-oriented tool logo collection pipeline that:

- discovers public logo assets from a tool website
- validates downloaded image assets
- stores normalized logo files
- writes the stored logo URL back to `Tool.logoUrl`
- preserves frontend fallback behavior when no logo is available

## Existing System Review

### Tool model

- `Tool.logoUrl` already exists in `prisma/schema.prisma`
- no schema migration was required
- logo absence is a data collection problem, not a model problem

### Media / storage

- repository already has screenshot capture and local storage behavior
- `packages/storage` is still scaffold-only
- current implementation uses a pragmatic local storage pipeline under `storage/logos`
- public access is exposed through a Next.js route:
  - `/logos/[filename]`

### Worker / queue

- existing automation queue infrastructure already supports retry, backoff, and cleanup
- new queue job is added under automation:
  - `automation-tool-logo-collect`

### Admin

- tools dashboard now supports a manual `Refresh Logo` action

## Discovery Priority

The implemented collection order follows the requested priority as closely as possible for public assets:

1. `/favicon.ico`
2. `/apple-touch-icon.png`
3. `/apple-touch-icon-precomposed.png`
4. `og:image`
5. `twitter:image`
6. visible logo image if safely detectable

Notes:

- Clearbit-style services were not hardwired into this implementation.
- Manual upload is still a future enhancement path through admin/media tooling.
- Frontend fallback remains available even if collection fails.

## Validation Rules

Collected assets are validated for:

- successful HTTP response
- image MIME type
- maximum size limit
- not an HTML response masquerading as an image
- minimum dimension threshold where detectable
- broken fetch rejection

## Storage Strategy

- normalized files are written to local storage:
  - `storage/logos`
- public URL is generated as:
  - `${APP_URL}/logos/{filename}`
- metadata is also written into `tool.metadata.logoCollection`

Stored metadata includes:

- source
- storage key
- MIME type
- byte length
- width
- height
- collected timestamp

## Worker Job

New automation queue job:

- queue: `automation-tool-logo-collect`
- job name: `collect-tool-logo`

Behavior:

- retries through existing BullMQ defaults
- idempotent when a tool already has `logoUrl` unless `force=true`
- logs result through automation worker

## API / Admin Actions

New automation endpoint:

- `POST /automation/logos/:toolId`

Admin action:

- `Refresh Logo`
- queues a forced refresh for the selected tool

## Frontend Fallback

Frontend display remains safe even if logo collection fails:

1. `Tool.logo`
2. generated initials avatar
3. category icon
4. default AI icon

This fallback is centralized in:

- `apps/web/src/components/tool/tool-logo.tsx`

## Acceptance Mapping

- tool cards show logos when available:
  - yes
- tool detail shows logo:
  - yes
- no broken image icons:
  - yes, through `onError` fallback and validation
- fallback still works if logo collection fails:
  - yes
- logo job is idempotent:
  - yes, unless forced refresh is requested

## Files Added / Updated

- `packages/automation/src/tool-logo.ts`
- `packages/automation/src/enqueue.ts`
- `packages/automation/src/index.ts`
- `packages/queue/src/automation-types.ts`
- `packages/queue/src/index.ts`
- `apps/worker/src/automation-worker.ts`
- `apps/api/src/automation/automation.controller.ts`
- `apps/api/src/automation/automation.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/(dashboard)/tools/page.tsx`
- `apps/web/src/app/logos/[filename]/route.ts`

## Remaining Work

1. Replace local storage with a real shared object-storage adapter in `packages/storage`.
2. Add optional external logo provider fallback such as Clearbit-compatible services.
3. Add scheduled bulk backfill for published tools missing logos.
4. Add asset deduplication and image normalization with resizing.
