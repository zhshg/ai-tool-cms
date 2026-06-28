import type { CrawlerContext } from "../context";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolListItemDTO, ToolDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";

/** Futurepedia adapter — scaffold for future production use (not registered by default). */
export class FuturepediaAdapter extends StructuredSiteAdapter {
  readonly sourceId = "futurepedia";
  readonly displayName = "Futurepedia";

  readonly config = {
    baseUrl: "https://www.futurepedia.io",
    categoriesPath: "/api/v1/categories",
    toolsPath: "/api/v1/tools",
    detailPathTemplate: "/api/v1/tools/{id}",
    listKey: "tools",
    mapping: {
      id: ["id", "_id"],
      name: ["tool_name", "name", "title"],
      slug: ["slug"],
      website: ["tool_url", "website", "url"],
      description: ["description"],
      summary: ["short_description", "summary"],
      logo: ["image", "logo", "logo_url"],
      tags: ["tags"],
      categories: ["category", "categories"],
    },
  };

  async getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    try {
      const data = await this.fetchJson<{ categories?: Record<string, unknown>[] }>(
        ctx,
        this.config.categoriesPath!,
      );
      return (data.categories ?? []).map((row, index) => ({
        externalId: String(this.pickField(row, ["id", "slug"]) ?? index),
        name: String(this.pickField(row, ["name", "title"]) ?? ""),
        slug: String(this.pickField(row, ["slug"]) ?? `fp-cat-${index}`),
      }));
    } catch {
      return [{ externalId: "featured", name: "Featured", slug: "featured" }];
    }
  }

  async getTools(ctx: CrawlerContext, category?: CrawlCategoryDTO, cursor?: CrawlCursor) {
    const page = cursor?.page ?? 1;
    const path = `${this.config.toolsPath}?page=${page}&limit=20`;

    try {
      const data = await this.fetchJson<Record<string, unknown>>(ctx, path);
      const rows = (data[this.config.listKey ?? "tools"] as Record<string, unknown>[]) ?? [];
      return {
        items: rows.map((row) => this.mapListItem(row)),
        cursor: rows.length >= 20 ? { page: page + 1, metadata: { category } } : undefined,
      };
    } catch {
      return { items: [] };
    }
  }

  async getDetail(ctx: CrawlerContext, item: CrawlToolListItemDTO) {
    const path = this.config.detailPathTemplate!.replace("{id}", item.externalId);
    try {
      const data = await this.fetchJson<Record<string, unknown>>(ctx, path);
      const row = (data.tool as Record<string, unknown>) ?? data;
      return {
        ...this.mapListItem(row),
        description: String(this.pickField(row, ["description"]) ?? ""),
        tags: (this.pickField(row, ["tags"]) as string[]) ?? [],
        features: [],
        platforms: ["web"],
        pricingModel: mapPricing(this.pickField(row, ["pricing"]) as string),
        raw: row,
      };
    } catch {
      return { ...item, description: item.summary, raw: {} };
    }
  }
}

function mapPricing(value?: string): ToolDTO["pricingModel"] {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper.includes("FREE")) return "FREE";
  if (upper.includes("FREEMIUM")) return "FREEMIUM";
  if (upper.includes("PAID")) return "PAID";
  return "CONTACT";
}
