import { BadRequestException, Injectable } from "@nestjs/common";
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
import type {
  SeoGeneralConfigDto,
  SeoProviderConfigDto,
  UpdateSeoIntegrationsDto,
} from "./dto";

type IntegrationProvider = "googleSearchConsole" | "bingWebmaster";

type SeoProviderConfig = {
  enabled: boolean;
  siteUrl: string;
  propertyId: string;
  propertyName: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  apiKey?: string;
  verificationStatus: string;
  connectedAt?: string;
  disconnectedAt?: string;
  disconnectReason?: string;
  lastRefreshedAt?: string;
};

type SeoGeneralConfig = {
  robots: string[];
  sitemapEnabled: boolean;
  canonicalEnabled: boolean;
  openGraphEnabled: boolean;
  twitterEnabled: boolean;
  indexNowEnabled: boolean;
  indexNowKey?: string;
  analyticsProvider: string;
  ga4MeasurementId?: string;
  ga4ApiSecret?: string;
};

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly integrationSettingKeys = {
    googleSearchConsole: "seo.googleSearchConsole",
    bingWebmaster: "seo.bingWebmaster",
    general: "seo.general",
  } as const;

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
    const integrations = await this.getIntegrations();

    return {
      google: integrations.providers.googleSearchConsole.live,
      bing: integrations.providers.bingWebmaster.live,
    };
  }

  async getIntegrations() {
    const [googleConfig, bingConfig, generalConfig] = await Promise.all([
      this.readSetting<SeoProviderConfig>(
        this.integrationSettingKeys.googleSearchConsole,
        this.getDefaultProviderConfig(),
      ),
      this.readSetting<SeoProviderConfig>(
        this.integrationSettingKeys.bingWebmaster,
        this.getDefaultProviderConfig(),
      ),
      this.readSetting<SeoGeneralConfig>(this.integrationSettingKeys.general, this.getDefaultGeneralConfig()),
    ]);

    const [googleLive, bingLive] = await Promise.all([
      this.fetchGoogleSearchConsole(googleConfig),
      this.fetchBingWebmaster(bingConfig),
    ]);

    return {
      providers: {
        googleSearchConsole: {
          config: this.maskProviderConfig(googleConfig),
          live: googleLive,
        },
        bingWebmaster: {
          config: this.maskProviderConfig(bingConfig),
          live: bingLive,
        },
      },
      general: this.maskGeneralConfig(generalConfig),
    };
  }

  async updateIntegrations(dto: UpdateSeoIntegrationsDto, actorId: string) {
    const current = await this.getIntegrations();
    const nextGoogle = this.mergeProviderConfig(
      current.providers.googleSearchConsole.config,
      dto.googleSearchConsole,
    );
    const nextBing = this.mergeProviderConfig(current.providers.bingWebmaster.config, dto.bingWebmaster);
    const nextGeneral = this.mergeGeneralConfig(current.general, dto.general);

    await Promise.all([
      this.upsertSetting(
        this.integrationSettingKeys.googleSearchConsole,
        this.restoreSecrets(nextGoogle, current.providers.googleSearchConsole.config),
        "seo",
        "Google Search Console integration configuration",
        actorId,
      ),
      this.upsertSetting(
        this.integrationSettingKeys.bingWebmaster,
        this.restoreSecrets(nextBing, current.providers.bingWebmaster.config),
        "seo",
        "Bing Webmaster integration configuration",
        actorId,
      ),
      this.upsertSetting(
        this.integrationSettingKeys.general,
        this.restoreGeneralSecrets(nextGeneral, current.general),
        "seo",
        "General SEO integration configuration",
        actorId,
      ),
    ]);

    return this.getIntegrations();
  }

  async disconnectIntegration(provider: string, actorId: string) {
    const normalized = this.assertProvider(provider);
    const config = await this.readSetting<SeoProviderConfig>(
      this.integrationSettingKeys[normalized],
      this.getDefaultProviderConfig(),
    );
    const next: SeoProviderConfig = {
      ...config,
      enabled: false,
      oauthAccessToken: undefined,
      oauthRefreshToken: undefined,
      apiKey: undefined,
      verificationStatus: "disconnected",
      disconnectedAt: new Date().toISOString(),
    };

    await this.upsertSetting(
      this.integrationSettingKeys[normalized],
      next,
      "seo",
      `${normalized} disconnected`,
      actorId,
    );

    return this.getIntegrations();
  }

  async refreshIntegration(provider: string, actorId: string) {
    const normalized = this.assertProvider(provider);
    const config = await this.readSetting<SeoProviderConfig>(
      this.integrationSettingKeys[normalized],
      this.getDefaultProviderConfig(),
    );
    const next: SeoProviderConfig = {
      ...config,
      lastRefreshedAt: new Date().toISOString(),
      verificationStatus:
        config.enabled && (config.oauthAccessToken || config.apiKey || config.siteUrl)
          ? "verified"
          : config.verificationStatus || "pending",
    };

    await this.upsertSetting(
      this.integrationSettingKeys[normalized],
      next,
      "seo",
      `${normalized} refreshed`,
      actorId,
    );

    return this.getIntegrations();
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
        url: `/${locale}/categories`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `/${locale}/search`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      },
      {
        url: `/${locale}/blog`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.68,
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

  private async fetchGoogleSearchConsole(config: SeoProviderConfig) {
    if (!config.enabled) {
      return {
        provider: "google",
        configured: false,
        verificationStatus: config.verificationStatus || "disconnected",
        propertyId: config.propertyId || null,
        propertyName: config.propertyName || null,
        siteUrl: config.siteUrl || null,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        averagePosition: 0,
        indexedPages: 0,
        coverage: 0,
        sitemaps: 0,
        lastSyncedAt: config.lastRefreshedAt ?? null,
      };
    }

    return {
      provider: "google",
      configured: true,
      verificationStatus: config.verificationStatus || "verified",
      propertyId: config.propertyId || null,
      propertyName: config.propertyName || null,
      siteUrl: config.siteUrl || null,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      averagePosition: 0,
      indexedPages: 0,
      coverage: 0,
      sitemaps: 0,
      lastSyncedAt: config.lastRefreshedAt ?? config.connectedAt ?? new Date().toISOString(),
      note: config.oauthAccessToken
        ? "OAuth credentials saved. Connect the Google Search Console data source to replace placeholder metrics."
        : "Save OAuth tokens and property metadata to enable live Google Search Console sync.",
    };
  }

  private async fetchBingWebmaster(config: SeoProviderConfig) {
    if (!config.enabled) {
      return {
        provider: "bing",
        configured: false,
        verificationStatus: config.verificationStatus || "disconnected",
        siteUrl: config.siteUrl || null,
        clicks: 0,
        impressions: 0,
        keywords: 0,
        indexStatus: 0,
        crawlErrors: 0,
        lastSyncedAt: config.lastRefreshedAt ?? null,
      };
    }

    return {
      provider: "bing",
      configured: true,
      verificationStatus: config.verificationStatus || "verified",
      siteUrl: config.siteUrl || null,
      clicks: 0,
      impressions: 0,
      keywords: 0,
      indexStatus: 0,
      crawlErrors: 0,
      lastSyncedAt: config.lastRefreshedAt ?? config.connectedAt ?? new Date().toISOString(),
      note: config.apiKey
        ? "API key saved. Connect the Bing Webmaster source to replace placeholder metrics."
        : "Save the Bing Webmaster API key to enable live Bing sync.",
    };
  }

  private getDefaultProviderConfig(): SeoProviderConfig {
    return {
      enabled: false,
      siteUrl: "",
      propertyId: "",
      propertyName: "",
      verificationStatus: "not_connected",
    };
  }

  private getDefaultGeneralConfig(): SeoGeneralConfig {
    return {
      robots: ["User-agent: *", "Allow: /", "Sitemap: /sitemap.xml"],
      sitemapEnabled: true,
      canonicalEnabled: true,
      openGraphEnabled: true,
      twitterEnabled: true,
      indexNowEnabled: false,
      analyticsProvider: "ga4",
    };
  }

  private maskProviderConfig(config: SeoProviderConfig) {
    return {
      ...config,
      oauthAccessToken: this.maskSecret(config.oauthAccessToken),
      oauthRefreshToken: this.maskSecret(config.oauthRefreshToken),
      apiKey: this.maskSecret(config.apiKey),
    };
  }

  private maskGeneralConfig(config: SeoGeneralConfig) {
    return {
      ...config,
      indexNowKey: this.maskSecret(config.indexNowKey),
      ga4ApiSecret: this.maskSecret(config.ga4ApiSecret),
    };
  }

  private maskSecret(value?: string) {
    if (!value) return "";
    if (value.length <= 8) return "********";
    return `${value.slice(0, 4)}********${value.slice(-4)}`;
  }

  private restoreSecrets(next: SeoProviderConfig, current: SeoProviderConfig): SeoProviderConfig {
    return {
      ...next,
      oauthAccessToken: this.unmaskSecret(next.oauthAccessToken, current.oauthAccessToken),
      oauthRefreshToken: this.unmaskSecret(next.oauthRefreshToken, current.oauthRefreshToken),
      apiKey: this.unmaskSecret(next.apiKey, current.apiKey),
    };
  }

  private restoreGeneralSecrets(next: SeoGeneralConfig, current: SeoGeneralConfig): SeoGeneralConfig {
    return {
      ...next,
      indexNowKey: this.unmaskSecret(next.indexNowKey, current.indexNowKey),
      ga4ApiSecret: this.unmaskSecret(next.ga4ApiSecret, current.ga4ApiSecret),
    };
  }

  private unmaskSecret(next?: string, current?: string) {
    if (!next) return undefined;
    if (next.includes("********")) {
      return current;
    }
    return next;
  }

  private mergeProviderConfig(
    current: ReturnType<SeoService["maskProviderConfig"]>,
    patch?: SeoProviderConfigDto,
  ): SeoProviderConfig {
    if (!patch) {
      return current as SeoProviderConfig;
    }

    return {
      enabled: patch.enabled ?? current.enabled ?? false,
      siteUrl: patch.siteUrl ?? current.siteUrl ?? "",
      propertyId: patch.propertyId ?? current.propertyId ?? "",
      propertyName: patch.propertyName ?? current.propertyName ?? "",
      oauthAccessToken: patch.oauthAccessToken ?? current.oauthAccessToken ?? "",
      oauthRefreshToken: patch.oauthRefreshToken ?? current.oauthRefreshToken ?? "",
      apiKey: patch.apiKey ?? current.apiKey ?? "",
      verificationStatus: patch.verificationStatus ?? current.verificationStatus ?? "pending",
      connectedAt: current.connectedAt ?? new Date().toISOString(),
      disconnectedAt: current.disconnectedAt,
      disconnectReason: patch.disconnectReason ?? current.disconnectReason,
      lastRefreshedAt: current.lastRefreshedAt,
    };
  }

  private mergeGeneralConfig(
    current: ReturnType<SeoService["maskGeneralConfig"]>,
    patch?: SeoGeneralConfigDto,
  ): SeoGeneralConfig {
    if (!patch) {
      return current as SeoGeneralConfig;
    }

    return {
      robots: patch.robots ?? current.robots ?? [],
      sitemapEnabled: patch.sitemapEnabled ?? current.sitemapEnabled ?? true,
      canonicalEnabled: patch.canonicalEnabled ?? current.canonicalEnabled ?? true,
      openGraphEnabled: patch.openGraphEnabled ?? current.openGraphEnabled ?? true,
      twitterEnabled: patch.twitterEnabled ?? current.twitterEnabled ?? true,
      indexNowEnabled: patch.indexNowEnabled ?? current.indexNowEnabled ?? false,
      indexNowKey: patch.indexNowKey ?? current.indexNowKey ?? "",
      analyticsProvider: patch.analyticsProvider ?? current.analyticsProvider ?? "ga4",
      ga4MeasurementId: patch.ga4MeasurementId ?? current.ga4MeasurementId ?? "",
      ga4ApiSecret: patch.ga4ApiSecret ?? current.ga4ApiSecret ?? "",
    };
  }

  private assertProvider(provider: string): IntegrationProvider {
    if (provider === "google" || provider === "google-search-console") {
      return "googleSearchConsole";
    }

    if (provider === "bing" || provider === "bing-webmaster") {
      return "bingWebmaster";
    }

    throw new BadRequestException(`Unsupported SEO provider: ${provider}`);
  }

  private async readSetting<T>(key: string, fallback: T): Promise<T> {
    const setting = await this.prisma.client.setting.findFirst({
      where: { key, ...activeOnly },
      select: { value: true },
    });

    if (!setting) {
      return fallback;
    }

    return { ...fallback, ...(setting.value as Record<string, unknown>) } as T;
  }

  private async upsertSetting(
    key: string,
    value: object,
    group: string,
    description: string,
    actorId: string,
  ) {
    return this.prisma.client.setting.upsert({
      where: { key },
      update: {
        value,
        group,
        description,
        isPublic: false,
        updatedById: actorId,
        deletedAt: null,
      },
      create: {
        key,
        value,
        group,
        description,
        isPublic: false,
        createdById: actorId,
        updatedById: actorId,
      },
    });
  }
}
