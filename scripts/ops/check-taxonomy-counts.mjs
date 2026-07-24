import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const [categories, tags, uncategorizedPrimary, publishedTools] = await Promise.all([
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.tag.count({ where: { deletedAt: null } }),
    prisma.tool.count({
      where: {
        deletedAt: null,
        categories: {
          some: {
            deletedAt: null,
            isPrimary: true,
            category: { slug: "uncategorized", deletedAt: null },
          },
        },
      },
    }),
    prisma.tool.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
  ]);

  console.log(JSON.stringify({ categories, tags, uncategorizedPrimary, publishedTools }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
