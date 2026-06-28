import type { PopularityInput, ToolScoreBreakdown } from "./types";

function clamp(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

/** Commit 057 — composite Tool Score (not sorted by ID). */
export function computeToolPopularity(input: PopularityInput): ToolScoreBreakdown {
  const metadata = input.metadata ?? {};
  const pipeline = (metadata.aiPipeline ?? {}) as Record<string, unknown>;
  const quality = pipeline.quality as { overall?: number } | undefined;
  const geo = metadata.geo ?? metadata.geoDocument;

  const seoScore = clamp(
    (input.metaTitle ? 30 : 0) +
      (input.metaDescription ? 30 : 0) +
      (input.summary ? 20 : 0) +
      (metadata.geoDocument ? 20 : 0),
  );

  const aiScore = clamp(quality?.overall ?? (geo ? 70 : input.summary ? 50 : 20));

  const trafficScore = clamp(
    Math.log10(input.viewCount + 1) * 20 +
      Math.log10(input.clickCount + 1) * 25 +
      Math.log10(input.favoriteCount + 1) * 15,
  );

  const daysSinceUpdate = Math.max(
    0,
    (Date.now() - input.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const freshnessScore = clamp(100 - daysSinceUpdate * 2);

  const reviewScore = clamp(
    input.reviewCount === 0 ? 0 : input.averageRating * 18 + Math.log10(input.reviewCount + 1) * 10,
  );

  const overallScore = clamp(
    seoScore * 0.2 +
      aiScore * 0.25 +
      trafficScore * 0.25 +
      freshnessScore * 0.15 +
      reviewScore * 0.15,
  );

  return {
    toolId: input.toolId,
    slug: input.slug,
    name: input.name,
    seoScore,
    aiScore,
    trafficScore,
    freshnessScore,
    reviewScore,
    overallScore,
  };
}
