import type { Logger } from "@ai-tool-cms/logger";
import { createCrawlerLogger } from "@ai-tool-cms/logger";

/** Crawler SDK logger (re-exports @ai-tool-cms/logger contract). */
export type CrawlerLogger = Logger;

export type CrawlerLoggerContext = {
  sourceId?: string;
  crawlJobId?: string;
  adapter?: string;
};

export function createSdkLogger(context: CrawlerLoggerContext = {}): CrawlerLogger {
  return createCrawlerLogger({
    crawlJobId: context.crawlJobId,
    source: context.sourceId ?? context.adapter,
  });
}

export class NoopLogger implements CrawlerLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  fatal(): void {}
  trace(): void {}
  child(): CrawlerLogger {
    return this;
  }
  raw = {} as CrawlerLogger["raw"];
}
