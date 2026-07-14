import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const SLUGS = ["ai-studios", "n8n", "chatgpt", "cursor"];

async function main() {
  const tools = [];
  for (const slug of SLUGS) {
    const tool = await prisma.tool.findFirst({
      where: { slug, deletedAt: null },
      select: {
        slug: true,
        name: true,
        website: true,
        summary: true,
        description: true,
        longDescription: true,
        logoUrl: true,
        metaTitle: true,
        metaDescription: true,
        metadata: true,
        categories: {
          where: { deletedAt: null },
          select: {
            isPrimary: true,
            category: { select: { slug: true, name: true } },
          },
        },
      },
    });

    if (tool) {
      tools.push({
        slug: tool.slug,
        name: tool.name,
        website: tool.website,
        summary: tool.summary,
        description: tool.description,
        longDescriptionLength: tool.longDescription ? tool.longDescription.length : 0,
        logoUrl: tool.logoUrl,
        metaTitle: tool.metaTitle,
        metaDescription: tool.metaDescription,
        metadata: {
          sourceUrl: tool.metadata && tool.metadata.sourceUrl ? tool.metadata.sourceUrl : null,
          sourceSlug: tool.metadata && tool.metadata.sourceSlug ? tool.metadata.sourceSlug : null,
          collectedLogoUrl:
            tool.metadata && tool.metadata.collectedLogoUrl ? tool.metadata.collectedLogoUrl : null,
          screenshots:
            tool.metadata && Array.isArray(tool.metadata.screenshots)
              ? tool.metadata.screenshots.length
              : 0,
        },
        categories: tool.categories.map((item) => ({
          slug: item.category.slug,
          name: item.category.name,
          primary: item.isPrimary,
        })),
      });
    }
  }

  console.log(JSON.stringify(tools, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
