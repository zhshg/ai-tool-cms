import type { Prisma } from "@ai-tool-cms/database";
import type { PrismaClient } from "@ai-tool-cms/database";
import { pingSitemapsAfterPublish, syncComparePages, syncInternalLinks } from "@ai-tool-cms/seo";
import { enqueueSearchIndex } from "@ai-tool-cms/search";
import { persistGeoDocumentForTool } from "./geo-persist";
import {
  ensureDefaultCategory,
  refreshTaxonomySeoMetadata,
  syncToolTaxonomyFromNames,
} from "./taxonomy";
import type { GrowthLoopResult, GrowthTriggerReason } from "./types";

const activeOnly = { deletedAt: null } as const;

/**
 * Sprint 5 — Site Growth Loop.
 * Runs after a tool is published so the site expands automatically:
 * taxonomy → GEO → internal links → compare/alternatives → taxonomy SEO → sitemap ping.
 */
export async function runSiteGrowthLoop(
  prisma: PrismaClient,
  toolId: string,
  reason: GrowthTriggerReason,
  actorId?: string,
): Promise<GrowthLoopResult> {
  const steps: Record<string, unknown> = {};

  const tool = await prisma.tool.findFirst({
    where: { id: toolId, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      tags: { where: activeOnly, include: { tag: true } },
    },
  });

  if (!tool) {
    return {
      toolId,
      reason,
      steps: { error: "tool_not_found" },
      finishedAt: new Date().toISOString(),
    };
  }

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const crawlTags = (metadata.crawlTags as string[] | undefined) ?? [];
  const crawlCategories = (metadata.crawlCategories as string[] | undefined) ?? [];

  if (crawlCategories.length || crawlTags.length) {
    steps.taxonomySync = await syncToolTaxonomyFromNames(
      prisma,
      toolId,
      { categories: crawlCategories, tags: crawlTags },
      actorId,
    );
  }

  steps.defaultCategory = await ensureDefaultCategory(prisma, toolId);
  steps.geo = await persistGeoDocumentForTool(prisma, toolId);
  steps.internalLinks = await syncInternalLinks(prisma, toolId);
  steps.comparePages = await syncComparePages(prisma);
  steps.taxonomySeo = await refreshTaxonomySeoMetadata(prisma, toolId, actorId);
  steps.sitemapPing = await pingSitemapsAfterPublish();
  steps.searchIndex = await enqueueSearchIndex(toolId, "publish");

  await prisma.tool.update({
    where: { id: toolId },
    data: {
      metadata: {
        ...metadata,
        growthLoop: {
          reason,
          finishedAt: new Date().toISOString(),
          steps,
        },
      } as Prisma.InputJsonValue,
    },
  });

  return {
    toolId,
    reason,
    steps,
    finishedAt: new Date().toISOString(),
  };
}
