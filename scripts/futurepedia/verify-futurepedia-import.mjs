import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const toolsTotal = await prisma.tool.count({ where: { deletedAt: null } });
  const categoriesTotal = await prisma.category.count({ where: { deletedAt: null } });
  const toolsWithCategory = await prisma.tool.count({
    where: {
      deletedAt: null,
      categories: { some: { deletedAt: null } },
    },
  });

  console.log(JSON.stringify({ toolsTotal, categoriesTotal, toolsWithCategory }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
