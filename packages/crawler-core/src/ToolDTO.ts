/**
 * Unified crawler output DTO — all adapters normalize to this shape (Commit 027).
 */
export type ToolDTO = {
  name: string;
  slug: string;
  website: string;
  domain: string;
  description?: string;
  summary?: string;
  logoUrl?: string;
  categories: string[];
  tags: string[];
  features: string[];
  platforms: string[];
  pricingModel?: "FREE" | "FREEMIUM" | "PAID" | "ENTERPRISE" | "CONTACT";
  externalId?: string;
  sourceId: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
};

export type CrawlCategoryDTO = {
  externalId: string;
  name: string;
  slug: string;
  url?: string;
  parentExternalId?: string;
};

export type CrawlToolListItemDTO = {
  externalId: string;
  name: string;
  slug?: string;
  url?: string;
  website?: string;
  summary?: string;
  logoUrl?: string;
  categoryExternalIds?: string[];
};

export type CrawlToolDetailDTO = CrawlToolListItemDTO & {
  description?: string;
  tags?: string[];
  features?: string[];
  platforms?: string[];
  pricingModel?: ToolDTO["pricingModel"];
  raw?: Record<string, unknown>;
};
