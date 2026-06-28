import type { ToolPromptContext } from "../prompt-engine/types";
import type {
  FaqItem,
  FeatureExtractionOutput,
  GeoOutput,
  SeoOutput,
  SummaryOutput,
} from "./index";

export function mockSummaryOutput(ctx: ToolPromptContext): SummaryOutput {
  const name = ctx.tool_name || "Tool";
  return {
    oneSentence: `${name} is an AI tool for ${ctx.category || "productivity"}.`,
    oneParagraph:
      `${name} helps teams work faster with AI-assisted workflows. ${ctx.description ?? ""}`.trim(),
    longDescription: `## About ${name}\n\n${ctx.description ?? `${name} is a modern AI application.`}\n\n### Key benefits\n\n- Easy to get started\n- Works across common platforms\n- Suitable for ${ctx.category || "general"} use cases`,
    featureHighlights: [
      "AI-assisted workflows",
      "Cross-platform support",
      "Team-friendly collaboration",
    ],
  };
}

export function mockFeatureOutput(ctx: ToolPromptContext): FeatureExtractionOutput {
  return {
    features: ["Chat interface", "API access", "Templates"],
    pricing: { model: "FREEMIUM", notes: "Free tier with paid upgrades" },
    platforms: ["Web", "iOS", "Android"],
    languages: ["English"],
    integrations: ["Slack", "Zapier"],
    targetUsers: ["Developers", "Marketers"],
    useCases: [`${ctx.tool_name} for ${ctx.category || "daily"} tasks`],
  };
}

export function mockFaqOutput(ctx: ToolPromptContext): FaqItem[] {
  const name = ctx.tool_name || "this tool";
  return [
    { question: `What is ${name}?`, answer: `${name} is an AI-powered application.` },
    { question: `Is ${name} free?`, answer: "A free tier is available with optional paid plans." },
    {
      question: `Who should use ${name}?`,
      answer: "Teams and individuals exploring AI workflows.",
    },
    {
      question: `What are the best alternatives to ${name}?`,
      answer: "Compare similar tools in the same category.",
    },
    {
      question: `How do I get started with ${name}?`,
      answer: "Visit the official website and create an account.",
    },
  ];
}

export function mockSeoOutput(ctx: ToolPromptContext): SeoOutput {
  const name = ctx.tool_name || "Tool";
  const slug = ctx.slug || name.toLowerCase().replace(/\s+/g, "-");
  return {
    title: `${name} Review, Pricing & Features (2026)`,
    metaDescription: `Discover ${name}: features, pricing, and how it compares. Updated guide for teams evaluating AI tools.`,
    keywords: [name, "AI tool", ctx.category ?? "software", "review"],
    canonical: `https://example.com/tools/${slug}`,
    openGraph: {
      title: `${name} — AI Tool Guide`,
      description: ctx.description ?? `${name} overview`,
      type: "article",
    },
    twitterCard: {
      card: "summary_large_image",
      title: name,
      description: ctx.description ?? "",
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name,
      applicationCategory: ctx.category ?? "BusinessApplication",
    },
  };
}

export function mockGeoOutput(ctx: ToolPromptContext): GeoOutput {
  const name = ctx.tool_name || "Tool";
  return {
    aiAnswer: `${name} is an AI software tool used for ${ctx.category || "productivity"} workflows.`,
    llmSummary: `${name}: ${ctx.description ?? "An AI application with chat and automation features."}`,
    knowledgeGraph: {
      entity: name,
      type: "SoftwareApplication",
      category: ctx.category ?? "AI Tools",
    },
    structuredFacts: [
      { fact: `${name} targets ${ctx.category || "general"} users`, confidence: "medium" },
      { fact: "Offers web and mobile access", confidence: "high" },
    ],
    semanticParagraphs: [
      `${name} fits teams evaluating AI assistants for repeatable tasks.`,
      `Compared with peers, ${name} emphasizes ease of onboarding.`,
    ],
    questionClusters: [
      [`What is ${name}?`, `How does ${name} work?`],
      [`Is ${name} free?`, `${name} pricing`],
    ],
  };
}

export function getMockGeneratorOutput<T>(templateId: string, ctx: ToolPromptContext): T {
  switch (templateId) {
    case "summary":
      return mockSummaryOutput(ctx) as T;
    case "feature":
      return mockFeatureOutput(ctx) as T;
    case "faq":
      return mockFaqOutput(ctx) as T;
    case "seo":
      return mockSeoOutput(ctx) as T;
    case "geo":
      return mockGeoOutput(ctx) as T;
    default:
      return {} as T;
  }
}
