export type TrendingPeriod = "weekly" | "monthly" | "yearly";

export type ToolScoreBreakdown = {
  toolId: string;
  slug: string;
  name: string;
  seoScore: number;
  aiScore: number;
  trafficScore: number;
  freshnessScore: number;
  reviewScore: number;
  overallScore: number;
};

export type TrendingItem = {
  toolId: string;
  slug: string;
  name: string;
  score: number;
  rank: number;
  period: TrendingPeriod;
};

export type PopularityInput = {
  toolId: string;
  slug: string;
  name: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  summary?: string | null;
  publishedAt?: Date | null;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
  reviewCount: number;
  averageRating: number;
  favoriteCount: number;
  clickCount: number;
  viewCount: number;
};
