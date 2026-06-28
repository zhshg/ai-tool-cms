import { prisma } from "@ai-tool-cms/database";
import {
  createCrawlerContext,
  globalAdapterRegistry,
  ingestToolDtos,
  StructuredSiteAdapter,
  type CrawlToolDetailDTO,
  type CrawlToolListItemDTO,
  type ToolDTO,
  type ToolPersistence,
} from "@ai-tool-cms/crawler-core";
import { slugify } from "@ai-tool-cms/common";
import { ToolStatus, type PricingModel } from "@ai-tool-cms/database";
import { defaultHttpFetcher } from "./fetch";

export async function resolveStructuredAdapter(
  adapterType: string,
): Promise<StructuredSiteAdapter> {
  const adapter = globalAdapterRegistry.get(adapterType);
  if (!adapter || !(adapter instanceof StructuredSiteAdapter)) {
    throw new Error(`Adapter not found or not structured: ${adapterType}`);
  }
  return adapter;
}

export function createWorkerContext(sourceId: string, crawlJobId: string) {
  return createCrawlerContext({
    fetch: defaultHttpFetcher,
    sourceId,
    crawlJobId,
  });
}

export async function markJobRunning(crawlJobId: string): Promise<void> {
  await prisma.crawlJob.update({
    where: { id: crawlJobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export async function markJobSucceeded(
  crawlJobId: string,
  sourceId: string,
  stats: { itemsFound?: number; itemsCreated?: number; itemsUpdated?: number },
): Promise<void> {
  const finishedAt = new Date();
  await prisma.$transaction([
    prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        status: "SUCCEEDED",
        finishedAt,
        itemsFound: stats.itemsFound,
        itemsCreated: stats.itemsCreated,
        itemsUpdated: stats.itemsUpdated,
      },
    }),
    prisma.crawlSource.update({
      where: { id: sourceId },
      data: { lastRunAt: finishedAt },
    }),
  ]);
}

export async function markJobFailed(crawlJobId: string, message: string): Promise<void> {
  await prisma.crawlJob.update({
    where: { id: crawlJobId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      errorMessage: message,
    },
  });
}

export function createToolPersistence(): ToolPersistence {
  return {
    loadExistingTools: async () => {
      const tools = await prisma.tool.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, slug: true, website: true, logoUrl: true },
      });
      return tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        website: tool.website,
        domain: extractDomain(tool.website),
        logoUrl: tool.logoUrl ?? undefined,
      }));
    },
    findByWebsite: async (website: string) => {
      const tool = await prisma.tool.findFirst({
        where: { website, deletedAt: null },
        select: { id: true },
      });
      return tool;
    },
    createTool: async (dto: ToolDTO) => {
      const tool = await prisma.tool.create({
        data: {
          slug: dto.slug || slugify(dto.name),
          name: dto.name,
          website: dto.website,
          description: dto.description,
          summary: dto.summary,
          logoUrl: dto.logoUrl,
          pricingModel: mapPricingModel(dto.pricingModel),
          status: ToolStatus.DRAFT,
          metadata: {
            sourceId: dto.sourceId,
            externalId: dto.externalId,
            crawledAt: new Date().toISOString(),
            ...(dto.metadata ?? {}),
          },
        },
      });
      return { id: tool.id };
    },
    updateTool: async (id: string, dto: ToolDTO) => {
      await prisma.tool.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          summary: dto.summary,
          logoUrl: dto.logoUrl,
          pricingModel: dto.pricingModel ? mapPricingModel(dto.pricingModel) : undefined,
          metadata: {
            sourceId: dto.sourceId,
            externalId: dto.externalId,
            updatedFromCrawlAt: new Date().toISOString(),
            ...(dto.metadata ?? {}),
          },
        },
      });
    },
  };
}

export async function ingestDetailReturningToolId(
  detail: CrawlToolDetailDTO,
  adapter: StructuredSiteAdapter,
): Promise<{ toolId: string; created: boolean } | null> {
  const dto = adapter.normalize(detail);
  if (!dto) return null;

  const persistence = createToolPersistence();
  const match = await persistence.findByWebsite(dto.website);
  if (match) {
    await persistence.updateTool(match.id, dto);
    return { toolId: match.id, created: false };
  }

  const created = await persistence.createTool(dto);
  return { toolId: created.id, created: true };
}

export async function ingestDetails(
  details: CrawlToolDetailDTO[],
  adapter: StructuredSiteAdapter,
): Promise<{ created: number; updated: number; duplicates: number }> {
  const dtos = details
    .map((detail) => adapter.normalize(detail))
    .filter((dto): dto is ToolDTO => Boolean(dto));

  const result = await ingestToolDtos(createToolPersistence(), dtos);
  return {
    created: result.created,
    updated: result.updated,
    duplicates: result.duplicates,
  };
}

export function parseListItem(payload: Record<string, unknown>): CrawlToolListItemDTO {
  return payload as unknown as CrawlToolListItemDTO;
}

export function parseDetail(payload: Record<string, unknown>): CrawlToolDetailDTO {
  return payload as unknown as CrawlToolDetailDTO;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}

function mapPricingModel(value?: ToolDTO["pricingModel"]): PricingModel {
  if (!value || value === "ENTERPRISE") return "PAID";
  return value;
}
