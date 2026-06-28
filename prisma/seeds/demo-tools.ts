import { PricingModel, ToolStatus } from "@prisma/client";
import { slugify } from "@ai-tool-cms/common";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

type DemoToolInput = {
  name: string;
  website: string;
  pricingModel: PricingModel;
  summary: string;
  description: string;
  features: string[];
  platforms: string[];
  categoryIndex: number;
  tagIndexes: number[];
};

const DEMO_TOOLS: DemoToolInput[] = [
  {
    name: "ChatGPT",
    website: "https://chat.openai.com",
    pricingModel: PricingModel.FREEMIUM,
    summary: "Conversational AI assistant by OpenAI",
    description: "General-purpose conversational AI for writing, coding, and research.",
    features: ["Chat", "Code interpreter", "Image input"],
    platforms: ["web", "ios", "android"],
    categoryIndex: 0,
    tagIndexes: [0, 1],
  },
  {
    name: "Claude",
    website: "https://claude.ai",
    pricingModel: PricingModel.FREEMIUM,
    summary: "Anthropic assistant focused on helpful, harmless responses",
    description: "Long-context AI assistant for analysis, writing, and coding.",
    features: ["Long context", "Artifacts", "Document analysis"],
    platforms: ["web", "api"],
    categoryIndex: 0,
    tagIndexes: [0, 4],
  },
  {
    name: "Midjourney",
    website: "https://midjourney.com",
    pricingModel: PricingModel.PAID,
    summary: "High-quality AI image generation",
    description: "Creative image generation via Discord and web.",
    features: ["Image generation", "Style presets", "Upscaling"],
    platforms: ["web", "discord"],
    categoryIndex: 1,
    tagIndexes: [1, 6],
  },
  {
    name: "Stable Diffusion",
    website: "https://stability.ai",
    pricingModel: PricingModel.FREE,
    summary: "Open image generation ecosystem",
    description: "Open models and tools for local and hosted image generation.",
    features: ["Open weights", "Local run", "Fine-tuning"],
    platforms: ["web", "desktop", "api"],
    categoryIndex: 1,
    tagIndexes: [2, 3],
  },
  {
    name: "GitHub Copilot",
    website: "https://github.com/features/copilot",
    pricingModel: PricingModel.PAID,
    summary: "AI pair programmer for developers",
    description: "Inline code suggestions across major IDEs.",
    features: ["Autocomplete", "Chat", "PR summaries"],
    platforms: ["desktop", "web"],
    categoryIndex: 2,
    tagIndexes: [1, 6],
  },
  {
    name: "Cursor",
    website: "https://cursor.com",
    pricingModel: PricingModel.FREEMIUM,
    summary: "AI-native code editor",
    description: "IDE with embedded agents for code generation and refactoring.",
    features: ["Agent mode", "Codebase context", "Multi-model"],
    platforms: ["desktop"],
    categoryIndex: 2,
    tagIndexes: [0, 1],
  },
  {
    name: "Notion AI",
    website: "https://notion.so/product/ai",
    pricingModel: PricingModel.PAID,
    summary: "AI inside Notion workspaces",
    description: "Summaries, writing help, and Q&A over workspace content.",
    features: ["Summaries", "Writing assist", "Q&A"],
    platforms: ["web", "desktop", "mobile"],
    categoryIndex: 3,
    tagIndexes: [4, 6],
  },
  {
    name: "Perplexity",
    website: "https://perplexity.ai",
    pricingModel: PricingModel.FREEMIUM,
    summary: "AI answer engine with citations",
    description: "Search-style answers with source citations.",
    features: ["Citations", "Pro search", "Collections"],
    platforms: ["web", "ios", "android"],
    categoryIndex: 0,
    tagIndexes: [0, 7],
  },
  {
    name: "Runway",
    website: "https://runwayml.com",
    pricingModel: PricingModel.PAID,
    summary: "AI video creation suite",
    description: "Text-to-video, editing, and generative video tools.",
    features: ["Gen-3 video", "Editing", "Motion brush"],
    platforms: ["web"],
    categoryIndex: 4,
    tagIndexes: [1, 7],
  },
  {
    name: "ElevenLabs",
    website: "https://elevenlabs.io",
    pricingModel: PricingModel.FREEMIUM,
    summary: "Realistic AI voice synthesis",
    description: "Text-to-speech and voice cloning platform.",
    features: ["Voice cloning", "TTS", "Dubbing"],
    platforms: ["web", "api"],
    categoryIndex: 4,
    tagIndexes: [3, 6],
  },
];

export async function seedDemoTools(
  actorId: string,
  categoryIds: string[],
  tagIds: string[],
): Promise<void> {
  for (const [index, tool] of DEMO_TOOLS.entries()) {
    const slug = slugify(tool.name);
    const record = await upsertBySlug(
      prisma.tool,
      slug,
      {
        name: tool.name,
        website: tool.website,
        pricingModel: tool.pricingModel,
        summary: tool.summary,
        description: tool.description,
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        createdById: actorId,
        metaTitle: `${tool.name} — AI Tool CMS`,
        metaDescription: tool.summary,
        metadata: {
          features: tool.features,
          platforms: tool.platforms,
          screenshots: [],
          aiSummary: tool.summary,
        },
      },
      {
        name: tool.name,
        website: tool.website,
        pricingModel: tool.pricingModel,
        summary: tool.summary,
        description: tool.description,
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        deletedAt: null,
        updatedById: actorId,
        metaTitle: `${tool.name} — AI Tool CMS`,
        metaDescription: tool.summary,
        metadata: {
          features: tool.features,
          platforms: tool.platforms,
          screenshots: [],
          aiSummary: tool.summary,
        },
      },
    );

    const categoryId = categoryIds[tool.categoryIndex % categoryIds.length];
    if (categoryId) {
      await prisma.toolCategory.upsert({
        where: {
          toolId_categoryId: { toolId: record.id, categoryId },
        },
        update: { isPrimary: true, deletedAt: null },
        create: { toolId: record.id, categoryId, isPrimary: true },
      });
    }

    for (const tagIndex of tool.tagIndexes) {
      const tagId = tagIds[tagIndex % tagIds.length];
      if (!tagId) continue;
      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId: record.id, tagId } },
        update: { deletedAt: null },
        create: { toolId: record.id, tagId },
      });
    }

    await prisma.toolVersion.upsert({
      where: {
        toolId_versionNumber: { toolId: record.id, versionNumber: 1 },
      },
      update: {
        slug: "v1",
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        deletedAt: null,
        snapshot: buildVersionSnapshot(tool),
      },
      create: {
        toolId: record.id,
        slug: "v1",
        versionNumber: 1,
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        createdById: actorId,
        changelog: "Initial seeded version",
        snapshot: buildVersionSnapshot(tool),
      },
    });

    if (index === 0) {
      await prisma.faq.upsert({
        where: { id: "00000000-0000-4000-8000-000000000001" },
        update: { deletedAt: null },
        create: {
          id: "00000000-0000-4000-8000-000000000001",
          toolId: record.id,
          slug: "what-is-chatgpt",
          question: "What is ChatGPT?",
          answer: "ChatGPT is a conversational AI assistant developed by OpenAI.",
          sortOrder: 0,
          createdById: actorId,
        },
      });
    }
  }
}

function buildVersionSnapshot(tool: DemoToolInput): Record<string, unknown> {
  const pricingModel =
    tool.pricingModel === PricingModel.CONTACT ? "ENTERPRISE" : tool.pricingModel;

  return {
    name: tool.name,
    pricing: {
      model: pricingModel,
      tiers: [
        {
          name: tool.pricingModel === PricingModel.FREE ? "Free" : "Pro",
          amount: tool.pricingModel === PricingModel.FREE ? 0 : 20,
          currency: "USD",
          billingPeriod: "MONTHLY",
        },
      ],
      regions: ["US", "EU", "APAC"],
      languages: ["en", "zh-CN"],
      platforms: tool.platforms,
    },
    features: tool.features,
    platforms: tool.platforms,
  };
}
