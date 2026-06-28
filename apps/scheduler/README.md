# scheduler

Polls `CrawlSource` registry and enqueues due crawls (Commit 029).

## Schedules

- `HOURLY` — every hour
- `DAILY` — uses `crawlIntervalMinutes` (default 1440)
- `WEEKLY` — every 7 days
- `MANUAL` — only via `POST /v1/crawler/jobs`

## Start

```bash
pnpm --filter @ai-tool-cms/scheduler dev
```

Requires PostgreSQL and Redis.
