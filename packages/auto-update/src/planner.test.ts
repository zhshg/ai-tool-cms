import { describe, expect, it } from "vitest";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import { planCandidates } from "./planner";
import type { CandidateDraft, ExistingToolLite } from "./types";

function makeCandidate(partial: Partial<CandidateDraft> = {}): CandidateDraft {
  return {
    sourceId: "futurepedia",
    sourceName: "Futurepedia",
    sourceUrl: "https://www.futurepedia.io/tool/test",
    name: "Test Tool",
    websiteUrl: "https://example.ai",
    logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=example.ai",
    shortDescription: "A complete AI tool description for planning tests.",
    description:
      "A complete AI tool description for planning tests that is long enough to pass validation.",
    category: "Productivity",
    tags: ["ai", "productivity"],
    pricingType: PricingModel.FREEMIUM,
    slug: "test-tool",
    confidenceScore: 0.92,
    isValid: true,
    validationErrors: [],
    warnings: [],
    discoveredAt: new Date().toISOString(),
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
    categorySlugs: ["productivity"],
    tagNames: [],
    ...partial,
  };
}

describe("planCandidates", () => {
  it("allows safe-auto create for high-confidence new tools", () => {
    const result = planCandidates({
      mode: "safe-auto",
      dailyLimit: 5,
      minConfidence: 0.85,
      candidates: [makeCandidate()],
      existingTools: [],
    });
    expect(result.decisions[0]?.status).toBe("create");
    expect(result.decisions[0]?.publish).toBe(true);
  });

  it("blocks updating existing tools in safe-auto", () => {
    const result = planCandidates({
      mode: "safe-auto",
      dailyLimit: 5,
      minConfidence: 0.85,
      candidates: [makeCandidate({ slug: "existing-tool", websiteUrl: "https://existing.ai" })],
      existingTools: [makeExisting()],
    });
    expect(result.decisions[0]?.status).toBe("skip");
    expect(result.decisions[0]?.reasons.join(" ")).toContain(
      "safe-auto forbids updating existing tools",
    );
  });

  it("sends low-confidence candidates to draft in manual-review", () => {
    const result = planCandidates({
      mode: "manual-review",
      dailyLimit: 5,
      minConfidence: 0.85,
      candidates: [makeCandidate({ confidenceScore: 0.42 })],
      existingTools: [],
    });
    expect(result.decisions[0]?.status).toBe("draft");
    expect(result.summary.lowConfidenceCount).toBe(1);
  });
});
