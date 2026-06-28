import type { CrawlCursor, RateLimitConfig } from "./types";
import type { CrawlRawPage } from "./Response";
import type { CrawlExtractedItem } from "./Extractor";
import type { CrawlerContext } from "./context";

export type CrawlerAdapter = {
  readonly sourceId: string;
  readonly displayName: string;
  readonly rateLimit?: RateLimitConfig;

  /** Fetch one or more raw pages from the source. */
  fetch(cursor: CrawlCursor | undefined, ctx: CrawlerContext): Promise<CrawlRawPage[]>;

  /**
   * Optional custom parse step.
   * Default pipeline uses ExtractorRegistry when not overridden.
   */
  parse?(page: CrawlRawPage, ctx: CrawlerContext): Promise<CrawlExtractedItem[]>;
};

export abstract class BaseAdapter implements CrawlerAdapter {
  abstract readonly sourceId: string;
  abstract readonly displayName: string;

  rateLimit: RateLimitConfig = {
    minDelayMs: 1_000,
    maxRequestsPerMinute: 30,
  };

  abstract fetch(cursor: CrawlCursor | undefined, ctx: CrawlerContext): Promise<CrawlRawPage[]>;

  parse?(page: CrawlRawPage, ctx: CrawlerContext): Promise<CrawlExtractedItem[]>;
}

export class AdapterRegistry {
  private readonly adapters = new Map<string, CrawlerAdapter>();

  register(adapter: CrawlerAdapter): this {
    this.adapters.set(adapter.sourceId, adapter);
    return this;
  }

  get(sourceId: string): CrawlerAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  list(): CrawlerAdapter[] {
    return [...this.adapters.values()];
  }

  has(sourceId: string): boolean {
    return this.adapters.has(sourceId);
  }
}

export const globalAdapterRegistry = new AdapterRegistry();
