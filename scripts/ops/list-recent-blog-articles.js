const { PrismaClient } = require("../../packages/database/generated/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.blogArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      slug: true,
      title: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      metadata: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
