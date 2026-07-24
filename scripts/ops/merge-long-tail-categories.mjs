import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";
import { CATEGORY_MAIN_MAP, toMergeMap } from "./category-main-map.mjs";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const mergeMap = toMergeMap();
  const entries = Object.entries(mergeMap);
  const sources = entries.map(([source]) => source);
  const targets = [...new Set(entries.map(([, target]) => target))];

  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
      slug: { in: [...sources, ...targets] },
    },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  const report = [];
  let movedTools = 0;
  let touchedCategories = 0;

  for (const [sourceSlug, targetSlug] of entries) {
    const source = bySlug.get(sourceSlug);
    if (!source) continue;

    let target = bySlug.get(targetSlug);
    if (!target) {
      if (dryRun) {
        target = { id: null, slug: targetSlug, name: targetSlug };
      } else {
        target = await prisma.category.create({
          data: {
            slug: targetSlug,
            name: titleCase(targetSlug.replace(/-/g, " ")),
            description: `Merged long-tail category for ${targetSlug}.`,
            metaTitle: `${titleCase(targetSlug.replace(/-/g, " "))} AI Tools`,
            metaDescription: `Browse ${titleCase(targetSlug.replace(/-/g, " "))} tools.`,
            metadata: { createdBy: "merge-long-tail-categories" },
          },
          select: { id: true, slug: true, name: true },
        });
        bySlug.set(target.slug, target);
      }
    }

    const tools = await prisma.tool.findMany({
      where: {
        deletedAt: null,
        status: ToolStatus.PUBLISHED,
        categories: {
          some: {
            deletedAt: null,
            categoryId: source.id,
          },
        },
      },
      select: { id: true, slug: true },
    });

    if (!tools.length) continue;

    report.push({ source: sourceSlug, target: target.slug, tools: tools.length });
    touchedCategories += 1;

    if (!dryRun) {
      for (const tool of tools) {
        await prisma.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: tool.id, categoryId: target.id } },
          update: { deletedAt: null },
          create: { toolId: tool.id, categoryId: target.id, isPrimary: false },
        });
        movedTools += 1;
      }

      await prisma.toolCategory.deleteMany({
        where: {
          categoryId: source.id,
          deletedAt: null,
        },
      });
    } else {
      movedTools += tools.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        touchedCategories,
        movedTools,
        mappedCategories: CATEGORY_MAIN_MAP.length,
        report: report.slice(0, 80),
      },
      null,
      2,
    ),
  );
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
