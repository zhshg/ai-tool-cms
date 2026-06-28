/**
 * Site crawler template — copy to `toolify.adapter.ts`, `futurepedia.adapter.ts`, etc.
 *
 * Pattern:
 *   1. Extend BaseAdapter  → fetch + optional parse
 *   2. Extend BaseCrawler → wire adapter + HttpFetcher
 *   3. Register in apps/crawler adapter registry
 */
import { BaseAdapter } from "../Adapter";
import { BaseCrawler } from "../Crawler";
import { createCrawlRequest, type HttpFetcher } from "../Request";
import type { CrawlRawPage } from "../Response";
import type { CrawlCursor } from "../types";
import type { CrawlerContext } from "../context";

export class ExampleSiteAdapter extends BaseAdapter {
  readonly sourceId = "example-site";
  readonly displayName = "Example Site";

  async fetch(cursor: CrawlCursor | undefined, ctx: CrawlerContext): Promise<CrawlRawPage[]> {
    const url = cursor?.nextUrl ?? "https://example.com/api/tools?page=1";
    const request = createCrawlRequest(url, { cursor });
    const response = await ctx.fetch(ctx.proxy.apply(request));

    return [
      {
        ...response,
        sourceId: this.sourceId,
        cursor: {
          page: (cursor?.page ?? 1) + 1,
          nextUrl: undefined,
        },
      },
    ];
  }
}

export class ExampleSiteCrawler extends BaseCrawler {
  constructor(fetch: HttpFetcher) {
    super({
      adapter: new ExampleSiteAdapter(),
      contextOptions: {
        fetch,
        sourceId: "example-site",
      },
    });
  }
}
