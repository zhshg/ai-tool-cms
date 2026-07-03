# Product Sprint 4.9 Analytics Dashboard

## Current Status

Implemented the Analytics Dashboard as a real operational dashboard backed by existing platform data. The implementation reuses current database tables and does not add new Prisma models for analytics snapshots.

## Data Sources

The dashboard currently reads from existing platform data:

- Visitors: returns `0` until GA4, PostHog, or Umami credentials are connected.
- Views: derived from `ToolPopularitySnapshot.trafficScore`.
- Clicks: derived from `SearchClickLog`.
- CTR: calculated as search clicks divided by search queries.
- Growth: compares current period activity against the previous equivalent period.
- Top Tools: calculated from search click logs grouped by tool.
- Top Categories: calculated from published tool/category relationships.
- Search Keywords: calculated from `SearchQueryLog` grouped by normalized query.
- Import Statistics: derived from tools created in the selected period.
- Crawler Statistics: derived from `CrawlJob` status counts.

## Admin Experience

Updated `/admin/analytics` to include:

- Daily, weekly, and monthly period selector.
- Metric cards for Visitors, Views, Clicks, CTR, Growth, and Search Keywords.
- Traffic trend bars.
- Top Tools table.
- Top Categories table.
- Search Keywords table.
- Import Statistics panel.
- Crawler Statistics panel.
- CSV export button.
- Loading and API error states.

## API

Updated Analytics API endpoints:

- `GET /v1/analytics/providers`
- `GET /v1/analytics/overview?period=daily|weekly|monthly`
- `GET /v1/analytics/export.csv?period=daily|weekly|monthly`

The CSV export includes metric rows, top tools, top categories, search keywords, and trend rows.

## Performance Notes

The implementation avoids adding new write-heavy analytics tables during this sprint. It uses bounded queries with period filters and top-N aggregations.

Current limits:

- Trend source rows are capped at 5,000 per source for dashboard responsiveness.
- Visitors remain external-provider dependent.
- Page-level public web views need a dedicated event pipeline in a future sprint.

## Verification

Completed targeted checks:

- `pnpm --filter @ai-tool-cms/api typecheck`
- `pnpm --filter @ai-tool-cms/admin typecheck`

## Remaining Work

Recommended follow-up:

- Add first-party page view and visitor event ingestion.
- Connect live GA4, PostHog, or Umami API adapters.
- Add persisted daily/weekly/monthly rollup jobs for high-traffic production use.
- Add exports for filtered Top Tools and Search Keywords independently.
- Split pre-existing Blog CMS work into its own commit before creating the Analytics commit.