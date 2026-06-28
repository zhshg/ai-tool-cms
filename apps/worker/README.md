# worker

Independent BullMQ worker process for crawler queues (Commit 023).

## Start

```bash
pnpm --filter @ai-tool-cms/worker dev
```

Requires PostgreSQL and Redis (`QUEUE_URL` / `REDIS_URL`).

Processes all five queues: `crawl-tool`, `crawl-category`, `crawl-detail`, `crawl-image`, `normalize`.
