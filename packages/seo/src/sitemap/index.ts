import type { SitemapChunk, SitemapChunkId, SitemapEntry } from "../types";
import { getSiteConfig } from "../site-config";
import { escapeXml, resolveAbsoluteUrl, toIsoDate } from "../utils";

export const SITEMAP_CHUNK_IDS: SitemapChunkId[] = [
  "tool",
  "category",
  "tag",
  "prompt",
  "compare",
  "rss",
];

export function buildSitemapEntries(
  entries: SitemapEntry[],
  config = getSiteConfig(),
): SitemapEntry[] {
  return entries.map((entry) => ({
    ...entry,
    url: resolveAbsoluteUrl(entry.url, config.siteUrl),
  }));
}

export function buildSitemapXml(entries: SitemapEntry[], config = getSiteConfig()): string {
  const resolved = buildSitemapEntries(entries, config);
  const urls = resolved
    .map((entry) => {
      const lastmod = toIsoDate(entry.lastModified);
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}${entry.changeFrequency ? `\n    <changefreq>${entry.changeFrequency}</changefreq>` : ""}${entry.priority !== undefined ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : ""}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function buildSitemapIndexXml(
  chunks: Array<{ loc: string; lastmod?: Date | string }>,
): string {
  const entries = chunks
    .map((chunk) => {
      const lastmod = toIsoDate(chunk.lastmod);
      return `  <sitemap>
    <loc>${escapeXml(chunk.loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

export function buildSitemapIndex(config = getSiteConfig()): string {
  const chunks = SITEMAP_CHUNK_IDS.map((id) => ({
    loc: resolveAbsoluteUrl(`/sitemaps/${id}.xml`, config.siteUrl),
    lastmod: new Date(),
  }));
  return buildSitemapIndexXml(chunks);
}

export function chunkToXml(chunk: SitemapChunk, config = getSiteConfig()): string {
  return buildSitemapXml(chunk.entries, config);
}

export type SitemapPingResult = { provider: string; ok: boolean; status?: number; error?: string };

/** Ping Google/Bing after sitemap update (Commit 043). */
export async function pingSearchEngines(
  sitemapIndexUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SitemapPingResult[]> {
  const encoded = encodeURIComponent(sitemapIndexUrl);
  const endpoints = [
    { provider: "google", url: `https://www.google.com/ping?sitemap=${encoded}` },
    { provider: "bing", url: `https://www.bing.com/ping?sitemap=${encoded}` },
  ];

  const results: SitemapPingResult[] = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetchImpl(endpoint.url, { method: "GET" });
      results.push({
        provider: endpoint.provider,
        ok: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        provider: endpoint.provider,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

/** @deprecated Use buildSitemapXml */
export const buildSitemap = buildSitemapEntries;

export function defaultSitemapEntries(): SitemapEntry[] {
  return [{ url: "/", changeFrequency: "daily", priority: 1 }];
}
