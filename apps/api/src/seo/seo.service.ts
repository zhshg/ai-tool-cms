import { Injectable } from "@nestjs/common";
import {
  buildAtomFeed,
  buildJsonFeed,
  buildPublicApiFeed,
  buildRssFeed,
  buildSitemapIndexXml,
  chunkToXml,
  scoreSeoHealth,
  pingSearchEngines,
  syncComparePages as syncComparePagesDb,
  syncInternalLinks as syncInternalLinksDb,
  SITEMAP_CHUNK_IDS,
  type FeedItem,
  type SitemapChunkId,
  type SitemapEntry,
  getSiteConfig,
} from "@ai-tool-cms/seo";
import { isSupportedLocale } from "@ai-tool-cms/i18n";
import { PromptStatus, ToolStatus } from "@ai-tool-cms/database";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly collectionPaths = [
    "best-ai-tools",
    "free-ai-tools",
    "new-ai-tools",
    "trending-ai-tools",
  ] as const;

  async getSitemapIndexXml(): Promise<string> {
    const config = getSiteConfig();
    const localeChunks = config.locales.map((locale) => ({
      loc: `${config.siteUrl}/sitemaps/${locale}.xml`,
      lastmod: new Date(),
    }));
    const contentChunks = SITEMAP_CHUNK_IDS.map((id: SitemapChunkId) => ({
      loc: `${config.siteUrl}/sitemaps/${id}.xml`,
      lastmod: new Date(),
    }));
    return buildSitemapIndexXml([...localeChunks, ...contentChunks]);
  }

  async getSitemapChunkXml(chunkId: string): Promise<string> {
    const normalized = chunkId.replace(/\.xml$/, "");
    if (isSupportedLocale(normalized)) {
      const entries = await this.loadLocaleSitemapEntries(normalized);
      return chunkToXml({ id: normalized as SitemapChunkId, entries, lastModified: new Date() });
    }
    return chunkToXml({
      id: normalized as SitemapChunkId,
      entries: await this.loadSitemapEntries(normalized as SitemapChunkId),
      lastModified: new Date(),
    });
  }

  async pingSitemaps(): Promise<unknown> {
    const config = getSiteConfig();
    const sitemapIndexUrl = `${config.siteUrl}/sitemap.xml`;
    return pingSearchEngines(sitemapIndexUrl);
  }

  async getFeeds(format: "rss" | "atom" | "json" | "api") {
    const tools = await this.prisma.client.tool.findMany({
      where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    const config = getSiteConfig();
    const items: FeedItem[] = tools.map((tool) => ({
      id: tool.id,
      title: tool.name,
      link: `${config.siteUrl}/en/tools/${tool.slug}`,
      description: tool.summary ?? undefined,
      publishedAt: tool.publishedAt ?? tool.updatedAt,
      updatedAt: tool.updatedAt,
    }));

    switch (format) {
      case "atom":
        return { contentType: "application/atom+xml", body: buildAtomFeed(items) };
      case "json":
        return { contentType: "application/feed+json", body: buildJsonFeed(items) };
      case "api":
        return { contentType: "application/json", body: buildPublicApiFeed(items) };
      case "rss":
      default:
        return { contentType: "application/rss+xml", body: buildRssFeed(items) };
    }
  }

  async syncComparePages(): Promise<{ created: number; updated: number }> {
    return syncComparePagesDb(this.prisma.client);
  }

  async syncInternalLinks(toolId?: string): Promise<{ tools: number; links: number }> {
    return syncInternalLinksDb(this.prisma.client, toolId);
  }

  async getDashboard() {
    const [tools, categories, tags, comparePages, snapshots] = await Promise.all([
      this.prisma.client.tool.findMany({
        where: activeOnly,
        select: {
          id: true,
          slug: true,
          metaTitle: true,
          metaDescription: true,
          summary: true,
          longDescription: true,
          status: true,
          metadata: true,
        },
      }),
      this.prisma.client.category.count({ where: activeOnly }),
      this.prisma.client.tag.count({ where: activeOnly }),
      this.prisma.client.seoComparePage.count({
        where: { ...activeOnly, status: ToolStatus.PUBLISHED },
      }),
      this.prisma.client.seoHealthSnapshot.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    const pages = tools.map((tool) => {
      const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
      const pipeline = (metadata.aiPipeline ?? {}) as Record<string, unknown>;
      const quality = pipeline.quality as { overall?: number } | undefined;
      const wordCount = `${tool.summary ?? ""} ${tool.longDescription ?? ""}`
        .split(/\s+/)
        .filter(Boolean).length;
      return {
        id: tool.id,
        path: `/en/tools/${tool.slug}`,
        title: tool.metaTitle ?? tool.slug,
        metaDescription: tool.metaDescription,
        hasSchema: Boolean(metadata.geo) || Boolean(tool.metaTitle),
        wordCount,
        statusCode: tool.status === ToolStatus.PUBLISHED ? 200 : 404,
        aiQualityScore: quality?.overall ?? null,
      };
    });

    const report = scoreSeoHealth({
      pages,
      indexStats: {
        indexed: tools.filter((t) => t.status === ToolStatus.PUBLISHED).length,
        pending: tools.filter((t) => t.status === ToolStatus.DRAFT).length,
        excluded: tools.filter((t) => t.status === ToolStatus.ARCHIVED).length,
      },
    });

    await this.prisma.client.seoHealthSnapshot.create({
      data: { score: report.score, payload: report as unknown as object },
    });

    return {
      report,
      counts: { tools: tools.length, categories, tags, comparePages },
      lastSnapshot: snapshots,
      sitemapChunks: SITEMAP_CHUNK_IDS,
    };
  }

  async getSearchConsole() {
    const googleConfigured = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS);
    const bingConfigured = Boolean(process.env.BING_WEBMASTER_API_KEY);

    return {
      google: googleConfigured
        ? await this.fetchGoogleSearchConsole()
        : {
            provider: "google",
            configured: false,
            message: "Set GOOGLE_SEARCH_CONSOLE_CREDENTIALS",
          },
      bing: bingConfigured
        ? await this.fetchBingWebmaster()
        : { provider: "bing", configured: false, message: "Set BING_WEBMASTER_API_KEY" },
    };
  }

  private async loadLocaleSitemapEntries(locale: string): Promise<SitemapEntry[]> {
    const tools = await this.prisma.client.tool.findMany({
      where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      select: { slug: true, updatedAt: true },
    });
    const categories = await this.prisma.client.category.findMany({
      where: activeOnly,
      select: { slug: true, updatedAt: true },
    });

    const entries: SitemapEntry[] = [
      { url: `/${locale}`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
      {
        url: `/${locale}/tools`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.85,
      },
      {
        url: `/${locale}/search`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      },
      ...this.collectionPaths.map((path) => ({
        url: `/${locale}/${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.72,
      })),
      ...tools.map((t) => ({
        url: `/${locale}/tools/${t.slug}`,
        lastModified: t.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...categories.map((c) => ({
        url: `/${locale}/category/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
    return entries;
  }

  private async loadSitemapEntries(chunkId: SitemapChunkId): Promise<SitemapEntry[]> {
    const config = getSiteConfig();
    const locales = config.locales.length ? config.locales : ["en"];

    switch (chunkId) {
      case "tool": {
        const tools = await this.prisma.client.tool.findMany({
          where: { status: ToolStatus.PUBLISHED, ...activeOnly },
          select: { slug: true, updatedAt: true },
        });
        return tools.flatMap((t) =>
          locales.map((locale) => ({
            url: `/${locale}/tools/${t.slug}`,
            lastModified: t.updatedAt,
            changeFrequency: "weekly" as const,
            priority: 0.8,
          })),
        );
      }
      case "category": {
        const categories = await this.prisma.client.category.findMany({
          where: activeOnly,
          select: { slug: true, updatedAt: true },
        });
        return categories.flatMap((c) =>
          locales.map((locale) => ({
            url: `/${locale}/category/${c.slug}`,
            lastModified: c.updatedAt,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          })),
        );
      }
      case "tag": {
        const tags = await this.prisma.client.tag.findMany({
          where: activeOnly,
          select: { slug: true, updatedAt: true },
        });
        return tags.flatMap((t) =>
          locales.map((locale) => ({
            url: `/${locale}/tag/${t.slug}`,
            lastModified: t.updatedAt,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          })),
        );
      }
      case "compare": {
        const pages = await this.prisma.client.seoComparePage.findMany({
          where: { status: ToolStatus.PUBLISHED, ...activeOnly },
          select: { slug: true, updatedAt: true },
        });
        return pages.flatMap((p) =>
          locales.map((locale) => ({
            url: `/${locale}/compare/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: "weekly" as const,
            priority: 0.65,
          })),
        );
      }
      case "prompt": {
        const prompts = await this.prisma.client.prompt.findMany({
          where: { status: PromptStatus.PUBLISHED, ...activeOnly },
          select: { slug: true, updatedAt: true },
          take: 500,
        });
        return prompts.flatMap((p) =>
          locales.map((locale) => ({
            url: `/${locale}/prompts/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: "monthly" as const,
            priority: 0.5,
          })),
        );
      }
      case "rss":
        return [
          {
            url: "/feed/tools.xml",
            lastModified: new Date(),
            changeFrequency: "hourly",
            priority: 0.4,
          },
        ];
      default:
        return [{ url: "/", lastModified: new Date() }];
    }
  }

  private async fetchGoogleSearchConsole() {
    return {
      provider: "google",
      configured: true,
      indexedPages: 0,
      clicks: 0,
      impressions: 0,
      averagePosition: 0,
      errors: 0,
      sitemapStatus: "unknown",
      lastSyncedAt: new Date().toISOString(),
      note: "Wire Google Search Console API client with service account credentials",
    };
  }

  private async fetchBingWebmaster() {
    return {
      provider: "bing",
      configured: true,
      indexedPages: 0,
      clicks: 0,
      impressions: 0,
      averagePosition: 0,
      errors: 0,
      sitemapStatus: "unknown",
      lastSyncedAt: new Date().toISOString(),
      note: "Wire Bing Webmaster API with BING_WEBMASTER_API_KEY",
    };
  }
}
