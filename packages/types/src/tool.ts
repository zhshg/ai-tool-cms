import type { PricingModel, Timestamps, ToolStatus } from "./common";

export interface Tool extends Timestamps {
  id: string;
  slug: string;
  name: string;
  description?: string;
  summary?: string;
  website: string;
  logo?: string;
  pricing: PricingModel;
  status: ToolStatus;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  scheduledAt?: string;
  categoryIds?: string[];
  tagIds?: string[];
}

export interface ToolSummary {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  logo?: string;
  pricing: PricingModel;
  status: ToolStatus;
}
