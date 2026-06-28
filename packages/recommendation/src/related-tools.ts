import type { PrismaClient } from "@ai-tool-cms/database";
import { ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { cosineSimilarity } from "@ai-tool-cms/search";
import type { RelatedTool } from "./types";

const activeOnly = { deletedAt: null } as const;

type ToolCandidate = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  categoryIds: Set<string>;
  tagIds: Set<string>;
  reviewScore: number;
  popularityScore: number;
  clickCount: number;
};

/** Commit 054 — Related tools via embedding + category + tags + traffic + reviews. */
export async function computeRelatedTools(
  prisma: PrismaClient,
  toolId: string,
  limit = 10,
): Promise<RelatedTool[]> {
  const source = await prisma.tool.findFirst({
    where: { id: toolId, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly },
      tags: { where: activeOnly },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
    },
  });
  if (!source) return [];

  const sourceMeta = (source.metadata ?? {}) as Record<string, unknown>;
  const sourceEmbedding = sourceMeta.searchEmbedding as number[] | undefined;
  const sourceCategoryIds = new Set(source.categories.map((c) => c.categoryId));
  const sourceTagIds = new Set(source.tags.map((t) => t.tagId));

  const candidates = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly, NOT: { id: toolId } },
    include: {
      categories: { where: activeOnly },
      tags: { where: activeOnly },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
    },
    take: 80,
    orderBy: { publishedAt: "desc" },
  });

  const clickCounts = await prisma.searchClickLog.groupBy({
    by: ["toolId"],
    _count: { toolId: true },
  });
  const clickMap = new Map(clickCounts.map((c) => [c.toolId, c._count.toolId]));

  const mapped: ToolCandidate[] = candidates.map((tool) => {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const reviews = tool.reviews;
    const avgRating =
      reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      summary: tool.summary,
      metadata,
      categoryIds: new Set(tool.categories.map((c) => c.categoryId)),
      tagIds: new Set(tool.tags.map((t) => t.tagId)),
      reviewScore: avgRating,
      popularityScore: Number(metadata.popularityScore ?? 0),
      clickCount: clickMap.get(tool.id) ?? 0,
    };
  });

  const scored = mapped.map((candidate) => {
    let score = 0;
    const reasons: string[] = [];

    const sharedCategories = [...sourceCategoryIds].filter((id) => candidate.categoryIds.has(id));
    if (sharedCategories.length) {
      score += sharedCategories.length * 25;
      reasons.push("same category");
    }

    const sharedTags = [...sourceTagIds].filter((id) => candidate.tagIds.has(id));
    if (sharedTags.length) {
      score += sharedTags.length * 15;
      reasons.push("shared tags");
    }

    score += candidate.popularityScore * 0.2;
    score += candidate.reviewScore * 10;
    score += Math.log10(candidate.clickCount + 1) * 8;

    const candidateEmbedding = candidate.metadata.searchEmbedding as number[] | undefined;
    if (sourceEmbedding?.length && candidateEmbedding?.length) {
      const sim = cosineSimilarity(sourceEmbedding, candidateEmbedding);
      score += sim * 40;
      if (sim > 0.5) reasons.push("semantic similarity");
    }

    return {
      toolId: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      summary: candidate.summary,
      score,
      reason: reasons.join(", ") || "related tool",
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
