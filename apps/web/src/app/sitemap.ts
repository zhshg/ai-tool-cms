import { buildSitemap, defaultSitemapEntries } from "@ai-tool-cms/seo";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(defaultSitemapEntries());
}
