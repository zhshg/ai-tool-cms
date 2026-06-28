export type SearchSortField = "relevance" | "popularity" | "newest" | "rating";

export type SearchFilters = {
  category?: string | string[];
  tag?: string | string[];
  pricing?: string | string[];
  language?: string | string[];
  platform?: string | string[];
};

export type SearchQuery = {
  keyword?: string;
  filters?: SearchFilters;
  sort?: SearchSortField;
  page?: number;
  pageSize?: number;
  semantic?: boolean;
};

export type SearchFacetValue = {
  value: string;
  count: number;
};

export type SearchFacets = {
  categories?: SearchFacetValue[];
  tags?: SearchFacetValue[];
  pricing?: SearchFacetValue[];
  platforms?: SearchFacetValue[];
  languages?: SearchFacetValue[];
};

export type SearchHit<T = SearchToolDocument> = {
  document: T;
  score: number;
  semanticScore?: number;
  highlights?: Array<{ field: string; snippet: string }>;
};

export type SearchResult<T = SearchToolDocument> = {
  query: string;
  normalizedQuery: string;
  hits: SearchHit<T>[];
  page: number;
  pageSize: number;
  totalHits: number;
  totalPages: number;
  processingTimeMs: number;
  facets?: SearchFacets;
  semanticUsed: boolean;
};

export type SearchToolDocument = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  summary?: string;
  website: string;
  logoUrl?: string;
  pricingModel: string;
  categorySlugs: string[];
  categoryNames: string[];
  tagSlugs: string[];
  tagNames: string[];
  platforms: string[];
  languages: string[];
  features: string[];
  useCases: string[];
  popularityScore: number;
  reviewScore: number;
  publishedAt?: string;
  updatedAt: string;
  searchableText: string;
};

export type IndexToolPayload = {
  toolId: string;
  reason?: "tool_update" | "ai_generated" | "seo_generated" | "publish";
};
