import type { CrawlerContext } from "../context";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolListItemDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";

/**
 * Toolify adapter — scaffold for future production use (not registered by default).
 * Enable via registerProductionSiteAdapters() when ready.
 */
export class ToolifyAdapter extends StructuredSiteAdapter {
  readonly sourceId = "toolify";
  readonly displayName = "Toolify";

  readonly config = {
    baseUrl: "https://www.toolify.ai",
    categoriesPath: "/api/categories",
    toolsPath: "/api/tools",
    detailPathTemplate: "/api/tools/{id}",
    listKey: "data",
    mapping: {
      id: ["id", "tool_id"],
      name: ["name", "title"],
      slug: ["slug"],
      website: ["website", "url", "homepage"],
      description: ["description"],
      summary: ["summary", "tagline"],
      logo: ["logo", "logo_url", "icon"],
      tags: ["tags"],
      categories: ["categories"],
    },
  };

  async getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    try {
      const data = await this.fetchJson<{ data?: Record<string, unknown>[] }>(
        ctx,
        this.config.categoriesPath!,
      );
      const rows = data.data ?? [];
      return rows.map((row, index) => ({
        externalId: String(this.pickField(row, ["id", "slug"]) ?? `cat-${index}`),
        name: String(this.pickField(row, ["name", "title"]) ?? `Category ${index + 1}`),
        slug: String(this.pickField(row, ["slug"]) ?? `category-${index + 1}`),
        url: String(this.pickField(row, ["url"]) ?? ""),
      }));
    } catch {
      return [{ externalId: "all", name: "All Tools", slug: "all" }];
    }
  }

  async getTools(
    ctx: CrawlerContext,
    category?: CrawlCategoryDTO,
    cursor?: CrawlCursor,
  ): Promise<{ items: CrawlToolListItemDTO[]; cursor?: CrawlCursor }> {
    const page = cursor?.page ?? 1;
    const path = `${this.config.toolsPath}?page=${page}${category && category.externalId !== "all" ? `&category=${category.externalId}` : ""}`;

    try {
      const data = await this.fetchJson<Record<string, unknown>>(ctx, path);
      const rows = (data[this.config.listKey ?? "data"] as Record<string, unknown>[]) ?? [];
      const items = rows.map((row) => this.mapListItem(row));
      const hasMore = rows.length >= 20;
      return {
        items,
        cursor: hasMore ? { page: page + 1, metadata: { category } } : undefined,
      };
    } catch {
      return { items: [] };
    }
  }

  async getDetail(ctx: CrawlerContext, item: CrawlToolListItemDTO) {
    const path =
      this.config.detailPathTemplate?.replace("{id}", item.externalId) ??
      `${this.config.toolsPath}/${item.externalId}`;

    try {
      const data = await this.fetchJson<{ data?: Record<string, unknown> }>(ctx, path);
      const row = data.data ?? (data as unknown as Record<string, unknown>);
      return {
        ...this.mapListItem(row),
        description: String(this.pickField(row, ["description"]) ?? ""),
        tags: (this.pickField(row, ["tags"]) as string[]) ?? [],
        features: (this.pickField(row, ["features"]) as string[]) ?? [],
        platforms: (this.pickField(row, ["platforms"]) as string[]) ?? ["web"],
        raw: row,
      };
    } catch {
      return {
        ...item,
        description: item.summary,
        raw: item as unknown as Record<string, unknown>,
      };
    }
  }
}
