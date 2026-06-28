# @ai-tool-cms/logger

Unified structured logging on **Pino** for all apps and workers.

**Status:** Infrastructure scaffold — JSON logs with consistent `service` and `kind` bindings.

## Usage

```typescript
import {
  createLogger,
  createRequestLogger,
  createWorkerLogger,
  createCrawlerLogger,
  logRequestComplete,
  logJobStart,
  logCrawlStart,
} from "@ai-tool-cms/logger";

const logger = createLogger({ service: "api" });
logger.info("Server ready", { port: 4000 });

const requestLogger = createRequestLogger({
  requestId: "req-123",
  method: "GET",
  path: "/health",
});
logRequestComplete(requestLogger, {
  requestId: "req-123",
  method: "GET",
  path: "/health",
  statusCode: 200,
  durationMs: 12,
});
```

## Loggers

| Factory | `kind` | Service default | Use case |
|---|---|---|---|
| `createLogger()` | `app` | custom | General application logging |
| `createRequestLogger()` | `request` | `api` | HTTP request lifecycle |
| `createWorkerLogger()` | `worker` | `worker` | BullMQ / background jobs |
| `createCrawlerLogger()` | `crawler` | `crawler` | Crawl jobs and ingestion |

## Log level

由调用方通过 `LoggerOptions.level` 传入（推荐从 `@ai-tool-cms/config` 的 `env.LOG_LEVEL` 读取）。未指定时默认为 `info`。

## Scripts

```bash
pnpm --filter @ai-tool-cms/logger build
pnpm --filter @ai-tool-cms/logger typecheck
```

## Layout

```
packages/logger/src/
├── create-logger.ts
├── request-logger.ts
├── worker-logger.ts
├── crawler-logger.ts
├── types.ts
└── index.ts
```

## Consumers

| Consumer | Integration |
|---|---|
| `apps/api` | Nest `AppLoggerService` wraps `createLogger({ service: 'api' })` |
| `apps/worker` | `createWorkerLogger` + job lifecycle helpers |
| `apps/crawler` | `createCrawlerLogger` + crawl lifecycle helpers |
| `apps/web` / `apps/admin` | Server components and route handlers |
