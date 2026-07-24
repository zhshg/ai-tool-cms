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
    keywords: ["assistant", "personal assistant", "help"],
  },
  {
    slug: "ai-productivity",
    name: "AI Productivity",
    keywords: ["productivity", "workflow", "task", "organize", "planner"],
  },
  {
    slug: "ai-business",
    name: "AI Business",
    keywords: ["business", "enterprise", "operations", "sales", "crm", "finance", "legal"],
  },
  {
    slug: "ai-data",
    name: "AI Data",
    keywords: ["data", "analytics", "spreadsheet", "database", "scrape", "extraction"],
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
  ["data", "data"],
  ["automation", "automation"],
];

const DEFAULT_LANGUAGE_VALUES = ["EN", "CN"];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const tools = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
      categories: {
        some: {
          deletedAt: null,
          isPrimary: true,
          category: {
            slug: "uncategorized",
            deletedAt: null,
          },
        },
      },
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
          isPrimary: true,
          category: {
            select: { id: true, slug: true, name: true },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      tags: {
        where: { deletedAt: null },
        select: { tag: { select: { id: true, slug: true, name: true } } },
      },
    },
  });

  const stats = {
    dryRun,
    total: tools.length,
    updated: 0,
    createdCategories: 0,
    createdTags: 0,
    reassignedCategories: 0,
    addedTags: 0,
    defaultedLanguages: 0,
  };

  for (const tool of tools) {
    const text = buildSearchText(tool);
    const category = await resolveCategory(text, tool, dryRun);
    const tagNames = resolveTagNames(text);
    const languageValues = resolveLanguages(tool);

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        if (tool.categories.length) {
          await tx.toolCategory.updateMany({
            where: { toolId: tool.id, deletedAt: null, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        await tx.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: tool.id, categoryId: category.id } },
          update: { deletedAt: null, isPrimary: true },
          create: { toolId: tool.id, categoryId: category.id, isPrimary: true },
        });

        for (const name of tagNames) {
          const tag = await findOrCreateTag(tx, name, dryRun);
          if (!tag) continue;
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
              aiLanguages: languageValues,
              languages: languageValues,
            },
          },
        });
      });
    }

    stats.updated += 1;
    if (category.created) stats.createdCategories += 1;
    stats.addedTags += tagNames.length;
    if (languageValues.length) stats.defaultedLanguages += 1;
  }

  console.log(JSON.stringify(stats, null, 2));
}

async function resolveCategory(text, tool, dryRun) {
  const matched = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword)),
  );
  if (matched) return findOrCreateCategory(matched.slug, matched.name, dryRun);

  return findOrCreateCategory("general-ai-tools", "General AI Tools", dryRun);
}

async function findOrCreateCategory(slug, name, dryRun) {
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return { ...existing, created: false };
  if (dryRun) return { id: null, slug, name, created: true };
  const created = await prisma.category.create({
    data: {
      slug,
      name,
      description: `${name} category created during uncategorized cleanup.`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse ${name.toLowerCase()} tools.`,
      metadata: { createdBy: "reclassify-uncategorized-tools" },
    },
    select: { id: true, slug: true, name: true },
  });
  return { ...created, created: true };
}

function resolveTagNames(text) {
  const names = [
    ...new Set(TAG_RULES.filter(([keyword]) => text.includes(keyword)).map(([, name]) => name)),
  ];
  if (names.length >= 3) return names.slice(0, 5);

  const fallback = ["assistant", "web", "productivity", "data", "maps"];
  for (const name of fallback) {
    if (!names.includes(name)) names.push(name);
    if (names.length >= 5) break;
  }
  return names.slice(0, 5);
}

function resolveLanguages(tool) {
  const metadata = normalizeMetadata(tool.metadata);
  const values = [
    ...normalizeStringList(metadata.aiLanguages),
    ...normalizeStringList(metadata.languages),
  ];
  return values.length ? values.slice(0, 4) : DEFAULT_LANGUAGE_VALUES;
}

async function findOrCreateTag(tx, name, dryRun) {
  const slug = slugify(name);
  const existing = await tx.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;
  if (dryRun) return { id: null, slug, name };
  return tx.tag.create({
    data: {
      slug,
      name: titleCase(name),
      description: `${titleCase(name)} tag created during cleanup.`,
      metadata: { createdBy: "reclassify-uncategorized-tools" },
    },
    select: { id: true, slug: true, name: true },
  });
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
