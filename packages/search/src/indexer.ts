import type { PrismaClient } from "@ai-tool-cms/database";
import { ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { embedText } from "./embeddings";
import { buildSearchableText } from "./ranking";
import { deleteToolDocument, upsertToolDocument } from "./client";
import type { IndexToolPayload, SearchToolDocument } from "./types";

const activeOnly = { deletedAt: null } as const;

export class Indexer {
  constructor(private readonly prisma: PrismaClient) {}

  async indexTool(
    toolId: string,
    _payload?: IndexToolPayload,
  ): Promise<{
    indexed: boolean;
    embeddingDimensions: number;
  }> {
    const tool = await this.prisma.tool.findFirst({
      where: { id: toolId, status: ToolStatus.PUBLISHED, ...activeOnly },
      include: {
        categories: { where: activeOnly, include: { category: true } },
        tags: { where: activeOnly, include: { tag: true } },
        reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
      },
    });

    if (!tool) {
      await deleteToolDocument(toolId);
      return { indexed: false, embeddingDimensions: 0 };
    }

    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const features = normalizeStringList(metadata.aiFeatures ?? metadata.features);
    const useCases = normalizeStringList(metadata.aiUseCases ?? metadata.useCases);
    const platforms = normalizeStringList(metadata.aiPlatforms ?? metadata.platforms);
    const languages = normalizeStringList(metadata.aiLanguages ?? metadata.languages);

    const categorySlugs = tool.categories.map((c) => c.category.slug);
    const categoryNames = tool.categories.map((c) => c.category.name);
    const tagSlugs = tool.tags.map((t) => t.tag.slug);
    const tagNames = tool.tags.map((t) => t.tag.name);

    const reviewScore =
      tool.reviews.length > 0
        ? tool.reviews.reduce((sum, r) => sum + r.rating, 0) / tool.reviews.length
        : 0;

    const popularityScore = Number(metadata.popularityScore ?? metadata.overallScore ?? 0);

    const partial: SearchToolDocument = {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      description: tool.description ?? undefined,
      summary: tool.summary ?? undefined,
      website: tool.website,
      logoUrl: tool.logoUrl ?? undefined,
      pricingModel: tool.pricingModel,
      categorySlugs,
      categoryNames,
      tagSlugs,
      tagNames,
      platforms,
      languages,
      features,
      useCases,
      hasApi: hasApiAccess(metadata),
      isFree: tool.pricingModel === "FREE" || tool.pricingModel === "FREEMIUM",
      isOpenSource: isOpenSourceTool(metadata, tagSlugs),
      popularityScore,
      trendingScore: Number(metadata.trendingScore ?? popularityScore),
      reviewScore,
      publishedAt: tool.publishedAt?.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
      searchableText: "",
    };

    partial.searchableText = buildSearchableText(partial);

    const embedding = await embedText(partial.searchableText);

    await this.prisma.tool.update({
      where: { id: toolId },
      data: {
        metadata: {
          ...metadata,
          searchEmbedding: embedding.vector,
          searchEmbeddingProvider: embedding.provider,
          searchEmbeddingModel: embedding.model,
          searchIndexedAt: new Date().toISOString(),
        },
      },
    });

    await upsertToolDocument(partial);

    return { indexed: true, embeddingDimensions: embedding.dimensions };
  }
}

export async function indexTool(
  prisma: PrismaClient,
  toolId: string,
  payload?: IndexToolPayload,
): Promise<{ indexed: boolean; embeddingDimensions: number }> {
  const indexer = new Indexer(prisma);
  return indexer.indexTool(toolId, payload);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function hasApiAccess(metadata: Record<string, unknown>): boolean {
  const explicit = metadata.hasApi ?? metadata.apiAccess ?? metadata.aiApiAccess ?? metadata.api;
  if (typeof explicit === "boolean") return explicit;
  const integrations = normalizeStringList(metadata.aiIntegrations ?? metadata.integrations);
  return integrations.some((item) => /api|webhook|zapier|make|n8n/i.test(item));
}

function isOpenSourceTool(metadata: Record<string, unknown>, tagSlugs: string[]): boolean {
  if (metadata.openSource === true || metadata.isOpenSource === true) return true;
  return tagSlugs.some((slug) => ["open-source", "opensource", "oss"].includes(slug));
}
