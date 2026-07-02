import { getSiteConfig } from "@ai-tool-cms/seo";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const config = getSiteConfig();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"],
    },
    sitemap: [new URL("/sitemap.xml", config.siteUrl).toString()],
  };
}
