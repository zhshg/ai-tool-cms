import type { PrismaClient } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import { getMeiliClient, TOOLS_INDEX } from "./client";
import { buildFacetsFromDocuments } from "./facets";
import { buildMeiliFilter, normalizeFilters } from "./filters";
import { embedText } from "./embeddings";
import { rerankWithEmbeddings, sortHits } from "./ranking";
import { expandQuerySynonyms } from "./synonyms";
import type { SearchHit, SearchQuery, SearchResult, SearchToolDocument } from "./types";

const activeOnly = { deletedAt: null } as const;

export class SearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(input: SearchQuery): Promise<SearchResult> {
    const started = Date.now();
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const keyword = input.keyword?.trim() ?? "";
    const normalizedQuery = keyword ? expandQuerySynonyms(keyword) : "";
    const filters = normalizeFilters(input.filters);
    const semantic = input.semantic !== false && keyword.length > 0;

    let hits: SearchHit[] = [];
    let totalHits = 0;
    let semanticUsed = false;

    const meili = getMeiliClient();
    if (meili && keyword) {
      const filter = buildMeiliFilter(filters);
      const sort =
        input.sort === "popularity"
          ? ["popularityScore:desc"]
          : input.sort === "newest"
            ? ["publishedAt:desc"]
            : input.sort === "rating"
              ? ["reviewScore:desc"]
              : undefined;

      const response = await meili.index(TOOLS_INDEX).search(normalizedQuery, {
        filter,
        limit: semantic ? Math.min(100, pageSize * 5) : pageSize,
        offset: semantic ? 0 : offset,
        sort,
      });

      hits = response.hits.map((hit) => ({
        document: hit as unknown as SearchToolDocument,
        score: hit._rankingScore ?? 1,
      }));
      totalHits = response.estimatedTotalHits ?? hits.length;
    } else {
      const prismaHits = await this.prismaFallbackSearch(keyword, filters, pageSize, offset);
      hits = prismaHits.hits;
      totalHits = prismaHits.total;
    }

    if (semantic && hits.length > 0) {
      const queryEmbedding = await embedText(normalizedQuery);
      const embeddings = await this.loadEmbeddings(hits.map((h) => h.document.id));
      hits = rerankWithEmbeddings(hits, queryEmbedding.vector, embeddings);
      semanticUsed = true;
      hits = hits.slice(offset, offset + pageSize);
    } else if (input.sort) {
      hits = sortHits(hits, input.sort);
    }

    const facets = buildFacetsFromDocuments(hits.map((h) => h.document));
    const processingTimeMs = Date.now() - started;

    const result: SearchResult = {
      query: keyword,
      normalizedQuery,
      hits,
      page,
      pageSize,
      totalHits,
      totalPages: Math.max(1, Math.ceil(totalHits / pageSize)),
      processingTimeMs,
      facets,
      semanticUsed,
    };

    await this.logQuery(result, filters);

    return result;
  }

  private async prismaFallbackSearch(
    keyword: string,
    _filters: ReturnType<typeof normalizeFilters>,
    limit: number,
    offset: number,
  ): Promise<{ hits: SearchHit[]; total: number }> {
    const where = {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" as const } },
              { summary: { contains: keyword, mode: "insensitive" as const } },
              { description: { contains: keyword, mode: "insensitive" as const } },
              { slug: { contains: keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [tools, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        include: {
          categories: { where: activeOnly, include: { category: true } },
          tags: { where: activeOnly, include: { tag: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      this.prisma.tool.count({ where }),
    ]);

    const hits: SearchHit[] = tools.map((tool) => {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const doc: SearchToolDocument = {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        description: tool.description ?? undefined,
        summary: tool.summary ?? undefined,
        website: tool.website,
        logoUrl: tool.logoUrl ?? undefined,
        pricingModel: tool.pricingModel,
        categorySlugs: tool.categories.map((c) => c.category.slug),
        categoryNames: tool.categories.map((c) => c.category.name),
        tagSlugs: tool.tags.map((t) => t.tag.slug),
        tagNames: tool.tags.map((t) => t.tag.name),
        platforms: (metadata.aiPlatforms as string[]) ?? [],
        languages: (metadata.aiLanguages as string[]) ?? [],
        features: (metadata.aiFeatures as string[]) ?? [],
        useCases: (metadata.aiUseCases as string[]) ?? [],
        popularityScore: Number(metadata.popularityScore ?? 0),
        reviewScore: 0,
        publishedAt: tool.publishedAt?.toISOString(),
        updatedAt: tool.updatedAt.toISOString(),
        searchableText: tool.name,
      };
      return { document: doc, score: 1 };
    });

    return { hits, total };
  }

  private async loadEmbeddings(toolIds: string[]): Promise<Map<string, number[]>> {
    const tools = await this.prisma.tool.findMany({
      where: { id: { in: toolIds } },
      select: { id: true, metadata: true },
    });
    const map = new Map<string, number[]>();
    for (const tool of tools) {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const vector = metadata.searchEmbedding as number[] | undefined;
      if (vector?.length) map.set(tool.id, vector);
    }
    return map;
  }

  private async logQuery(
    result: SearchResult,
    filters: ReturnType<typeof normalizeFilters>,
  ): Promise<void> {
    try {
      await this.prisma.searchQueryLog.create({
        data: {
          query: result.query,
          normalizedQuery: result.normalizedQuery,
          filters: filters as object,
          resultCount: result.totalHits,
          latencyMs: result.processingTimeMs,
          hadResults: result.totalHits > 0,
          semanticUsed: result.semanticUsed,
        },
      });
    } catch {
      // logging must not break search
    }
  }
}

export function createSearchService(prisma: PrismaClient): SearchService {
  return new SearchService(prisma);
}
