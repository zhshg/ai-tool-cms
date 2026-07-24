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

const TAG_SYNONYMS = [
  ["api", "api"],
  ["chatbot", "chatbot"],
  ["assistant", "assistant"],
  ["workflow", "workflow"],
  ["automation", "automation"],
  ["integration", "integration"],
  ["design", "design"],
  ["seo", "seo"],
  ["marketing", "marketing"],
  ["analytics", "analytics"],
  ["research", "research"],
  ["productivity", "productivity"],
  ["writing", "writing"],
  ["content", "content"],
  ["video", "video"],
  ["audio", "audio"],
  ["image", "image"],
  ["developer", "developer"],
  ["code", "coding"],
  ["database", "database"],
  ["support", "support"],
  ["sales", "sales"],
  ["enterprise", "enterprise"],
  ["slack", "slack"],
  ["notion", "notion"],
  ["wordpress", "wordpress"],
  ["shopify", "shopify"],
  ["browser", "browser"],
  ["chrome", "chrome"],
  ["open source", "open source"],
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const tools = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
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
      categories: {
        where: { deletedAt: null },
        select: {
          categoryId: true,
          isPrimary: true,
          category: { select: { slug: true, name: true } },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      tags: {
        where: { deletedAt: null },
        select: { tagId: true, tag: { select: { slug: true, name: true } } },
      },
    },
  });

  const stats = {
    total: tools.length,
    missingCategories: 0,
    missingTags: 0,
    categoryAssignments: 0,
    tagAssignments: 0,
    createdCategories: 0,
    createdTags: 0,
  };

  for (const tool of tools) {
    const hasCategory = tool.categories.length > 0;
    const hasTags = tool.tags.length > 0;
    if (!hasCategory) stats.missingCategories += 1;
    if (!hasTags) stats.missingTags += 1;

    const category = hasCategory ? null : await resolveCategory(tool, dryRun);
    if (category && !hasCategory) {
      stats.categoryAssignments += 1;
      if (!dryRun) {
        await upsertPrimaryCategory(tool.id, category.id);
      }
    }

    const tags = hasTags ? [] : await resolveTags(tool, dryRun);
    if (tags.length) {
      stats.tagAssignments += tags.length;
      if (!dryRun) {
        for (const tag of tags) {
          await prisma.toolTag.upsert({
            where: { toolId_tagId: { toolId: tool.id, tagId: tag.id } },
            update: { deletedAt: null },
            create: { toolId: tool.id, tagId: tag.id },
          });
        }
      }
    }

    if (!dryRun) {
      stats.createdCategories = createdCategories;
      stats.createdTags = createdTags;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        ...stats,
      },
      null,
      2,
    ),
  );
}

let createdCategories = 0;
let createdTags = 0;

async function resolveCategory(tool, dryRun) {
  const text = buildSearchText(tool);
  const matchedRule = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  );
  if (matchedRule) {
    return dryRun
      ? findCategory(matchedRule.slug, matchedRule.name)
      : findOrCreateCategory(matchedRule.slug, matchedRule.name);
  }
  const generated = buildGeneratedCategory(tool);
  return dryRun
    ? findCategory(generated.slug, generated.name)
    : findOrCreateCategory(generated.slug, generated.name);
}

async function resolveTags(tool, dryRun) {
  const text = buildSearchText(tool);
  const candidates = [];
  for (const [keyword, tagName] of TAG_SYNONYMS) {
    if (text.includes(keyword)) candidates.push(tagName);
  }
  const normalized = [...new Set(candidates)].slice(0, 6);
  const tags = [];
  for (const name of normalized) {
    const tag = dryRun ? await findTag(name) : await findOrCreateTag(name);
    if (tag) tags.push(tag);
  }
  if (!tags.length) {
    const categoryName = tool.categories[0]?.category?.name ?? "AI Tools";
    for (const name of [categoryName, "AI Tools"]) {
      const tag = dryRun ? await findTag(name) : await findOrCreateTag(name);
      if (tag) tags.push(tag);
    }
  }
  return tags;
}

function buildSearchText(tool) {
  const metadata = tool.metadata && typeof tool.metadata === "object" ? tool.metadata : {};
  return [
    tool.name,
    tool.summary,
    tool.description,
    tool.longDescription,
    tool.website,
    typeof metadata.category === "string" ? metadata.category : "",
    typeof metadata.industry === "string" ? metadata.industry : "",
    typeof metadata.useCase === "string" ? metadata.useCase : "",
  ]
    .join(" ")
    .toLowerCase();
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
      description: `${name} category created during taxonomy cleanup.`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse ${name.toLowerCase()} tools.`,
      metadata: { createdBy: "fill-missing-taxonomy" },
    },
    select: { id: true, slug: true, name: true },
  });
  createdCategories += 1;
  return created;
}

async function findCategory(slug, name) {
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  return existing ?? { id: null, slug, name };
}

async function findOrCreateTag(name) {
  const slug = slugify(name);
  if (!slug) return null;
  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;

  const created = await prisma.tag.create({
    data: {
      slug,
      name: titleCase(name),
      description: `${titleCase(name)} tag created during taxonomy cleanup.`,
      metadata: { createdBy: "fill-missing-taxonomy" },
    },
    select: { id: true, slug: true, name: true },
  });
  createdTags += 1;
  return created;
}

async function findTag(name) {
  const slug = slugify(name);
  if (!slug) return null;
  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  return existing ?? { id: null, slug, name: titleCase(name) };
}

async function upsertPrimaryCategory(toolId, categoryId) {
  await prisma.toolCategory.updateMany({
    where: { toolId, deletedAt: null, isPrimary: true },
    data: { isPrimary: false },
  });
  await prisma.toolCategory.upsert({
    where: { toolId_categoryId: { toolId, categoryId } },
    update: { deletedAt: null, isPrimary: true },
    create: { toolId, categoryId, isPrimary: true },
  });
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
  return String(value || "")
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
