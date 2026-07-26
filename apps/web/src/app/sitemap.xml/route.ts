import { buildSitemapIndexXml, getSiteConfig, SITEMAP_CHUNK_IDS } from "@ai-tool-cms/seo";

const API_URL = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

function buildFallbackSitemapIndex() {
  const config = getSiteConfig();
  const localeChunks = config.locales.map((locale) => ({
    loc: `${config.siteUrl}/sitemaps/${locale}.xml`,
    lastmod: new Date(),
  }));
  const contentChunks = SITEMAP_CHUNK_IDS.map((chunk) => ({
    loc: `${config.siteUrl}/sitemaps/${chunk}.xml`,
    lastmod: new Date(),
  }));

  return buildSitemapIndexXml([...localeChunks, ...contentChunks]);
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/v1/seo/sitemap-index.xml`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      return new Response(await response.text(), {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      });
    }
  } catch {
    /* fallback */
  }

  return new Response(buildFallbackSitemapIndex(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
