import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();
const prefix = process.argv[2] ?? new Date().toISOString().slice(0, 10);

try {
  const rows = await prisma.blogArticle.findMany({
    where: { slug: { startsWith: `${prefix}-` } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      _count: { select: { tags: true } },
    },
  });
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await prisma.$disconnect();
}
