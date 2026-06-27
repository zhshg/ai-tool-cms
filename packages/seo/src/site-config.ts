import { normalizeUrl } from "./utils";

export type SiteConfig = {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  defaultLocale: string;
  twitterHandle?: string;
  ogImage?: string;
  robotsNoIndex: boolean;
};

export function getSiteConfig(env: Record<string, string | undefined> = process.env): SiteConfig {
  const siteUrl = env.SITE_URL ?? env.APP_URL ?? "http://localhost:3000";

  return {
    siteName: env.SITE_NAME ?? "AI Tool CMS",
    siteDescription: env.SITE_DESCRIPTION ?? "",
    siteUrl: normalizeUrl(siteUrl),
    defaultLocale: env.DEFAULT_LOCALE ?? "zh-CN",
    twitterHandle: env.TWITTER_HANDLE,
    ogImage: env.OG_IMAGE,
    robotsNoIndex: env.ROBOTS_NO_INDEX === "true",
  };
}
