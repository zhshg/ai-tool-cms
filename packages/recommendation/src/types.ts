export type RecommendationBreakdown = {
  sharedTags: number;
  sharedCategories: number;
  samePricing: number;
  sharedPlatforms: number;
  popularity: number;
  freshness: number;
  semanticSimilarity: number;
};

export type RelatedTool = {
  toolId: string;
  slug: string;
  name: string;
  summary?: string | null;
  score: number;
  reason: string;
  breakdown: RecommendationBreakdown;
};

export type RelatedCategory = {
  id: string;
  slug: string;
  name: string;
  iconUrl?: string | null;
  toolCount: number;
  reason: string;
};

export type ToolRecommendationSet = {
  similarTools: RelatedTool[];
  alternatives: RelatedTool[];
  moreLikeThis: RelatedTool[];
  trendingTools: RelatedTool[];
  relatedCategories: RelatedCategory[];
};

export type HomeSectionKind =
  | "because_you_viewed"
  | "trending_in_category"
  | "popular_this_week"
  | "recently_added"
  | "similar_ai"
  | "alternatives"
  | "compare";

export type HomeSection = {
  kind: HomeSectionKind;
  title: string;
  tools: RelatedTool[];
};

export type RecommendationContext = {
  locale?: string;
  region?: string;
  viewedToolIds?: string[];
  categorySlug?: string;
  limit?: number;
};
