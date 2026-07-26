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
import { STANDARD_AI_CATEGORIES } from "@ai-tool-cms/common";
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

type SeoProviderStatus = {
  siteUrl: string | null;
  propertyId: string | null;
  propertyName: string | null;
  verificationStatus: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  connected: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  disconnectReason: string | null;
  oauthConfigured: boolean;
  authUrl: string | null;
};

type GoogleOAuthCallbackParams = {
  code?: string;
  error?: string;
};

type GoogleOAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
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
    "top-ai-tools",
    "best-ai-tools",
    "best-ai-writing-tools",
    "best-ai-image-generators",
    "best-ai-video-generators",
    "best-ai-coding-tools",
    "best-ai-seo-tools",
    "free-ai-tools",
    "new-ai-tools",
    "trending-ai-tools",
    "ai-tools-for-productivity",
  ] as const;

  private readonly seoGrowthPaths = [
    "ai/industry",
    "ai/job",
    "ai/category",
    "ai/country",
    "ai/language",
  ] as const;
  private readonly standardCategorySlugs = STANDARD_AI_CATEGORIES.map((category) => category.slug);

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
          status: this.buildProviderStatus("googleSearchConsole", googleConfig),
        },
        bingWebmaster: {
          config: this.maskProviderConfig(bingConfig),
          live: bingLive,
          status: this.buildProviderStatus("bingWebmaster", bingConfig),
        },
      },
      general: this.maskGeneralConfig(generalConfig),
    };
  }

  async updateIntegrations(dto: UpdateSeoIntegrationsDto, actorId: string) {
    const [googleCurrent, bingCurrent, generalCurrent] = await Promise.all([
      this.readSetting<SeoProviderConfig>(
        this.integrationSettingKeys.googleSearchConsole,
        this.getDefaultProviderConfig(),
      ),
      this.readSetting<SeoProviderConfig>(
        this.integrationSettingKeys.bingWebmaster,
        this.getDefaultProviderConfig(),
      ),
      this.readSetting<SeoGeneralConfig>(
        this.integrationSettingKeys.general,
        this.getDefaultGeneralConfig(),
      ),
    ]);
    const current = {
      providers: {
        googleSearchConsole: { config: this.maskProviderConfig(googleCurrent) },
        bingWebmaster: { config: this.maskProviderConfig(bingCurrent) },
      },
      general: this.maskGeneralConfig(generalCurrent),
    };
    const nextGoogle = this.mergeProviderConfig(
      current.providers.googleSearchConsole.config,
      dto.googleSearchConsole,
    );
    const nextBing = this.mergeProviderConfig(current.providers.bingWebmaster.config, dto.bingWebmaster);
    const nextGeneral = this.mergeGeneralConfig(current.general, dto.general);

    await Promise.all([
        this.upsertSetting(
          this.integrationSettingKeys.googleSearchConsole,
          this.restoreSecrets(nextGoogle, googleCurrent),
          "seo",
          "Google Search Console integration configuration",
          actorId,
        ),
        this.upsertSetting(
          this.integrationSettingKeys.bingWebmaster,
          this.restoreSecrets(nextBing, bingCurrent),
          "seo",
          "Bing Webmaster integration configuration",
          actorId,
        ),
        this.upsertSetting(
          this.integrationSettingKeys.general,
          this.restoreGeneralSecrets(nextGeneral, generalCurrent),
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
      connectedAt: undefined,
      disconnectedAt: new Date().toISOString(),
      lastRefreshedAt: new Date().toISOString(),
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
    const hasAccessToken = Boolean(config.oauthAccessToken?.trim());
    const hasRefreshToken = Boolean(config.oauthRefreshToken?.trim());
    const hasApiKey = Boolean(config.apiKey?.trim());
    const connected =
      normalized === "googleSearchConsole"
        ? hasRefreshToken && this.isConnectedVerificationStatus(config.verificationStatus)
        : hasApiKey && this.isConnectedVerificationStatus(config.verificationStatus);
    const next: SeoProviderConfig = {
      ...config,
      lastRefreshedAt: new Date().toISOString(),
      enabled: connected,
      verificationStatus: connected
        ? config.verificationStatus || "connected"
        : hasAccessToken || hasRefreshToken || hasApiKey || Boolean(config.siteUrl?.trim())
          ? "disconnected"
          : "not_connected",
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

  getIntegrationConnectUrl(provider: string) {
    const normalized = this.assertProvider(provider);
    if (normalized !== "googleSearchConsole") {
      return {
        provider: normalized,
        authUrl: null,
        oauthConfigured: false,
        reason: "OAuth connect URL is only supported for Google Search Console.",
      };
    }

    const { clientId, redirectUri, oauthConfigured } = this.getGoogleOAuthConfig();

    if (!oauthConfigured) {
      return {
        provider: normalized,
        authUrl: null,
        oauthConfigured: false,
        reason:
          "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_SEARCH_CONSOLE_REDIRECT_URI.",
      };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      include_granted_scopes: "true",
    });

    return {
      provider: normalized,
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      oauthConfigured: true,
      redirectUri,
      hasClientId: true,
      hasClientSecret: true,
    };
  }

  async handleGoogleSearchConsoleCallback({ code, error }: GoogleOAuthCallbackParams) {
    if (error) {
      return {
        statusCode: 400,
        html: this.renderOAuthResultPage({
          title: "Google Search Console connect failed",
          message: `Google returned an OAuth error: ${error}.`,
          success: false,
        }),
      };
    }

    if (!code?.trim()) {
      return {
        statusCode: 400,
        html: this.renderOAuthResultPage({
          title: "Google Search Console connect failed",
          message: "Missing OAuth code from Google callback.",
          success: false,
        }),
      };
    }

    const { clientId, clientSecret, redirectUri, oauthConfigured } = this.getGoogleOAuthConfig();
    if (!oauthConfigured) {
      return {
        statusCode: 500,
        html: this.renderOAuthResultPage({
          title: "Google Search Console connect failed",
          message:
            "Server OAuth environment is incomplete. Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_SEARCH_CONSOLE_REDIRECT_URI.",
          success: false,
        }),
      };
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenPayload = (await tokenResponse.json()) as GoogleOAuthTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      const reason =
        tokenPayload.error_description?.trim() ||
        tokenPayload.error?.trim() ||
        "Token exchange failed.";
      return {
        statusCode: 502,
        html: this.renderOAuthResultPage({
          title: "Google Search Console connect failed",
          message: `Google token exchange failed: ${reason}`,
          success: false,
        }),
      };
    }

    const current = await this.readSetting<SeoProviderConfig>(
      this.integrationSettingKeys.googleSearchConsole,
      this.getDefaultProviderConfig(),
    );

    const next: SeoProviderConfig = {
      ...current,
      enabled: true,
      oauthAccessToken: tokenPayload.access_token,
      oauthRefreshToken: tokenPayload.refresh_token?.trim() || current.oauthRefreshToken,
      verificationStatus: "connected",
      connectedAt: current.connectedAt ?? new Date().toISOString(),
      disconnectedAt: undefined,
      disconnectReason: undefined,
      lastRefreshedAt: new Date().toISOString(),
    };

    await this.upsertSetting(
      this.integrationSettingKeys.googleSearchConsole,
      next,
      "seo",
      "Google Search Console integration configuration",
      null,
    );

    return {
      statusCode: 200,
      html: this.renderOAuthResultPage({
        title: "Google Search Console connected",
        message:
          "Google Search Console OAuth completed successfully. You can return to the admin SEO page and refresh the integration card.",
        success: true,
      }),
    };
  }

  private async loadLocaleSitemapEntries(locale: string): Promise<SitemapEntry[]> {
    const tools = await this.prisma.client.tool.findMany({
      where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      select: { slug: true, updatedAt: true },
    });
    const categories = await this.prisma.client.category.findMany({
      where: {
        ...activeOnly,
        slug: { in: this.standardCategorySlugs },
        tools: {
          some: {
            deletedAt: null,
            tool: { status: ToolStatus.PUBLISHED, deletedAt: null },
          },
        },
      },
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
      ...this.seoGrowthPaths.map((path) => ({
        url: `/${locale}/${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
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
          where: {
            ...activeOnly,
            slug: { in: this.standardCategorySlugs },
            tools: {
              some: {
                deletedAt: null,
                tool: { status: ToolStatus.PUBLISHED, deletedAt: null },
              },
            },
          },
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
    const status = this.buildProviderStatus("googleSearchConsole", config);
    if (!status.connected) {
      return {
        provider: "google",
        configured: false,
        verificationStatus: status.verificationStatus,
        propertyId: status.propertyId,
        propertyName: status.propertyName,
        siteUrl: status.siteUrl,
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
      verificationStatus: status.verificationStatus,
      propertyId: status.propertyId,
      propertyName: status.propertyName,
      siteUrl: status.siteUrl,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      averagePosition: 0,
      indexedPages: 0,
      coverage: 0,
      sitemaps: 0,
      lastSyncedAt: config.lastRefreshedAt ?? config.connectedAt ?? new Date().toISOString(),
      note: status.hasAccessToken
        ? "OAuth credentials saved. Connect the Google Search Console data source to replace placeholder metrics."
        : "Save OAuth tokens and property metadata to enable live Google Search Console sync.",
    };
  }

  private async fetchBingWebmaster(config: SeoProviderConfig) {
    const status = this.buildProviderStatus("bingWebmaster", config);
    if (!status.connected) {
      return {
        provider: "bing",
        configured: false,
        verificationStatus: status.verificationStatus,
        siteUrl: status.siteUrl,
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
      verificationStatus: status.verificationStatus,
      siteUrl: status.siteUrl,
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

  private buildProviderStatus(provider: IntegrationProvider, config: SeoProviderConfig): SeoProviderStatus {
    const hasAccessToken = Boolean(config.oauthAccessToken?.trim());
    const hasRefreshToken = Boolean(config.oauthRefreshToken?.trim());
    const hasApiKey = Boolean(config.apiKey?.trim());
    const verificationStatus = (config.verificationStatus || "not_connected").trim();
    const connected =
      provider === "googleSearchConsole"
        ? hasRefreshToken && this.isConnectedVerificationStatus(verificationStatus)
        : hasApiKey && this.isConnectedVerificationStatus(verificationStatus);
    const connectInfo =
      provider === "googleSearchConsole"
        ? this.getIntegrationConnectUrl("google")
        : { oauthConfigured: false, authUrl: null };

    return {
      siteUrl: config.siteUrl?.trim() || null,
      propertyId: config.propertyId?.trim() || null,
      propertyName: config.propertyName?.trim() || null,
      verificationStatus: connected
        ? verificationStatus || "connected"
        : verificationStatus || "not_connected",
      hasAccessToken,
      hasRefreshToken,
      connected,
      connectedAt: connected ? config.connectedAt ?? null : null,
      disconnectedAt: config.disconnectedAt ?? null,
      disconnectReason: config.disconnectReason ?? null,
      oauthConfigured: Boolean(connectInfo.oauthConfigured),
      authUrl: connectInfo.authUrl ?? null,
    };
  }

  private isConnectedVerificationStatus(status?: string | null) {
    const normalized = (status || "").trim().toLowerCase();
    return normalized === "connected" || normalized === "verified";
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
      connectedAt:
        patch.verificationStatus && this.isConnectedVerificationStatus(patch.verificationStatus)
          ? current.connectedAt ?? new Date().toISOString()
          : current.connectedAt,
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
    actorId?: string | null,
  ) {
    return this.prisma.client.setting.upsert({
      where: { key },
      update: {
        value,
        group,
        description,
        isPublic: false,
        updatedById: actorId ?? null,
        deletedAt: null,
      },
      create: {
        key,
        value,
        group,
        description,
        isPublic: false,
        createdById: actorId ?? null,
        updatedById: actorId ?? null,
      },
    });
  }

  private getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
    const redirectUri = process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI?.trim() ?? "";

    return {
      clientId,
      clientSecret,
      redirectUri,
      oauthConfigured: Boolean(clientId && clientSecret && redirectUri),
    };
  }

  private renderOAuthResultPage(input: { title: string; message: string; success: boolean }) {
    const tone = input.success ? "#166534" : "#b91c1c";
    const badge = input.success ? "Connected" : "Failed";

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(input.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; }
      main { max-width: 640px; margin: 10vh auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); }
      .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: ${tone}; color: #fff; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
      h1 { margin: 18px 0 12px; font-size: 28px; }
      p { margin: 0; line-height: 1.6; color: #334155; }
    </style>
  </head>
  <body>
    <main>
      <span class="badge">${badge}</span>
      <h1>${this.escapeHtml(input.title)}</h1>
      <p>${this.escapeHtml(input.message)}</p>
    </main>
  </body>
</html>`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
