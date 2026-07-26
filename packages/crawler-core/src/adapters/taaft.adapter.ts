import type { CrawlerContext } from "../context";
import { StructuredSiteAdapter } from "../StructuredSiteAdapter";
import type { CrawlCategoryDTO, CrawlToolListItemDTO, CrawlToolDetailDTO } from "../ToolDTO";
import type { CrawlCursor } from "../types";
import { createCrawlRequest } from "../Request";

/**
 * TAAFT 适配器 — 针对 https://theresanaiforthat.com/ 的生产级采集器。
 *
 * 网站特征：
 * - SSR 架构，列表页 /tools/ 返回完整 HTML
 * - 提供 AJAX 接口 /api/mini-tools-more/ 用于加载更多（返回 HTML 片段）
 * - 详情页路径 /ai/{slug}/
 * - 受 Cloudflare 保护，需使用浏览器 UA
 *
 * 采集策略：
 * - 列表：调用 /api/mini-tools-more/ 获取 HTML 片段，正则提取工具卡片
 * - 详情：抓取 /ai/{slug}/ HTML 页面，提取完整信息
 * - 分页：cursor-based，start/cursor/limit 参数
 */
export class TaaftAdapter extends StructuredSiteAdapter {
  readonly sourceId = "taaft";
  readonly displayName = "There's An AI For That";

  readonly config = {
    baseUrl: "https://theresanaiforthat.com",
    categoriesPath: "/api/categories/",
    toolsPath: "/api/mini-tools-more/",
    detailPathTemplate: "/ai/{id}/",
    listKey: "results",
    mapping: {
      id: ["id", "uuid", "slug"],
      name: ["name", "title"],
      slug: ["slug"],
      website: ["website", "external_url", "url"],
      description: ["description", "long_description"],
      summary: ["short_description", "summary", "tagline"],
      logo: ["logo", "image_url", "logo_url"],
      tags: ["tags"],
      categories: ["categories"],
    },
  };

  // 限流配置：TAAFT 对频率敏感，保守设置
  rateLimit = {
    minDelayMs: 2_000,
    maxRequestsPerMinute: 20,
  };

  async getCategories(ctx: CrawlerContext): Promise<CrawlCategoryDTO[]> {
    void ctx; // 签名要求保留参数，TAAFT 无需上下文
    // TAAFT 没有公开的分类 API，使用预设分类
    return [
      { externalId: "all", name: "All Tools", slug: "all" },
      { externalId: "trending", name: "Trending", slug: "trending" },
      { externalId: "new", name: "New", slug: "new" },
    ];
  }

  /**
   * 获取工具列表 — 调用 /api/mini-tools-more/ 接口
   * 该接口返回 HTML 片段（由 row_markup 参数控制渲染模板）
   */
  async getTools(
    ctx: CrawlerContext,
    _category?: CrawlCategoryDTO,
    cursor?: CrawlCursor,
  ): Promise<{ items: CrawlToolListItemDTO[]; cursor?: CrawlCursor }> {
    const start = cursor?.offset ?? 0;
    const cursorVal = cursor?.page ?? 0;
    const limit = 50;
    const path = `${this.config.toolsPath}?start=${start}&cursor=${cursorVal}&limit=${limit}&sort=released&order=desc&row_markup=price-comments-popover-v2`;

    try {
      const html = await this.fetchHtml(ctx, path);
      const items = this.parseToolCards(html);

      // 是否还有更多：通过返回的卡片数量判断
      const hasMore = items.length >= limit;
      return {
        items,
        cursor: hasMore ? { offset: start + items.length, page: cursorVal + 1 } : undefined,
      };
    } catch {
      return { items: [] };
    }
  }

  /**
   * 获取工具详情 — 抓取 /ai/{slug}/ HTML 页面
   */
  async getDetail(
    ctx: CrawlerContext,
    item: CrawlToolListItemDTO,
  ): Promise<CrawlToolDetailDTO | null> {
    if (!item.slug) {
      return { ...item, description: item.summary, raw: {} };
    }

    const path = this.config.detailPathTemplate!.replace("{id}", item.slug);
    try {
      const html = await this.fetchHtml(ctx, path);
      return this.parseDetailPage(html, item);
    } catch {
      return { ...item, description: item.summary, raw: {} };
    }
  }

  /**
   * 获取 HTML 内容（复用 StructuredSiteAdapter 的 fetchJson 模式，但返回文本）
   */
  protected async fetchHtml(ctx: CrawlerContext, path: string): Promise<string> {
    const url = path.startsWith("http") ? path : `${this.config.baseUrl}${path}`;
    const request = createCrawlRequest(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    });
    await ctx.rateLimiter.acquire();
    const response = await ctx.fetch(ctx.proxy.apply(request));
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.body;
  }

  /**
   * 解析工具列表 HTML 片段，提取工具卡片信息
   * TAAFT 的卡片结构：<a href="/ai/{slug}/">...<img>...<h3>name</h3>...<p>desc</p>...</a>
   */
  private parseToolCards(html: string): CrawlToolListItemDTO[] {
    const items: CrawlToolListItemDTO[] = [];

    // 匹配工具链接：/ai/{slug}/
    const linkRegex = /href="\/ai\/([^\/"?\s]+)\/?"/g;
    const seenSlugs = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const slug = match[1];
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      // 提取该工具卡片上下文（链接前后 2000 字符）
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(html.length, match.index + 2000);
      const context = html.slice(contextStart, contextEnd);

      const name = this.extractName(context, slug);
      const summary = this.extractSummary(context);
      const logoUrl = this.extractLogo(context);

      items.push({
        externalId: slug,
        name,
        slug,
        url: `${this.config.baseUrl}/ai/${slug}/`,
        summary,
        logoUrl,
      });
    }

    return items;
  }

  /**
   * 从上下文提取工具名称
   */
  private extractName(context: string, fallback: string): string {
    // 尝试匹配 <h3>name</h3>
    const h3Match = context.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    if (h3Match) return this.decodeEntities(h3Match[1].trim());

    // 尝试匹配 alt="name"
    const altMatch = context.match(/alt="([^"]+)"/);
    if (altMatch) return this.decodeEntities(altMatch[1].trim());

    // 回退到 slug 首字母大写
    return fallback
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  /**
   * 从上下文提取工具描述
   */
  private extractSummary(context: string): string | undefined {
    // 匹配 <p>description</p>
    const pMatch = context.match(/<p[^>]*>([^<]+)<\/p>/i);
    if (pMatch) {
      const text = this.decodeEntities(pMatch[1].trim());
      if (text.length > 10) return text;
    }
    return undefined;
  }

  /**
   * 从上下文提取 logo URL
   */
  private extractLogo(context: string): string | undefined {
    // 匹配 <img src="..."> （排除 1x1 占位图）
    const imgMatch = context.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    if (imgMatch) {
      const src = imgMatch[1];
      if (src && !src.includes("1x1") && !src.includes("placeholder")) {
        return src.startsWith("http") ? src : `${this.config.baseUrl}${src}`;
      }
    }
    return undefined;
  }

  /**
   * 解析详情页 HTML，提取完整工具信息
   */
  private parseDetailPage(html: string, item: CrawlToolListItemDTO): CrawlToolDetailDTO {
    // 提取描述（meta description 或页面正文）
    const metaDescMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);

    // 提取外部网站链接
    const websiteMatch = html.match(
      /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*class="[^"]*(?:visit|external|website)[^"]*"[^>]*>/i,
    );

    // 提取分类标签
    const categories = this.extractTags(html, /href="\/category\/([^\/"?\s]+)\/?"/g);

    // 提取普通标签
    const tags = this.extractTags(html, /href="\/tag\/([^\/"?\s]+)\/?"/g);

    const description =
      this.decodeEntities(metaDescMatch?.[1] ?? ogDescMatch?.[1] ?? "") || item.summary || "";

    return {
      ...item,
      website: websiteMatch?.[1] ?? item.website ?? "",
      description,
      tags,
      features: [], // TAAFT 详情页无明确 features 字段
      platforms: ["web"],
      raw: {
        slug: item.slug,
        categories,
        tags,
        sourceUrl: item.url,
      },
    };
  }

  /**
   * 批量提取标签（从 HTML 中的分类/标签链接）
   */
  private extractTags(html: string, regex: RegExp): string[] {
    const tags = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const tag = this.decodeEntities(match[1].replace(/-/g, " ").trim());
      if (tag) tags.add(tag);
    }
    return [...tags];
  }

  /**
   * HTML 实体解码（基础版，不引入额外依赖）
   */
  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
      .trim();
  }
}
