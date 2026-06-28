import { describe, expect, it } from "vitest";
import { computeToolPopularity } from "./popularity";

describe("computeToolPopularity", () => {
  it("scores published tools with SEO and AI signals", () => {
    const score = computeToolPopularity({
      toolId: "1",
      slug: "chatgpt",
      name: "ChatGPT",
      metaTitle: "ChatGPT Review",
      metaDescription: "Best AI chatbot",
      summary: "AI assistant",
      publishedAt: new Date(),
      updatedAt: new Date(),
      metadata: { aiPipeline: { quality: { overall: 90 } }, geoDocument: {} },
      reviewCount: 10,
      averageRating: 4.5,
      favoriteCount: 50,
      clickCount: 100,
      viewCount: 1000,
    });
    expect(score.overallScore).toBeGreaterThan(50);
    expect(score.seoScore).toBeGreaterThan(0);
    expect(score.aiScore).toBeGreaterThan(0);
  });
});
