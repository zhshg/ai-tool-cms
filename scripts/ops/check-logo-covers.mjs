import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const [total, withLogo, missing] = await Promise.all([
    prisma.tool.count({ where: { deletedAt: null } }),
    prisma.tool.count({ where: { deletedAt: null, NOT: { logoUrl: null } } }),
    prisma.tool.count({ where: { deletedAt: null, OR: [{ logoUrl: null }, { logoUrl: "" }] } }),
  ]);

  const sample = await prisma.tool.findMany({
    where: { deletedAt: null },
    take: 5,
    orderBy: { createdAt: "asc" },
    select: { name: true, website: true, logoUrl: true, metadata: true },
  });

  console.log(JSON.stringify({ total, withLogo, missing, sample }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
