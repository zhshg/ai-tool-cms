import type { PrismaClient } from "@ai-tool-cms/database";
import { Prisma, PricingModel, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { getMeiliClient, TOOLS_INDEX } from "./client";
import { buildFacetsFromDocuments } from "./facets";
import { buildMeiliFilter, normalizeFilters } from "./filters";
import { embedText } from "./embeddings";
import { rerankWithEmbeddings, sortHits } from "./ranking";
import { expandQuerySynonyms } from "./synonyms";
import type { SearchHit, SearchQuery, SearchResult, SearchToolDocument } from "./types";

const activeOnly = { deletedAt: null } as const;

type NormalizedFilters = ReturnType<typeof normalizeFilters>;

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
      const sort = getMeiliSort(input.sort);

      try {
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
      } catch {
        const prismaHits = await this.prismaFallbackSearch(
          keyword,
          filters,
          input.sort,
          pageSize,
          offset,
        );
        hits = prismaHits.hits;
        totalHits = prismaHits.total;
      }
    } else {
      const prismaHits = await this.prismaFallbackSearch(
        keyword,
        filters,
        input.sort,
        pageSize,
        offset,
      );
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
    filters: NormalizedFilters,
    sort: SearchQuery["sort"] | undefined,
    limit: number,
    offset: number,
  ): Promise<{ hits: SearchHit[]; total: number }> {
    const baseWhere: Prisma.ToolWhereInput = {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" as const } },
              { summary: { contains: keyword, mode: "insensitive" as const } },
              { description: { contains: keyword, mode: "insensitive" as const } },
              { slug: { contains: keyword, mode: "insensitive" as const } },
              {
                categories: {
                  some: {
                    ...activeOnly,
                    category: {
                      ...activeOnly,
                      name: { contains: keyword, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                tags: {
                  some: {
                    ...activeOnly,
                    tag: {
                      ...activeOnly,
                      name: { contains: keyword, mode: "insensitive" as const },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(filters.category
        ? {
            categories: {
              some: {
                ...activeOnly,
                category: { ...activeOnly, slug: { in: toArray(filters.category) } },
              },
            },
          }
        : {}),
      ...(filters.tag
        ? {
            tags: {
              some: { ...activeOnly, tag: { ...activeOnly, slug: { in: toArray(filters.tag) } } },
            },
          }
        : {}),
      ...(filters.pricing ? { pricingModel: { in: toPricingModels(filters.pricing) } } : {}),
      ...(filters.free ? { pricingModel: { in: [PricingModel.FREE, PricingModel.FREEMIUM] } } : {}),
    };

    const tools = await this.prisma.tool.findMany({
      where: baseWhere,
      include: {
        categories: { where: activeOnly, include: { category: true } },
        tags: { where: activeOnly, include: { tag: true } },
        reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
      },
      orderBy: getPrismaOrderBy(sort),
      take: Math.max(100, limit + offset),
    });

    const filtered = tools.filter((tool) => {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const tagSlugs = tool.tags.map((item) => item.tag.slug);
      const platforms = normalizeStringList(metadata.aiPlatforms ?? metadata.platforms);
      const languages = normalizeStringList(metadata.aiLanguages ?? metadata.languages);

      if (filters.platform && !hasIntersection(platforms, toArray(filters.platform))) return false;
      if (filters.language && !hasIntersection(languages, toArray(filters.language))) return false;
      if (filters.api && !hasApiAccess(metadata)) return false;
      if (filters.openSource && !isOpenSourceTool(metadata, tagSlugs)) return false;
      return true;
    });

    const sorted = sortFallbackTools(filtered, sort);
    const pageTools = sorted.slice(offset, offset + limit);
    const hits: SearchHit[] = pageTools.map((tool) => {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const tagSlugs = tool.tags.map((t) => t.tag.slug);
      const popularityScore = Number(metadata.popularityScore ?? metadata.overallScore ?? 0);
      const reviewScore = tool.reviews.length
        ? tool.reviews.reduce((sum, review) => sum + review.rating, 0) / tool.reviews.length
        : 0;
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
        tagSlugs,
        tagNames: tool.tags.map((t) => t.tag.name),
        platforms: normalizeStringList(metadata.aiPlatforms ?? metadata.platforms),
        languages: normalizeStringList(metadata.aiLanguages ?? metadata.languages),
        features: normalizeStringList(metadata.aiFeatures ?? metadata.features),
        useCases: normalizeStringList(metadata.aiUseCases ?? metadata.useCases),
        hasApi: hasApiAccess(metadata),
        isFree: tool.pricingModel === "FREE" || tool.pricingModel === "FREEMIUM",
        isOpenSource: isOpenSourceTool(metadata, tagSlugs),
        popularityScore,
        trendingScore: Number(metadata.trendingScore ?? popularityScore),
        reviewScore,
        publishedAt: tool.publishedAt?.toISOString(),
        updatedAt: tool.updatedAt.toISOString(),
        searchableText: tool.name,
      };
      return { document: doc, score: 1 };
    });

    return { hits, total: filtered.length };
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

  private async logQuery(result: SearchResult, filters: NormalizedFilters): Promise<void> {
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

function sortFallbackTools<
  T extends {
    name: string;
    metadata: unknown;
    publishedAt: Date | null;
    updatedAt: Date;
    reviews: Array<{ rating: number }>;
  },
>(tools: T[], sort: SearchQuery["sort"] | undefined): T[] {
  const copy = [...tools];
  switch (sort) {
    case "popular":
    case "popularity":
      return copy.sort((a, b) => getScore(b, "popularityScore") - getScore(a, "popularityScore"));
    case "trending":
      return copy.sort((a, b) => getScore(b, "trendingScore") - getScore(a, "trendingScore"));
    case "rating":
      return copy.sort((a, b) => getAverageRating(b) - getAverageRating(a));
    case "a-z":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:
      return copy.sort((a, b) => {
        const left = a.publishedAt ?? a.updatedAt;
        const right = b.publishedAt ?? b.updatedAt;
        return right.getTime() - left.getTime();
      });
  }
}

function getScore(tool: { metadata: unknown }, key: "popularityScore" | "trendingScore"): number {
  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata[key] === "number") return metadata[key];
  if (key === "trendingScore" && typeof metadata.popularityScore === "number") {
    return metadata.popularityScore;
  }
  if (typeof metadata.overallScore === "number") return metadata.overallScore;
  return 0;
}

function getAverageRating(tool: { reviews: Array<{ rating: number }> }): number {
  return tool.reviews.length
    ? tool.reviews.reduce((sum, review) => sum + review.rating, 0) / tool.reviews.length
    : 0;
}
function getMeiliSort(sort: SearchQuery["sort"] | undefined): string[] | undefined {
  switch (sort) {
    case "popular":
    case "popularity":
      return ["popularityScore:desc"];
    case "trending":
      return ["trendingScore:desc"];
    case "newest":
      return ["publishedAt:desc"];
    case "rating":
      return ["reviewScore:desc"];
    case "a-z":
      return ["name:asc"];
    default:
      return undefined;
  }
}

function getPrismaOrderBy(sort: SearchQuery["sort"] | undefined) {
  if (sort === "a-z") return [{ name: "asc" as const }];
  return [
    { publishedAt: "desc" as const },
    { updatedAt: "desc" as const },
    { name: "asc" as const },
  ];
}

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toPricingModels(value?: string | string[]): PricingModel[] {
  return toArray(value).filter((item): item is PricingModel =>
    Object.values(PricingModel).includes(item as PricingModel),
  );
}
function hasIntersection(values: string[], selected: string[]): boolean {
  const normalized = new Set(values.map((value) => value.toLowerCase()));
  return selected.some((value) => normalized.has(value.toLowerCase()));
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function hasApiAccess(metadata: Record<string, unknown>): boolean {
  const explicit = metadata.hasApi ?? metadata.apiAccess ?? metadata.aiApiAccess ?? metadata.api;
  if (typeof explicit === "boolean") return explicit;
  const integrations = normalizeStringList(metadata.aiIntegrations ?? metadata.integrations);
  return integrations.some((item) => /api|webhook|zapier|make|n8n/i.test(item));
}

function isOpenSourceTool(metadata: Record<string, unknown>, tagSlugs: string[]): boolean {
  if (metadata.openSource === true || metadata.isOpenSource === true) return true;
  return tagSlugs.some((slug) => ["open-source", "opensource", "oss"].includes(slug));
}

export function createSearchService(prisma: PrismaClient): SearchService {
  return new SearchService(prisma);
}
