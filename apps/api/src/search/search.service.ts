import { Injectable } from "@nestjs/common";
import { createSearchService, isMeiliConfigured } from "@ai-tool-cms/search";
import { computeTrending } from "@ai-tool-cms/ranking";
import { buildHomeSections, computeRelatedTools } from "@ai-tool-cms/recommendation";
import { PrismaService } from "../prisma/prisma.service";
import type {
  HomeRecommendationsQueryDto,
  PublicSearchQueryDto,
  TrendingQueryDto,
} from "./dto/search-query.dto";

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
      },
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      semantic: query.semantic,
    });
  }

  async relatedTools(slug: string, limit = 10) {
    const tool = await this.prisma.client.tool.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!tool) return { items: [] };
    const items = await computeRelatedTools(this.prisma.client, tool.id, limit);
    return { items };
  }

  async trending(query: TrendingQueryDto) {
    const items = await computeTrending(
      this.prisma.client,
      query.period ?? "weekly",
      query.limit ?? 20,
    );
    return { period: query.period ?? "weekly", items };
  }

  async homeRecommendations(query: HomeRecommendationsQueryDto) {
    const viewedToolIds = query.viewed ? [query.viewed] : undefined;
    const sections = await buildHomeSections(this.prisma.client, {
      viewedToolIds,
      categorySlug: query.category,
      limit: query.limit ?? 6,
    });
    return { sections };
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
        note: "Index updates via BullMQ search-tool-index queue — no manual rebuild",
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
}
