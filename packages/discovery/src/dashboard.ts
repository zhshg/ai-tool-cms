import type { PrismaClient } from "@ai-tool-cms/database";

export type DiscoveryDashboardMetrics = {
  sourcesEnabled: number;
  tasksToday: number;
  newResultsToday: number;
  pendingReview: number;
  importedTotal: number;
  recentResults: Array<{
    id: string;
    title: string;
    url: string;
    sourceKind: string;
    relevanceScore: number;
    status: string;
    createdAt: string;
  }>;
};

export async function getDiscoveryDashboard(
  prisma: PrismaClient,
): Promise<DiscoveryDashboardMetrics> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [sourcesEnabled, tasksToday, newResultsToday, pendingReview, importedTotal, recentResults] =
    await Promise.all([
      prisma.discoverySource.count({ where: { deletedAt: null, isEnabled: true } }),
      prisma.discoveryTask.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.discoveryResult.count({
        where: { status: "NEW", createdAt: { gte: startOfDay } },
      }),
      prisma.discoveryResult.count({ where: { status: "NEW" } }),
      prisma.discoveryResult.count({ where: { status: "IMPORTED" } }),
      prisma.discoveryResult.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          url: true,
          sourceKind: true,
          relevanceScore: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  return {
    sourcesEnabled,
    tasksToday,
    newResultsToday,
    pendingReview,
    importedTotal,
    recentResults: recentResults.map((r) => ({
      ...r,
      relevanceScore: Number(r.relevanceScore),
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
