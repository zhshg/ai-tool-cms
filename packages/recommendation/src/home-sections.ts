import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "./related-tools";
import type { HomeSection, RecommendationContext, RelatedTool } from "./types";

const activeOnly = { deletedAt: null } as const;

function mapTrendingToRelated(items: Awaited<ReturnType<typeof computeTrending>>): RelatedTool[] {
  return items.map((item) => ({
    toolId: item.toolId,
    slug: item.slug,
    name: item.name,
    score: item.score,
    reason: `trending ${item.period}`,
  }));
}

async function fetchRecentTools(prisma: PrismaClient, limit: number): Promise<RelatedTool[]> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, slug: true, name: true, summary: true },
  });
  return tools.map((tool, index) => ({
    toolId: tool.id,
    slug: tool.slug,
    name: tool.name,
    summary: tool.summary,
    score: 100 - index,
    reason: "recently added",
  }));
}

/** Commit 055 — dynamic homepage recommendation sections. */
export async function buildHomeSections(
  prisma: PrismaClient,
  context: RecommendationContext = {},
): Promise<HomeSection[]> {
  const limit = context.limit ?? 6;
  const sections: HomeSection[] = [];

  if (context.viewedToolIds?.length) {
    const viewedId = context.viewedToolIds[0]!;
    const related = await computeRelatedTools(prisma, viewedId, limit);
    if (related.length) {
      sections.push({
        kind: "because_you_viewed",
        title: "Because you viewed…",
        tools: related,
      });
      sections.push({
        kind: "similar_ai",
        title: "Similar AI",
        tools: related.slice(0, limit),
      });
    }
  }

  const trending = mapTrendingToRelated(await computeTrending(prisma, "weekly", limit));
  sections.push({
    kind: "popular_this_week",
    title: "Popular this week",
    tools: trending,
  });

  if (context.categorySlug) {
    const categoryTools = await prisma.tool.findMany({
      where: {
        status: ToolStatus.PUBLISHED,
        ...activeOnly,
        categories: { some: { category: { slug: context.categorySlug }, ...activeOnly } },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { id: true, slug: true, name: true, summary: true },
    });
    sections.push({
      kind: "trending_in_category",
      title: `Trending in ${context.categorySlug.replace(/-/g, " ")}`,
      tools: categoryTools.map((t, i) => ({
        toolId: t.id,
        slug: t.slug,
        name: t.name,
        summary: t.summary,
        score: 90 - i,
        reason: "category trending",
      })),
    });
  }

  sections.push({
    kind: "recently_added",
    title: "Recently Added",
    tools: await fetchRecentTools(prisma, limit),
  });

  return sections;
}
