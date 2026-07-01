import type { PrismaClient } from "@ai-tool-cms/database";
import { prisma, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import {
  CATEGORIES_INDEX,
  TAGS_INDEX,
  TOOLS_INDEX,
  ensureSearchIndexes,
  getMeiliClient,
} from "./client";
import { buildSearchableText } from "./ranking";
import type { SearchToolDocument } from "./types";

const activeOnly = { deletedAt: null } as const;

type SearchBootstrapResult = {
  configured: boolean;
  indexes: string[];
  imported: {
    tools: number;
    categories: number;
    tags: number;
  };
};

export async function bootstrapSearch(client: PrismaClient = prisma): Promise<SearchBootstrapResult> {
  const meili = getMeiliClient();
  if (!meili) {
    return {
      configured: false,
      indexes: [],
      imported: { tools: 0, categories: 0, tags: 0 },
    };
  }

  await ensureSearchIndexes();

  const [tools, categories, tags] = await Promise.all([
    loadToolDocuments(client),
    client.category.findMany({
      where: activeOnly,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    client.tag.findMany({
      where: activeOnly,
      orderBy: { name: "asc" },
    }),
  ]);

  if (tools.length > 0) {
    const task = await meili.index(TOOLS_INDEX).addDocuments(tools);
    await meili.waitForTask(task.taskUid);
  }

  if (categories.length > 0) {
    const task = await meili.index(CATEGORIES_INDEX).addDocuments(
      categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        updatedAt: category.updatedAt.toISOString(),
        searchableText: [category.name, category.slug, category.description].filter(Boolean).join(" "),
      })),
    );
    await meili.waitForTask(task.taskUid);
  }

  if (tags.length > 0) {
    const task = await meili.index(TAGS_INDEX).addDocuments(
      tags.map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        description: tag.description,
        updatedAt: tag.updatedAt.toISOString(),
        searchableText: [tag.name, tag.slug, tag.description].filter(Boolean).join(" "),
      })),
    );
    await meili.waitForTask(task.taskUid);
  }

  return {
    configured: true,
    indexes: [TOOLS_INDEX, CATEGORIES_INDEX, TAGS_INDEX],
    imported: {
      tools: tools.length,
      categories: categories.length,
      tags: tags.length,
    },
  };
}

async function loadToolDocuments(client: PrismaClient): Promise<SearchToolDocument[]> {
  const tools = await client.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      tags: { where: activeOnly, include: { tag: true } },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tools.map((tool) => {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    const document: SearchToolDocument = {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      description: tool.description ?? undefined,
      summary: tool.summary ?? undefined,
      website: tool.website,
      logoUrl: tool.logoUrl ?? undefined,
      pricingModel: tool.pricingModel,
      categorySlugs: tool.categories.map((item) => item.category.slug),
      categoryNames: tool.categories.map((item) => item.category.name),
      tagSlugs: tool.tags.map((item) => item.tag.slug),
      tagNames: tool.tags.map((item) => item.tag.name),
      platforms: (metadata.aiPlatforms as string[] | undefined) ?? [],
      languages: (metadata.aiLanguages as string[] | undefined) ?? [],
      features: (metadata.aiFeatures as string[] | undefined) ?? [],
      useCases: (metadata.aiUseCases as string[] | undefined) ?? [],
      popularityScore: Number(metadata.popularityScore ?? metadata.overallScore ?? 0),
      reviewScore:
        tool.reviews.length > 0
          ? tool.reviews.reduce((sum, review) => sum + review.rating, 0) / tool.reviews.length
          : 0,
      publishedAt: tool.publishedAt?.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
      searchableText: "",
    };

    document.searchableText = buildSearchableText(document);
    return document;
  });
}
