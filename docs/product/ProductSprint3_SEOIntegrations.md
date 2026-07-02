# Product Sprint 3 - Batch 2 SEO Integrations

## Current Result

The Admin SEO dashboard has been upgraded from a read-only placeholder into a real configuration center backed by persisted settings.

## Files Modified

- `apps/api/src/seo/dto/seo-integrations.dto.ts`
- `apps/api/src/seo/dto/index.ts`
- `apps/api/src/seo/seo.controller.ts`
- `apps/api/src/seo/seo.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/(dashboard)/seo/page.tsx`

## What Was Added

### Google Search Console

- Persisted configuration for:
  - OAuth access token
  - OAuth refresh token
  - property id
  - property name
  - site URL
  - verification status
- Actions:
  - Save
  - Disconnect
  - Refresh
- Dashboard display:
  - Clicks
  - Impressions
  - CTR
  - Average Position
  - Indexed Pages
  - Coverage
  - Sitemaps

### Bing Webmaster

- Persisted configuration for:
  - API key
  - site URL
  - verification status
- Actions:
  - Save
  - Disconnect
  - Refresh
- Dashboard display:
  - Clicks
  - Impressions
  - Keywords
  - Index Status
  - Crawl Errors

### General SEO

- Persisted configuration for:
  - robots
  - sitemap
  - canonical
  - OpenGraph
  - Twitter
  - IndexNow
  - Analytics provider
  - GA4 measurement id
  - GA4 API secret

## Persistence Strategy

- Reused the existing `Setting` model.
- No Prisma schema change.
- No migration added.
- Data stored under:
  - `seo.googleSearchConsole`
  - `seo.bingWebmaster`
  - `seo.general`

## Security Notes

- Settings are stored as private records.
- Secrets are masked on readback to Admin.
- Masked values are preserved during updates unless explicitly replaced.

## API Endpoints Added

- `GET /v1/seo/integrations`
- `PUT /v1/seo/integrations`
- `POST /v1/seo/integrations/:provider/disconnect`
- `POST /v1/seo/integrations/:provider/refresh`

## Live Data Status

- Dashboard configuration state is fully API-backed and persisted.
- Provider status and refresh timestamps are live from persisted settings.
- External Google/Bing metrics currently return placeholder snapshot values until real webmaster API clients are wired.

## Acceptance Mapping

- All settings persist: yes
- Configuration stored securely: yes, via private settings with masked secrets
- Dashboard loads live data: yes for persisted configuration and API-backed state; third-party webmaster metrics still need real provider client wiring

## Remaining Work

1. Connect real Google Search Console OAuth exchange and reporting APIs.
2. Connect real Bing Webmaster API metrics.
3. Add stronger secret encryption if platform policy later requires encrypted-at-rest credential storage.
4. Add audit logs for SEO integration save/disconnect actions.
