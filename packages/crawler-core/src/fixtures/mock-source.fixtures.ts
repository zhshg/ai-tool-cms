import type { CrawlCategoryDTO, CrawlToolDetailDTO, CrawlToolListItemDTO } from "../ToolDTO";

/**
 * Local fixture data for framework validation — no external network.
 * Used by MockStructuredAdapter to exercise the full crawl → normalize pipeline.
 */
export type MockSourceFixtures = {
  categories: CrawlCategoryDTO[];
  tools: CrawlToolListItemDTO[];
  details: CrawlToolDetailDTO[];
};

export const MOCK_SOURCE_FIXTURES: MockSourceFixtures = {
  categories: [
    { externalId: "writing", name: "Writing", slug: "writing" },
    { externalId: "image", name: "Image", slug: "image" },
  ],
  tools: [
    {
      externalId: "mock-writer",
      name: "Mock AI Writer",
      slug: "mock-ai-writer",
      website: "https://example.com/mock-writer",
      summary: "Fixture writing assistant",
      logoUrl: "https://example.com/mock-writer/logo.png",
      categoryExternalIds: ["writing"],
    },
    {
      externalId: "mock-image",
      name: "Mock Image Bot",
      slug: "mock-image-bot",
      website: "https://example.com/mock-image",
      summary: "Fixture image generator",
      logoUrl: "https://example.com/mock-image/logo.png",
      categoryExternalIds: ["image"],
    },
    {
      externalId: "mock-duplicate",
      name: "Mock AI Writer",
      slug: "mock-ai-writer-dup",
      website: "https://example.com/mock-writer",
      summary: "Duplicate of mock-writer for dedup tests",
      categoryExternalIds: ["writing"],
    },
  ],
  details: [
    {
      externalId: "mock-writer",
      name: "Mock AI Writer",
      slug: "mock-ai-writer",
      website: "https://example.com/mock-writer",
      summary: "Fixture writing assistant",
      description: "A local fixture tool for validating crawler ingestion.",
      logoUrl: "https://example.com/mock-writer/logo.png",
      tags: ["writing", "productivity"],
      features: ["draft", "rewrite"],
      platforms: ["web"],
      pricingModel: "FREEMIUM",
    },
    {
      externalId: "mock-image",
      name: "Mock Image Bot",
      slug: "mock-image-bot",
      website: "https://example.com/mock-image",
      summary: "Fixture image generator",
      description: "Generates placeholder images from local fixtures.",
      logoUrl: "https://example.com/mock-image/logo.png",
      tags: ["image"],
      features: ["generate"],
      platforms: ["web"],
      pricingModel: "FREE",
    },
    {
      externalId: "mock-duplicate",
      name: "Mock AI Writer",
      slug: "mock-ai-writer-dup",
      website: "https://example.com/mock-writer",
      summary: "Duplicate of mock-writer for dedup tests",
      description: "Should be skipped by duplicate detection.",
      tags: ["writing"],
      features: [],
      platforms: ["web"],
      pricingModel: "FREE",
    },
  ],
};
