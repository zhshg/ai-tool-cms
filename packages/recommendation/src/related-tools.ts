import type { PrismaClient } from "@ai-tool-cms/database";
import { ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { cosineSimilarity } from "@ai-tool-cms/search";
import type { RelatedCategory, RelatedTool, ToolRecommendationSet } from "./types";

const activeOnly = { deletedAt: null } as const;
const MAX_CANDIDATES = 200;

type ToolCandidate = {
  id: string;
  slug: string;
  name: string;
  website: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  categoryIds: Set<string>;
  tagIds: Set<string>;
  pricingModel: string;
  platforms: Set<string>;
  reviewScore: number;
  popularityScore: number;
  clickCount: number;
  favoriteCount: number;
  updatedAt: Date;
};

type ScoredTool = RelatedTool & {
  websiteKey: string;
  nameKey: string;
  sharedTagCount: number;
  sharedCategoryCount: number;
};

type SourceToolContext = {
  id: string;
  pricingModel: string;
  metadata: Record<string, unknown>;
  categoryIds: Set<string>;
  tagIds: Set<string>;
  platforms: Set<string>;
  embedding?: number[];
};

/** Build a ranked recommendation set for a tool detail page. */
export async function buildToolRecommendations(
  prisma: PrismaClient,
  toolId: string,
  limit = 6,
): Promise<ToolRecommendationSet> {
  const [ranked, trendingItems, relatedCategories] = await Promise.all([
    computeRelatedTools(prisma, toolId, Math.max(limit * 3, 18)),
    computeTrending(prisma, "weekly", Math.max(limit * 2, 12)),
    computeRelatedCategories(prisma, toolId, limit),
  ]);

  const seen = new Set<string>();
  const takeUnique = (tools: RelatedTool[], size: number) => {
    const output: RelatedTool[] = [];
    for (const tool of tools) {
      if (seen.has(tool.toolId)) continue;
      seen.add(tool.toolId);
      output.push(tool);
      if (output.length >= size) break;
    }
    return output;
  };

  const similarTools = takeUnique(
    ranked.filter((tool) => tool.breakdown.sharedTags > 0 || tool.breakdown.sharedCategories > 0),
    limit,
  );
  const alternatives = takeUnique(
    ranked.filter((tool) => tool.breakdown.sharedTags > 0 || tool.breakdown.samePricing > 0),
    Math.min(5, limit),
  );
  const moreLikeThis = takeUnique(ranked, limit);

  const trendingIds = trendingItems
    .filter((item) => item.toolId !== toolId && !seen.has(item.toolId))
    .slice(0, limit)
    .map((item) => item.toolId);

  const trendingTools = trendingIds.length
    ? await hydrateRelatedTools(prisma, trendingIds, "trending this week")
    : [];

  return {
    similarTools,
    alternatives,
    moreLikeThis,
    trendingTools,
    relatedCategories,
  };
}

/** Ranked related tools using tags, categories, pricing, platforms, popularity, freshness, and embeddings. */
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
    },
  });
  if (!source) return [];

  const sourceMeta = (source.metadata ?? {}) as Record<string, unknown>;
  const context: SourceToolContext = {
    id: source.id,
    pricingModel: source.pricingModel,
    metadata: sourceMeta,
    categoryIds: new Set(source.categories.map((c) => c.categoryId)),
    tagIds: new Set(source.tags.map((t) => t.tagId)),
    platforms: new Set(normalizeStringList(sourceMeta.aiPlatforms ?? sourceMeta.platforms)),
    embedding: Array.isArray(sourceMeta.searchEmbedding)
      ? (sourceMeta.searchEmbedding as number[])
      : undefined,
  };

  const candidates = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly, NOT: { id: toolId } },
    include: {
      categories: { where: activeOnly },
      tags: { where: activeOnly },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
      _count: { select: { favorites: true } },
    },
    take: MAX_CANDIDATES,
    orderBy: [{ updatedAt: "desc" }, { publishedAt: "desc" }, { name: "asc" }],
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
      website: tool.website,
      summary: tool.summary,
      metadata,
      categoryIds: new Set(tool.categories.map((c) => c.categoryId)),
      tagIds: new Set(tool.tags.map((t) => t.tagId)),
      pricingModel: tool.pricingModel,
      platforms: new Set(normalizeStringList(metadata.aiPlatforms ?? metadata.platforms)),
      reviewScore: avgRating,
      popularityScore: Number(metadata.popularityScore ?? 0),
      clickCount: clickMap.get(tool.id) ?? 0,
      favoriteCount: tool._count.favorites,
      updatedAt: tool.updatedAt,
    };
  });

  const scored = mapped.map((candidate) => scoreCandidate(context, candidate));
  return dedupeScoredTools(scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ websiteKey: _websiteKey, nameKey: _nameKey, sharedTagCount: _tagCount, sharedCategoryCount: _categoryCount, ...tool }) => tool);
}

async function computeRelatedCategories(
  prisma: PrismaClient,
  toolId: string,
  limit: number,
): Promise<RelatedCategory[]> {
  const source = await prisma.tool.findFirst({
    where: { id: toolId, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: { categories: { where: activeOnly }, tags: { where: activeOnly } },
  });
  if (!source) return [];

  const categoryIds = source.categories.map((item) => item.categoryId);
  const tagIds = source.tags.map((item) => item.tagId);
  if (!categoryIds.length && !tagIds.length) return [];

  const categories = await prisma.category.findMany({
    where: {
      ...activeOnly,
      tools: {
        some: {
          ...activeOnly,
          tool: {
            status: ToolStatus.PUBLISHED,
            ...activeOnly,
            id: { not: toolId },
            OR: [
              ...(categoryIds.length
                ? [{ categories: { some: { ...activeOnly, categoryId: { in: categoryIds } } } }]
                : []),
              ...(tagIds.length
                ? [{ tags: { some: { ...activeOnly, tagId: { in: tagIds } } } }]
                : []),
            ],
          },
        },
      },
    },
    include: {
      _count: {
        select: {
          tools: { where: { ...activeOnly, tool: { status: ToolStatus.PUBLISHED, ...activeOnly } } },
        },
      },
    },
    take: Math.max(limit * 2, 12),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories
    .filter((category) => !categoryIds.includes(category.id) || category._count.tools > 1)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      iconUrl: category.iconUrl,
      toolCount: category._count.tools,
      reason: categoryIds.includes(category.id) ? "same category cluster" : "related discovery path",
    }))
    .slice(0, limit);
}

async function hydrateRelatedTools(
  prisma: PrismaClient,
  toolIds: string[],
  reason: string,
): Promise<RelatedTool[]> {
  const tools = await prisma.tool.findMany({
    where: { id: { in: toolIds }, status: ToolStatus.PUBLISHED, ...activeOnly },
    select: { id: true, slug: true, name: true, summary: true, metadata: true },
  });
  const order = new Map(toolIds.map((id, index) => [id, index]));

  return tools
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
    .map((tool, index) => ({
      toolId: tool.id,
      slug: tool.slug,
      name: tool.name,
      summary: tool.summary,
      score: Math.max(1, toolIds.length - index),
      reason,
      breakdown: {
        sharedTags: 0,
        sharedCategories: 0,
        samePricing: 0,
        sharedPlatforms: 0,
        popularity: Number(((tool.metadata ?? {}) as Record<string, unknown>).popularityScore ?? 0),
        freshness: 0,
        semanticSimilarity: 0,
      },
    }));
}

function scoreCandidate(context: SourceToolContext, candidate: ToolCandidate): ScoredTool {
  let score = 0;
  const reasons: string[] = [];

  const sharedCategories = [...context.categoryIds].filter((id) => candidate.categoryIds.has(id));
  if (sharedCategories.length) {
    score += sharedCategories.length * 28;
    reasons.push("same category");
  }

  const sharedTags = [...context.tagIds].filter((id) => candidate.tagIds.has(id));
  if (sharedTags.length) {
    score += sharedTags.length * 38;
    reasons.push("shared tags");
  }

  const samePricing = candidate.pricingModel === context.pricingModel ? 1 : 0;
  if (samePricing) {
    score += 10;
    reasons.push("similar pricing");
  }

  const sharedPlatforms = [...context.platforms].filter((platform) => candidate.platforms.has(platform));
  if (sharedPlatforms.length) {
    score += Math.min(sharedPlatforms.length, 3) * 8;
    reasons.push("same platform");
  }

  const popularity =
    candidate.popularityScore * 0.18 +
    Math.log10(candidate.clickCount + 1) * 8 +
    candidate.favoriteCount * 2 +
    candidate.reviewScore * 6;
  score += popularity;
  if (popularity >= 8) reasons.push("popular");

  const freshness = computeFreshnessBoost(candidate.updatedAt);
  score += freshness;
  if (freshness >= 4) reasons.push("recently updated");

  let semanticSimilarity = 0;
  const candidateEmbedding = candidate.metadata.searchEmbedding as number[] | undefined;
  if (context.embedding?.length && candidateEmbedding?.length) {
    semanticSimilarity = cosineSimilarity(context.embedding, candidateEmbedding);
    score += semanticSimilarity * 24;
    if (semanticSimilarity > 0.5) reasons.push("semantic similarity");
  }

  if (sharedTags.length === 0 && sharedCategories.length === 0) {
    score *= 0.72;
  }

  return {
    toolId: candidate.id,
    slug: candidate.slug,
    name: candidate.name,
    summary: candidate.summary,
    score,
    reason: reasons.join(", ") || "related tool",
    breakdown: {
      sharedTags: sharedTags.length,
      sharedCategories: sharedCategories.length,
      samePricing,
      sharedPlatforms: sharedPlatforms.length,
      popularity,
      freshness,
      semanticSimilarity,
    },
    websiteKey: normalizeWebsite(candidate.website),
    nameKey: normalizeText(candidate.name),
    sharedTagCount: sharedTags.length,
    sharedCategoryCount: sharedCategories.length,
  };
}

function dedupeScoredTools(items: ScoredTool[]): ScoredTool[] {
  const byWebsite = new Map<string, ScoredTool>();
  const byName = new Map<string, ScoredTool>();

  for (const item of items) {
    const existingWebsite = item.websiteKey ? byWebsite.get(item.websiteKey) : undefined;
    const existingName = item.nameKey ? byName.get(item.nameKey) : undefined;
    const existing = existingWebsite ?? existingName;

    if (existing && existing.score >= item.score) continue;
    if (existing) {
      if (existing.websiteKey) byWebsite.delete(existing.websiteKey);
      if (existing.nameKey) byName.delete(existing.nameKey);
    }
    if (item.websiteKey) byWebsite.set(item.websiteKey, item);
    if (item.nameKey) byName.set(item.nameKey, item);
  }

  return [...new Set([...byWebsite.values(), ...byName.values()])];
}

function computeFreshnessBoost(updatedAt: Date): number {
  const ageDays = Math.max(0, (Date.now() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays <= 14) return 8;
  if (ageDays <= 45) return 5;
  if (ageDays <= 90) return 3;
  if (ageDays <= 180) return 1;
  return 0;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean);
}

function normalizeWebsite(value: string): string {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return normalizeText(value);
  }
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}
