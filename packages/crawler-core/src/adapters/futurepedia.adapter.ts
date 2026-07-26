import type { CrawlerContext } from "../context";
import { createCrawlRequest } from "../Request";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolDetailDTO, CrawlToolListItemDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";

const DEFAULT_CATEGORY: CrawlCategoryDTO = {
  externalId: "productivity",
  name: "Productivity",
  slug: "productivity",
  url: "/ai-tools/productivity",
};

const TOOL_LINK_RE =
  /(?:href="(?:https:\/\/www\.futurepedia\.io)?\/tool\/|\/tool\/)([^"'#?\/\s<]+)/gi;

export class FuturepediaAdapter extends StructuredSiteAdapter {
  readonly sourceId = "futurepedia";
  readonly displayName = "Futurepedia";

  readonly config = {
    baseUrl: "https://www.futurepedia.io",
    categoriesPath: "/ai-tools",
    toolsPath: "/ai-tools/productivity",
    detailPathTemplate: "/tool/{id}",
  };

  async getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    try {
      const html = await this.fetchHtml(ctx, this.config.categoriesPath);
      const categories = this.extractCategories(html);
      return categories.length > 0 ? categories : [DEFAULT_CATEGORY];
    } catch {
      return [DEFAULT_CATEGORY];
    }
  }

  async getTools(
    ctx: CrawlerContext,
    category?: CrawlCategoryDTO,
    cursor?: CrawlCursor,
  ): Promise<{ items: CrawlToolListItemDTO[]; cursor?: CrawlCursor }> {
    const path = cursor?.nextUrl ?? category?.url ?? this.config.toolsPath;
    const html = await this.fetchHtml(ctx, path);
    const slugs = this.extractToolSlugs(html).slice(0, 20);

    const items = slugs.map((slug) => ({
      externalId: slug,
      slug,
      name: this.humanizeSlug(slug),
      url: `${this.config.baseUrl}/tool/${slug}`,
      summary: "",
      logoUrl: "",
      categoryExternalIds: [category?.externalId ?? DEFAULT_CATEGORY.externalId],
    }));

    return { items };
  }

  async getDetail(
    ctx: CrawlerContext,
    item: CrawlToolListItemDTO,
  ): Promise<CrawlToolDetailDTO | null> {
    const slug = item.slug ?? item.externalId;
    const path = this.config.detailPathTemplate.replace("{id}", slug);
    const html = await this.fetchHtml(ctx, path);

    const name =
      this.extractMetaContent(html, "og:title") ?? this.extractTagText(html, "h1") ?? item.name;
    const description =
      this.extractMetaContent(html, "description") ??
      this.extractMetaContent(html, "og:description") ??
      item.summary ??
      "";
    const summary = description;
    const logoUrl =
      this.extractMetaContent(html, "og:image") ??
      this.extractImageByAlt(html, `${name} Logo`) ??
      item.logoUrl ??
      "";
    const website = this.extractVisitSiteUrl(html) ?? item.website ?? item.url ?? "";
    const tags = this.extractCategoriesFromHtml(html);
    const pricingModel = this.extractPricingModel(html);

    return {
      ...item,
      externalId: slug,
      slug,
      name: this.cleanToolName(name),
      url: `${this.config.baseUrl}/tool/${slug}`,
      website,
      summary,
      description,
      logoUrl,
      tags,
      features: [],
      platforms: ["web"],
      pricingModel,
      raw: {
        slug,
        tags,
        pricingModel,
        htmlSnippet: html.slice(0, 4000),
      },
    };
  }

  private async fetchHtml(ctx: CrawlerContext, path: string): Promise<string> {
    const url = path.startsWith("http") ? path : `${this.config.baseUrl}${path}`;
    const request = createCrawlRequest(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AI-Tool-CMS-Crawler/1.0; +https://ai-tool-cms.local/bot)",
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });
    await ctx.rateLimiter.acquire();
    const response = await ctx.fetch(ctx.proxy.apply(request));
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.body;
  }

  private extractCategories(html: string): CrawlCategoryDTO[] {
    const matches = html.matchAll(/href="\/ai-tools\/([^"#?\/]+)"[^>]*>([^<]+)</gi);
    const seen = new Set<string>();
    const categories: CrawlCategoryDTO[] = [];

    for (const match of matches) {
      const slug = (match[1] ?? "").trim();
      const name = this.cleanText(match[2] ?? "");
      if (!slug || !name || seen.has(slug)) {
        continue;
      }
      seen.add(slug);
      categories.push({
        externalId: slug,
        slug,
        name,
        url: `/ai-tools/${slug}`,
      });
    }

    return categories;
  }

  private extractToolSlugs(html: string): string[] {
    const slugs: string[] = [];
    const seen = new Set<string>();

    for (const match of html.matchAll(TOOL_LINK_RE)) {
      const slug = (match[1] ?? "").trim();
      if (!slug || seen.has(slug)) {
        continue;
      }
      seen.add(slug);
      slugs.push(slug);
    }

    return slugs;
  }

  private extractVisitSiteUrl(html: string): string | undefined {
    const direct =
      this.firstCapture(
        html,
        /<a[^>]+href="([^"]+)"[^>]*data-tool-name="[^"]+"[^>]*>\s*<button[^>]*>\s*Visit Site/is,
      ) ?? this.firstCapture(html, /<a[^>]+href="([^"]+)"[^>]*>\s*<button[^>]*>\s*Visit Site/is);

    return direct ? this.decodeHtml(direct) : undefined;
  }

  private extractCategoriesFromHtml(html: string): string[] {
    const section =
      this.firstCapture(html, /AI Categories<\/h2>([\s\S]{0,4000}?)<\/section>/i) ??
      this.firstCapture(html, /AI Categories([\s\S]{0,2000}?)(?:<\/div>|<\/section>)/i) ??
      "";

    const labels = Array.from(section.matchAll(/>([^<>]{2,80})</g))
      .map((match) => this.cleanText(match[1] ?? ""))
      .filter((value) => {
        const lower = value.toLowerCase();
        return (
          value.length > 1 &&
          lower !== "ai categories" &&
          lower !== "pricing model:" &&
          lower !== "pricing model" &&
          lower !== "categories"
        );
      });

    return Array.from(new Set(labels)).slice(0, 10);
  }

  private extractPricingModel(
    html: string,
  ): "FREE" | "FREEMIUM" | "PAID" | "ENTERPRISE" | "CONTACT" | undefined {
    const text = html.toLowerCase();
    if (text.includes("freemium")) return "FREEMIUM";
    if (text.includes("free trial") || text.includes(">free<")) return "FREE";
    if (text.includes("contact for pricing")) return "CONTACT";
    if (text.includes("enterprise")) return "ENTERPRISE";
    if (text.includes("paid")) return "PAID";
    return undefined;
  }

  private extractMetaContent(html: string, property: string): string | undefined {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.cleanMaybe(
      this.firstCapture(
        html,
        new RegExp(`<meta[^>]+(?:property|name)="${escaped}"[^>]+content="([^"]*)"[^>]*>`, "i"),
      ),
    );
  }

  private extractTagText(html: string, tagName: string): string | undefined {
    return this.cleanMaybe(
      this.firstCapture(html, new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")),
    );
  }

  private extractImageByAlt(html: string, altText: string): string | undefined {
    const escaped = altText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.cleanMaybe(
      this.firstCapture(html, new RegExp(`<img[^>]+alt="${escaped}"[^>]+src="([^"]+)"[^>]*>`, "i")),
    );
  }

  private firstCapture(html: string, pattern: RegExp): string | undefined {
    const match = pattern.exec(html);
    return match?.[1];
  }

  private cleanMaybe(value?: string): string | undefined {
    const cleaned = this.cleanText(value ?? "");
    return cleaned.length > 0 ? cleaned : undefined;
  }

  private cleanText(value: string): string {
    return this.decodeHtml(
      value
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
  }

  private cleanToolName(value: string): string {
    return this.cleanText(value)
      .replace(/\s*:\s*use cases,\s*pricing\s*&\s*alternatives$/i, "")
      .replace(/\s*reviews?$/i, "")
      .trim();
  }

  private decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  private humanizeSlug(slug: string): string {
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
