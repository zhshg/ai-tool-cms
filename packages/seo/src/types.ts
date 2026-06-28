export type BreadcrumbItem = {
  name: string;
  path: string;
};

export type HreflangAlternate = {
  locale: string;
  path: string;
};

export type SeoPageInput = {
  title?: string;
  description?: string;
  path?: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
  twitterCard?: "summary" | "summary_large_image";
  keywords?: string[];
  hreflang?: HreflangAlternate[];
  robots?: string;
};

export type SoftwareApplicationInput = {
  name: string;
  description?: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  image?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    description?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
    bestRating?: number;
    worstRating?: number;
  };
};

export type FaqPageInput = {
  url: string;
  faqs: Array<{ question: string; answer: string }>;
};

export type CollectionPageInput = {
  name: string;
  description?: string;
  url: string;
  items: Array<{ name: string; url: string; description?: string }>;
};

export type ItemListInput = {
  name: string;
  description?: string;
  url: string;
  items: Array<{ name: string; url: string; position?: number }>;
};

export type SitemapEntry = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export type SitemapChunkId = "tool" | "category" | "tag" | "prompt" | "compare" | "rss";

export type SitemapChunk = {
  id: SitemapChunkId;
  entries: SitemapEntry[];
  lastModified?: Date | string;
};

export type RobotsOptions = {
  allow?: string | string[];
  disallow?: string | string[];
  noIndex?: boolean;
  sitemapIndexUrl?: string;
};

export type InternalLinkType =
  "alternative" | "compare" | "category" | "tag" | "prompt" | "faq" | "related" | "trending";

export type InternalLink = {
  href: string;
  anchor: string;
  type: InternalLinkType;
  targetSlug: string;
  targetKind: "tool" | "category" | "tag" | "compare" | "prompt" | "faq" | "page";
};

export type ComparePageKind = "tool_vs" | "alternatives" | "top_list";

export type ComparePageSpec = {
  slug: string;
  kind: ComparePageKind;
  title: string;
  toolSlugs?: string[];
  categorySlug?: string;
  tagSlug?: string;
};

export type FeedItem = {
  id: string;
  title: string;
  link: string;
  description?: string;
  publishedAt: Date | string;
  updatedAt?: Date | string;
};

export type SeoHealthIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  entityType?: string;
  entityId?: string;
  path?: string;
};

export type SeoHealthReport = {
  score: number;
  indexStatus: { indexed: number; pending: number; excluded: number };
  issues: SeoHealthIssue[];
  metrics: {
    missingMeta: number;
    missingSchema: number;
    duplicateTitles: number;
    brokenLinks: number;
    notFound404: number;
    lowContent: number;
    aiQualityLow: number;
  };
  generatedAt: string;
};

export type SearchConsoleMetrics = {
  provider: "google" | "bing";
  indexedPages: number;
  clicks: number;
  impressions: number;
  averagePosition: number;
  errors: number;
  sitemapStatus: "ok" | "warning" | "error" | "unknown";
  lastSyncedAt?: string;
};
