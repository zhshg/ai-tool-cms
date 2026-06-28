/** Pagination / resume cursor passed between crawl batches. */
export type CrawlCursor = {
  page?: number;
  offset?: number;
  nextUrl?: string;
  token?: string;
  metadata?: Record<string, unknown>;
};

/** RFC-0002 normalized tool draft — never auto-published. */
export type NormalizedToolDraft = {
  name: string;
  website: string;
  description?: string;
  summary?: string;
  logoUrl?: string;
  slug?: string;
  externalId?: string;
  sourceMeta?: Record<string, unknown>;
  tags?: string[];
  categories?: string[];
};

export type CrawlJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type CrawlRunStats = {
  pagesFetched: number;
  itemsExtracted: number;
  itemsNormalized: number;
  itemsSkipped: number;
  errors: number;
};

export type CrawlRunResult = {
  sourceId: string;
  status: CrawlJobStatus;
  drafts: NormalizedToolDraft[];
  cursor?: CrawlCursor;
  stats: CrawlRunStats;
  errors: CrawlError[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type CrawlError = {
  phase: "fetch" | "parse" | "extract" | "normalize" | "pipeline";
  message: string;
  url?: string;
  cause?: unknown;
};

export type RateLimitConfig = {
  /** Minimum delay between outbound requests (ms). */
  minDelayMs: number;
  /** Max requests per minute (optional hard cap). */
  maxRequestsPerMinute?: number;
};

export type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses?: number[];
};

export type ProxyConfig = {
  enabled: boolean;
  url?: string;
  username?: string;
  password?: string;
};
