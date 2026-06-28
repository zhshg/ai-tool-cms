import type {
  CrawlCursor,
  CrawlError,
  CrawlRunResult,
  CrawlRunStats,
  NormalizedToolDraft,
} from "./types";
import type { CrawlerAdapter } from "./Adapter";
import type { CrawlerContext } from "./context";
import type { CrawlRawPage } from "./Response";
import { isSuccessResponse } from "./Response";
import { defaultExtractorRegistry } from "./Extractor";
import { defaultNormalizer } from "./Normalizer";
import { retry } from "./Retry";
import { logCrawlComplete, logCrawlFailed, logCrawlStart } from "@ai-tool-cms/logger";

export type PipelineOptions = {
  useStorageCache?: boolean;
};

export class CrawlPipeline {
  constructor(
    private readonly ctx: CrawlerContext,
    private readonly options: PipelineOptions = {},
  ) {}

  async execute(adapter: CrawlerAdapter, cursor?: CrawlCursor): Promise<CrawlRunResult> {
    const startedAt = new Date();
    const stats: CrawlRunStats = {
      pagesFetched: 0,
      itemsExtracted: 0,
      itemsNormalized: 0,
      itemsSkipped: 0,
      errors: 0,
    };
    const errors: CrawlError[] = [];
    const drafts: NormalizedToolDraft[] = [];
    let nextCursor: CrawlCursor | undefined = cursor;

    const logContext = {
      crawlJobId: this.ctx.crawlJobId,
      source: adapter.sourceId,
    };

    logCrawlStart(this.ctx.logger, logContext);

    try {
      const pages = await this.fetchPages(adapter, cursor, errors, stats);
      stats.pagesFetched = pages.length;

      for (const page of pages) {
        nextCursor = page.cursor ?? nextCursor;
        try {
          const extracted = await this.extractFromPage(adapter, page);
          stats.itemsExtracted += extracted.length;

          const normalized = defaultNormalizer.normalizeMany(extracted, {
            sourceId: adapter.sourceId,
          });
          stats.itemsSkipped += extracted.length - normalized.length;
          stats.itemsNormalized += normalized.length;
          drafts.push(...normalized);

          if (this.options.useStorageCache) {
            await this.ctx.storage.put(page);
          }
        } catch (error) {
          stats.errors += 1;
          errors.push({
            phase: "extract",
            message: error instanceof Error ? error.message : String(error),
            url: page.url,
            cause: error,
          });
          this.ctx.logger.warn("Extract failed", { url: page.url, error });
        }
      }

      const finishedAt = new Date();
      const result: CrawlRunResult = {
        sourceId: adapter.sourceId,
        status: errors.length > 0 && drafts.length === 0 ? "FAILED" : "SUCCEEDED",
        drafts,
        cursor: nextCursor,
        stats,
        errors,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };

      logCrawlComplete(this.ctx.logger, logContext, result.durationMs, {
        ...result.stats,
      });

      return result;
    } catch (error) {
      const finishedAt = new Date();
      stats.errors += 1;
      errors.push({
        phase: "pipeline",
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });

      logCrawlFailed(
        this.ctx.logger,
        logContext,
        error,
        finishedAt.getTime() - startedAt.getTime(),
      );

      return {
        sourceId: adapter.sourceId,
        status: "FAILED",
        drafts,
        cursor: nextCursor,
        stats,
        errors,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }
  }

  private async fetchPages(
    adapter: CrawlerAdapter,
    cursor: CrawlCursor | undefined,
    errors: CrawlError[],
    stats: CrawlRunStats,
  ): Promise<CrawlRawPage[]> {
    try {
      return await retry(
        async () => {
          await this.ctx.rateLimiter.acquire();
          return adapter.fetch(cursor, this.ctx);
        },
        this.ctx.retry,
        () => true,
      );
    } catch (error) {
      stats.errors += 1;
      errors.push({
        phase: "fetch",
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });
      throw error;
    }
  }

  private async extractFromPage(
    adapter: CrawlerAdapter,
    page: CrawlRawPage,
  ): Promise<import("./Extractor").CrawlExtractedItem[]> {
    if (!isSuccessResponse(page)) {
      throw new Error(`HTTP ${page.status} for ${page.url}`);
    }

    if (adapter.parse) {
      return adapter.parse(page, this.ctx);
    }

    return defaultExtractorRegistry.extract(page);
  }
}
