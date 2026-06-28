import { describe, expect, it } from "vitest";
import { expandQuerySynonyms } from "./synonyms";
import { cosineSimilarity } from "./ranking";
import { buildMeiliFilter } from "./filters";

describe("synonyms", () => {
  it("expands AI PPT to presentation tools", () => {
    const expanded = expandQuerySynonyms("AI PPT");
    expect(expanded.toLowerCase()).toContain("presentation");
    expect(expanded.toLowerCase()).toContain("gamma");
  });
});

describe("ranking", () => {
  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("filters", () => {
  it("builds meilisearch filter string", () => {
    const filter = buildMeiliFilter({ category: "ai-writing", pricing: "FREE" });
    expect(filter).toContain("categorySlugs");
    expect(filter).toContain("pricingModel");
  });
});
