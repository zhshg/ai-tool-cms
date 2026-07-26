const { PrismaClient } = require("../../packages/database/generated/client");

const prisma = new PrismaClient();

async function main() {
  const [toolRows, categoryRows] = await Promise.all([
    prisma.toolTranslation.groupBy({
      by: ["toolId"],
      where: { status: "PUBLISHED", deletedAt: null },
      _count: { toolId: true },
      orderBy: { _count: { toolId: "desc" } },
      take: 10,
    }),
    prisma.categoryTranslation.groupBy({
      by: ["categoryId"],
      where: { status: "PUBLISHED", deletedAt: null },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 10,
    }),
  ]);

  const tools = [];
  for (const row of toolRows) {
    const tool = await prisma.tool.findUnique({
      where: { id: row.toolId },
      select: { slug: true, name: true },
    });
    const translations = await prisma.toolTranslation.findMany({
      where: { toolId: row.toolId, status: "PUBLISHED", deletedAt: null },
      select: { locale: true },
      orderBy: { locale: "asc" },
    });
    tools.push({
      slug: tool?.slug,
      name: tool?.name,
      locales: translations.map((item) => item.locale),
    });
  }

  const categories = [];
  for (const row of categoryRows) {
    const category = await prisma.category.findUnique({
      where: { id: row.categoryId },
      select: { slug: true, name: true },
    });
    const translations = await prisma.categoryTranslation.findMany({
      where: { categoryId: row.categoryId, status: "PUBLISHED", deletedAt: null },
      select: { locale: true },
      orderBy: { locale: "asc" },
    });
    categories.push({
      slug: category?.slug,
      name: category?.name,
      locales: translations.map((item) => item.locale),
    });
  }

  console.log(JSON.stringify({ tools, categories }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
