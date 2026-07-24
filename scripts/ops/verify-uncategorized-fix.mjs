import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const [uncategorized, mapsGpt] = await Promise.all([
    prisma.tool.count({
      where: {
        deletedAt: null,
        status: ToolStatus.PUBLISHED,
        categories: {
          some: {
            deletedAt: null,
            isPrimary: true,
            category: { slug: "uncategorized", deletedAt: null },
          },
        },
      },
    }),
    prisma.tool.findFirst({
      where: { slug: "maps-gpt", deletedAt: null, status: ToolStatus.PUBLISHED },
      select: {
        slug: true,
        categories: {
          where: { deletedAt: null },
          select: {
            isPrimary: true,
            category: { select: { slug: true, name: true } },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        tags: {
          where: { deletedAt: null },
          select: { tag: { select: { slug: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        metadata: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        uncategorized,
        mapsGpt: mapsGpt
          ? {
              categories: mapsGpt.categories.map((item) => ({
                slug: item.category.slug,
                name: item.category.name,
                isPrimary: item.isPrimary,
              })),
              tags: mapsGpt.tags.map((item) => item.tag.slug),
              languages: [
                ...(Array.isArray(mapsGpt.metadata?.aiLanguages)
                  ? mapsGpt.metadata.aiLanguages
                  : []),
                ...(Array.isArray(mapsGpt.metadata?.languages) ? mapsGpt.metadata.languages : []),
              ],
            }
          : null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
