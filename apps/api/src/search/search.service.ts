import { Injectable } from "@nestjs/common";
import { createSearchService, expandQuerySynonyms, isMeiliConfigured } from "@ai-tool-cms/search";
import { ToolStatus } from "@ai-tool-cms/database";
import { computeTrending } from "@ai-tool-cms/ranking";
import { buildHomeSections, computeRelatedTools } from "@ai-tool-cms/recommendation";
import { PrismaService } from "../prisma/prisma.service";
import type {
  HomeRecommendationsQueryDto,
  PublicSearchQueryDto,
  TrendingQueryDto,
} from "./dto/search-query.dto";

const activeOnly = { deletedAt: null } as const;

@Injectable()
export class SearchApiService {
  constructor(private readonly prisma: PrismaService) {}

  private get searchEngine() {
    return createSearchService(this.prisma.client);
  }

  async search(query: PublicSearchQueryDto) {
    const keyword = query.keyword ?? query.q;
    return this.searchEngine.search({
      keyword,
      filters: {
        category: query.category,
        tag: query.tag,
        pricing: query.pricing,
        language: query.language,
        platform: query.platform,
        api: query.api,
        free: query.free,
        openSource: query.openSource,
      },
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      semantic: query.semantic,
    });
  }

  async autocomplete(q: string, limit = 10) {
    const query = q.trim();
    const safeLimit = Math.min(20, Math.max(1, limit));
    const whereName = query ? { contains: query, mode: "insensitive" as const } : undefined;

    const [tools, categories, tags, queryLogs] = await Promise.all([
      this.prisma.client.tool.findMany({
        where: {
          deletedAt: null,
          status: "PUBLISHED",
          ...(whereName ? { OR: [{ name: whereName }, { slug: whereName }] } : {}),
        },
        orderBy: [{ publishedAt: "desc" }, { name: "asc" }],
        take: safeLimit,
        select: { name: true, slug: true, summary: true },
      }),
      this.prisma.client.category.findMany({
        where: {
          deletedAt: null,
          ...(whereName ? { OR: [{ name: whereName }, { slug: whereName }] } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: Math.ceil(safeLimit / 2),
        select: { name: true, slug: true, description: true },
      }),
      this.prisma.client.tag.findMany({
        where: {
          deletedAt: null,
          ...(whereName ? { OR: [{ name: whereName }, { slug: whereName }] } : {}),
        },
        orderBy: { name: "asc" },
        take: Math.ceil(safeLimit / 2),
        select: { name: true, slug: true, description: true },
      }),
      this.prisma.client.searchQueryLog.groupBy({
        by: ["query"],
        where: {
          hadResults: true,
          query: query ? { contains: query, mode: "insensitive" as const } : { not: "" },
        },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: safeLimit,
      }),
    ]);

    const items = [
      ...tools.map((tool) => ({
        type: "tool" as const,
        label: tool.name,
        value: tool.name,
        slug: tool.slug,
        description: tool.summary,
      })),
      ...categories.map((category) => ({
        type: "category" as const,
        label: category.name,
        value: category.slug,
        slug: category.slug,
        description: category.description,
      })),
      ...tags.map((tag) => ({
        type: "tag" as const,
        label: tag.name,
        value: tag.slug,
        slug: tag.slug,
        description: tag.description,
      })),
      ...queryLogs.map((item) => ({
        type: "query" as const,
        label: item.query,
        value: item.query,
        count: item._count.query,
      })),
    ];

    return { query, items: dedupeSuggestions(items).slice(0, safeLimit) };
  }

  async suggestions(q: string, limit = 10) {
    const query = q.trim();
    const safeLimit = Math.min(20, Math.max(1, limit));
    const [autocomplete, popular, recent] = await Promise.all([
      this.autocomplete(query, safeLimit),
      this.popularSearches(safeLimit),
      this.recentSearches(safeLimit),
    ]);
    const synonyms = query
      ? expandQuerySynonyms(query)
          .split(" ")
          .map((item) => item.trim())
          .filter((item) => item && item !== query.toLowerCase())
          .slice(0, safeLimit)
      : [];

    return {
      query,
      autocomplete: autocomplete.items,
      synonyms,
      popular: popular.items,
      recent: recent.items,
    };
  }

  async popularSearches(limit = 10) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const items = await this.prisma.client.searchQueryLog.groupBy({
      by: ["query"],
      where: { createdAt: { gte: since }, hadResults: true, query: { not: "" } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: safeLimit,
    });
    return { items: items.map((item) => ({ query: item.query, count: item._count.query })) };
  }

  async recentSearches(limit = 10) {
    const safeLimit = Math.min(20, Math.max(1, limit));
    const logs = await this.prisma.client.searchQueryLog.findMany({
      where: { hadResults: true, query: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: safeLimit * 3,
      select: { query: true, createdAt: true },
    });
    const seen = new Set<string>();
    const items = [] as Array<{ query: string; createdAt: string }>;
    for (const log of logs) {
      const key = log.query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ query: log.query, createdAt: log.createdAt.toISOString() });
      if (items.length >= safeLimit) break;
    }
    return { items };
  }

  async relatedTools(slug: string, limit = 10) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!tool) return { items: [] };
    const items = await computeRelatedTools(this.prisma.client, tool.id, limit);
    return { items: await this.attachLogoUrls(items) };
  }

  async trending(query: TrendingQueryDto) {
    const items = await computeTrending(
      this.prisma.client,
      query.period ?? "weekly",
      query.limit ?? 20,
    );
    return { period: query.period ?? "weekly", items: await this.attachLogoUrls(items) };
  }

  async homeRecommendations(query: HomeRecommendationsQueryDto) {
    const viewedToolIds = query.viewed ? [query.viewed] : undefined;
    const sections = await buildHomeSections(this.prisma.client, {
      viewedToolIds,
      categorySlug: query.category,
      locale: query.locale,
      region: query.region,
      limit: query.limit ?? 6,
    });
    return {
      sections: await Promise.all(
        sections.map(async (section) => ({
          ...section,
          tools: await this.attachLogoUrls(section.tools),
        })),
      ),
    };
  }

  async getDashboard() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [topQueries, noResultQueries, slowQueries, clickGroups, viewGroups, totalQueries] =
      await Promise.all([
        this.prisma.client.searchQueryLog.groupBy({
          by: ["normalizedQuery"],
          where: { createdAt: { gte: since }, hadResults: true },
          _count: { normalizedQuery: true },
          orderBy: { _count: { normalizedQuery: "desc" } },
          take: 20,
        }),
        this.prisma.client.searchQueryLog.groupBy({
          by: ["normalizedQuery"],
          where: { createdAt: { gte: since }, hadResults: false },
          _count: { normalizedQuery: true },
          orderBy: { _count: { normalizedQuery: "desc" } },
          take: 20,
        }),
        this.prisma.client.searchQueryLog.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { latencyMs: "desc" },
          take: 10,
          select: { query: true, latencyMs: true, resultCount: true, createdAt: true },
        }),
        this.prisma.client.searchClickLog.groupBy({
          by: ["toolId"],
          where: { createdAt: { gte: since } },
          _count: { toolId: true },
          orderBy: { _count: { toolId: "desc" } },
          take: 20,
        }),
        this.prisma.client.tool.findMany({
          where: { deletedAt: null, status: "PUBLISHED" },
          select: { id: true, slug: true, name: true, metadata: true },
          take: 100,
        }),
        this.prisma.client.searchQueryLog.count({ where: { createdAt: { gte: since } } }),
      ]);

    const toolMap = new Map(viewGroups.map((t) => [t.id, t]));
    const mostClicked = clickGroups.map((group) => {
      const tool = toolMap.get(group.toolId);
      return {
        toolId: group.toolId,
        slug: tool?.slug,
        name: tool?.name,
        clicks: group._count.toolId,
      };
    });

    const mostViewed = viewGroups
      .map((tool) => ({
        toolId: tool.id,
        slug: tool.slug,
        name: tool.name,
        views: Number((tool.metadata as Record<string, unknown>)?.viewCount ?? 0),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    return {
      indexStatus: {
        meilisearch: isMeiliConfigured(),
        autoIndexOnly: true,
        note: "Index updates via BullMQ search-tool-index queue �?no manual rebuild",
      },
      topQueries: topQueries.map((q) => ({
        query: q.normalizedQuery,
        count: q._count.normalizedQuery,
      })),
      noResultQueries: noResultQueries.map((q) => ({
        query: q.normalizedQuery,
        count: q._count.normalizedQuery,
      })),
      slowSearch: slowQueries,
      mostClicked,
      mostViewed,
      brokenSearch: noResultQueries.slice(0, 10).map((q) => ({
        query: q.normalizedQuery,
        count: q._count.normalizedQuery,
      })),
      totals: { queries7d: totalQueries },
    };
  }

  private async attachLogoUrls<T extends { slug: string }>(
    items: T[],
  ): Promise<Array<T & { logoUrl: string | null }>> {
    if (!items.length) return [];

    const tools = await this.prisma.client.tool.findMany({
      where: {
        slug: { in: items.map((item) => item.slug) },
        status: ToolStatus.PUBLISHED,
        ...activeOnly,
      },
      select: { slug: true, website: true, logoUrl: true, metadata: true },
    });

    const logoBySlug = new Map(
      tools.map((tool) => [
        tool.slug,
        resolveApiLogoUrl(
          tool.logoUrl,
          (tool.metadata ?? {}) as Record<string, unknown>,
          tool.website,
        ),
      ]),
    );

    return items.map((item) => ({
      ...item,
      logoUrl: logoBySlug.get(item.slug) ?? null,
    }));
  }
}

function dedupeSuggestions<T extends { type: string; value: string; label: string }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveApiLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website: string | null | undefined,
): string | null {
  const candidates = buildOrderedLogoCandidates(primaryLogoUrl, metadata, website);

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isPreferredPrimaryLogo(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  const source =
    cleanString(website) ?? cleanString(metadata.website) ?? cleanString(metadata.canonicalUrl);
  if (!source) return null;

  try {
    const hostname = new URL(source).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildOrderedLogoCandidates(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website: string | null | undefined,
) {
  const source =
    cleanString(website) ?? cleanString(metadata.website) ?? cleanString(metadata.canonicalUrl);
  const directFavicon = buildDirectWebsiteFaviconUrl(source);

  return [
    cleanString(primaryLogoUrl),
    cleanString(metadata.logoUrl),
    cleanString(metadata.logo),
    cleanString(metadata.svgLogoUrl),
    cleanString(metadata.officialLogoUrl),
    cleanString(metadata.collectedLogoUrl),
    cleanString(metadata.faviconUrl),
    cleanString(metadata.appleTouchIconUrl),
    cleanString(metadata.openGraphImageUrl),
    cleanString(metadata.imageUrl),
    cleanString(metadata.iconUrl),
    directFavicon,
  ];
}

function buildDirectWebsiteFaviconUrl(source: string | null) {
  if (!source) return null;

  try {
    const url = new URL(source);
    if (!url.hostname) return null;
    return new URL("/favicon.ico", url).toString();
  } catch {
    return null;
  }
}

function isPreferredPrimaryLogo(value: string) {
  if (value.startsWith("/logos/") || value.startsWith("/storage/")) return true;

  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === "img.toolsdar.io") return true;
    if (url.pathname.startsWith("/logos/")) return true;
    if (url.pathname.includes("/storage/logos/")) return true;
    return false;
  } catch {
    return false;
  }
}
