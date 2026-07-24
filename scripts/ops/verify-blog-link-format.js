const { PrismaClient, ToolStatus } = require("../../packages/database/generated/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.blogArticle.findMany({
    where: {
      createdAt: { gte: new Date("2026-07-19T00:00:00.000Z") },
      status: ToolStatus.PUBLISHED,
    },
    select: {
      slug: true,
      content: true,
    },
  });

  const invalid = rows
    .filter((row) => /\bToolsDar page:|Directory page:/iu.test(row.content))
    .map((row) => row.slug);

  const links = rows.reduce((count, row) => {
    return count + (row.content.match(/\[[^\]]+\]\(\/en\/tools\/[^)]+\)/gu) ?? []).length;
  }, 0);
  const duplicateLinkLines = rows
    .filter((row) => {
      const lines = String(row.content).split("\n");
      return lines.some((line, index) => {
        const match = line.match(/^\s*-\s*\[[^\]]+\]\((\/en\/tools\/[^)]+)\)\s*$/iu);
        return (
          match &&
          lines.slice(Math.max(0, index - 8), index).some((item) => item.includes(`](${match[1]})`))
        );
      });
    })
    .map((row) => row.slug);

  console.log(
    JSON.stringify(
      {
        scanned: rows.length,
        invalidPrefixArticles: invalid,
        duplicateLinkArticles: duplicateLinkLines,
        internalLinkCount: links,
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
