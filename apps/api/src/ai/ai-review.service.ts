import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@ai-tool-cms/database";
import { AiPipelineStage, ContentRevisionStatus, SeoEntityType } from "@ai-tool-cms/database";
import type {
  FaqItem,
  FeatureExtractionOutput,
  GeoOutput,
  SeoOutput,
  SummaryOutput,
} from "@ai-tool-cms/ai";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
import { startAiPipeline } from "@ai-tool-cms/ai";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";
import { paginate, type PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class AiReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async listRevisions(query: PaginationQueryDto & { status?: ContentRevisionStatus }) {
    const { skip, take } = paginate(query.page, query.pageSize);
    const where = {
      ...activeOnly,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.contentRevision.findMany({
        where,
        include: {
          tool: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.client.contentRevision.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findRevision(id: string) {
    const revision = await this.prisma.client.contentRevision.findFirst({
      where: { id, ...activeOnly },
      include: {
        tool: { select: { id: true, name: true, slug: true } },
        aiTask: true,
      },
    });
    if (!revision) throw new NotFoundException("Content revision not found");
    return revision;
  }

  async approve(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) {
      return revision;
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.applyPayload(tx, revision.toolId, revision.stage, revision.payload, actorId);
      await tx.contentRevision.update({
        where: { id },
        data: {
          status: ContentRevisionStatus.APPROVED,
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote,
          updatedById: actorId,
        },
      });
    });

    return this.findRevision(id);
  }

  async reject(id: string, actorId: string, reviewNote?: string) {
    const revision = await this.findRevision(id);
    if (revision.status !== ContentRevisionStatus.PENDING) {
      return revision;
    }

    return this.prisma.client.contentRevision.update({
      where: { id },
      data: {
        status: ContentRevisionStatus.REJECTED,
        reviewedById: actorId,
        reviewedAt: new Date(),
        reviewNote,
        updatedById: actorId,
      },
      include: {
        tool: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async regenerate(toolId: string, actorId: string) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { id: toolId, ...activeOnly },
    });
    if (!tool) throw new NotFoundException("Tool not found");

    const result = await startAiPipeline(
      toolId,
      (queue, job, payload) => enqueueAiJob(queue as AiQueueName, job, payload),
      actorId,
    );
    return { toolId, ...result };
  }

  private async applyPayload(
    tx: Prisma.TransactionClient,
    toolId: string,
    stage: AiPipelineStage,
    payload: Prisma.JsonValue,
    actorId?: string,
  ): Promise<void> {
    switch (stage) {
      case AiPipelineStage.SUMMARY: {
        const data = payload as unknown as SummaryOutput;
        await tx.tool.update({
          where: { id: toolId },
          data: {
            summary: (data.oneParagraph ?? data.oneSentence)?.slice(0, 500),
            longDescription: data.longDescription,
            updatedById: actorId,
          },
        });
        break;
      }
      case AiPipelineStage.FEATURE: {
        const data = payload as unknown as FeatureExtractionOutput;
        const tool = await tx.tool.findUniqueOrThrow({ where: { id: toolId } });
        const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
        await tx.tool.update({
          where: { id: toolId },
          data: {
            metadata: {
              ...metadata,
              aiFeatures: data.features,
              aiPlatforms: data.platforms,
              aiLanguages: data.languages,
              aiIntegrations: data.integrations,
              aiTargetUsers: data.targetUsers,
              aiUseCases: data.useCases,
              aiPricingNotes: data.pricing,
            } as Prisma.InputJsonValue,
            updatedById: actorId,
          },
        });
        break;
      }
      case AiPipelineStage.FAQ: {
        const raw = payload as unknown as FaqItem[] | { faqs: FaqItem[] };
        const items = Array.isArray(raw) ? raw : (raw.faqs ?? []);
        await tx.faq.updateMany({
          where: { toolId, deletedAt: null },
          data: { deletedAt: new Date(), deletedById: actorId },
        });
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i]!;
          await tx.faq.create({
            data: {
              toolId,
              slug: slugFromQuestion(item.question),
              question: item.question.slice(0, 500),
              answer: item.answer,
              sortOrder: i,
              createdById: actorId,
              metadata: { source: "ai-review" },
            },
          });
        }
        break;
      }
      case AiPipelineStage.SEO: {
        const data = payload as unknown as SeoOutput;
        await tx.tool.update({
          where: { id: toolId },
          data: {
            metaTitle: data.title?.slice(0, 160),
            metaDescription: data.metaDescription?.slice(0, 320),
            updatedById: actorId,
          },
        });
        await tx.seoMetadata.upsert({
          where: {
            entityType_entityId: { entityType: SeoEntityType.TOOL, entityId: toolId },
          },
          create: {
            entityType: SeoEntityType.TOOL,
            entityId: toolId,
            toolId,
            metaTitle: data.title,
            metaDescription: data.metaDescription,
            canonicalUrl: data.canonical,
            schemaJson: {
              keywords: data.keywords,
              openGraph: data.openGraph,
              twitterCard: data.twitterCard,
              jsonLd: data.jsonLd,
            } as Prisma.InputJsonValue,
            createdById: actorId,
          },
          update: {
            metaTitle: data.title,
            metaDescription: data.metaDescription,
            canonicalUrl: data.canonical,
            schemaJson: {
              keywords: data.keywords,
              openGraph: data.openGraph,
              twitterCard: data.twitterCard,
              jsonLd: data.jsonLd,
            } as Prisma.InputJsonValue,
            updatedById: actorId,
          },
        });
        break;
      }
      case AiPipelineStage.GEO: {
        const data = payload as unknown as GeoOutput;
        const tool = await tx.tool.findUniqueOrThrow({ where: { id: toolId } });
        const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
        await tx.tool.update({
          where: { id: toolId },
          data: {
            metadata: { ...metadata, geo: data } as Prisma.InputJsonValue,
            updatedById: actorId,
          },
        });
        break;
      }
      default:
        break;
    }
  }
}

function slugFromQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
