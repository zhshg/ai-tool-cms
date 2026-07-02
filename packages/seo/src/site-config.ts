import { getEnv } from "@ai-tool-cms/config";
import { parseEnabledLocales } from "@ai-tool-cms/i18n";
import { normalizeUrl } from "./utils";

export type SiteConfig = {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  defaultLocale: string;
  locales: string[];
  twitterHandle?: string;
  ogImage?: string;
  robotsNoIndex: boolean;
  adminUrl?: string;
};

export function getSiteConfig(env: NodeJS.ProcessEnv = process.env): SiteConfig {
  const parsed = safeGetEnv();
  const rawSiteUrl =
    env.NEXT_PUBLIC_SITE_URL ?? env.SITE_URL ?? env.NEXT_PUBLIC_APP_URL ?? env.APP_URL;
  const siteUrl =
    rawSiteUrl ??
    parsed.NEXT_PUBLIC_SITE_URL ??
    parsed.SITE_URL ??
    parsed.NEXT_PUBLIC_APP_URL ??
    parsed.APP_URL ??
    "http://localhost";
  const locales = parseEnabledLocales(parsed.ENABLED_LOCALES);
  const siteName = normalizePublicSiteName(env.SITE_NAME ?? parsed.SITE_NAME);

  return {
    siteName,
    siteDescription:
      parsed.SITE_DESCRIPTION ??
      "Discover, compare, and review AI tools by category, pricing, and workflow.",
    siteUrl: normalizeUrl(siteUrl),
    defaultLocale: parsed.DEFAULT_LOCALE ?? "en",
    locales: locales.length ? [...locales] : ["en"],
    twitterHandle: env.TWITTER_HANDLE,
    ogImage: env.OG_IMAGE,
    robotsNoIndex: env.ROBOTS_NO_INDEX === "true",
    adminUrl: parsed.ADMIN_URL,
  };
}

function normalizePublicSiteName(siteName: string | undefined): string {
  if (!siteName) return "AI Tool Directory";
  return siteName === "AI Tool CMS" ? "AI Tool Directory" : siteName;
}

function safeGetEnv() {
  try {
    return getEnv();
  } catch {
    return process.env as unknown as ReturnType<typeof getEnv>;
  }
}
