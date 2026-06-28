import type { CrawlRequest } from "@ai-tool-cms/crawler-core";
import { createCrawlResponse } from "@ai-tool-cms/crawler-core";

export const defaultHttpFetcher = async (request: CrawlRequest) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 30_000);

  try {
    const response = await fetch(request.url, {
      method: request.method ?? "GET",
      headers: request.headers,
      body: request.body as string | undefined,
      signal: controller.signal,
    });

    const body = await response.text();
    return createCrawlResponse(request.url, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      durationMs: 0,
    });
  } finally {
    clearTimeout(timeout);
  }
};
