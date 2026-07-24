const { PrismaClient } = require("../../packages/database/generated/client");

const prisma = new PrismaClient();

async function main() {
  const slugs = process.argv.slice(2);
  const rows = await prisma.blogArticle.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      title: true,
      content: true,
    },
    orderBy: { createdAt: "desc" },
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
