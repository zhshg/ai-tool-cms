import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const CATEGORY_RULES = [
  {
    slug: "ai-chatbots",
    name: "AI Chatbots",
    keywords: ["chatbot", "assistant", "conversational", "chat"],
  },
  {
    slug: "ai-writing",
    name: "AI Writing",
    keywords: ["writing", "writer", "copy", "content", "blog", "text"],
  },
  {
    slug: "ai-image",
    name: "AI Image",
    keywords: ["image", "photo", "visual", "design", "art", "illustration", "avatar"],
  },
  {
    slug: "ai-video",
    name: "AI Video",
    keywords: ["video", "film", "clip", "reel", "avatar video"],
  },
  {
    slug: "ai-audio",
    name: "AI Audio",
    keywords: ["audio", "voice", "speech", "music", "podcast", "transcript", "transcription"],
  },
  {
    slug: "ai-coding",
    name: "AI Coding",
    keywords: ["code", "coding", "developer", "dev", "programming", "api", "terminal"],
  },
  { slug: "ai-seo", name: "AI SEO", keywords: ["seo", "search engine", "keyword", "rank", "serp"] },
  {
    slug: "ai-marketing",
    name: "AI Marketing",
    keywords: ["marketing", "campaign", "growth", "ads", "advertising", "social media"],
  },
  {
    slug: "ai-productivity",
    name: "AI Productivity",
    keywords: ["productivity", "workflow", "task", "notes", "meeting", "calendar"],
  },
  {
    slug: "ai-design",
    name: "AI Design",
    keywords: ["design", "brand", "branding", "ui", "ux", "mockup", "layout"],
  },
  {
    slug: "ai-business",
    name: "AI Business",
    keywords: ["business", "enterprise", "operations", "ops", "sales", "crm", "finance", "legal"],
  },
  {
    slug: "ai-research",
    name: "AI Research",
    keywords: ["research", "paper", "science", "academic", "fact", "evidence"],
  },
  {
    slug: "ai-education",
    name: "AI Education",
    keywords: ["education", "learn", "learning", "tutor", "study", "course", "teacher"],
  },
  {
    slug: "ai-agents",
    name: "AI Agents",
    keywords: ["agent", "agents", "autonomous", "orchestration"],
  },
  {
    slug: "ai-data",
    name: "AI Data",
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
  {
    slug: "ai-presentation",
    name: "AI Presentation",
    keywords: ["presentation", "slides", "deck", "pitch"],
  },
  {
    slug: "ai-social-media",
    name: "AI Social Media",
    keywords: ["twitter", "x ", "linkedin", "instagram", "social media", "post scheduler"],
  },
  {
    slug: "ai-customer-support",
    name: "AI Customer Support",
    keywords: ["support", "ticket", "help desk", "customer service", "cs"],
  },
  {
    slug: "ai-developer-tools",
    name: "AI Developer Tools",
    keywords: ["devtool", "observability", "monitoring", "testing", "debug", "infrastructure"],
  },
  {
    slug: "ai-automation",
    name: "AI Automation",
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
  const dryRun = process.argv.includes("--dry-run");

  const uncategorized = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
      categories: { none: { deletedAt: null } },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      description: true,
      longDescription: true,
      website: true,
      metadata: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let assigned = 0;
  let createdCategories = 0;
  const createdCategoryIds = new Map();

  for (const tool of uncategorized) {
    const text = buildSearchText(tool);
    const matchedRule = CATEGORY_RULES.find((rule) =>
      rule.keywords.some((keyword) => text.includes(keyword)),
    );

    let category = matchedRule
      ? await findOrCreateCategory(matchedRule.slug, matchedRule.name)
      : null;
    if (!category) {
      const generated = buildGeneratedCategory(tool);
      category = await findOrCreateCategory(generated.slug, generated.name);
      if (!createdCategoryIds.has(category.id)) {
        createdCategoryIds.set(category.id, true);
        createdCategories += 1;
      }
    }

    assigned += 1;
    console.log(`[assign] ${tool.slug} -> ${category.slug}`);

    if (dryRun) continue;

    const hasPrimary = await prisma.toolCategory.findFirst({
      where: { toolId: tool.id, deletedAt: null, isPrimary: true },
      select: { id: true },
    });

    if (hasPrimary) {
      await prisma.toolCategory.updateMany({
        where: { toolId: tool.id, deletedAt: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: tool.id, categoryId: category.id } },
      update: { deletedAt: null, isPrimary: true },
      create: { toolId: tool.id, categoryId: category.id, isPrimary: true },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        uncategorized: uncategorized.length,
        assigned,
        createdCategories,
      },
      null,
      2,
    ),
  );
}

function buildSearchText(tool) {
  const metadata = tool.metadata && typeof tool.metadata === "object" ? tool.metadata : {};
  const parts = [
    tool.name,
    tool.summary,
    tool.description,
    tool.longDescription,
    tool.website,
    typeof metadata.category === "string" ? metadata.category : "",
    typeof metadata.industry === "string" ? metadata.industry : "",
    typeof metadata.useCase === "string" ? metadata.useCase : "",
  ];

  return parts.join(" ").toLowerCase();
}

function buildGeneratedCategory(tool) {
  const base = tool.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");

  const name = base ? `${titleCase(base)} Tools` : "General AI Tools";
  const slug = `${slugify(name)}-${slugify(tool.slug).slice(0, 16)}`.slice(0, 120);
  return { slug, name };
}

async function findOrCreateCategory(slug, name) {
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;

  const created = await prisma.category.create({
    data: {
      slug,
      name,
      description: `${name} category created during uncategorized tool cleanup.`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse ${name.toLowerCase()} tools.`,
      metadata: { createdBy: "classify-uncategorized-tools" },
    },
    select: { id: true, slug: true, name: true },
  });
  return created;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
