import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CrawlQueueJobType } from "@ai-tool-cms/database";
import {
  CRAWL_QUEUE_NAMES,
  enqueueCrawlJob,
  getAllQueueStats,
  queueNameForJobType,
} from "@ai-tool-cms/queue";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import { CrawlSourcesService } from "./crawl-sources.service";

@Injectable()
export class CrawlJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sourcesService: CrawlSourcesService,
  ) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.crawlJob.findMany({
        where: activeOnly,
        include: { source: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.client.crawlJob.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async listRecent(limit = 10) {
    const items = await this.prisma.client.crawlJob.findMany({
      where: activeOnly,
      include: { source: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { items, total: items.length };
  }

  async listDraftTools(limit = 50) {
    const items = await this.prisma.client.tool.findMany({
      where: {
        ...activeOnly,
        status: "DRAFT",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        website: true,
        summary: true,
        status: true,
        pricingModel: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    return { items, total: items.length };
  }

  async triggerManual(
    sourceId: string,
    actorId: string,
    jobType: CrawlQueueJobType = "CRAWL_TOOL",
  ) {
    const source = await this.sourcesService.findById(sourceId);
    if (source.status !== "ENABLED") {
      throw new BadRequestException("Source must be ENABLED to run crawl");
    }

    const crawlJob = await this.prisma.client.crawlJob.create({
      data: {
        sourceId,
        jobType,
        status: "PENDING",
        createdById: actorId,
        metadata: { trigger: "manual" },
      },
    });

    try {
      const queueName = queueNameForJobType(jobType);
      await enqueueCrawlJob(queueName, "manual", {
        sourceId,
        crawlJobId: crawlJob.id,
        actorId,
      } as never);
    } catch (error) {
      await this.prisma.client.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Queue unavailable",
        },
      });
      throw new BadRequestException("Failed to enqueue crawl job — is Redis running?");
    }

    return crawlJob;
  }

  async getQueueOverview() {
    try {
      return await getAllQueueStats();
    } catch {
      return Object.fromEntries(
        Object.values(CRAWL_QUEUE_NAMES).map((name) => [
          name,
          { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
        ]),
      );
    }
  }

  async findById(id: string) {
    const job = await this.prisma.client.crawlJob.findFirst({
      where: { id, ...activeOnly },
      include: { source: true },
    });
    if (!job) throw new NotFoundException("Crawl job not found");
    return job;
  }
}
