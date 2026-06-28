import { describe, expect, it } from "vitest";
import { normalizeToolRecord } from "./Normalizer";
import { computeBackoffDelay, retry, DEFAULT_RETRY_CONFIG } from "./Retry";
import { DelayRateLimiter } from "./RateLimiter";
import { MockCrawler } from "./adapters/mock.adapter";

describe("ToolDraftNormalizer", () => {
  it("normalizes valid extracted items", () => {
    const draft = normalizeToolRecord(
      {
        name: "ChatGPT",
        website: "https://chat.openai.com",
        description: "AI assistant",
        externalId: "ext-1",
      },
      { sourceId: "toolify" },
    );

    expect(draft).toMatchObject({
      name: "ChatGPT",
      website: "https://chat.openai.com",
      slug: "chatgpt",
      externalId: "ext-1",
    });
  });

  it("skips items missing required fields", () => {
    const draft = normalizeToolRecord({ name: "No URL" }, { sourceId: "test" });
    expect(draft).toBeNull();
  });
});

describe("retry", () => {
  it("retries until success", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("temporary");
        return "ok";
      },
      { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 1, maxDelayMs: 5 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("computes exponential backoff", () => {
    expect(
      computeBackoffDelay(1, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 100, maxDelayMs: 10_000 }),
    ).toBeGreaterThanOrEqual(100);
    expect(
      computeBackoffDelay(3, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 100, maxDelayMs: 10_000 }),
    ).toBeLessThanOrEqual(500);
  });
});

describe("DelayRateLimiter", () => {
  it("enforces minimum delay", async () => {
    const limiter = new DelayRateLimiter({ minDelayMs: 20 });
    const start = Date.now();
    await limiter.acquire();
    await limiter.acquire();
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe("MockCrawler", () => {
  it("runs end-to-end pipeline", async () => {
    const crawler = new MockCrawler();
    const result = await crawler.crawl();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.drafts.length).toBeGreaterThanOrEqual(2);
    expect(result.stats.itemsNormalized).toBeGreaterThanOrEqual(2);
  });
});
