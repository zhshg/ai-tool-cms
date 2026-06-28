import { getSiteConfig } from "@ai-tool-cms/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const config = getSiteConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
