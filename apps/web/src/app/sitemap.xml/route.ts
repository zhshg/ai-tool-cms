import { buildSitemapIndex } from "@ai-tool-cms/seo";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

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

  return new Response(buildSitemapIndex(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
