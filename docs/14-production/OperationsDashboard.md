# Operations Dashboard

Release Candidate Sprint 2 Batch 6

## Summary

This batch turns the existing Admin dashboard into a production operations center. It reuses the existing `/v1/operations/dashboard` endpoint and the current Admin dashboard route instead of adding a new Admin surface.

The dashboard now aggregates content quality, SEO health, broken links, missing logos, crawler status, worker status, import queue, AI queue, storage, search index, database health, system health, and recent activity.

## Implemented Scope

### Backend

Updated `apps/api/src/operations/operations.service.ts`.

The existing `GET /v1/operations/dashboard` response now includes:

- `contentScore`
- `seoScore`
- `brokenLinks`
- `missingLogos`
- `importQueue`
- `aiQueue`
- `storage`
- `database`
- `content`
- `seo`
- `crawler`
- `worker`
- `import`
- `ai`
- `search`
- `infrastructure`
- `recentActivity`

Existing fields remain compatible:

- `totalTools`
- `publishedTools`
- `draftTools`
- `categories`
- `tags`
- `users`
- `activeUsers`
- `pendingAiReview`
- `indexedTools`
- `crawlerJobs`
- `workerQueue`
- `schedulerJobs`
- `searchIndex`
- `lastCrawl`
- `systemHealth`

### Admin UI

Updated `apps/admin/src/components/dashboard/dashboard-summary.tsx`.

The Admin dashboard now displays:

- Primary catalog metrics
- Operations metrics
- Content Operations panel
- SEO & Search panel
- Queues panel
- Infrastructure panel
- Database panel
- Recent Activity panel
- RBAC Session panel

All missing values fall back to `0` or `unknown` instead of rendering blank states.

### Admin API Client

Updated `apps/admin/src/lib/api.ts`.

The `DashboardStatsResponse` type now represents the full operations payload, and `fetchDashboardStats()` normalizes legacy or partial responses so the UI remains resilient.

## Data Sources

| Dashboard Area | Source |
| --- | --- |
| Content Score | Tool content fields and relations |
| SEO Score | Latest `SeoHealthSnapshot`, fallback content SEO readiness |
| Broken Links | `BrokenLinkCheck.isHealthy=false` |
| Missing Logos | `Tool.logoUrl` and logo metadata fields |
| Crawler Status | `AutomationRun` discovery records |
| Worker Status | Pending/running automation runs and AI tasks |
| Import Queue | Pending/running discovery automation runs |
| AI Queue | `AiGenerationTask` pending/running records |
| Storage | Settings/database probe based configuration status |
| Search Index | Meilisearch configuration and published tools |
| Database | Prisma `SELECT 1` readiness probe |
| System Health | Database, Redis placeholder, Meilisearch, storage status |
| Recent Activity | Tools, content revisions, automation runs, audit logs |

## Acceptance Mapping

| Requirement | Status | Notes |
| --- | --- | --- |
| Content Score | PASS | Aggregated from current tool completeness checks. |
| SEO Score | PASS | Uses latest SEO snapshot, with content SEO fallback in Admin. |
| Broken Links | PASS | Counts unhealthy broken link checks. |
| Missing Logos | PASS | Counts missing stored or collected logo fields. |
| Crawler Status | PASS | Uses `AutomationRun` discovery status. |
| Worker Status | PASS | Uses pending/running automation and AI task depth. |
| Import Queue | PASS | Uses discovery automation queue approximation. |
| AI Queue | PASS | Uses pending/running AI generation tasks. |
| Storage | PASS | Reports configured/unknown from application settings probe. |
| Search Index | PASS | Uses Meilisearch config plus published tools count. |
| Database | PASS | Uses Prisma readiness query. |
| System Health | PASS | Returns health summary for Admin display. |
| Recent Activity | PASS | Aggregates latest tool, AI review, automation, and audit events. |

## Known Limitations

- Redis is currently represented by an application-level placeholder because this service does not directly inject a Redis client.
- Import Queue uses discovery automation runs as the current import pipeline signal. If a dedicated `ImportJob` model is added later, this should be switched to that source.
- Storage status is configuration-oriented, not a live MinIO/S3 object write-read probe.
- Worker queue depth is database-derived. A future version should add BullMQ live queue stats for crawler, AI, logo, screenshot, and search indexing queues.

## Verification

Attempted verification was constrained by the local dependency state inherited from the previous batch:

- `node_modules` is incomplete because registry/socket timeouts interrupted `pnpm install`.
- `node_modules/.bin/tsc.cmd` and `node_modules/.bin/eslint.cmd` are currently unavailable.
- Full `pnpm typecheck` and `pnpm lint` could not be completed until dependencies are restored.

Recommended verification once network is stable:

```bash
CI=true pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
```

Additional manual checks after containers are running:

```bash
curl http://localhost/v1/operations/dashboard
```

Then verify in browser:

- `/admin` loads the new operations dashboard.
- Metric cards show `0` or real values, never blank.
- Content Operations panel renders missing content counts.
- Queues panel renders crawler, worker, import, and AI queue status.
- Infrastructure panel renders database, Redis, storage, and search index status.
- Recent Activity panel renders recent items or an empty state.

## Files Changed

- `apps/api/src/operations/operations.service.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/components/dashboard/dashboard-summary.tsx`
- `docs/14-production/OperationsDashboard.md`

## Future Improvements

- Add live BullMQ queue depth per queue name.
- Add real Redis ping and MinIO/S3 write-read probe.
- Add dedicated import history model metrics when available.
- Add trend deltas for content score, SEO score, and broken links.
- Add alert thresholds for P0 operational failures.
