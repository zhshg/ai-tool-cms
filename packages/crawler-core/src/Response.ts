import type { CrawlCursor } from "./types";

/** Raw HTTP response from a crawl fetch. */
export type CrawlResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  contentType?: string;
  fetchedAt: string;
  durationMs: number;
  cursor?: CrawlCursor;
};

export type CrawlRawPage = CrawlResponse & {
  sourceId: string;
  externalId?: string;
};

export function createCrawlResponse(
  requestUrl: string,
  init: {
    status: number;
    headers?: Record<string, string>;
    body: string;
    durationMs: number;
    cursor?: CrawlCursor;
  },
): CrawlResponse {
  const headers = normalizeHeaders(init.headers ?? {});
  const contentType = headers["content-type"];

  return {
    url: requestUrl,
    status: init.status,
    headers,
    body: init.body,
    contentType,
    fetchedAt: new Date().toISOString(),
    durationMs: init.durationMs,
    cursor: init.cursor,
  };
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

export function isSuccessResponse(response: CrawlResponse): boolean {
  return response.status >= 200 && response.status < 300;
}

export function isRetryableStatus(
  status: number,
  retryable = [408, 429, 500, 502, 503, 504],
): boolean {
  return retryable.includes(status);
}
