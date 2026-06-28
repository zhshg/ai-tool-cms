import { Injectable } from "@nestjs/common";
import {
  publicCompareTools,
  publicGetAlternatives,
  publicGetPricing,
  publicGetTool,
  publicLatestTools,
  publicListCategories,
  publicListTags,
  publicListTools,
  publicListTrending,
  publicSearchTools,
} from "@ai-tool-cms/public-api";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublicApiService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  listTools(limit?: number, cursor?: string) {
    return publicListTools(this.db, { limit, cursor });
  }

  getTool(slug: string, locale?: string) {
    return publicGetTool(this.db, slug, locale ?? "en");
  }

  search(query: {
    keyword?: string;
    category?: string;
    tag?: string;
    pricing?: string;
    platform?: string;
    language?: string;
    sort?: "relevance" | "popularity" | "newest" | "rating";
    page?: number;
    pageSize?: number;
    semantic?: boolean;
  }) {
    return publicSearchTools(this.db, {
      keyword: query.keyword,
      filters: {
        category: query.category,
        tag: query.tag,
        pricing: query.pricing,
        platform: query.platform,
        language: query.language,
      },
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      semantic: query.semantic,
    });
  }

  listCategories(query?: string, slug?: string, limit?: number) {
    return publicListCategories(this.db, { query, slug, limit });
  }

  listTags(query?: string, limit?: number) {
    return publicListTags(this.db, { query, limit });
  }

  trending(period?: "weekly" | "monthly" | "yearly", limit?: number) {
    return publicListTrending(this.db, { period, limit });
  }

  compare(slugs?: string[], comparePageSlug?: string) {
    return publicCompareTools(this.db, { slugs, comparePageSlug });
  }

  alternatives(slug: string, limit?: number) {
    return publicGetAlternatives(this.db, slug, limit);
  }

  pricing(slug?: string, pricingModel?: string, maxAmount?: number, limit?: number) {
    return publicGetPricing(this.db, { slug, pricingModel, maxAmount, limit });
  }

  latest(limit?: number, cursor?: string) {
    return publicLatestTools(this.db, { limit, cursor });
  }
}
