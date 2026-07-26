import { createHash } from "node:crypto";
import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { createSearchService } from "@ai-tool-cms/search";
import type { SearchQuery } from "@ai-tool-cms/search";
import { computeTrending } from "@ai-tool-cms/ranking";
import { computeRelatedTools } from "@ai-tool-cms/recommendation";
import type { ComparePageSpec } from "@ai-tool-cms/seo";

const activeOnly = { deletedAt: null } as const;

export type CursorPayload = { id: string; publishedAt?: string };

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
  } catch {
    return null;
  }
}

export function computeEtag(body: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return `"${hash.slice(0, 32)}"`;
}

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function publicListTools(
  prisma: PrismaClient,
  input: { limit?: number; cursor?: string },
): Promise<
  CursorPage<{
    slug: string;
    name: string;
    summary: string | null;
    website: string;
    logoUrl: string | null;
    pricingModel: string;
    publishedAt: string | null;
  }>
> {
  const limit = Math.min(input.limit ?? 20, 50);
  const decoded = decodeCursor(input.cursor);

  const tools = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      ...(decoded ? { id: { lt: decoded.id } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      website: true,
      logoUrl: true,
      metadata: true,
      pricingModel: true,
      publishedAt: true,
    },
  });

  const hasMore = tools.length > limit;
  const page = hasMore ? tools.slice(0, limit) : tools;
  const last = page[page.length - 1];

  return {
    data: page.map((t) => ({
      slug: t.slug,
      name: t.name,
      summary: t.summary,
      website: t.website,
      logoUrl: resolvePublicLogoUrl(t.logoUrl, (t.metadata ?? {}) as Record<string, unknown>, t.website),
      pricingModel: t.pricingModel,
      publishedAt: t.publishedAt?.toISOString() ?? null,
    })),
    hasMore,
    nextCursor:
      hasMore && last
        ? encodeCursor({ id: last.id, publishedAt: last.publishedAt?.toISOString() })
        : null,
  };
}

export async function publicSearchTools(prisma: PrismaClient, input: SearchQuery) {
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
      logoUrl: hit.document.logoUrl ?? buildFaviconLogoUrl(hit.document.website) ?? null,
      pricingModel: hit.document.pricingModel,
      categories: hit.document.categoryNames,
      tags: hit.document.tagNames,
      score: hit.score,
      semanticScore: hit.semanticScore,
    })),
  };
}

export async function publicGetTool(prisma: PrismaClient, slug: string, locale = "en") {
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
  const relatedLogos = await loadToolLogosBySlug(
    prisma,
    related.map((item) => item.slug),
  );

  return {
    slug: tool.slug,
    name: tool.name,
    website: tool.website,
    logoUrl: resolvePublicLogoUrl(tool.logoUrl, metadata, tool.website),
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
    pricing: tool.pricingPlans.map((p) => ({
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
      logoUrl: relatedLogos.get(r.slug) ?? null,
      score: r.score,
    })),
    publishedAt: tool.publishedAt?.toISOString(),
    updatedAt: tool.updatedAt.toISOString(),
  };
}

export async function publicCompareTools(
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
    return { title: page.title, comparePageSlug: page.slug, type: page.type, tools };
  }

  if (!input.slugs?.length) return { error: "slugs_required" };

  const tools = await loadToolsForCompare(prisma, input.slugs.slice(0, 5));
  return { title: tools.map((t) => t.name).join(" vs "), tools };
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
      pricing: tool.pricingPlans.map((p) => ({
        name: p.name,
        amount: p.amount ? Number(p.amount) : null,
        currency: p.currency,
        billingPeriod: p.billingPeriod,
      })),
    };
  });
}

export async function publicListCategories(
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
        tool: {
          select: {
            slug: true,
            name: true,
            summary: true,
            pricingModel: true,
            website: true,
            logoUrl: true,
            metadata: true,
          },
        },
      },
      take: limit,
      orderBy: { tool: { publishedAt: "desc" } },
    });

    return {
      category: { slug: category.slug, name: category.name, description: category.description },
      tools: links.map((l) => ({
        slug: l.tool.slug,
        name: l.tool.name,
        summary: l.tool.summary,
        pricingModel: l.tool.pricingModel,
        website: l.tool.website,
        logoUrl: resolvePublicLogoUrl(
          l.tool.logoUrl,
          (l.tool.metadata ?? {}) as Record<string, unknown>,
          l.tool.website,
        ),
      })),
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

export async function publicListTags(
  prisma: PrismaClient,
  input: { limit?: number; query?: string },
) {
  const limit = input.limit ?? 50;
  const tags = await prisma.tag.findMany({
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
    select: { slug: true, name: true },
  });
  return { tags };
}

export async function publicGetPricing(
  prisma: PrismaClient,
  input: { slug?: string; pricingModel?: string; maxAmount?: number; limit?: number },
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

  return {
    tools: tools.map((tool) => ({
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

export async function publicListTrending(
  prisma: PrismaClient,
  input: { period?: "weekly" | "monthly" | "yearly"; limit?: number },
) {
  const items = await computeTrending(prisma, input.period ?? "weekly", input.limit ?? 20);
  const logoBySlug = await loadToolLogosBySlug(
    prisma,
    items.map((item) => item.slug),
  );
  return {
    period: input.period ?? "weekly",
    tools: items.map((item) => ({
      ...item,
      logoUrl: logoBySlug.get(item.slug) ?? null,
    })),
  };
}

export async function publicLatestTools(
  prisma: PrismaClient,
  input: { limit?: number; cursor?: string },
) {
  return publicListTools(prisma, input);
}

export async function publicGetAlternatives(prisma: PrismaClient, slug: string, limit = 10) {
  const tool = await prisma.tool.findFirst({
    where: { slug, status: ToolStatus.PUBLISHED, ...activeOnly },
    select: { id: true, slug: true, name: true },
  });
  if (!tool) return { tool: null, alternatives: [] };

  const alternatives = await computeRelatedTools(prisma, tool.id, limit);
  const logoBySlug = await loadToolLogosBySlug(
    prisma,
    alternatives.map((item) => item.slug),
  );
  return {
    tool: { slug: tool.slug, name: tool.name },
    alternatives: alternatives.map((a) => ({
      slug: a.slug,
      name: a.name,
      summary: a.summary,
      logoUrl: logoBySlug.get(a.slug) ?? null,
      score: a.score,
      reason: a.reason,
    })),
  };
}

async function loadToolLogosBySlug(prisma: PrismaClient, slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) return new Map();

  const tools = await prisma.tool.findMany({
    where: { slug: { in: slugs }, status: ToolStatus.PUBLISHED, ...activeOnly },
    select: { slug: true, website: true, logoUrl: true, metadata: true },
  });

  return new Map(
    tools
      .map((tool) => [
        tool.slug,
        resolvePublicLogoUrl(
          tool.logoUrl,
          (tool.metadata ?? {}) as Record<string, unknown>,
          tool.website,
        ),
      ] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function resolvePublicLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website: string | null | undefined,
): string | null {
  const primary = cleanString(primaryLogoUrl);
  if (primary) return primary;

  const candidates = [
    metadata.logoUrl,
    metadata.logo,
    metadata.collectedLogoUrl,
    metadata.faviconUrl,
    metadata.appleTouchIconUrl,
    metadata.openGraphImageUrl,
    metadata.imageUrl,
    metadata.iconUrl,
  ];

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return value;
  }

  return buildFaviconLogoUrl(
    cleanString(website) ??
      cleanString(metadata.website) ??
      cleanString(metadata.canonicalUrl) ??
      cleanString(metadata.sourceUrl),
  );
}

function buildFaviconLogoUrl(website: string | null): string | null {
  if (!website) return null;

  try {
    const hostname = new URL(website).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// MCP 兼容别名
export const mcpSearchTools = publicSearchTools;
export const mcpGetToolDetails = publicGetTool;
export const mcpCompareTools = publicCompareTools;
export const mcpCategorySearch = publicListCategories;
export const mcpPricingQuery = publicGetPricing;
export const mcpLatestAiTools = (
  prisma: PrismaClient,
  input: { period?: "weekly" | "monthly" | "yearly"; limit?: number; mode?: "trending" | "new" },
) =>
  input.mode === "new"
    ? publicLatestTools(prisma, { limit: input.limit })
    : publicListTrending(prisma, { period: input.period, limit: input.limit });
