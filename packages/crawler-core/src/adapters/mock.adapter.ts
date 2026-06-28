import { BaseCrawler } from "../Crawler";
import { BaseAdapter } from "../Adapter";
import type { CrawlerContext } from "../context";
import { createCrawlRequest, type HttpFetcher } from "../Request";
import type { CrawlRawPage } from "../Response";
import { createCrawlResponse } from "../Response";
import type { CrawlCursor } from "../types";

/**
 * Mock adapter for local development and integration tests.
 * Returns a static JSON payload — no external network when paired with createMockFetcher().
 */
export class MockAdapter extends BaseAdapter {
  readonly sourceId = "mock";
  readonly displayName = "Mock Source";

  rateLimit = { minDelayMs: 0, maxRequestsPerMinute: 120 };

  async fetch(cursor: CrawlCursor | undefined, ctx: CrawlerContext): Promise<CrawlRawPage[]> {
    const page = cursor?.page ?? 1;
    if (page > 1) {
      return [];
    }

    const request = createCrawlRequest("https://mock.ai-tool-cms.local/api/tools", {
      cursor,
    });
    const response = await ctx.fetch(ctx.proxy.apply(request));

    return [
      {
        ...response,
        sourceId: this.sourceId,
        cursor: { page: page + 1, metadata: { hasMore: false } },
      },
    ];
  }
}

export type MockFixture = {
  id: string;
  name: string;
  website: string;
  description?: string;
};

export const MOCK_FIXTURES: MockFixture[] = [
  {
    id: "mock-1",
    name: "Mock AI Writer",
    website: "https://example.com/mock-writer",
    description: "Fixture tool for crawler SDK tests",
  },
  {
    id: "mock-2",
    name: "Mock Image Bot",
    website: "https://example.com/mock-image",
    description: "Second fixture tool",
  },
];

/** Fetcher that returns mock JSON without network I/O. */
export function createMockFetcher(fixtures: MockFixture[] = MOCK_FIXTURES): HttpFetcher {
  return async (request) => {
    const started = Date.now();
    return createCrawlResponse(request.url, {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: fixtures }),
      durationMs: Date.now() - started,
      cursor: request.cursor,
    });
  };
}

/** Example: `class ToolifyCrawler extends BaseCrawler` with a site-specific adapter. */
export class MockCrawler extends BaseCrawler {
  constructor(fetcher: HttpFetcher = createMockFetcher()) {
    super({
      adapter: new MockAdapter(),
      contextOptions: { fetch: fetcher, sourceId: "mock" },
    });
  }
}
