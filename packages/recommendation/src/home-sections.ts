import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "./related-tools";
import type {`r`n  HomeSection,`r`n  HomeSectionKind,`r`n  RecommendationBreakdown,`r`n  RecommendationContext,`r`n  RelatedTool,`r`n} from "./types";

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
    because_you_viewed: "鍥犱负浣犳祻瑙堣繃",
    similar_ai: "鐩镐技 AI",
    trending_in_category: "鍒嗙被鐑棬",
    popular_this_week: "鏈懆鐑棬",
    recently_added: "鏈€鏂颁笂鏋?,
    alternatives: "鏇夸唬宸ュ叿",
    compare: "瀵规瘮",
  },
  ja: {
    because_you_viewed: "闁茶Η灞ユ銇熀銇ャ亸銇娿仚銇欍倎",
    similar_ai: "椤炰技 AI",
    trending_in_category: "銈儐銈淬儶銇儓銉兂銉?,
    popular_this_week: "浠婇€便伄浜烘皸",
    recently_added: "鏂扮潃 AI",
    alternatives: "浠ｆ浛銉勩兗銉?,
    compare: "姣旇純",
  },
  "zh-TW": {
    because_you_viewed: "鍥犵偤浣犵€忚閬?,
    similar_ai: "鐩镐技 AI",
    trending_in_category: "鍒嗛鐔遍杸",
    popular_this_week: "鏈€辩啽闁€",
    recently_added: "鏈€鏂颁笂鏋?,
    alternatives: "鏇夸唬宸ュ叿",
    compare: "姣旇純",
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

/** Commit 055 閳?dynamic homepage recommendation sections. */
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
