import type { CrawlRawPage } from "./Response";
import type { CrawlExtractedItem } from "./Extractor";
import type { CrawlerContext } from "./context";
import { BaseAdapter } from "./Adapter";
import type { CrawlCursor } from "./types";
import type {
  CrawlCategoryDTO,
  CrawlToolDetailDTO,
  CrawlToolListItemDTO,
  ToolDTO,
} from "./ToolDTO";
import { unifiedToolNormalizer } from "./UnifiedNormalizer";
import { createCrawlRequest } from "./Request";

/** JSON field path mapping — config-driven, no CSS selectors. */
export type FieldMapping = {
  id?: string[];
  name?: string[];
  slug?: string[];
  website?: string[];
  url?: string[];
  description?: string[];
  summary?: string[];
  logo?: string[];
  tags?: string[];
  categories?: string[];
};

export type StructuredAdapterConfig = {
  baseUrl: string;
  categoriesPath?: string;
  toolsPath?: string;
  detailPathTemplate?: string;
  listKey?: string;
  mapping?: FieldMapping;
};

/**
 * Structured site adapter base — Toolify / Futurepedia / TAAFT pattern (Commit 024+).
 * Uses JSON API + field mappings instead of hardcoded DOM selectors.
 */
export abstract class StructuredSiteAdapter extends BaseAdapter {
  abstract readonly config: StructuredAdapterConfig;

  abstract getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]>;

  abstract getTools(
    ctx: CrawlerContext,
    category?: CrawlCategoryDTO,
    cursor?: CrawlCursor,
  ): Promise<{ items: CrawlToolListItemDTO[]; cursor?: CrawlCursor }>;

  abstract getDetail(
    ctx: CrawlerContext,
    item: CrawlToolListItemDTO,
  ): Promise<CrawlToolDetailDTO | null>;

  normalize(detail: CrawlToolDetailDTO): ToolDTO | null {
    return unifiedToolNormalizer.normalize({
      sourceId: this.sourceId,
      detail,
      sourceUrl: detail.url,
    });
  }

  async fetch(cursor: CrawlCursor | undefined, ctx: CrawlerContext): Promise<CrawlRawPage[]> {
    const phase = (cursor?.metadata?.phase as string) ?? "tools";
    const pages: CrawlRawPage[] = [];

    if (phase === "categories") {
      const categories = await this.getCategories(ctx);
      pages.push(this.toRawPage(ctx, "categories", { categories }));
      return pages;
    }

    const category = cursor?.metadata?.category as CrawlCategoryDTO | undefined;
    const { items, cursor: nextCursor } = await this.getTools(ctx, category, cursor);

    for (const item of items.slice(0, 5)) {
      const detail = await this.getDetail(ctx, item);
      if (detail) {
        pages.push(this.toRawPage(ctx, "detail", { detail, item }));
      }
    }

    if (nextCursor) {
      pages.push(
        this.toRawPage(ctx, "tools", {
          items,
          nextCursor,
        }),
      );
    }

    return pages;
  }

  async parse(page: CrawlRawPage): Promise<CrawlExtractedItem[]> {
    const payload = page.cursor?.metadata ?? {};
    const items: CrawlExtractedItem[] = [];

    if (payload.detail) {
      const detail = payload.detail as CrawlToolDetailDTO;
      const dto = this.normalize(detail);
      if (dto) {
        items.push(toolDtoToExtracted(dto, detail));
      }
      return items;
    }

    const list = (payload.items as CrawlToolListItemDTO[]) ?? [];
    for (const item of list) {
      items.push({
        externalId: item.externalId,
        name: item.name,
        website: item.website ?? item.url,
        summary: item.summary,
        logoUrl: item.logoUrl,
        raw: item as unknown as Record<string, unknown>,
      });
    }

    return items;
  }

  protected async fetchJson<T>(
    ctx: CrawlerContext,
    path: string,
    cursor?: CrawlCursor,
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.config.baseUrl}${path}`;
    const request = createCrawlRequest(url, { cursor });
    await ctx.rateLimiter.acquire();
    const response = await ctx.fetch(ctx.proxy.apply(request));
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return JSON.parse(response.body) as T;
  }

  protected pickField(record: Record<string, unknown>, keys: string[] = []): unknown {
    for (const key of keys) {
      if (key in record) return record[key];
    }
    return undefined;
  }

  protected mapListItem(record: Record<string, unknown>): CrawlToolListItemDTO {
    const m = this.config.mapping ?? {};
    return {
      externalId: String(this.pickField(record, m.id ?? ["id", "slug"]) ?? ""),
      name: String(this.pickField(record, m.name ?? ["name", "title"]) ?? ""),
      slug: String(this.pickField(record, m.slug ?? ["slug"]) ?? ""),
      url: String(this.pickField(record, m.url ?? ["url", "link"]) ?? ""),
      website: String(this.pickField(record, m.website ?? ["website", "homepage"]) ?? ""),
      summary: String(this.pickField(record, m.summary ?? ["summary", "tagline"]) ?? ""),
      logoUrl: String(this.pickField(record, m.logo ?? ["logo", "logoUrl", "icon"]) ?? ""),
    };
  }

  private toRawPage(
    _ctx: CrawlerContext,
    phase: string,
    metadata: Record<string, unknown>,
  ): CrawlRawPage {
    return {
      url: this.config.baseUrl,
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(metadata),
      contentType: "application/json",
      fetchedAt: new Date().toISOString(),
      durationMs: 0,
      sourceId: this.sourceId,
      cursor: { metadata: { phase, ...metadata } },
    };
  }
}

function toolDtoToExtracted(dto: ToolDTO, detail: CrawlToolDetailDTO): CrawlExtractedItem {
  return {
    externalId: dto.externalId,
    name: dto.name,
    website: dto.website,
    description: dto.description,
    summary: dto.summary,
    logoUrl: dto.logoUrl,
    tags: dto.tags,
    categories: dto.categories,
    raw: detail.raw,
  };
}
