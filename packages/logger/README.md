# @ai-tool-cms/logger

基于 **Pino** 的统一结构化日志包，覆盖 API、HTTP 请求、后台任务等场景。

## 用法

```typescript
import {
  logger,
  createApiLogger,
  createRequestLogger,
  createWorkerLogger,
  logRequestComplete,
  logJobStart,
} from "@ai-tool-cms/logger";

// 默认单例（推荐）
logger.info("服务已启动");

// API 专用实例（可指定 level）
const apiLogger = createApiLogger({ service: "api", level: "debug" });

// HTTP 请求日志
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

// Worker 任务日志
const workerLogger = createWorkerLogger({ jobId: "job-1", queueName: "index" });
logJobStart(workerLogger, { jobId: "job-1", queueName: "index" });
```

## 日志器一览

| 导出 | `kind` | 默认 service | 场景 |
|---|---|---|---|
| `logger` | `app` | `app` | 全局默认单例 |
| `createApiLogger()` | `app` | `api` | NestJS / REST API |
| `createRequestLogger()` | `request` | `api` | HTTP 请求生命周期 |
| `createWorkerLogger()` | `worker` | `worker` | BullMQ / 后台任务 |
| `createCrawlerLogger()` | `crawler` | `crawler` | 爬虫任务 |

## 日志级别

由调用方通过 `LoggerOptions.level` 传入（推荐从 `@ai-tool-cms/config` 的 `env.LOG_LEVEL` 读取）。未指定时默认为 `info`。

## 脚本

```bash
pnpm --filter @ai-tool-cms/logger build
pnpm --filter @ai-tool-cms/logger typecheck
```
