import { Injectable, NotFoundException } from "@nestjs/common";
import { ToolStatus } from "@ai-tool-cms/database";
import {
  createCrawlerContext,
  createCrawlResponse,
  globalAdapterRegistry,
  type CrawlToolListItemDTO,
  StructuredSiteAdapter,
  ingestToolDtos,
} from "@ai-tool-cms/crawler-core";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { CrawlIngestionService } from "./crawl-ingestion.service";

@Injectable()
export class CrawlWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestionService: CrawlIngestionService,
  ) {}

  async runSource(sourceId: string, actorId: string) {
    const source = await this.prisma.client.crawlSource.findFirst({
      where: { id: sourceId, ...activeOnly },
    });
    if (!source) throw new NotFoundException("Crawl source not found");

    const adapter = this.resolveAdapter(source.adapterType);
    const ctx = this.createContext(sourceId);

    const crawlJob = await this.prisma.client.crawlJob.create({
      data: {
        sourceId,
        status: "RUNNING",
        createdById: actorId,
        metadata: { trigger: "auto-flow", steps: [] },
      },
    });

    const steps: Record<string, unknown>[] = [];
    const toolDtos: Array<ReturnType<StructuredSiteAdapter["normalize"]>> = [];

    const categories = await adapter.getCategories(ctx);
    steps.push({ phase: "LIST", categoriesCount: categories.length });
    await this.prisma.client.crawlJob.update({
      where: { id: crawlJob.id },
      data: { result: { trigger: "auto-flow", steps: [...steps] } as never },
    });

    const firstCategory = categories[0];
    const listResult = await adapter.getTools(ctx, firstCategory);
    steps.push({ phase: "DETAIL_LIST", itemsCount: listResult.items.length });
    await this.prisma.client.crawlJob.update({
      where: { id: crawlJob.id },
      data: { result: { trigger: "auto-flow", steps: [...steps] } as never },
    });

    for (const item of listResult.items.slice(0, 20)) {
      const detail = await adapter.getDetail(ctx, item);
      if (!detail) continue;
      const dto = adapter.normalize(detail);
      if (dto) {
        toolDtos.push(dto);
      }
      steps.push({
        phase: "DETAIL",
        item: this.pickItem(item),
        detailUrl: detail.website || detail.url,
      });
      await this.prisma.client.crawlJob.update({
        where: { id: crawlJob.id },
        data: { result: { trigger: "auto-flow", steps: [...steps] } as never },
      });
    }

    const result = await ingestToolDtos(
      {
        loadExistingTools: async () => this.ingestionService.loadExistingForDuplicateCheck(),
        findByWebsite: async (website: string) => {
          const tool = await this.prisma.client.tool.findFirst({
            where: { website, ...activeOnly },
            select: { id: true },
          });
          return tool;
        },
        createTool: async (dto) => {
          const tool = await this.prisma.client.tool.create({
            data: {
              slug: dto.slug,
              name: dto.name,
              website: dto.website,
              description: dto.description,
              summary: dto.summary,
              logoUrl: dto.logoUrl,
              pricingModel: dto.pricingModel === "ENTERPRISE" ? "PAID" : dto.pricingModel,
              status: ToolStatus.DRAFT,
              metadata: { sourceId, crawledAt: new Date().toISOString(), ...(dto.metadata ?? {}) },
            },
          });
          return { id: tool.id };
        },
        updateTool: async (id, dto) => {
          await this.prisma.client.tool.update({
            where: { id },
            data: {
              name: dto.name,
              website: dto.website,
              description: dto.description,
              summary: dto.summary,
              logoUrl: dto.logoUrl,
              metadata: { sourceId, crawledAt: new Date().toISOString(), ...(dto.metadata ?? {}) },
            },
          });
        },
      },
      toolDtos.filter(Boolean) as NonNullable<(typeof toolDtos)[number]>[],
    );

    await this.prisma.client.crawlJob.update({
      where: { id: crawlJob.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        itemsFound: toolDtos.length,
        itemsCreated: result.created,
        itemsUpdated: result.updated,
        result: {
          categoriesCount: categories.length,
          listItemsCount: listResult.items.length,
          steps,
          duplicates: result.duplicates,
          skipped: result.skipped,
        } as never,
      },
    });

    return {
      jobId: crawlJob.id,
      sourceId,
      categoriesCount: categories.length,
      listItemsCount: listResult.items.length,
      created: result.created,
      updated: result.updated,
      duplicates: result.duplicates,
      skipped: result.skipped,
    };
  }

  private resolveAdapter(adapterType: string): StructuredSiteAdapter {
    const adapter = globalAdapterRegistry.get(adapterType);
    if (!(adapter instanceof StructuredSiteAdapter)) {
      throw new NotFoundException(`Crawler adapter "${adapterType}" is not registered`);
    }
    return adapter;
  }

  private createContext(sourceId: string) {
    return createCrawlerContext({
      sourceId,
      fetch: async (request) => {
        const response = await fetch(request.url, {
          method: request.method ?? "GET",
          headers: request.headers,
          body: request.body,
        });
        return createCrawlResponse(request.url, {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
          durationMs: 0,
          cursor: request.cursor,
        });
      },
    });
  }

  private pickItem(item: CrawlToolListItemDTO) {
    return {
      externalId: item.externalId,
      name: item.name,
      website: item.website,
      url: item.url,
    };
  }
}
