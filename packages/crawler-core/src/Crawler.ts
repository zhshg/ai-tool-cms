import type { CrawlCursor, CrawlRunResult } from "./types";
import type { CrawlerAdapter } from "./Adapter";
import type { HttpFetcher } from "./Request";
import type { CrawlerContext, CrawlerContextOptions } from "./context";
import { createCrawlerContext } from "./context";
import { CrawlPipeline, type PipelineOptions } from "./Pipeline";
import { globalAdapterRegistry } from "./Adapter";

export type BaseCrawlerOptions = {
  adapter: CrawlerAdapter;
  context?: CrawlerContext;
  contextOptions?: CrawlerContextOptions;
  pipeline?: PipelineOptions;
};

/**
 * Base crawler for all sources (Toolify, Futurepedia, OpenTools, AIBase, Product Hunt, …).
 *
 * @example
 * ```ts
 * class ToolifyCrawler extends BaseCrawler {
 *   constructor(fetch: HttpFetcher) {
 *     super({
 *       adapter: new ToolifyAdapter(),
 *       contextOptions: { fetch, sourceId: "toolify" },
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseCrawler {
  readonly sourceId: string;
  readonly displayName: string;

  protected readonly adapter: CrawlerAdapter;
  protected readonly context: CrawlerContext;
  protected readonly pipeline: CrawlPipeline;

  constructor(options: BaseCrawlerOptions) {
    this.adapter = options.adapter;
    this.sourceId = options.adapter.sourceId;
    this.displayName = options.adapter.displayName;
    this.context =
      options.context ??
      createCrawlerContext({
        ...options.contextOptions,
        fetch: options.contextOptions?.fetch as HttpFetcher,
        sourceId: options.contextOptions?.sourceId ?? options.adapter.sourceId,
      });

    if (!this.context.fetch) {
      throw new Error("BaseCrawler requires context.fetch or contextOptions.fetch");
    }
    this.pipeline = new CrawlPipeline(this.context, options.pipeline);

    globalAdapterRegistry.register(this.adapter);
  }

  /** Execute a single crawl pass. */
  async crawl(cursor?: CrawlCursor): Promise<CrawlRunResult> {
    this.context.logger.info("Crawler run started", {
      sourceId: this.sourceId,
      cursor,
    });
    return this.pipeline.execute(this.adapter, cursor);
  }

  /** Register this crawler's adapter globally (idempotent). */
  register(): this {
    globalAdapterRegistry.register(this.adapter);
    return this;
  }
}

export class CrawlerBuilder {
  private adapter?: CrawlerAdapter;
  private contextOptions: CrawlerContextOptions | undefined;
  private pipelineOptions: PipelineOptions | undefined;

  withAdapter(adapter: CrawlerAdapter): this {
    this.adapter = adapter;
    return this;
  }

  withContext(options: CrawlerContextOptions): this {
    this.contextOptions = options;
    return this;
  }

  withPipeline(options: PipelineOptions): this {
    this.pipelineOptions = options;
    return this;
  }

  build(): ConfiguredCrawler {
    if (!this.adapter || !this.contextOptions?.fetch) {
      throw new Error("CrawlerBuilder requires adapter and context.fetch");
    }

    return new ConfiguredCrawler({
      adapter: this.adapter,
      contextOptions: this.contextOptions,
      pipeline: this.pipelineOptions,
    });
  }
}

/** Non-abstract crawler for quick adapter wiring without subclassing. */
export class ConfiguredCrawler extends BaseCrawler {
  constructor(options: BaseCrawlerOptions) {
    super(options);
  }
}

export function createCrawlerBuilder(): CrawlerBuilder {
  return new CrawlerBuilder();
}
