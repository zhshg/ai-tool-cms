import type { FeedItem } from "../types";
import { getSiteConfig } from "../site-config";
import { escapeXml, joinUrl, toIsoDate } from "../utils";

export function buildRssFeed(
  items: FeedItem[],
  options?: { title?: string; description?: string; feedPath?: string },
): string {
  const config = getSiteConfig();
  const title = options?.title ?? `${config.siteName} — Tools Feed`;
  const description = options?.description ?? config.siteDescription;
  const link = joinUrl(config.siteUrl, options?.feedPath ?? "/feed/tools.xml");
  const now = new Date().toUTCString();

  const entries = items
    .map((item) => {
      const pubDate = new Date(item.publishedAt).toUTCString();
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${pubDate}</pubDate>${item.description ? `\n      <description>${escapeXml(item.description)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <lastBuildDate>${now}</lastBuildDate>
    <language>${config.defaultLocale}</language>
${entries}
  </channel>
</rss>`;
}

export function buildAtomFeed(
  items: FeedItem[],
  options?: { title?: string; feedPath?: string },
): string {
  const config = getSiteConfig();
  const title = options?.title ?? `${config.siteName} — Tools`;
  const feedUrl = joinUrl(config.siteUrl, options?.feedPath ?? "/feed/tools.atom");
  const updated = toIsoDate(items[0]?.updatedAt ?? items[0]?.publishedAt ?? new Date());

  const entries = items
    .map((item) => {
      const updatedAt = toIsoDate(item.updatedAt ?? item.publishedAt);
      return `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.link)}" />
    <id>${escapeXml(item.link)}</id>
    <updated>${updatedAt}</updated>${item.description ? `\n    <summary>${escapeXml(item.description)}</summary>` : ""}
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(title)}</title>
  <link href="${escapeXml(feedUrl)}" rel="self" />
  <updated>${updated}</updated>
  <id>${escapeXml(feedUrl)}</id>
${entries}
</feed>`;
}

export function buildJsonFeed(
  items: FeedItem[],
  options?: { title?: string; feedPath?: string },
): string {
  const config = getSiteConfig();
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: options?.title ?? `${config.siteName} — Tools`,
    home_page_url: config.siteUrl,
    feed_url: joinUrl(config.siteUrl, options?.feedPath ?? "/feed/tools.json"),
    items: items.map((item) => ({
      id: item.id,
      url: item.link,
      title: item.title,
      content_text: item.description,
      date_published: toIsoDate(item.publishedAt),
      date_modified: toIsoDate(item.updatedAt ?? item.publishedAt),
    })),
  };
  return JSON.stringify(feed, null, 2);
}

export function buildPublicApiFeed(
  items: FeedItem[],
  options?: { title?: string },
): Record<string, unknown> {
  return {
    meta: {
      title: options?.title ?? "AI Tools Public Feed",
      generatedAt: new Date().toISOString(),
      count: items.length,
    },
    data: items.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.link,
      summary: item.description,
      publishedAt: toIsoDate(item.publishedAt),
      updatedAt: toIsoDate(item.updatedAt ?? item.publishedAt),
    })),
  };
}
