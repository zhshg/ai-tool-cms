import { Injectable, NotFoundException } from "@nestjs/common";
import type { CrawlSourceStatus, Prisma } from "@ai-tool-cms/database";
import { computeNextRunAt } from "@ai-tool-cms/crawler-core";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";
import type {
  CreateCrawlSourceDto,
  UpdateCrawlFrequencyDto,
  UpdateCrawlSourceDto,
} from "./dto/crawl-source.dto";

@Injectable()
export class CrawlSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.client.crawlSource.findMany({
        where: activeOnly,
        orderBy: [{ priority: "desc" }, { name: "asc" }],
        skip,
        take,
      }),
      this.prisma.client.crawlSource.count({ where: activeOnly }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    const source = await this.prisma.client.crawlSource.findFirst({
      where: { id, ...activeOnly },
    });
    if (!source) throw new NotFoundException("Crawl source not found");
    return source;
  }

  async create(dto: CreateCrawlSourceDto, actorId: string) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const schedule = dto.schedule ?? "DAILY";
    const crawlIntervalMinutes = dto.crawlIntervalMinutes ?? 1440;
    const status = dto.status ?? "ENABLED";

    return this.prisma.client.crawlSource.create({
      data: {
        slug,
        name: dto.name,
        baseUrl: dto.baseUrl,
        adapterType: dto.adapterType,
        status,
        schedule,
        crawlIntervalMinutes,
        robotsTxt: dto.robotsTxt,
        priority: dto.priority ?? 100,
        isEnabled: status === "ENABLED",
        nextRunAt: computeNextRunAt(schedule, crawlIntervalMinutes),
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateCrawlSourceDto, actorId: string) {
    const current = await this.findById(id);
    const schedule = dto.schedule ?? current.schedule;
    const crawlIntervalMinutes = dto.crawlIntervalMinutes ?? current.crawlIntervalMinutes;
    const status = dto.status ?? current.status;

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        baseUrl: dto.baseUrl,
        adapterType: dto.adapterType,
        status,
        schedule,
        crawlIntervalMinutes,
        robotsTxt: dto.robotsTxt,
        priority: dto.priority,
        isEnabled: dto.isEnabled ?? status === "ENABLED",
        nextRunAt:
          status === "ENABLED"
            ? computeNextRunAt(schedule, crawlIntervalMinutes)
            : current.nextRunAt,
        config: dto.config as Prisma.InputJsonValue | undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        updatedById: actorId,
      },
    });
  }

  async setStatus(id: string, status: CrawlSourceStatus, actorId: string) {
    const current = await this.findById(id);
    const nextRunAt =
      status === "ENABLED"
        ? computeNextRunAt(current.schedule, current.crawlIntervalMinutes)
        : null;

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        status,
        isEnabled: status === "ENABLED",
        nextRunAt,
        updatedById: actorId,
      },
    });
  }

  async updateFrequency(id: string, dto: UpdateCrawlFrequencyDto, actorId: string) {
    const current = await this.findById(id);
    const nextRunAt =
      current.status === "ENABLED"
        ? computeNextRunAt(dto.schedule, dto.crawlIntervalMinutes)
        : current.nextRunAt;

    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        schedule: dto.schedule,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
        nextRunAt,
        updatedById: actorId,
      },
    });
  }

  async markRunComplete(id: string, finishedAt: Date = new Date()) {
    const source = await this.findById(id);
    return this.prisma.client.crawlSource.update({
      where: { id },
      data: {
        lastRunAt: finishedAt,
        nextRunAt: computeNextRunAt(source.schedule, source.crawlIntervalMinutes, finishedAt),
      },
    });
  }
}
