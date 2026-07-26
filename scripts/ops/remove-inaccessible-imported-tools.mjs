import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const importSource = "all-tools-inaccessible-records";

  const matches = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      metadata: {
        path: ["importSource"],
        equals: importSource,
      },
    },
    select: { id: true, slug: true, name: true },
  });

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, matched: matches.length }, null, 2));
    return;
  }

  if (matches.length === 0) {
    console.log(JSON.stringify({ dryRun: false, matched: 0, deleted: 0 }, null, 2));
    return;
  }

  const ids = matches.map((item) => item.id);
  await prisma.$transaction([
    prisma.toolTag.deleteMany({ where: { toolId: { in: ids } } }),
    prisma.toolCategory.deleteMany({ where: { toolId: { in: ids } } }),
    prisma.tool.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(
    JSON.stringify({ dryRun: false, matched: matches.length, deleted: ids.length }, null, 2),
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
