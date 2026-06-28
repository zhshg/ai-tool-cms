import type { DiscoverySourceKind } from "@ai-tool-cms/database";

export type DiscoveryCandidate = {
  externalId?: string;
  title: string;
  url: string;
  description?: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
};

export type DiscoveryAdapterContext = {
  sourceUrl?: string | null;
  config: Record<string, unknown>;
};

export type DiscoveryAdapter = {
  kind: DiscoverySourceKind;
  discover: (ctx: DiscoveryAdapterContext) => Promise<DiscoveryCandidate[]>;
};

export const DEFAULT_DISCOVERY_SOURCES: Array<{
  slug: string;
  name: string;
  kind: DiscoverySourceKind;
  url?: string;
  intervalHours: number;
  priority: number;
}> = [
  {
    slug: "hacker-news-ai",
    name: "Hacker News AI",
    kind: "HACKER_NEWS",
    url: "https://news.ycombinator.com",
    intervalHours: 6,
    priority: 90,
  },
  {
    slug: "github-trending-ai",
    name: "GitHub Trending AI",
    kind: "GITHUB_TRENDING",
    url: "https://github.com/trending",
    intervalHours: 12,
    priority: 85,
  },
  {
    slug: "reddit-machinelearning",
    name: "Reddit r/MachineLearning",
    kind: "REDDIT_AI",
    url: "https://www.reddit.com/r/MachineLearning/.json",
    intervalHours: 6,
    priority: 80,
  },
  {
    slug: "hugging-face-daily",
    name: "Hugging Face Daily Papers",
    kind: "HUGGING_FACE",
    url: "https://huggingface.co/papers",
    intervalHours: 24,
    priority: 75,
  },
  {
    slug: "product-hunt-ai",
    name: "Product Hunt AI",
    kind: "PRODUCT_HUNT",
    url: "https://www.producthunt.com/topics/artificial-intelligence",
    intervalHours: 24,
    priority: 95,
  },
  {
    slug: "google-news-ai",
    name: "Google News AI",
    kind: "GOOGLE_NEWS_AI",
    intervalHours: 12,
    priority: 70,
  },
  {
    slug: "rss-ai-tools",
    name: "AI Tools RSS",
    kind: "RSS_FEED",
    url: "https://www.artificialintelligence-news.com/feed/",
    intervalHours: 12,
    priority: 60,
  },
  {
    slug: "openai-blog",
    name: "OpenAI Blog",
    kind: "OFFICIAL_BLOG",
    url: "https://openai.com/blog/rss.xml",
    intervalHours: 24,
    priority: 50,
  },
  {
    slug: "x-ai-trending",
    name: "X AI Trending",
    kind: "X_AI",
    intervalHours: 6,
    priority: 65,
  },
];
