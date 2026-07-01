const API_URL = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:4000";

const FALLBACK_SITEMAP_INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sitemaps/tool.xml</loc></sitemap>
</sitemapindex>`;

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

  return new Response(FALLBACK_SITEMAP_INDEX, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
