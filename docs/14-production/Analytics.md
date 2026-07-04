# Release Candidate Sprint 2 Batch 8 - Production Analytics

## Summary

This batch completes the production analytics dashboard by wiring existing analytics APIs to real catalog, search, crawler, collection, and traffic-source signals. It does not add a new database schema and does not invent traffic data.

## Implemented Scope

### Dashboard Metrics

The Admin Analytics dashboard supports:

- Views from `ToolPopularitySnapshot.trafficScore`.
- Clicks from `SearchClickLog`.
- CTR calculated from search clicks divided by search queries.
- Search Terms from `SearchQueryLog.normalizedQuery`.
- Popular Tools from grouped `SearchClickLog.toolId`.
- Popular Categories from grouped published `ToolCategory` links.
- Collections from public `Collection` records and item counts.
- Traffic Sources from tracked `AffiliateClick.referrer` values.
- Import statistics from created tool counts in the selected period.
- Crawler statistics from `CrawlJob` status counts.

### Periods

The dashboard supports:

- Daily
- Weekly
- Monthly

Period selection is passed to `/v1/analytics/overview?period=...` and `/v1/analytics/export.csv?period=...`.

### CSV Export

CSV export includes:

- Metrics
- Top tools
- Top categories
- Search keywords
- Collections
- Traffic sources
- Trends

The Admin UI downloads the export from the existing authenticated API client.

## Data Source Strategy

| Area | Source | Notes |
| --- | --- | --- |
| Views | `ToolPopularitySnapshot.trafficScore` | Uses internal popularity snapshots until GA4/PostHog/Umami live visitor ingestion is wired. |
| Clicks | `SearchClickLog` | Search-result click tracking. |
| CTR | `SearchClickLog / SearchQueryLog` | Returns 0 when no searches exist. |
| Search Terms | `SearchQueryLog` | Grouped by normalized query. |
| Popular Tools | `SearchClickLog` + `Tool` | Excludes missing/deleted tool records. |
| Popular Categories | `ToolCategory` + `Category` | Published tools only. |
| Collections | `Collection` + `CollectionItem` | Public collections only. |
| Traffic Sources | `AffiliateClick.referrer` | Uses tracked referrers only; no synthetic sources. |
| Crawler | `CrawlJob` | Period-filtered status counts. |

## Admin UX

The existing `/admin/analytics` page now shows additional production sections:

- Collections
- Traffic Sources

Both sections support empty states when there is no tracked data.

## API

Existing endpoints were preserved:

- `GET /v1/analytics/providers`
- `GET /v1/analytics/overview?period=daily|weekly|monthly`
- `GET /v1/analytics/export.csv?period=daily|weekly|monthly`

No backend business logic outside analytics was changed.

## Files Changed

- `apps/api/src/analytics/analytics.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/app/(dashboard)/analytics/page.tsx`
- `docs/14-production/Analytics.md`

## Acceptance

- Dashboard returns production values from existing database models.
- Views, clicks, CTR, search terms, popular categories, popular tools, collections, and traffic sources are represented.
- CSV export includes the new sections.
- Daily, weekly, and monthly period options are supported.
- Empty values display as 0 or empty states, not fake data.
