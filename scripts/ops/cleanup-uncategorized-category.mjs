import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const uncategorizedCategory = await prisma.category.findFirst({
    where: { slug: "uncategorized", deletedAt: null },
    select: { id: true, slug: true, name: true },
  });

  if (!uncategorizedCategory) {
    console.log(JSON.stringify({ dryRun, removedRelations: 0, updatedTools: 0 }, null, 2));
    return;
  }

  const relations = await prisma.toolCategory.findMany({
    where: { categoryId: uncategorizedCategory.id, deletedAt: null },
    select: {
      toolId: true,
      tool: { select: { id: true, slug: true, metadata: true } },
      isPrimary: true,
    },
  });

  let removedRelations = 0;
  let updatedTools = 0;

  for (const relation of relations) {
    const tool = relation.tool;
    const nextLanguages = dedupeStrings([
      ...normalizeStringList(tool.metadata?.aiLanguages),
      ...normalizeStringList(tool.metadata?.languages),
    ]);

    if (dryRun) {
      removedRelations += 1;
      if (nextLanguages.length) updatedTools += 1;
      continue;
    }

    await prisma.toolCategory.deleteMany({
      where: {
        toolId: relation.toolId,
        categoryId: uncategorizedCategory.id,
        deletedAt: null,
      },
    });

    if (nextLanguages.length) {
      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          metadata: {
            ...(tool.metadata && typeof tool.metadata === "object" && !Array.isArray(tool.metadata)
              ? tool.metadata
              : {}),
            aiLanguages: nextLanguages,
            languages: nextLanguages,
          },
        },
      });
      updatedTools += 1;
    }
    removedRelations += 1;
  }

  console.log(JSON.stringify({ dryRun, removedRelations, updatedTools }, null, 2));
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function dedupeStrings(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
