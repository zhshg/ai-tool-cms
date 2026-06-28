import { Injectable } from "@nestjs/common";
import { ToolStatus, type PricingModel } from "@ai-tool-cms/database";
import {
  defaultDuplicateDetector,
  ingestToolDtos,
  type ToolDTO,
  type ToolPersistence,
} from "@ai-tool-cms/crawler-core";
import { slugify } from "@ai-tool-cms/common";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class CrawlIngestionService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(_sourceId: string, crawlJobId: string, dtos: ToolDTO[]) {
    const persistence = this.createPersistence();
    const result = await ingestToolDtos(persistence, dtos);

    await this.prisma.client.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        itemsFound: { increment: dtos.length },
        itemsCreated: { increment: result.created },
        itemsUpdated: { increment: result.updated },
        metadata: {
          duplicates: result.duplicates,
          skipped: result.skipped,
        },
      },
    });

    return result;
  }

  async loadExistingForDuplicateCheck() {
    const tools = await this.prisma.client.tool.findMany({
      where: activeOnly,
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
  }

  checkDuplicate(candidate: ToolDTO) {
    return defaultDuplicateDetector.check(candidate, []);
  }

  private createPersistence(): ToolPersistence {
    return {
      loadExistingTools: async () => this.loadExistingForDuplicateCheck(),
      findByWebsite: async (website: string) => {
        const tool = await this.prisma.client.tool.findFirst({
          where: { website, ...activeOnly },
          select: { id: true },
        });
        return tool;
      },
      createTool: async (dto: ToolDTO) => {
        const tool = await this.prisma.client.tool.create({
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
        await this.prisma.client.tool.update({
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
