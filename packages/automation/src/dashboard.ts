import type { Prisma, PrismaClient } from "@ai-tool-cms/database";
import {
  getAllAiQueueStats,
  getAllAutomationQueueStats,
  getAllCrawlQueues,
  getAllGrowthQueueStats,
  getAllI18nQueues,
  getAllPlatformQueueStats,
  getAllSearchQueueStats,
} from "@ai-tool-cms/queue";
import { getDiscoveryDashboard } from "@ai-tool-cms/discovery";

export type AutomationCenterMetrics = {
  discovery: Awaited<ReturnType<typeof getDiscoveryDashboard>>;
  queues: {
    automation: Awaited<ReturnType<typeof getAllAutomationQueueStats>>;
    crawl: number;
    ai: Awaited<ReturnType<typeof getAllAiQueueStats>>;
    growth: Awaited<ReturnType<typeof getAllGrowthQueueStats>>;
    search: Awaited<ReturnType<typeof getAllSearchQueueStats>>;
    platform: Awaited<ReturnType<typeof getAllPlatformQueueStats>>;
    i18n: number;
  };
  monitors: {
    websiteActive: number;
    priceActive: number;
    brokenLinksOpen: number;
    aiRefreshDue: number;
    socialScheduled: number;
    indexPending: number;
  };
  recentRuns: Array<{
    id: string;
    kind: string;
    status: string;
    createdAt: string;
    errorMessage: string | null;
  }>;
};

export async function getAutomationCenterMetrics(
  prisma: PrismaClient,
): Promise<AutomationCenterMetrics> {
  const now = new Date();
  const [
    discovery,
    automationQueues,
    aiQueues,
    growthQueues,
    searchQueues,
    platformQueues,
    websiteActive,
    priceActive,
    brokenLinksOpen,
    aiRefreshDue,
    socialScheduled,
    indexPending,
    recentRuns,
  ] = await Promise.all([
    getDiscoveryDashboard(prisma),
    getAllAutomationQueueStats(),
    getAllAiQueueStats(),
    getAllGrowthQueueStats(),
    getAllSearchQueueStats(),
    getAllPlatformQueueStats(),
    prisma.websiteMonitor.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.priceMonitor.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.brokenLinkIssue.count({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.aiRefreshSchedule.count({
      where: {
        deletedAt: null,
        isEnabled: true,
        OR: [{ nextDueAt: null }, { nextDueAt: { lte: now } }],
      },
    }),
    prisma.socialPost.count({ where: { status: "SCHEDULED" } }),
    prisma.indexSubmission.count({ where: { status: "PENDING" } }),
    prisma.automationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        status: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
  ]);

  return {
    discovery,
    queues: {
      automation: automationQueues,
      crawl: getAllCrawlQueues().length,
      ai: aiQueues,
      growth: growthQueues,
      search: searchQueues,
      platform: platformQueues,
      i18n: getAllI18nQueues().length,
    },
    monitors: {
      websiteActive,
      priceActive,
      brokenLinksOpen,
      aiRefreshDue,
      socialScheduled,
      indexPending,
    },
    recentRuns: recentRuns.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function createAutomationRun(
  prisma: PrismaClient,
  kind: Parameters<typeof prisma.automationRun.create>[0]["data"]["kind"],
  referenceId?: string,
) {
  return prisma.automationRun.create({
    data: {
      kind,
      status: "RUNNING",
      referenceId,
      startedAt: new Date(),
    },
  });
}

export async function finishAutomationRun(
  prisma: PrismaClient,
  runId: string,
  result: Record<string, unknown>,
  error?: string,
) {
  await prisma.automationRun.update({
    where: { id: runId },
    data: {
      status: error ? "FAILED" : "COMPLETED",
      finishedAt: new Date(),
      errorMessage: error,
      result: result as Prisma.InputJsonValue,
    },
  });
}
