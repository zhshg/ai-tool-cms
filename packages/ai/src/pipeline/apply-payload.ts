import type { Prisma } from "@ai-tool-cms/database";
import { AiPipelineStage, SeoEntityType, ToolStatus } from "@ai-tool-cms/database";
import type {
  FaqItem,
  FeatureExtractionOutput,
  GeoOutput,
  SeoOutput,
  SummaryOutput,
} from "../generators";

export type PipelineArtifacts = {
  summary?: SummaryOutput;
  features?: FeatureExtractionOutput;
  faqs?: FaqItem[];
  seo?: SeoOutput;
  geo?: GeoOutput;
};

export async function applyStagePayload(
  tx: Prisma.TransactionClient,
  toolId: string,
  stage: AiPipelineStage,
  payload: unknown,
  actorId?: string,
): Promise<void> {
  switch (stage) {
    case AiPipelineStage.SUMMARY: {
      const data = payload as SummaryOutput;
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
      const data = payload as FeatureExtractionOutput;
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
      const raw = payload as FaqItem[] | { faqs: FaqItem[] };
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
            metadata: { source: "ai-pipeline" },
          },
        });
      }
      break;
    }
    case AiPipelineStage.SEO: {
      const data = payload as SeoOutput;
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
      const data = payload as GeoOutput;
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

/** Apply all pipeline artifacts and optionally publish the tool to the public catalog. */
export async function applyPipelineArtifacts(
  tx: Prisma.TransactionClient,
  toolId: string,
  artifacts: PipelineArtifacts,
  options?: { actorId?: string; publish?: boolean },
): Promise<void> {
  if (artifacts.summary) {
    await applyStagePayload(
      tx,
      toolId,
      AiPipelineStage.SUMMARY,
      artifacts.summary,
      options?.actorId,
    );
  }
  if (artifacts.features) {
    await applyStagePayload(
      tx,
      toolId,
      AiPipelineStage.FEATURE,
      artifacts.features,
      options?.actorId,
    );
  }
  if (artifacts.faqs?.length) {
    await applyStagePayload(tx, toolId, AiPipelineStage.FAQ, artifacts.faqs, options?.actorId);
  }
  if (artifacts.seo) {
    await applyStagePayload(tx, toolId, AiPipelineStage.SEO, artifacts.seo, options?.actorId);
  }
  if (artifacts.geo) {
    await applyStagePayload(tx, toolId, AiPipelineStage.GEO, artifacts.geo, options?.actorId);
  }

  if (options?.publish) {
    const tool = await tx.tool.findUniqueOrThrow({ where: { id: toolId } });
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    await tx.tool.update({
      where: { id: toolId },
      data: {
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        metadata: {
          ...metadata,
          aiPipeline: {
            ...((metadata.aiPipeline ?? {}) as Record<string, unknown>),
            status: "published",
            publishedAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
        updatedById: options.actorId,
      },
    });
  }
}

function slugFromQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
