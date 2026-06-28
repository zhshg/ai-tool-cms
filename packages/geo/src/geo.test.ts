import { describe, expect, it } from "vitest";
import { buildGeoContentBlocks, buildGeoDocument, buildGeoPlainText } from "./index";

describe("GEO Engine", () => {
  it("builds LLM-optimized document from tool geo payload", () => {
    const doc = buildGeoDocument({
      slug: "chatgpt",
      name: "ChatGPT",
      website: "https://chat.openai.com",
      description: "AI chat assistant",
      category: "Chatbots",
      geo: {
        aiAnswer: "ChatGPT is an AI assistant by OpenAI.",
        llmSummary: "ChatGPT helps users with conversational AI tasks.",
        structuredFacts: [{ fact: "Supports plugins", confidence: "high" }],
        questionClusters: [["What is ChatGPT?"]],
        semanticParagraphs: ["Neutral encyclopedic summary."],
      },
    });

    expect(doc.llmSummary).toContain("ChatGPT");
    expect(doc.facts.length).toBeGreaterThan(0);
    expect(doc.targets).toContain("perplexity");
  });

  it("exports content blocks for page rendering", () => {
    const doc = buildGeoDocument({
      slug: "x",
      name: "X",
      website: "https://x.com",
    });
    const blocks = buildGeoContentBlocks(doc);
    expect(blocks.some((b) => b.type === "llm_summary")).toBe(true);
    expect(blocks.some((b) => b.type === "question_cluster")).toBe(true);
    expect(buildGeoPlainText(doc)).toContain("LLM Summary");
  });
});
