import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const CATEGORY_RULES = [
  {
    slug: "ai-maps",
    name: "AI Maps",
    keywords: ["maps", "map", "location", "nearby places", "places", "routing", "directions"],
  },
  {
    slug: "ai-travel",
    name: "AI Travel",
    keywords: ["travel", "trip", "tour", "journey", "flight", "hotel", "itinerary"],
  },
  {
    slug: "ai-search",
    name: "AI Search",
    keywords: ["search", "discover", "explore", "find results", "query"],
  },
  {
    slug: "ai-assistant",
    name: "AI Assistant",
    keywords: ["assistant", "assistant", "personal assistant", "help"],
  },
  {
    slug: "ai-productivity",
    name: "AI Productivity",
    keywords: ["productivity", "workflow", "task", "organize", "planner"],
  },
];

const TAG_RULES = [
  ["maps", "maps"],
  ["location", "location"],
  ["travel", "travel"],
  ["search", "search"],
  ["assistant", "assistant"],
  ["productivity", "productivity"],
  ["web", "web"],
  ["api", "api"],
  ["mobile", "mobile"],
];

const DEFAULT_LANGUAGE_TAGS = ["EN", "CN"];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const targetSlug = getArg("--slug") ?? "maps-gpt";

  const tool = await prisma.tool.findFirst({
    where: { slug: targetSlug, deletedAt: null, status: ToolStatus.PUBLISHED },
    include: {
      categories: {
        where: { deletedAt: null },
        include: { category: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      tags: { where: { deletedAt: null }, include: { tag: true } },
    },
  });
  if (!tool) {
    throw new Error(`Tool not found: ${targetSlug}`);
  }

  const text = buildSearchText(tool);
  const category = await resolveCategory(text, tool, dryRun);
  const tags = await resolveTags(text, dryRun);
  const languages = resolveLanguages(tool, dryRun);

  const summary = {
    dryRun,
    tool: tool.slug,
    currentCategory: tool.categories[0]?.category.slug ?? null,
    nextCategory: category.slug,
    currentTags: tool.tags.map((item) => item.tag.slug),
    nextTags: tags.map((item) => item.slug),
    nextLanguages: languages,
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.toolCategory.updateMany({
      where: { toolId: tool.id, deletedAt: null, isPrimary: true },
      data: { isPrimary: false },
    });

    await tx.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: tool.id, categoryId: category.id } },
      update: { deletedAt: null, isPrimary: true },
      create: { toolId: tool.id, categoryId: category.id, isPrimary: true },
    });

    for (const tag of tags) {
      await tx.toolTag.upsert({
        where: { toolId_tagId: { toolId: tool.id, tagId: tag.id } },
        update: { deletedAt: null },
        create: { toolId: tool.id, tagId: tag.id },
      });
    }

    await tx.tool.update({
      where: { id: tool.id },
      data: {
        metadata: {
          ...normalizeMetadata(tool.metadata),
          aiLanguages: languages,
          languages,
        },
      },
    });
  });

  console.log(JSON.stringify(summary, null, 2));
}

async function resolveCategory(text, tool, dryRun) {
  const rule = CATEGORY_RULES.find((item) =>
    item.keywords.some((keyword) => text.includes(keyword)),
  );
  if (rule) return findOrCreateCategory(rule.slug, rule.name, dryRun);
  const generatedName = `${titleCase(tool.name)} Tools`;
  const generatedSlug = `${slugify(generatedName)}-${slugify(tool.slug).slice(0, 16)}`.slice(
    0,
    120,
  );
  return findOrCreateCategory(generatedSlug, generatedName, dryRun);
}

async function resolveTags(text, dryRun) {
  const names = [
    ...new Set(TAG_RULES.filter(([keyword]) => text.includes(keyword)).map(([, name]) => name)),
  ];
  const normalized = names.length ? names : ["maps", "assistant", "web"];
  const result = [];
  for (const name of normalized) {
    const tag = dryRun ? await findTag(name) : await findOrCreateTag(name);
    if (tag) result.push(tag);
  }
  const categoryTag = dryRun ? await findTag("maps") : await findOrCreateTag("maps");
  if (categoryTag && !result.some((tag) => tag.slug === categoryTag.slug))
    result.unshift(categoryTag);
  return result.slice(0, 5);
}

function resolveLanguages(tool, dryRun) {
  const metadata = normalizeMetadata(tool.metadata);
  const existing = [
    ...normalizeStringList(metadata.aiLanguages),
    ...normalizeStringList(metadata.languages),
  ];
  if (existing.length) return existing.slice(0, 4);
  return dryRun ? DEFAULT_LANGUAGE_TAGS : DEFAULT_LANGUAGE_TAGS;
}

async function findOrCreateCategory(slug, name, dryRun) {
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;
  if (dryRun) return { id: null, slug, name };
  return prisma.category.create({
    data: {
      slug,
      name,
      description: `${name} category created during uncategorized cleanup.`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse ${name.toLowerCase()} tools.`,
      metadata: { createdBy: "fix-uncategorized-tools" },
    },
    select: { id: true, slug: true, name: true },
  });
}

async function findOrCreateTag(name) {
  const slug = slugify(name);
  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;
  return prisma.tag.create({
    data: {
      slug,
      name: titleCase(name),
      description: `${titleCase(name)} tag created during cleanup.`,
      metadata: { createdBy: "fix-uncategorized-tools" },
    },
    select: { id: true, slug: true, name: true },
  });
}

async function findTag(name) {
  const slug = slugify(name);
  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  return existing ?? { id: null, slug, name: titleCase(name) };
}

function buildSearchText(tool) {
  const metadata = normalizeMetadata(tool.metadata);
  return [
    tool.name,
    tool.summary,
    tool.description,
    tool.longDescription,
    tool.website,
    metadata.category,
    metadata.industry,
    metadata.useCase,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return { ...metadata };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
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
