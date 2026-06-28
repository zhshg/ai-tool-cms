export type RelatedTool = {
  toolId: string;
  slug: string;
  name: string;
  summary?: string | null;
  score: number;
  reason: string;
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
  viewedToolIds?: string[];
  categorySlug?: string;
  limit?: number;
};
