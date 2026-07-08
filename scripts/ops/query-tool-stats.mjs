import { PrismaClient } from "../../packages/database/generated/client/index.js";

async function main() {
  const prisma = new PrismaClient();

  try {
    const total = await prisma.tool.count({
      where: { deletedAt: null },
    });

    const groups = await prisma.tool.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { status: true },
      orderBy: { status: "asc" },
    });

    console.log(
      JSON.stringify(
        {
          total,
          byStatus: groups.map((group) => ({
            status: group.status,
            count: group._count.status,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
