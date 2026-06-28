import { describe, expect, it } from "vitest";
import { buildGeoDocument } from "@ai-tool-cms/geo";

describe("growth geo integration", () => {
  it("builds LLM-ready document from tool context", () => {
    const doc = buildGeoDocument({
      slug: "chatgpt",
      name: "ChatGPT",
      website: "https://chat.openai.com",
      description: "AI assistant",
      category: "AI Writing",
    });
    expect(doc.llmSummary).toContain("ChatGPT");
    expect(doc.targets).toContain("perplexity");
  });
});
