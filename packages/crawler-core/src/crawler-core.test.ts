import { describe, expect, it } from "vitest";
import { normalizeToolRecord } from "./Normalizer";
import { computeBackoffDelay, retry, DEFAULT_RETRY_CONFIG } from "./Retry";
import { DelayRateLimiter } from "./RateLimiter";
import { MockCrawler, createMockFetcher, createCrawlerContext } from "./index";
import { DuplicateDetector, defaultDuplicateDetector } from "./DuplicateDetector";
import { unifiedToolNormalizer } from "./UnifiedNormalizer";
import { computeNextRunAt } from "./schedule";
import { MockStructuredAdapter } from "./adapters/mock-structured.adapter";
import { MOCK_SOURCE_FIXTURES } from "./fixtures/mock-source.fixtures";

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

describe("DuplicateDetector", () => {
  it("detects duplicate by website", () => {
    const detector = new DuplicateDetector();
    const result = detector.check(
      {
        name: "ChatGPT",
        slug: "chatgpt",
        website: "https://chat.openai.com",
        domain: "chat.openai.com",
      },
      [
        {
          id: "1",
          name: "OpenAI Chat",
          slug: "chatgpt",
          website: "https://chat.openai.com/",
          domain: "chat.openai.com",
        },
      ],
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.bestMatch?.reasons).toContain("website");
  });
});

describe("UnifiedToolNormalizer", () => {
  it("normalizes structured detail to ToolDTO", () => {
    const dto = unifiedToolNormalizer.normalize({
      sourceId: "toolify",
      detail: {
        externalId: "1",
        name: "Midjourney",
        website: "https://midjourney.com",
        description: "Image AI",
        tags: ["image"],
        features: [],
        platforms: ["web"],
      },
    });

    expect(dto).toMatchObject({
      name: "Midjourney",
      domain: "midjourney.com",
      sourceId: "toolify",
      tags: ["image"],
    });
  });
});

describe("computeNextRunAt", () => {
  it("returns null for manual schedule", () => {
    expect(computeNextRunAt("MANUAL", 60)).toBeNull();
  });
});

describe("MockStructuredAdapter pipeline", () => {
  it("runs categories → tools → detail → normalize without network", async () => {
    const adapter = new MockStructuredAdapter();
    const ctx = createCrawlerContext({ fetch: createMockFetcher() });

    const categories = await adapter.getCategories(ctx);
    expect(categories.length).toBeGreaterThanOrEqual(1);

    const { items } = await adapter.getTools(ctx, categories[0]);
    expect(items.length).toBeGreaterThanOrEqual(1);

    const detail = await adapter.getDetail(ctx, items[0]!);
    const dto = adapter.normalize(detail!);

    expect(dto).toMatchObject({
      name: items[0]!.name,
      sourceId: "mock",
      website: items[0]!.website,
    });
  });

  it("deduplicates fixture tools by website", () => {
    const adapter = new MockStructuredAdapter();
    const normalized = MOCK_SOURCE_FIXTURES.details
      .map((detail) => adapter.normalize({ ...detail, raw: {} }))
      .filter((dto): dto is NonNullable<typeof dto> => Boolean(dto));

    const { unique, duplicates } = defaultDuplicateDetector.filterUnique(normalized, []);
    expect(unique.length).toBe(2);
    expect(duplicates.length).toBe(1);
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
