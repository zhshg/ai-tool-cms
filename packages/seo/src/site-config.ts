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
  const siteUrl = parsed.NEXT_PUBLIC_APP_URL ?? parsed.APP_URL ?? "http://localhost:3000";
  const locales = parseEnabledLocales(parsed.ENABLED_LOCALES);

  return {
    siteName: parsed.SITE_NAME ?? "AI Tool CMS",
    siteDescription: parsed.SITE_DESCRIPTION ?? "",
    siteUrl: normalizeUrl(siteUrl),
    defaultLocale: parsed.DEFAULT_LOCALE ?? "en",
    locales: locales.length ? [...locales] : ["en"],
    twitterHandle: env.TWITTER_HANDLE,
    ogImage: env.OG_IMAGE,
    robotsNoIndex: env.ROBOTS_NO_INDEX === "true",
    adminUrl: parsed.ADMIN_URL,
  };
}

function safeGetEnv() {
  try {
    return getEnv();
  } catch {
    return process.env as unknown as ReturnType<typeof getEnv>;
  }
}
