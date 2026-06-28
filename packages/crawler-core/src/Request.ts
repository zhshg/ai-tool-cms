import type { CrawlCursor } from "./types";

export type HttpMethod = "GET" | "POST" | "HEAD";

/** Host-provided HTTP transport (apps/crawler wires fetch/axios here). */
export type HttpFetcher = (request: CrawlRequest) => Promise<import("./Response").CrawlResponse>;

/** Outbound crawl HTTP request descriptor. */
export type CrawlRequest = {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | Buffer;
  cursor?: CrawlCursor;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
};

export function createCrawlRequest(
  url: string,
  overrides: Partial<CrawlRequest> = {},
): CrawlRequest {
  return {
    url,
    method: "GET",
    headers: {
      "user-agent": "AI-Tool-CMS-Crawler/1.0 (+https://ai-tool-cms.local/bot)",
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
    timeoutMs: 30_000,
    ...overrides,
  };
}
