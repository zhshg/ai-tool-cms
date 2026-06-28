import type { CrawlerContext } from "../context";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolListItemDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";

/** TAAFT adapter — scaffold for future production use (not registered by default). */
export class TaaftAdapter extends StructuredSiteAdapter {
  readonly sourceId = "taaft";
  readonly displayName = "There's An AI For That";

  readonly config = {
    baseUrl: "https://theresanaiforthat.com",
    categoriesPath: "/api/categories/",
    toolsPath: "/api/tools/",
    detailPathTemplate: "/api/tools/{id}/",
    listKey: "results",
    mapping: {
      id: ["id", "uuid"],
      name: ["name", "title"],
      slug: ["slug"],
      website: ["website", "external_url", "url"],
      description: ["description", "long_description"],
      summary: ["short_description", "summary"],
      logo: ["logo", "image_url"],
      tags: ["tags"],
      categories: ["categories"],
    },
  };

  async getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    try {
      const data = await this.fetchJson<{ results?: Record<string, unknown>[] }>(
        ctx,
        this.config.categoriesPath!,
      );
      return (data.results ?? []).map((row, index) => ({
        externalId: String(this.pickField(row, ["id", "slug"]) ?? index),
        name: String(this.pickField(row, ["name"]) ?? ""),
        slug: String(this.pickField(row, ["slug"]) ?? `taaft-${index}`),
      }));
    } catch {
      return [{ externalId: "trending", name: "Trending", slug: "trending" }];
    }
  }

  async getTools(ctx: CrawlerContext, category?: CrawlCategoryDTO, cursor?: CrawlCursor) {
    const offset = cursor?.offset ?? 0;
    const path = `${this.config.toolsPath}?offset=${offset}&limit=20`;

    try {
      const data = await this.fetchJson<Record<string, unknown>>(ctx, path);
      const rows = (data[this.config.listKey ?? "results"] as Record<string, unknown>[]) ?? [];
      return {
        items: rows.map((row) => this.mapListItem(row)),
        cursor: rows.length >= 20 ? { offset: offset + 20, metadata: { category } } : undefined,
      };
    } catch {
      return { items: [] };
    }
  }

  async getDetail(ctx: CrawlerContext, item: CrawlToolListItemDTO) {
    const path = this.config.detailPathTemplate!.replace("{id}", item.externalId);
    try {
      const data = await this.fetchJson<Record<string, unknown>>(ctx, path);
      const row = data;
      return {
        ...this.mapListItem(row),
        description: String(this.pickField(row, ["description"]) ?? ""),
        tags: (this.pickField(row, ["tags"]) as string[]) ?? [],
        features: (this.pickField(row, ["features"]) as string[]) ?? [],
        platforms: ["web"],
        raw: row,
      };
    } catch {
      return { ...item, description: item.summary, raw: {} };
    }
  }
}
