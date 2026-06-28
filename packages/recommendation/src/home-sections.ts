import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "./related-tools";
import type { HomeSection, HomeSectionKind, RecommendationContext, RelatedTool } from "./types";

const activeOnly = { deletedAt: null } as const;

const SECTION_TITLES: Record<string, Partial<Record<HomeSectionKind, string>>> = {
  en: {
    because_you_viewed: "Because you viewed…",
    similar_ai: "Similar AI",
    trending_in_category: "Trending in Coding",
    popular_this_week: "Popular this week",
    recently_added: "Recently Added",
    alternatives: "Alternatives",
    compare: "Compare",
  },
  "zh-CN": {
    because_you_viewed: "因为你浏览过…",
    similar_ai: "相似 AI",
    trending_in_category: "编程类热门",
    popular_this_week: "本周热门",
    recently_added: "最新上架",
    alternatives: "替代品",
    compare: "对比",
  },
  ja: {
    because_you_viewed: "閲覧履歴に基づくおすすめ",
    popular_this_week: "今週の人気",
    recently_added: "新着 AI",
  },
  "zh-TW": {
    because_you_viewed: "因為你瀏覽過…",
    popular_this_week: "本週熱門",
    recently_added: "最新上架",
  },
};

function sectionTitle(kind: HomeSectionKind, locale = "en"): string {
  const titles = SECTION_TITLES[locale] ?? SECTION_TITLES.en ?? {};
  return titles[kind] ?? SECTION_TITLES.en?.[kind] ?? kind;
}

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
  const locale = context.locale ?? "en";
  const sections: HomeSection[] = [];

  if (context.viewedToolIds?.length) {
    const viewedId = context.viewedToolIds[0]!;
    const related = await computeRelatedTools(prisma, viewedId, limit);
    if (related.length) {
      sections.push({
        kind: "because_you_viewed",
        title: sectionTitle("because_you_viewed", locale),
        tools: related,
      });
      sections.push({
        kind: "similar_ai",
        title: sectionTitle("similar_ai", locale),
        tools: related.slice(0, limit),
      });
    }
  }

  const trending = mapTrendingToRelated(await computeTrending(prisma, "weekly", limit));
  sections.push({
    kind: "popular_this_week",
    title: sectionTitle("popular_this_week", locale),
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
    title: sectionTitle("recently_added", locale),
    tools: await fetchRecentTools(prisma, limit),
  });

  return sections;
}
