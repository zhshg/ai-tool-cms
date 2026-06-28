// Core SDK
export { BaseCrawler, ConfiguredCrawler, CrawlerBuilder, createCrawlerBuilder } from "./Crawler";
export type { BaseCrawlerOptions } from "./Crawler";

// Adapter layer
export { AdapterRegistry, BaseAdapter, globalAdapterRegistry } from "./Adapter";
export type { CrawlerAdapter } from "./Adapter";

// HTTP primitives
export { createCrawlRequest } from "./Request";
export type { CrawlRequest, HttpFetcher, HttpMethod } from "./Request";
export { createCrawlResponse, isRetryableStatus, isSuccessResponse } from "./Response";
export type { CrawlRawPage, CrawlResponse } from "./Response";

// Pipeline stages
export {
  defaultExtractorRegistry,
  ExtractorRegistry,
  JsonListExtractor,
  PassthroughExtractor,
} from "./Extractor";
export type { CrawlExtractedItem, Extractor } from "./Extractor";
export { defaultNormalizer, normalizeToolRecord, ToolDraftNormalizer } from "./Normalizer";
export type { NormalizeOptions, Normalizer } from "./Normalizer";
export { CrawlPipeline } from "./Pipeline";
export type { PipelineOptions } from "./Pipeline";

// Infrastructure
export { createCrawlerContext } from "./context";
export type { CrawlerContext, CrawlerContextOptions } from "./context";
export { createSdkLogger, NoopLogger } from "./Logger";
export type { CrawlerLogger, CrawlerLoggerContext } from "./Logger";
export { MemoryCrawlQueue } from "./Queue";
export type { CrawlQueue, CrawlQueueJob } from "./Queue";
export { createProxyProvider, NoProxy, StaticProxy } from "./Proxy";
export type { ProxyProvider } from "./Proxy";
export { createRateLimiter, DelayRateLimiter } from "./RateLimiter";
export type { RateLimiter } from "./RateLimiter";
export { computeBackoffDelay, DEFAULT_RETRY_CONFIG, defaultShouldRetry, retry } from "./Retry";
export type { RetryContext } from "./Retry";
export { MemoryCrawlStorage, NoopCrawlStorage } from "./Storage";
export type { CrawlStorage, StorageKey } from "./Storage";

// Types
export type {
  CrawlCursor,
  CrawlError,
  CrawlJobStatus,
  CrawlRunResult,
  CrawlRunStats,
  NormalizedToolDraft,
  ProxyConfig,
  RateLimitConfig,
  RetryConfig,
} from "./types";

// Built-in adapters
export {
  createMockFetcher,
  MockAdapter,
  MockCrawler,
  MOCK_FIXTURES,
} from "./adapters/mock.adapter";
export type { MockFixture } from "./adapters/mock.adapter";
export { ExampleSiteAdapter, ExampleSiteCrawler } from "./adapters/example-site.adapter";

// Site adapters (Commit 024–026)
export {
  registerSiteAdapters,
  SITE_ADAPTERS,
  ToolifyAdapter,
  FuturepediaAdapter,
  TaaftAdapter,
} from "./adapters";

// Unified DTO & normalization (Commit 027)
export type {
  ToolDTO,
  CrawlCategoryDTO,
  CrawlToolListItemDTO,
  CrawlToolDetailDTO,
} from "./ToolDTO";
export {
  UnifiedToolNormalizer,
  unifiedToolNormalizer,
  normalizeToToolDTO,
} from "./UnifiedNormalizer";
export type { UnifiedNormalizeInput } from "./UnifiedNormalizer";

// Structured adapter base (Commit 024)
export { StructuredSiteAdapter } from "./StructuredSiteAdapter";
export type { FieldMapping, StructuredAdapterConfig } from "./StructuredSiteAdapter";

// Duplicate detection (Commit 028)
export { DuplicateDetector, defaultDuplicateDetector } from "./DuplicateDetector";
export type {
  DuplicateCandidate,
  DuplicateCheckResult,
  DuplicateMatch,
  DuplicateDetectorOptions,
  ExistingToolRecord,
} from "./DuplicateDetector";

// Ingestion helper (Commit 028)
export { ingestToolDtos } from "./Ingestion";
export type { IngestionResult, ToolPersistence } from "./Ingestion";

// Scheduler helpers (Commit 029)
export { computeNextRunAt, isSourceRunnable } from "./schedule";
