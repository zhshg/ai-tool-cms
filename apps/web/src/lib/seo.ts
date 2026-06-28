import type { Metadata } from "next";
import { buildMetadata as buildSeoMetadata, getSiteConfig } from "@ai-tool-cms/seo";

/** All pages must use @ai-tool-cms/seo — do not hand-roll meta tags. */
export function createRootMetadata(locale = "en"): Metadata {
  const config = getSiteConfig();
  const isZh = locale === "zh";

  return buildSeoMetadata(
    {
      title: config.siteName,
      description: isZh
        ? "AI Tool CMS — 发现、比较与评测 AI 工具。"
        : config.siteDescription || "Discover, compare, and review AI tools.",
      path: `/${locale}`,
      hreflang: config.locales.map((loc) => ({ locale: loc, path: `/${loc}` })),
    },
    config,
  ) as Metadata;
}

export {
  buildMetadata,
  buildToolMetadata,
  buildToolPageJsonLd,
  serializeJsonLd,
} from "@ai-tool-cms/seo";
