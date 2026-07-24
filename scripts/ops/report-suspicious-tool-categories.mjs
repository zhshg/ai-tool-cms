import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const CATEGORY_RULES = [
  { slug: "ai-chatbots", keywords: ["chatbot", "assistant", "conversational", "chat"] },
  { slug: "ai-writing", keywords: ["writing", "writer", "copy", "content", "blog", "text"] },
  {
    slug: "ai-image",
    keywords: ["image", "photo", "visual", "design", "art", "illustration", "avatar"],
  },
  { slug: "ai-video", keywords: ["video", "film", "clip", "reel", "avatar video"] },
  {
    slug: "ai-audio",
    keywords: ["audio", "voice", "speech", "music", "podcast", "transcript", "transcription"],
  },
  {
    slug: "ai-coding",
    keywords: ["code", "coding", "developer", "dev", "programming", "api", "terminal"],
  },
  { slug: "ai-seo", keywords: ["seo", "search engine", "keyword", "rank", "serp"] },
  {
    slug: "ai-marketing",
    keywords: ["marketing", "campaign", "growth", "ads", "advertising", "social media"],
  },
  {
    slug: "ai-productivity",
    keywords: ["productivity", "workflow", "task", "notes", "meeting", "calendar"],
  },
  { slug: "ai-design", keywords: ["design", "brand", "branding", "ui", "ux", "mockup", "layout"] },
  {
    slug: "ai-business",
    keywords: ["business", "enterprise", "operations", "ops", "sales", "crm", "finance", "legal"],
  },
  {
    slug: "ai-research",
    keywords: ["research", "paper", "science", "academic", "fact", "evidence"],
  },
  {
    slug: "ai-education",
    keywords: ["education", "learn", "learning", "tutor", "study", "course", "teacher"],
  },
  { slug: "ai-agents", keywords: ["agent", "agents", "autonomous", "orchestration"] },
  {
    slug: "ai-data",
    keywords: [
      "data",
      "analytics",
      "spreadsheet",
      "csv",
      "database",
      "etl",
      "scrape",
      "extraction",
    ],
  },
  { slug: "ai-presentation", keywords: ["presentation", "slides", "deck", "pitch"] },
  {
    slug: "ai-social-media",
    keywords: ["twitter", "x ", "linkedin", "instagram", "social media", "post scheduler"],
  },
  {
    slug: "ai-customer-support",
    keywords: ["support", "ticket", "help desk", "customer service", "cs"],
  },
  {
    slug: "ai-developer-tools",
    keywords: ["devtool", "observability", "monitoring", "testing", "debug", "infrastructure"],
  },
  {
    slug: "ai-automation",
    keywords: [
      "automation",
      "automate",
      "workflow automation",
      "zapier",
      "make",
      "n8n",
      "integration",
    ],
  },
];

async function main() {
  const tools = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
    },
    select: {
      slug: true,
      name: true,
      summary: true,
      description: true,
      longDescription: true,
      website: true,
      metadata: true,
      categories: {
        where: { deletedAt: null },
        include: {
          category: {
            select: { slug: true, name: true },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  const suspicious = [];
  for (const tool of tools) {
    const expected = detectExpectedCategory(tool);
    const actual = tool.categories[0]?.category.slug ?? null;
    if (!expected || actual === expected.slug) continue;
    suspicious.push({
      slug: tool.slug,
      name: tool.name,
      actual,
      expected: expected.slug,
      expectedName: expected.name,
      summary: tool.summary,
    });
  }

  console.log(
    JSON.stringify({ total: tools.length, suspicious: suspicious.slice(0, 100) }, null, 2),
  );
}

function detectExpectedCategory(tool) {
  const text = [
    tool.name,
    tool.summary,
    tool.description,
    tool.longDescription,
    tool.website,
    typeof tool.metadata?.category === "string" ? tool.metadata.category : "",
    typeof tool.metadata?.industry === "string" ? tool.metadata.industry : "",
    typeof tool.metadata?.useCase === "string" ? tool.metadata.useCase : "",
  ]
    .join(" ")
    .toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return { slug: rule.slug, name: rule.slug.replace(/^ai-/, "").replace(/-/g, " ") };
    }
  }
  return null;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
