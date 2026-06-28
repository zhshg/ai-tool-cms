import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { PromptEngine } from "./prompt-engine/PromptEngine";
import { generateSummary, scoreQuality, QUALITY_THRESHOLD } from "./generators";
import { fullPipelineOrder } from "./pipeline/orchestrator";
import { nextStage, AI_PIPELINE_STAGES } from "./pipeline/types";
import { parseJsonFromLlm } from "./utils/json";

describe("PromptEngine", () => {
  const engine = new PromptEngine(join(__dirname, "..", "prompts"));

  it("loads and interpolates template variables", () => {
    const rendered = engine.renderTemplate("summary", {
      tool_name: "ChatGPT",
      website: "https://chat.openai.com",
      description: "AI chat assistant",
      category: "Chatbots",
      features: "chat, api",
      locale: "en",
    });

    expect(rendered).toContain("ChatGPT");
    expect(rendered).toContain("Chatbots");
    expect(rendered).not.toContain("{{tool_name}}");
  });

  it("lists all prompt templates", () => {
    const templates = engine.listTemplates();
    expect(templates).toContain("summary");
    expect(templates).toContain("faq");
    expect(templates).toContain("geo");
    expect(templates.length).toBe(7);
  });
});

describe("generators", () => {
  it("generates summary via mock provider", async () => {
    const result = await generateSummary({
      tool_name: "TestTool",
      description: "A test AI tool",
      category: "Productivity",
    });

    expect(result.oneSentence).toContain("TestTool");
    expect(result.featureHighlights.length).toBeGreaterThan(0);
    expect(result.longDescription).toContain("TestTool");
  });

  it("scores quality with threshold", () => {
    const pass = scoreQuality({
      summary: "A solid paragraph about the tool.",
      longDescription: "Long markdown body ".repeat(20),
      features: ["a", "b"],
      faqCount: 5,
      hasSeo: true,
      hasGeo: true,
    });
    expect(pass.overall).toBeGreaterThanOrEqual(QUALITY_THRESHOLD);
    expect(pass.passed).toBe(true);

    const fail = scoreQuality({ summary: "short" });
    expect(fail.passed).toBe(false);
  });
});

describe("pipeline", () => {
  it("orders stages correctly", () => {
    const order = fullPipelineOrder();
    expect(order[0]).toBe("SUMMARY");
    expect(order[order.length - 1]).toBe("PUBLISH");
    expect(nextStage("SEO")).toBe("GEO");
    expect(nextStage("PUBLISH")).toBeNull();
  });
});

describe("parseJsonFromLlm", () => {
  it("parses fenced JSON", () => {
    const parsed = parseJsonFromLlm<{ ok: boolean }>('```json\n{"ok":true}\n```');
    expect(parsed.ok).toBe(true);
  });
});
