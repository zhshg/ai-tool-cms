import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const [missingLogo, missingFallback] = await Promise.all([
    prisma.tool.count({
      where: {
        deletedAt: null,
        OR: [{ logoUrl: null }, { logoUrl: "" }],
      },
    }),
    prisma.tool.count({
      where: {
        deletedAt: null,
        metadata: {
          path: ["collectedLogoUrl"],
          equals: null,
        },
      },
    }),
  ]);

  console.log(JSON.stringify({ missingLogo, missingFallback }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
