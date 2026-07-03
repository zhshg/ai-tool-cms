import { Injectable } from "@nestjs/common";
import { ToolStatus } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";
import { PrismaService } from "../prisma/prisma.service";

export type AnalyticsPeriod = "daily" | "weekly" | "monthly";

type TrendBucket = {
  label: string;
  searches: number;
  clicks: number;
  views: number;
  crawlerJobs: number;
};

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

  async getOverview(period: AnalyticsPeriod = "daily") {
    const normalizedPeriod = normalizePeriod(period);
    const since = getPeriodStart(normalizedPeriod);
    const previousSince = getPreviousPeriodStart(normalizedPeriod);
    const providers = this.getProviders();

    const [
      queryCount,
      previousQueryCount,
      clickCount,
      previousClickCount,
      publishedTools,
      newTools,
      crawlerTotal,
      crawlerSuccess,
      crawlerFailed,
      crawlerPending,
      importCreated,
      topToolClicks,
      topCategoriesRaw,
      keywordRows,
      recentQueries,
      recentClicks,
      recentCrawlerJobs,
      popularitySnapshots,
    ] = await Promise.all([
      this.prisma.client.searchQueryLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.searchQueryLog.count({
        where: { createdAt: { gte: previousSince, lt: since } },
      }),
      this.prisma.client.searchClickLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.searchClickLog.count({
        where: { createdAt: { gte: previousSince, lt: since } },
      }),
      this.prisma.client.tool.count({ where: { deletedAt: null, status: ToolStatus.PUBLISHED } }),
      this.prisma.client.tool.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
      this.prisma.client.crawlJob.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
      this.prisma.client.crawlJob.count({
        where: { deletedAt: null, status: "SUCCEEDED", createdAt: { gte: since } },
      }),
      this.prisma.client.crawlJob.count({
        where: { deletedAt: null, status: "FAILED", createdAt: { gte: since } },
      }),
      this.prisma.client.crawlJob.count({
        where: { deletedAt: null, status: "PENDING", createdAt: { gte: since } },
      }),
      this.prisma.client.tool.count({ where: { deletedAt: null, createdAt: { gte: since } } }),
      this.prisma.client.searchClickLog.groupBy({
        by: ["toolId"],
        where: { createdAt: { gte: since } },
        _count: { toolId: true },
        orderBy: { _count: { toolId: "desc" } },
        take: 8,
      }),
      this.prisma.client.toolCategory.groupBy({
        by: ["categoryId"],
        where: { deletedAt: null, tool: { status: ToolStatus.PUBLISHED, deletedAt: null } },
        _count: { toolId: true },
        orderBy: { _count: { toolId: "desc" } },
        take: 8,
      }),
      this.prisma.client.searchQueryLog.groupBy({
        by: ["normalizedQuery"],
        where: { createdAt: { gte: since }, normalizedQuery: { not: "" } },
        _count: { normalizedQuery: true },
        _avg: { latencyMs: true },
        orderBy: { _count: { normalizedQuery: "desc" } },
        take: 10,
      }),
      this.prisma.client.searchQueryLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      this.prisma.client.searchClickLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      this.prisma.client.crawlJob.findMany({
        where: { deletedAt: null, createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      this.prisma.client.toolPopularitySnapshot.findMany({
        where: { createdAt: { gte: since } },
        select: { toolId: true, trafficScore: true, overallScore: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
    ]);

    const [topTools, topCategories] = await Promise.all([
      this.resolveTopTools(topToolClicks),
      this.resolveTopCategories(topCategoriesRaw),
    ]);

    const views = popularitySnapshots.reduce((sum, item) => sum + item.trafficScore, 0);
    const previousGrowthBase = previousQueryCount + previousClickCount;
    const growth = calculateGrowth(queryCount + clickCount, previousGrowthBase);
    const ctr = queryCount > 0 ? Number(((clickCount / queryCount) * 100).toFixed(2)) : 0;

    return {
      period: normalizedPeriod,
      providers,
      metrics: {
        visitors: 0,
        views,
        clicks: clickCount,
        ctr,
        growth,
        searchQueries: queryCount,
        publishedTools,
        topTools: topTools.length,
        topCategories: topCategories.length,
      },
      topTools,
      topCategories,
      searchKeywords: keywordRows.map((row) => ({
        keyword: row.normalizedQuery,
        searches: row._count.normalizedQuery,
        avgLatencyMs: Math.round(row._avg.latencyMs ?? 0),
      })),
      trends: buildTrends(
        normalizedPeriod,
        since,
        recentQueries,
        recentClicks,
        recentCrawlerJobs,
        popularitySnapshots,
      ),
      importStatistics: {
        importedTools: importCreated,
        newTools,
        publishedTools,
      },
      crawlerStatistics: {
        total: crawlerTotal,
        success: crawlerSuccess,
        failed: crawlerFailed,
        pending: crawlerPending,
      },
      note:
        providers.ga4.configured || providers.posthog.configured || providers.umami.configured
          ? "Provider credentials are configured; external PV/UV can be wired into this dashboard."
          : "Visitors use 0 until GA4, PostHog, or Umami credentials are configured.",
    };
  }

  async exportCsv(period: AnalyticsPeriod = "daily") {
    const overview = await this.getOverview(period);
    const rows = [
      ["section", "name", "value", "extra"],
      ...Object.entries(overview.metrics).map(([key, value]) => ["metric", key, String(value), ""]),
      ...overview.topTools.map((tool) => ["top_tool", tool.name, String(tool.clicks), tool.slug]),
      ...overview.topCategories.map((category) => [
        "top_category",
        category.name,
        String(category.toolCount),
        category.slug,
      ]),
      ...overview.searchKeywords.map((keyword) => [
        "search_keyword",
        keyword.keyword,
        String(keyword.searches),
        `${keyword.avgLatencyMs}ms`,
      ]),
      ...overview.trends.map((trend) => [
        "trend",
        trend.label,
        String(trend.searches),
        `clicks=${trend.clicks};views=${trend.views};crawler=${trend.crawlerJobs}`,
      ]),
    ];
    return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  }

  private async resolveTopTools(rows: Array<{ toolId: string; _count: { toolId: number } }>) {
    const toolIds = rows.map((row) => row.toolId);
    if (!toolIds.length) return [];
    const tools = await this.prisma.client.tool.findMany({
      where: { id: { in: toolIds }, deletedAt: null },
      select: { id: true, name: true, slug: true, summary: true },
    });
    const toolMap = new Map(tools.map((tool) => [tool.id, tool]));
    return rows
      .map((row) => ({ ...toolMap.get(row.toolId), clicks: row._count.toolId }))
      .filter(
        (
          tool,
        ): tool is {
          id: string;
          name: string;
          slug: string;
          summary: string | null;
          clicks: number;
        } => Boolean(tool.id),
      );
  }

  private async resolveTopCategories(
    rows: Array<{ categoryId: string; _count: { toolId: number } }>,
  ) {
    const categoryIds = rows.map((row) => row.categoryId);
    if (!categoryIds.length) return [];
    const categories = await this.prisma.client.category.findMany({
      where: { id: { in: categoryIds }, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    return rows
      .map((row) => ({ ...categoryMap.get(row.categoryId), toolCount: row._count.toolId }))
      .filter(
        (category): category is { id: string; name: string; slug: string; toolCount: number } =>
          Boolean(category.id),
      );
  }
}

function normalizePeriod(period: AnalyticsPeriod | undefined): AnalyticsPeriod {
  return period === "weekly" || period === "monthly" ? period : "daily";
}

function getPeriodStart(period: AnalyticsPeriod) {
  const days = period === "monthly" ? 30 : period === "weekly" ? 7 : 1;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function getPreviousPeriodStart(period: AnalyticsPeriod) {
  const days = period === "monthly" ? 60 : period === "weekly" ? 14 : 2;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function calculateGrowth(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function buildTrends(
  period: AnalyticsPeriod,
  since: Date,
  queries: Array<{ createdAt: Date }>,
  clicks: Array<{ createdAt: Date }>,
  crawlerJobs: Array<{ createdAt: Date }>,
  snapshots: Array<{ createdAt: Date; trafficScore: number }>,
): TrendBucket[] {
  const bucketCount = period === "monthly" ? 30 : period === "weekly" ? 7 : 24;
  const bucketMs = period === "daily" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(since.getTime() + index * bucketMs);
    return {
      label: period === "daily" ? `${start.getHours()}:00` : start.toISOString().slice(5, 10),
      start,
      end: new Date(start.getTime() + bucketMs),
      searches: 0,
      clicks: 0,
      views: 0,
      crawlerJobs: 0,
    };
  });

  for (const item of queries) incrementBucket(buckets, item.createdAt, "searches");
  for (const item of clicks) incrementBucket(buckets, item.createdAt, "clicks");
  for (const item of crawlerJobs) incrementBucket(buckets, item.createdAt, "crawlerJobs");
  for (const item of snapshots)
    incrementBucket(buckets, item.createdAt, "views", item.trafficScore);

  return buckets.map(({ label, searches, clicks: bucketClicks, views, crawlerJobs }) => ({
    label,
    searches,
    clicks: bucketClicks,
    views,
    crawlerJobs,
  }));
}

function incrementBucket(
  buckets: Array<TrendBucket & { start: Date; end: Date }>,
  date: Date,
  key: keyof TrendBucket,
  amount = 1,
) {
  const bucket = buckets.find((item) => date >= item.start && date < item.end);
  if (bucket && key !== "label") bucket[key] += amount;
}

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
