import { createLogger } from "./create-logger";
import type { Logger, LoggerOptions } from "./types";
import { LoggerKind } from "./types";

export interface CrawlerLogContext {
  crawlJobId?: string;
  source?: string;
  url?: string;
  workerName?: string;
}

export function createCrawlerLogger(
  context: CrawlerLogContext = {},
  options: LoggerOptions = { service: "crawler" },
): Logger {
  return createLogger(options).child({
    kind: LoggerKind.Crawler,
    ...context,
  });
}

export function logCrawlStart(logger: Logger, context: CrawlerLogContext): void {
  logger.info("Crawl started", {
    event: "crawl.start",
    crawlJobId: context.crawlJobId,
    source: context.source,
    url: context.url,
    workerName: context.workerName,
  });
}

export function logCrawlComplete(
  logger: Logger,
  context: CrawlerLogContext,
  durationMs: number,
  stats?: Record<string, unknown>,
): void {
  logger.info("Crawl completed", {
    event: "crawl.complete",
    crawlJobId: context.crawlJobId,
    source: context.source,
    url: context.url,
    workerName: context.workerName,
    durationMs,
    stats,
  });
}

export function logCrawlFailed(
  logger: Logger,
  context: CrawlerLogContext,
  error: unknown,
  durationMs?: number,
): void {
  logger.error("Crawl failed", {
    event: "crawl.failed",
    crawlJobId: context.crawlJobId,
    source: context.source,
    url: context.url,
    workerName: context.workerName,
    durationMs,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
