import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { createSearchService } from "@ai-tool-cms/search";
import type { SearchQuery } from "@ai-tool-cms/search";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "@ai-tool-cms/recommendation";
import type { ComparePageSpec } from "@ai-tool-cms/seo";

const activeOnly = { deletedAt: null } as const;

export async function mcpSearchTools(prisma: PrismaClient, input: SearchQuery) {
  const search = createSearchService(prisma);
  const result = await search.search(input);
  return {
    query: result.normalizedQuery,
    totalHits: result.totalHits,
    page: result.page,
    pageSize: result.pageSize,
    semanticUsed: result.semanticUsed,
    facets: result.facets,
    tools: result.hits.map((hit) => ({
      slug: hit.document.slug,
      name: hit.document.name,
      summary: hit.document.summary,
      website: hit.document.website,
      pricingModel: hit.document.pricingModel,
      categories: hit.document.categoryNames,
      tags: hit.document.tagNames,
      score: hit.score,
      semanticScore: hit.semanticScore,
    })),
  };
}

export async function mcpGetToolDetails(prisma: PrismaClient, slug: string, locale = "en") {
  const tool = await prisma.tool.findFirst({
    where: { slug, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      tags: { where: activeOnly, include: { tag: true } },
      faqs: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 10 },
      pricingPlans: { where: activeOnly, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!tool) return null;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const related = await computeRelatedTools(prisma, tool.id, 6);

  return {
    slug: tool.slug,
    name: tool.name,
    website: tool.website,
    logoUrl: tool.logoUrl,
    summary: tool.summary,
    longDescription: tool.longDescription,
    pricingModel: tool.pricingModel,
    locale,
    aiSummary:
      (metadata.geoDocument as { llmSummary?: string } | undefined)?.llmSummary ??
      tool.summary ??
      tool.description,
    pros: (metadata.aiPros as string[] | undefined) ?? [],
    cons: (metadata.aiCons as string[] | undefined) ?? [],
    useCases: (metadata.aiUseCases as string[] | undefined) ?? [],
    features: (metadata.aiFeatures as string[] | undefined) ?? [],
    categories: tool.categories.map((c) => ({
      slug: c.category.slug,
      name: c.category.name,
    })),
    tags: tool.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    faqs: tool.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    pricingPlans: tool.pricingPlans.map((p) => ({
      name: p.name,
      slug: p.slug,
      pricingModel: p.pricingModel,
      amount: p.amount ? Number(p.amount) : null,
      currency: p.currency,
      billingPeriod: p.billingPeriod,
      description: p.description,
    })),
    relatedTools: related.map((r) => ({
      slug: r.slug,
      name: r.name,
      summary: r.summary,
      score: r.score,
    })),
    publishedAt: tool.publishedAt?.toISOString(),
    updatedAt: tool.updatedAt.toISOString(),
  };
}

export async function mcpCompareTools(
  prisma: PrismaClient,
  input: { slugs?: string[]; comparePageSlug?: string },
) {
  if (input.comparePageSlug) {
    const page = await prisma.seoComparePage.findFirst({
      where: { slug: input.comparePageSlug, status: ToolStatus.PUBLISHED, ...activeOnly },
    });
    if (!page) return { error: "compare_page_not_found", slug: input.comparePageSlug };

    const spec = page.metadata as ComparePageSpec;
    const slugs = spec.toolSlugs ?? [];
    if (page.toolId && page.toolBId) {
      const pair = await prisma.tool.findMany({
        where: { id: { in: [page.toolId, page.toolBId] }, ...activeOnly },
        select: { slug: true },
      });
      for (const t of pair) slugs.push(t.slug);
    }

    const tools = await loadToolsForCompare(prisma, [...new Set(slugs)]);
    return {
      title: page.title,
      comparePageSlug: page.slug,
      type: page.type,
      tools,
    };
  }

  if (!input.slugs?.length) {
    return { error: "slugs_or_compare_page_slug_required" };
  }

  const tools = await loadToolsForCompare(prisma, input.slugs.slice(0, 5));
  return {
    title: `${tools.map((t) => t.name).join(" vs ")}`,
    tools,
  };
}

async function loadToolsForCompare(prisma: PrismaClient, slugs: string[]) {
  const tools = await prisma.tool.findMany({
    where: { slug: { in: slugs }, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      pricingPlans: { where: activeOnly, orderBy: { sortOrder: "asc" } },
    },
  });

  return tools.map((tool) => {
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    return {
      slug: tool.slug,
      name: tool.name,
      website: tool.website,
      summary: tool.summary,
      pricingModel: tool.pricingModel,
      categories: tool.categories.map((c) => c.category.name),
      pros: (metadata.aiPros as string[] | undefined) ?? [],
      cons: (metadata.aiCons as string[] | undefined) ?? [],
      useCases: (metadata.aiUseCases as string[] | undefined) ?? [],
      pricingPlans: tool.pricingPlans.map((p) => ({
        name: p.name,
        amount: p.amount ? Number(p.amount) : null,
        currency: p.currency,
        billingPeriod: p.billingPeriod,
      })),
    };
  });
}

export async function mcpCategorySearch(
  prisma: PrismaClient,
  input: { query?: string; slug?: string; limit?: number },
) {
  const limit = input.limit ?? 20;

  if (input.slug) {
    const category = await prisma.category.findFirst({
      where: { slug: input.slug, ...activeOnly },
    });
    if (!category) return { category: null, tools: [] };

    const links = await prisma.toolCategory.findMany({
      where: {
        categoryId: category.id,
        ...activeOnly,
        tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
      },
      include: {
        tool: { select: { slug: true, name: true, summary: true, pricingModel: true } },
      },
      take: limit,
      orderBy: { tool: { publishedAt: "desc" } },
    });

    return {
      category: { slug: category.slug, name: category.name, description: category.description },
      tools: links.map((l) => l.tool),
    };
  }

  const categories = await prisma.category.findMany({
    where: {
      ...activeOnly,
      ...(input.query
        ? {
            OR: [
              { name: { contains: input.query, mode: "insensitive" as const } },
              { slug: { contains: input.query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: { name: "asc" },
    select: { slug: true, name: true, description: true },
  });

  return { categories };
}

export async function mcpPricingQuery(
  prisma: PrismaClient,
  input: {
    slug?: string;
    pricingModel?: string;
    maxAmount?: number;
    limit?: number;
  },
) {
  const limit = input.limit ?? 20;

  if (input.slug) {
    const tool = await prisma.tool.findFirst({
      where: { slug: input.slug, status: ToolStatus.PUBLISHED, ...activeOnly },
      include: { pricingPlans: { where: activeOnly, orderBy: { sortOrder: "asc" } } },
    });
    if (!tool) return { tool: null };

    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    return {
      tool: {
        slug: tool.slug,
        name: tool.name,
        pricingModel: tool.pricingModel,
        website: tool.website,
        lastPriceSnapshot: metadata.lastPriceSnapshot ?? null,
        plans: tool.pricingPlans.map((p) => ({
          name: p.name,
          slug: p.slug,
          pricingModel: p.pricingModel,
          amount: p.amount ? Number(p.amount) : null,
          currency: p.currency,
          billingPeriod: p.billingPeriod,
          description: p.description,
        })),
      },
    };
  }

  const tools = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      ...(input.pricingModel ? { pricingModel: input.pricingModel as never } : {}),
    },
    include: { pricingPlans: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 5 } },
    take: limit,
    orderBy: { publishedAt: "desc" },
  });

  let filtered = tools;
  if (input.maxAmount != null) {
    filtered = tools.filter((tool) => {
      const amounts = tool.pricingPlans
        .map((p) => (p.amount ? Number(p.amount) : null))
        .filter((a): a is number => a != null);
      if (!amounts.length) return tool.pricingModel === "FREE";
      return Math.min(...amounts) <= input.maxAmount!;
    });
  }

  return {
    tools: filtered.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      pricingModel: tool.pricingModel,
      plans: tool.pricingPlans.map((p) => ({
        name: p.name,
        amount: p.amount ? Number(p.amount) : null,
        currency: p.currency,
        billingPeriod: p.billingPeriod,
      })),
    })),
  };
}

export async function mcpLatestAiTools(
  prisma: PrismaClient,
  input: { period?: "weekly" | "monthly" | "yearly"; limit?: number; mode?: "trending" | "new" },
) {
  const limit = input.limit ?? 20;

  if (input.mode === "new") {
    const tools = await prisma.tool.findMany({
      where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        slug: true,
        name: true,
        summary: true,
        pricingModel: true,
        publishedAt: true,
        website: true,
      },
    });
    return { mode: "new", tools };
  }

  const items = await computeTrending(prisma, input.period ?? "weekly", limit);
  return { mode: "trending", period: input.period ?? "weekly", tools: items };
}
