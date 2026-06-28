import { Injectable } from "@nestjs/common";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  REGION_LOCALE_MAP,
  buildHreflangMap,
  enqueueAllLocaleTranslations,
  enqueueTranslationWorkflow,
  getCountryAnalytics,
  getGlobalDashboardMetrics,
  getTranslationStatusSummary,
  parseEnabledLocales,
  resolveLocalizedTool,
} from "@ai-tool-cms/i18n";
import { getEnv } from "@ai-tool-cms/config";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class I18nApiService {
  constructor(private readonly prisma: PrismaService) {}

  locales() {
    const env = getEnv();
    const enabled = parseEnabledLocales(env.ENABLED_LOCALES);
    return {
      supported: SUPPORTED_LOCALES,
      enabled,
      labels: LOCALE_LABELS,
      regions: REGION_LOCALE_MAP,
      defaultLocale: env.DEFAULT_LOCALE ?? "en",
      fallbackLocale: env.FALLBACK_LOCALE ?? "en",
    };
  }

  cdnConfig() {
    const env = getEnv();
    return {
      provider: env.CDN_PROVIDER,
      edgeCacheTtlSeconds: env.EDGE_CACHE_TTL_SECONDS,
      r2Bucket: env.R2_BUCKET,
      cloudflareConfigured: Boolean(env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN),
      compression: ["brotli", "gzip"],
      isr: true,
    };
  }

  async toolTranslations(toolId: string) {
    return getTranslationStatusSummary(this.prisma.client, toolId);
  }

  async resolveTool(toolId: string, locale: string) {
    return resolveLocalizedTool(this.prisma.client, toolId, locale);
  }

  async triggerTranslation(toolId: string, targetLocale: string) {
    const jobId = await enqueueTranslationWorkflow(this.prisma.client, toolId, targetLocale);
    return { queued: true, jobId };
  }

  async triggerAllLocales(toolId: string, locales?: string[]) {
    const env = getEnv();
    const targets = locales ?? parseEnabledLocales(env.ENABLED_LOCALES).filter((l) => l !== "en");
    const jobIds = await enqueueAllLocaleTranslations(this.prisma.client, toolId, targets);
    return { queued: true, count: jobIds.length, jobIds };
  }

  async listRegionalSeo() {
    return this.prisma.client.regionalSeoConfig.findMany({
      where: activeOnly,
      orderBy: { region: "asc" },
    });
  }

  async upsertRegionalSeo(input: {
    region: string;
    locale: string;
    keywords?: string[];
    metaTitle?: string;
    metaDescription?: string;
    aiSummary?: string;
  }) {
    return this.prisma.client.regionalSeoConfig.upsert({
      where: { region_locale: { region: input.region, locale: input.locale } },
      create: {
        region: input.region,
        locale: input.locale,
        keywords: input.keywords ?? [],
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        aiSummary: input.aiSummary,
      },
      update: {
        keywords: input.keywords ?? [],
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        aiSummary: input.aiSummary,
        deletedAt: null,
      },
    });
  }

  hreflang(path: string) {
    const env = getEnv();
    const siteUrl = env.NEXT_PUBLIC_APP_URL ?? env.APP_URL;
    return buildHreflangMap(siteUrl, path);
  }

  globalDashboard() {
    return getGlobalDashboardMetrics(this.prisma.client);
  }

  countryAnalytics(periodKey?: string) {
    return getCountryAnalytics(this.prisma.client, periodKey);
  }

  async translationJobs(toolId?: string) {
    return this.prisma.client.translationJob.findMany({
      where: toolId ? { toolId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
