import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const [description, longDescription, metaDescription, summary, emptySummary] = await Promise.all([
    prisma.tool.count({ where: { deletedAt: null, description: { contains: "<" } } }),
    prisma.tool.count({ where: { deletedAt: null, longDescription: { contains: "<" } } }),
    prisma.tool.count({ where: { deletedAt: null, metaDescription: { contains: "<" } } }),
    prisma.tool.count({ where: { deletedAt: null, summary: { contains: "<" } } }),
    prisma.tool.count({ where: { deletedAt: null, summary: null } }),
  ]);

  console.log(
    JSON.stringify(
      { description, longDescription, metaDescription, summary, emptySummary },
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
