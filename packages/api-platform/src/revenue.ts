import type { PrismaClient, RevenueSource } from "@ai-tool-cms/database";

export type RevenueOverview = {
  total: number;
  bySource: Record<RevenueSource, number>;
  weekly: number;
  monthly: number;
};

function periodKey(period: "weekly" | "monthly", date = new Date()): string {
  if (period === "weekly") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start.toISOString().slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function aggregateRevenueSnapshot(
  prisma: PrismaClient,
  source: RevenueSource,
  period: "weekly" | "monthly",
): Promise<void> {
  const key = periodKey(period);
  let amount = 0;
  let clicks = 0;
  let conversions = 0;

  if (source === "AFFILIATE") {
    const since =
      period === "weekly"
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [clickCount, conversionCount, commissionSum] = await Promise.all([
      prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
      prisma.affiliateConversion.count({ where: { createdAt: { gte: since } } }),
      prisma.affiliateCommission.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
      }),
    ]);
    clicks = clickCount;
    conversions = conversionCount;
    amount = Number(commissionSum._sum.amount ?? 0);
  }

  await prisma.revenueSnapshot.upsert({
    where: { source_periodKey: { source, periodKey: key } },
    create: {
      source,
      period,
      periodKey: key,
      amount,
      clicks,
      conversions,
      impressions: 0,
    },
    update: { amount, clicks, conversions },
  });
}

export async function getRevenueOverview(prisma: PrismaClient): Promise<RevenueOverview> {
  const snapshots = await prisma.revenueSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const bySource: Record<RevenueSource, number> = {
    AFFILIATE: 0,
    ADS: 0,
    SPONSORED: 0,
    API: 0,
    OTHER: 0,
  };

  let weekly = 0;
  let monthly = 0;
  const weekKey = periodKey("weekly");
  const monthKey = periodKey("monthly");

  for (const row of snapshots) {
    const amt = Number(row.amount);
    bySource[row.source] += amt;
    if (row.periodKey === weekKey) weekly += amt;
    if (row.periodKey === monthKey) monthly += amt;
  }

  const total = Object.values(bySource).reduce((a, b) => a + b, 0);
  return { total, bySource, weekly, monthly };
}

export async function getGrowthCenterMetrics(prisma: PrismaClient) {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [searchQueries, searchClicks, affiliateClicks, publishedTools, topTools, revenue] =
    await Promise.all([
      prisma.searchQueryLog.count({ where: { createdAt: { gte: since7d } } }),
      prisma.searchClickLog.count({ where: { createdAt: { gte: since7d } } }),
      prisma.affiliateClick.count({ where: { createdAt: { gte: since7d } } }),
      prisma.tool.count({
        where: { status: "PUBLISHED", deletedAt: null, publishedAt: { gte: since7d } },
      }),
      prisma.searchClickLog.groupBy({
        by: ["toolId"],
        where: { createdAt: { gte: since7d } },
        _count: { toolId: true },
        orderBy: { _count: { toolId: "desc" } },
        take: 10,
      }),
      getRevenueOverview(prisma),
    ]);

  const ctr = searchQueries > 0 ? searchClicks / searchQueries : 0;

  const toolIds = topTools.map((t) => t.toolId);
  const tools = toolIds.length
    ? await prisma.tool.findMany({
        where: { id: { in: toolIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const toolMap = new Map(tools.map((t) => [t.id, t]));

  return {
    traffic: { searchQueries, affiliateClicks },
    search: { queries: searchQueries, clicks: searchClicks, ctr },
    conversion: { affiliateClicks },
    revenue,
    topTools: topTools.map((row) => ({
      tool: toolMap.get(row.toolId) ?? { id: row.toolId, name: "Unknown", slug: "" },
      clicks: row._count.toolId,
    })),
    recentlyPublished: publishedTools,
    topKeywords: await prisma.searchQueryLog.groupBy({
      by: ["normalizedQuery"],
      where: { createdAt: { gte: since7d } },
      _count: { normalizedQuery: true },
      orderBy: { _count: { normalizedQuery: "desc" } },
      take: 10,
    }),
  };
}
