import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { CrawlJobsService } from "./crawl-jobs.service";

@Injectable()
export class CrawlDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: CrawlJobsService,
  ) {}

  async getSummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      todayJobs,
      success,
      failed,
      pending,
      sources,
      newTools,
      updatedTools,
      queue,
      totalRules,
      totalFields,
      totalRecords,
      sourceKinds,
      recordStatuses,
    ] = await Promise.all([
      this.prisma.client.crawlJob.count({
        where: { createdAt: { gte: startOfDay }, ...activeOnly },
      }),
      this.prisma.client.crawlJob.count({
        where: { status: "SUCCEEDED", createdAt: { gte: startOfDay }, ...activeOnly },
      }),
      this.prisma.client.crawlJob.count({
        where: { status: "FAILED", createdAt: { gte: startOfDay }, ...activeOnly },
      }),
      this.prisma.client.crawlJob.count({
        where: { status: "PENDING", ...activeOnly },
      }),
      this.prisma.client.crawlSource.count({ where: { status: "ENABLED", ...activeOnly } }),
      this.prisma.client.tool.count({
        where: { createdAt: { gte: startOfDay }, ...activeOnly },
      }),
      this.prisma.client.crawlJob.aggregate({
        where: { createdAt: { gte: startOfDay }, ...activeOnly },
        _sum: { itemsUpdated: true },
      }),
      this.jobsService.getQueueOverview(),
      this.prisma.client.crawlRule.count({ where: activeOnly }),
      this.prisma.client.crawlFieldDefine.count({ where: activeOnly }),
      this.prisma.client.crawlRecord.count({ where: activeOnly }),
      this.prisma.client.crawlSource.groupBy({
        by: ["kind"],
        where: activeOnly,
        _count: { _all: true },
      }),
      this.prisma.client.crawlRecord.groupBy({
        by: ["status"],
        where: activeOnly,
        _count: { _all: true },
      }),
    ]);

    const durations = await this.prisma.client.crawlJob.findMany({
      where: {
        status: "SUCCEEDED",
        startedAt: { not: null },
        finishedAt: { not: null },
        createdAt: { gte: startOfDay },
        ...activeOnly,
      },
      select: { startedAt: true, finishedAt: true },
      take: 200,
    });

    const averageTimeMs =
      durations.length === 0
        ? 0
        : durations.reduce((sum, job) => {
            const ms = job.finishedAt!.getTime() - job.startedAt!.getTime();
            return sum + ms;
          }, 0) / durations.length;

    const queueTotal = Object.values(queue).reduce(
      (sum, stats) => sum + (stats as { total: number }).total,
      0,
    );

    return {
      todayCrawl: todayJobs,
      success,
      failed,
      pending,
      enabledSources: sources,
      totalRules,
      totalFields,
      totalRecords,
      sourceKinds: sourceKinds.map((item) => ({
        kind: item.kind,
        count: item._count._all,
      })),
      recordStatuses: recordStatuses.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      queue: {
        byName: queue,
        total: queueTotal,
      },
      averageTimeMs: Math.round(averageTimeMs),
      newTools,
      updatedTools: updatedTools._sum.itemsUpdated ?? 0,
    };
  }
}
