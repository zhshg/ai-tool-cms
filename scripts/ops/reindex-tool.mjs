import { PrismaClient } from "../../packages/database/generated/client/index.js";
import { indexTool } from "../../packages/search/dist/index.js";

const prisma = new PrismaClient();

async function main() {
  const slug = getArg("--slug");
  if (!slug) throw new Error("Missing --slug");

  const tool = await prisma.tool.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!tool) throw new Error(`Tool not found: ${slug}`);

  const result = await indexTool(prisma, tool.id);
  console.log(JSON.stringify({ slug: tool.slug, ...result }, null, 2));
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
