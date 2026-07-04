import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "./related-tools";
import type {
  HomeSection,
  HomeSectionKind,
  RecommendationBreakdown,
  RecommendationContext,
  RelatedTool,
} from "./types";

const activeOnly = { deletedAt: null } as const;

const emptyBreakdown: RecommendationBreakdown = {
  sharedTags: 0,
  sharedCategories: 0,
  samePricing: 0,
  sharedPlatforms: 0,
  popularity: 0,
  freshness: 0,
  semanticSimilarity: 0,
};

const SECTION_TITLES: Record<string, Partial<Record<HomeSectionKind, string>>> = {
  en: {
    because_you_viewed: "Because you viewed",
    similar_ai: "Similar AI",
    trending_in_category: "Trending in category",
    popular_this_week: "Popular this week",
    recently_added: "Recently Added",
    alternatives: "Alternatives",
    compare: "Compare",
  },
  "zh-CN": {
    because_you_viewed: "基于你的浏览",
    similar_ai: "相似 AI 工具",
    trending_in_category: "分类热门",
    popular_this_week: "本周热门",
    recently_added: "最新收录",
    alternatives: "替代工具",
    compare: "对比",
  },
  ja: {
    because_you_viewed: "閲覧履歴に基づくおすすめ",
    similar_ai: "類似 AI ツール",
    trending_in_category: "カテゴリー内のトレンド",
    popular_this_week: "今週の人気",
    recently_added: "新着ツール",
    alternatives: "代替ツール",
    compare: "比較",
  },
  "zh-TW": {
    because_you_viewed: "根據你的瀏覽",
    similar_ai: "相似 AI 工具",
    trending_in_category: "分類熱門",
    popular_this_week: "本週熱門",
    recently_added: "最新收錄",
    alternatives: "替代工具",
    compare: "比較",
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
    breakdown: emptyBreakdown,
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
    breakdown: { ...emptyBreakdown, freshness: 100 - index },
  }));
}

/** Build dynamic homepage recommendation sections. */
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
        breakdown: { ...emptyBreakdown, sharedCategories: 1 },
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
