import { Injectable } from "@nestjs/common";
import { getEnv } from "@ai-tool-cms/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  getProviders() {
    const env = getEnv();
    return {
      ga4: {
        configured: Boolean(env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET),
        measurementId: env.GA4_MEASUREMENT_ID ?? null,
      },
      posthog: {
        configured: Boolean(env.POSTHOG_API_KEY),
        host: env.POSTHOG_HOST ?? null,
      },
      umami: {
        configured: Boolean(env.UMAMI_URL && env.UMAMI_WEBSITE_ID),
        url: env.UMAMI_URL ?? null,
      },
    };
  }

  async getOverview() {
    const providers = this.getProviders();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [queryCount, clickCount, publishedTools] = await Promise.all([
      this.prisma.client.searchQueryLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.searchClickLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.tool.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    ]);

    const ctr = queryCount > 0 ? Number(((clickCount / queryCount) * 100).toFixed(2)) : 0;

    return {
      providers,
      metrics: {
        pageViews: null,
        uniqueVisitors: null,
        ctr,
        bounceRate: null,
        searchQueries30d: queryCount,
        searchClicks30d: clickCount,
        publishedTools,
      },
      topPages: [],
      topCategories: [],
      searchKeywords: [],
      note: "Wire GA4 / PostHog / Umami APIs with provider credentials for live PV/UV/bounce metrics",
    };
  }
}
