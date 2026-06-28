import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { PromptEngine } from "./prompt-engine/PromptEngine";
import { pickWeightedVariant } from "./prompt-engine/PromptRegistry";
import { generateSummary, scoreQuality, QUALITY_THRESHOLD } from "./generators";
import { fullPipelineOrder } from "./pipeline/orchestrator";
import { nextStage } from "./pipeline/types";
import { parseJsonFromLlm } from "./utils/json";

const promptsRoot = join(__dirname, "..", "prompts");

describe("PromptEngine", () => {
  const engine = new PromptEngine(promptsRoot);

  it("loads catalog from registry.yaml", () => {
    const catalog = engine.loadCatalog();
    expect(catalog.kind).toBe("PromptCatalog");
    expect(catalog.templates.summary.latestVersion).toBe("1");
  });

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

  it("resolves zh-CN locale from catalog", () => {
    const resolved = engine.resolve({ templateId: "summary", locale: "zh-CN" });
    expect(resolved.locale).toBe("zh-CN");
    expect(resolved.user).toContain("工具目录");
  });

  it("selects A/B variant by bucket", () => {
    const resolvedDefault = engine.resolve({
      templateId: "summary",
      locale: "en",
      variant: "default",
    });
    const resolvedConcise = engine.resolve({
      templateId: "summary",
      locale: "en",
      variant: "concise",
    });
    expect(resolvedDefault.variant).toBe("default");
    expect(resolvedConcise.variant).toBe("concise");
    expect(resolvedConcise.user).toContain("shorter");
  });

  it("reloads catalog after disk changes", () => {
    engine.reload();
    expect(engine.listTemplates().length).toBe(7);
  });

  it("discovers catalog tree on disk", () => {
    const tree = engine.discoverCatalogTree();
    expect(tree.some((e) => e.templateId === "summary" && e.variant === "concise")).toBe(true);
  });

  it("lists all prompt templates", () => {
    const templates = engine.listTemplates();
    expect(templates).toContain("summary");
    expect(templates).toContain("faq");
    expect(templates).toContain("geo");
    expect(templates.length).toBe(7);
  });

  it("buildMessages uses markdown system prompt from _shared", () => {
    const messages = engine.buildMessages("summary", { tool_name: "X", locale: "en" });
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("precise content generation assistant");
    expect(messages[1]?.role).toBe("user");
  });
});

describe("pickWeightedVariant", () => {
  it("distributes by weight", () => {
    const variants: Array<[string, { weight: number }]> = [
      ["default", { weight: 70 }],
      ["concise", { weight: 30 }],
    ];
    expect(pickWeightedVariant(variants, 0)).toBe("default");
    expect(pickWeightedVariant(variants, 69)).toBe("default");
    expect(pickWeightedVariant(variants, 70)).toBe("concise");
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
