const { prisma } = require("/app/packages/database/dist");
const { collectToolLogo } = require("/app/packages/automation/dist");

async function main() {
  const tools = await prisma.tool.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    select: { id: true, slug: true, logoUrl: true, metadata: true },
    orderBy: { slug: "asc" },
  });

  const results = [];
  for (const tool of tools) {
    const result = await collectToolLogo(prisma, tool.id, { force: true });
    results.push({
      slug: tool.slug,
      ok: Boolean(result.ok),
      skipped: Boolean(result.skipped),
      reason: result.reason ?? null,
      logoUrl: result.logoUrl ?? null,
      source: result.source ?? null,
    });
  }

  const refreshed = await prisma.tool.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    select: { slug: true, logoUrl: true, metadata: true },
    orderBy: { slug: "asc" },
  });

  const missing = refreshed
    .filter((tool) => {
      const metadata = tool.metadata && typeof tool.metadata === "object" ? tool.metadata : {};
      return !tool.logoUrl && typeof metadata.collectedLogoUrl !== "string";
    })
    .map((tool) => tool.slug);

  console.log(
    JSON.stringify({
      total: results.length,
      ok: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      missingAfterRefresh: missing.length,
      missingSample: missing.slice(0, 10),
      sample: results.slice(0, 10),
    }),
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
