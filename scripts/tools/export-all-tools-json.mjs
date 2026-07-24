import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../../packages/database/generated/client/index.js";

function readArgValue(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function extractDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toJsonSafe(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const prisma = new PrismaClient();
  const outArg = readArgValue(process.argv.slice(2), "--out");
  const outputPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.resolve(process.cwd(), "storage/exports/all-tools.json");

  try {
    const [tools, categories, tags, toolCategories, toolTags] = await Promise.all([
      prisma.tool.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          website: true,
          logoUrl: true,
          pricingModel: true,
          status: true,
          summary: true,
          description: true,
          longDescription: true,
          metaTitle: true,
          metaDescription: true,
          publishedAt: true,
          scheduledAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          parentId: true,
          sortOrder: true,
          iconUrl: true,
          description: true,
          metaTitle: true,
          metaDescription: true,
          metadata: true,
        },
      }),
      prisma.tag.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          metadata: true,
        },
      }),
      prisma.toolCategory.findMany({
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          toolId: true,
          categoryId: true,
          isPrimary: true,
          metadata: true,
        },
      }),
      prisma.toolTag.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          toolId: true,
          tagId: true,
          metadata: true,
        },
      }),
    ]);

    const categoryById = new Map(categories.map((item) => [item.id, item]));
    const tagById = new Map(tags.map((item) => [item.id, item]));

    const categoryLinksByTool = new Map();
    for (const link of toolCategories) {
      if (!categoryLinksByTool.has(link.toolId)) categoryLinksByTool.set(link.toolId, []);
      categoryLinksByTool.get(link.toolId).push(link);
    }

    const tagLinksByTool = new Map();
    for (const link of toolTags) {
      if (!tagLinksByTool.has(link.toolId)) tagLinksByTool.set(link.toolId, []);
      tagLinksByTool.get(link.toolId).push(link);
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      total: tools.length,
      categoriesTotal: categories.length,
      tagsTotal: tags.length,
      tools: tools.map((tool) => {
        const categoryLinks = categoryLinksByTool.get(tool.id) || [];
        const tagLinks = tagLinksByTool.get(tool.id) || [];
        const toolCategoriesPayload = categoryLinks
          .map((link) => {
            const category = categoryById.get(link.categoryId);
            if (!category) return null;
            return {
              id: category.id,
              slug: category.slug,
              name: category.name,
              parentId: category.parentId,
              sortOrder: category.sortOrder,
              iconUrl: category.iconUrl,
              description: category.description,
              metaTitle: category.metaTitle,
              metaDescription: category.metaDescription,
              isPrimary: link.isPrimary,
              metadata: toJsonSafe(link.metadata),
            };
          })
          .filter(Boolean);

        const tagPayload = tagLinks
          .map((link) => {
            const tag = tagById.get(link.tagId);
            if (!tag) return null;
            return {
              id: tag.id,
              slug: tag.slug,
              name: tag.name,
              description: tag.description,
              metadata: toJsonSafe(link.metadata),
            };
          })
          .filter(Boolean);

        return {
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          website: tool.website,
          websiteDomain: extractDomain(tool.website),
          logoUrl: tool.logoUrl,
          pricingModel: tool.pricingModel,
          status: tool.status,
          summary: tool.summary,
          description: tool.description,
          longDescription: tool.longDescription,
          metaTitle: tool.metaTitle,
          metaDescription: tool.metaDescription,
          publishedAt: tool.publishedAt,
          scheduledAt: tool.scheduledAt,
          categories: toolCategoriesPayload,
          tags: tagPayload,
          metadata: toJsonSafe(tool.metadata),
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt,
        };
      }),
    };

    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.info(`[tools:export-all-json] total=${payload.total}`);
    console.info(`[tools:export-all-json] categories=${payload.categoriesTotal}`);
    console.info(`[tools:export-all-json] tags=${payload.tagsTotal}`);
    console.info(`[tools:export-all-json] output=${path.relative(process.cwd(), outputPath)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    `[tools:export-all-json][error] ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
