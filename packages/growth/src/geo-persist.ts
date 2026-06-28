import type { PrismaClient } from "@ai-tool-cms/database";
import { buildGeoDocument, buildGeoPlainText } from "@ai-tool-cms/geo";

const activeOnly = { deletedAt: null } as const;

/** Materialize GEO document for LLM crawlers (ChatGPT, Gemini, Claude, Perplexity). */
export async function persistGeoDocumentForTool(
  prisma: PrismaClient,
  toolId: string,
): Promise<{ persisted: boolean; plainTextLength: number }> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true }, take: 1 },
    },
  });
  if (!tool) return { persisted: false, plainTextLength: 0 };

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const pipeline = (metadata.aiPipeline ?? {}) as Record<string, unknown>;
  const geo = metadata.geo ?? pipeline.geo;

  const doc = buildGeoDocument({
    slug: tool.slug,
    name: tool.name,
    website: tool.website,
    description: tool.description ?? undefined,
    category: tool.categories[0]?.category.name,
    geo: geo as never,
  });

  const plainText = buildGeoPlainText(doc);

  await prisma.tool.update({
    where: { id: toolId },
    data: {
      metadata: {
        ...metadata,
        geoDocument: doc,
        geoPlainText: plainText,
        geoPersistedAt: new Date().toISOString(),
      },
    },
  });

  return { persisted: true, plainTextLength: plainText.length };
}
