import { describe, expect, it } from "vitest";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import { planCrawlerImports } from "./crawler-plan";
import type { CandidateDraft, ExistingToolLite } from "./types";

function makeCandidate(partial: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    sourceId: "futurepedia",
    sourceName: "Futurepedia",
    sourceUrl: "https://www.futurepedia.io/tool/test-tool",
    externalId: "test-tool",
    name: "Test Tool",
    websiteUrl: "https://example.ai",
    logoUrl: "https://cdn.example.ai/logo.png",
    shortDescription: "A reliable AI tool for planning and workflow automation.",
    description:
      "A reliable AI tool for planning, workflow automation, collaboration, and content review across fast-moving teams.",
    category: "Productivity",
    tags: ["automation", "productivity", "workflow"],
    pricingType: PricingModel.FREEMIUM,
    slug: "test-tool",
    confidenceScore: 0.92,
    isValid: true,
    validationErrors: [],
    warnings: [],
    discoveredAt: "2026-07-09T00:00:00.000Z",
    metadata: {},
    ...partial,
  };
}

function makeExisting(partial: Partial<ExistingToolLite> = {}): ExistingToolLite {
  return {
    id: "tool-1",
    slug: "existing-tool",
    name: "Existing Tool",
    website: "https://existing.ai",
    logoUrl: null,
    summary: null,
    description: null,
    status: ToolStatus.PUBLISHED,
    metadata: {},
    categorySlugs: ["ai-productivity"],
    tagNames: [],
    ...partial,
  };
}

describe("planCrawlerImports", () => {
  it("skips duplicates by default when update-existing is disabled", () => {
    const result = planCrawlerImports({
      candidates: [makeCandidate({ websiteUrl: "https://existing.ai", slug: "existing-tool" })],
      existingTools: [makeExisting()],
      categories: [{ id: "cat-1", slug: "ai-productivity", name: "AI Productivity" }],
      options: {
        updateExisting: false,
        categoryFallbackSlug: "ai-productivity",
        defaultStatus: ToolStatus.PUBLISHED,
        skipLogo: false,
      },
    });

    expect(result.decisions[0]?.action).toBe("skip");
    expect(result.summary.planUpdateCount).toBe(0);
    expect(result.summary.duplicateCount).toBe(1);
  });

  it("plans a safe update when update-existing is enabled and only empty fields will change", () => {
    const result = planCrawlerImports({
      candidates: [
        makeCandidate({
          websiteUrl: "https://existing.ai",
          slug: "existing-tool",
          logoUrl: "https://cdn.example.ai/existing.png",
        }),
      ],
      existingTools: [makeExisting()],
      categories: [{ id: "cat-1", slug: "ai-productivity", name: "AI Productivity" }],
      options: {
        updateExisting: true,
        categoryFallbackSlug: "ai-productivity",
        defaultStatus: ToolStatus.PUBLISHED,
        skipLogo: false,
      },
    });

    expect(result.decisions[0]?.action).toBe("update");
    expect(result.decisions[0]?.updateFields).toContain("logoUrl");
    expect(result.summary.planUpdateCount).toBe(1);
  });

  it("uses an existing fallback category instead of creating a new category", () => {
    const result = planCrawlerImports({
      candidates: [makeCandidate({ category: "Unknown Bucket" })],
      existingTools: [],
      categories: [{ id: "cat-1", slug: "ai-productivity", name: "AI Productivity" }],
      options: {
        updateExisting: false,
        categoryFallbackSlug: "ai-productivity",
        defaultStatus: ToolStatus.PUBLISHED,
        skipLogo: false,
      },
    });

    expect(result.decisions[0]?.normalized.categorySlug).toBe("ai-productivity");
    expect(result.decisions[0]?.warnings).toContain("category fallback applied");
    expect(result.summary.fallbackCategoryCount).toBe(1);
  });

  it("adds a stable hash suffix when the candidate slug conflicts with another tool", () => {
    const result = planCrawlerImports({
      candidates: [makeCandidate({ slug: "existing-tool", websiteUrl: "https://different.ai" })],
      existingTools: [makeExisting()],
      categories: [{ id: "cat-1", slug: "ai-productivity", name: "AI Productivity" }],
      options: {
        updateExisting: false,
        categoryFallbackSlug: "ai-productivity",
        defaultStatus: ToolStatus.PUBLISHED,
        skipLogo: false,
      },
    });

    expect(result.decisions[0]?.action).toBe("create");
    expect(result.decisions[0]?.normalized.slug).toMatch(/^existing-tool-[a-f0-9]{4}$/);
  });
});
