import type { CrawlerLogger } from "./Logger";
import type { ProxyProvider } from "./Proxy";
import type { RateLimiter } from "./RateLimiter";
import type { CrawlStorage } from "./Storage";
import type { CrawlQueue } from "./Queue";
import type { HttpFetcher } from "./Request";
import type { RetryConfig } from "./types";
import { DEFAULT_RETRY_CONFIG } from "./Retry";
import { createRateLimiter } from "./RateLimiter";
import { createProxyProvider } from "./Proxy";
import { NoopCrawlStorage } from "./Storage";
import { createSdkLogger } from "./Logger";

/** Runtime dependencies injected into crawlers by apps/crawler. */
export type CrawlerContext = {
  fetch: HttpFetcher;
  logger: CrawlerLogger;
  rateLimiter: RateLimiter;
  storage: CrawlStorage;
  queue?: CrawlQueue;
  proxy: ProxyProvider;
  retry: RetryConfig;
  crawlJobId?: string;
};

export type CrawlerContextOptions = {
  fetch: HttpFetcher;
  logger?: CrawlerLogger;
  rateLimiter?: RateLimiter;
  storage?: CrawlStorage;
  queue?: CrawlQueue;
  proxy?: ProxyProvider;
  retry?: Partial<RetryConfig>;
  crawlJobId?: string;
  sourceId?: string;
};

export function createCrawlerContext(options: CrawlerContextOptions): CrawlerContext {
  return {
    fetch: options.fetch,
    logger:
      options.logger ??
      createSdkLogger({ sourceId: options.sourceId, crawlJobId: options.crawlJobId }),
    rateLimiter: options.rateLimiter ?? createRateLimiter(),
    storage: options.storage ?? new NoopCrawlStorage(),
    queue: options.queue,
    proxy: options.proxy ?? createProxyProvider(),
    retry: { ...DEFAULT_RETRY_CONFIG, ...options.retry },
    crawlJobId: options.crawlJobId,
  };
}
