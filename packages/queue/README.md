# queue

BullMQ queue definitions for the crawler platform (Commit 023).

## Queues

| Queue | Purpose |
|-------|---------|
| `crawl-tool` | Top-level source crawl orchestration |
| `crawl-category` | Fetch category taxonomy |
| `crawl-detail` | Fetch single tool detail |
| `crawl-image` | Logo / image processing |
| `normalize` | Normalize to `ToolDTO` and ingest |

## Usage

```ts
import { CRAWL_QUEUE_NAMES, enqueueCrawlJob } from "@ai-tool-cms/queue";

await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_TOOL, "manual", {
  sourceId: "...",
  crawlJobId: "...",
});
```

Requires `QUEUE_URL` or `REDIS_URL` in environment.
