import type { PrismaClient } from "@ai-tool-cms/database";
import { ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import type { PopularityInput, TrendingItem, TrendingPeriod } from "./types";
import { computeToolPopularity } from "./popularity";

const activeOnly = { deletedAt: null } as const;

function periodStart(period: TrendingPeriod): Date {
  const now = new Date();
  switch (period) {
    case "yearly":
      return new Date(now.getFullYear(), 0, 1);
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "weekly":
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/** Commit 056 — trending from clicks, favorites, reviews, freshness. */
export async function computeTrending(
  prisma: PrismaClient,
  period: TrendingPeriod = "weekly",
  limit = 20,
): Promise<TrendingItem[]> {
  const since = periodStart(period);

  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
      _count: { select: { favorites: true } },
    },
    take: 200,
    orderBy: { publishedAt: "desc" },
  });

  const clickCounts = await prisma.searchClickLog.groupBy({
    by: ["toolId"],
    where: { createdAt: { gte: since } },
    _count: { toolId: true },
  });
  const clickMap = new Map(clickCounts.map((c) => [c.toolId, c._count.toolId]));

  const scored = tools.map((tool) => {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const reviews = tool.reviews;
    const avgRating =
      reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const popularity = computeToolPopularity({
      toolId: tool.id,
      slug: tool.slug,
      name: tool.name,
      metaTitle: tool.metaTitle,
      metaDescription: tool.metaDescription,
      summary: tool.summary,
      publishedAt: tool.publishedAt,
      updatedAt: tool.updatedAt,
      metadata,
      reviewCount: reviews.length,
      averageRating: avgRating,
      favoriteCount: tool._count.favorites,
      clickCount: clickMap.get(tool.id) ?? 0,
      viewCount: Number(metadata.viewCount ?? 0),
    });

    const periodBoost = (clickMap.get(tool.id) ?? 0) * 5 + tool._count.favorites * 3;
    return { ...popularity, trendScore: popularity.overallScore + periodBoost };
  });

  return scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit)
    .map((item, index) => ({
      toolId: item.toolId,
      slug: item.slug,
      name: item.name,
      score: item.trendScore,
      rank: index + 1,
      period,
    }));
}

export async function snapshotToolPopularity(prisma: PrismaClient, toolId: string): Promise<void> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, ...activeOnly },
    include: {
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
      _count: { select: { favorites: true } },
    },
  });
  if (!tool) return;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const reviews = tool.reviews;
  const avgRating =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const clickCount = await prisma.searchClickLog.count({
    where: { toolId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });

  const input: PopularityInput = {
    toolId: tool.id,
    slug: tool.slug,
    name: tool.name,
    metaTitle: tool.metaTitle,
    metaDescription: tool.metaDescription,
    summary: tool.summary,
    publishedAt: tool.publishedAt,
    updatedAt: tool.updatedAt,
    metadata,
    reviewCount: reviews.length,
    averageRating: avgRating,
    favoriteCount: tool._count.favorites,
    clickCount,
    viewCount: Number(metadata.viewCount ?? 0),
  };

  const scores = computeToolPopularity(input);

  await prisma.toolPopularitySnapshot.create({
    data: {
      toolId,
      seoScore: scores.seoScore,
      aiScore: scores.aiScore,
      trafficScore: scores.trafficScore,
      freshnessScore: scores.freshnessScore,
      reviewScore: scores.reviewScore,
      overallScore: scores.overallScore,
      payload: scores as object,
    },
  });

  await prisma.tool.update({
    where: { id: toolId },
    data: {
      metadata: {
        ...metadata,
        popularityScore: scores.overallScore,
        popularityBreakdown: scores,
      },
    },
  });
}
