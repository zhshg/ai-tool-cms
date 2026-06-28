import type { PrismaClient } from "@ai-tool-cms/database";
import { SUPPORTED_LOCALES } from "./locales";

export type GlobalDashboardMetrics = {
  languages: { locale: string; published: number; pending: number; aiGenerated: number }[];
  countries: { country: string; traffic: number; revenue: number }[];
  translationProgress: { total: number; published: number; pending: number };
  indexStatus: { locale: string; toolCount: number }[];
  revenueByRegion: { region: string; amount: number }[];
  topLocales: { locale: string; traffic: number }[];
  seoHealth: { score: number; issues: number };
};

export async function getGlobalDashboardMetrics(
  prisma: PrismaClient,
): Promise<GlobalDashboardMetrics> {
  const [translations, publishedTools, countrySnapshots, regionalConfigs] = await Promise.all([
    prisma.toolTranslation.groupBy({
      by: ["locale", "status"],
      where: { deletedAt: null },
      _count: { locale: true },
    }),
    prisma.tool.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.countryAnalyticsSnapshot.findMany({
      orderBy: { traffic: "desc" },
      take: 20,
    }),
    prisma.regionalSeoConfig.findMany({ where: { deletedAt: null } }),
  ]);

  const langMap = new Map<string, { published: number; pending: number; aiGenerated: number }>();

  for (const locale of SUPPORTED_LOCALES) {
    langMap.set(locale, { published: 0, pending: 0, aiGenerated: 0 });
  }

  let totalPublished = 0;
  let totalPending = 0;

  for (const row of translations) {
    const entry = langMap.get(row.locale) ?? { published: 0, pending: 0, aiGenerated: 0 };
    const count = row._count.locale;
    if (row.status === "PUBLISHED") {
      entry.published += count;
      totalPublished += count;
    } else if (row.status === "PENDING") {
      entry.pending += count;
      totalPending += count;
    } else if (row.status === "AI_GENERATED") {
      entry.aiGenerated += count;
    }
    langMap.set(row.locale, entry);
  }

  const languages = [...langMap.entries()].map(([locale, stats]) => ({
    locale,
    ...stats,
  }));

  const countries = countrySnapshots.map((s) => ({
    country: s.country,
    traffic: s.traffic,
    revenue: Number(s.revenue),
  }));

  const topLocales = countrySnapshots.reduce(
    (acc, s) => {
      const existing = acc.find((r) => r.locale === s.locale);
      if (existing) {
        existing.traffic += s.traffic;
      } else {
        acc.push({ locale: s.locale, traffic: s.traffic });
      }
      return acc;
    },
    [] as { locale: string; traffic: number }[],
  );

  return {
    languages,
    countries,
    translationProgress: {
      total: totalPublished + totalPending,
      published: totalPublished,
      pending: totalPending,
    },
    indexStatus: SUPPORTED_LOCALES.map((locale) => ({
      locale,
      toolCount: publishedTools,
    })),
    revenueByRegion: regionalConfigs.map((r) => ({
      region: r.region,
      amount: 0,
    })),
    topLocales: topLocales.sort((a, b) => b.traffic - a.traffic).slice(0, 10),
    seoHealth: { score: 85, issues: regionalConfigs.length === 0 ? 1 : 0 },
  };
}

export async function getCountryAnalytics(prisma: PrismaClient, periodKey?: string) {
  const key = periodKey ?? new Date().toISOString().slice(0, 10);
  return prisma.countryAnalyticsSnapshot.findMany({
    where: { periodKey: key },
    orderBy: [{ revenue: "desc" }, { traffic: "desc" }],
    take: 50,
  });
}
