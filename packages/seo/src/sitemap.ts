import type { MetadataRoute } from "next";
import { getSiteConfig } from "./site-config";
import type { SitemapEntry } from "./types";
import { resolveAbsoluteUrl } from "./utils";

export function buildSitemap(
  entries: SitemapEntry[],
  config = getSiteConfig(),
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: resolveAbsoluteUrl(entry.url, config.siteUrl),
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}

export function defaultSitemapEntries(): SitemapEntry[] {
  return [
    {
      url: "/",
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
