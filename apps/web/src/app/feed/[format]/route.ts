import { NextResponse } from "next/server";
import { ToolStatus, prisma } from "@ai-tool-cms/database";
import { getSiteConfig, joinUrl } from "@ai-tool-cms/seo";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const activeOnly = { deletedAt: null } as const;

type Params = { params: Promise<{ format: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { format } = await params;
  const feedFormat = format.replace(/\.(xml|json)$/, "") as "rss" | "atom" | "json" | "api";

  try {
    const blogFeed = await buildBlogFeed(feedFormat);
    if (blogFeed) return blogFeed;
  } catch {
    /* fall back to API feed */
  }

  try {
    const response = await fetch(`${API_URL}/v1/seo/feed/${feedFormat}`, {
      next: { revalidate: 600 },
    });
    if (response.ok) {
      const data = await response.json();
      return new NextResponse(
        typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2),
        { headers: { "Content-Type": data.contentType ?? "application/xml" } },
      );
    }
  } catch {
    /* empty feed */
  }

  return new NextResponse('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>', {
    headers: { "Content-Type": "application/rss+xml" },
  });
}

async function buildBlogFeed(format: "rss" | "atom" | "json" | "api") {
  const posts = await prisma.blogArticle.findMany({
    where: {
      ...activeOnly,
      status: ToolStatus.PUBLISHED,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
  if (!posts.length) return null;

  const config = getSiteConfig();
  const items = posts.map((post) => ({
    title: post.title,
    url: joinUrl(config.siteUrl, `/en/blog/${post.slug}`),
    description: post.excerpt ?? stripMarkdown(post.content).slice(0, 220),
    publishedAt: post.publishedAt ?? post.createdAt,
  }));

  if (format === "json" || format === "api") {
    return NextResponse.json({ version: "https://jsonfeed.org/version/1.1", title: "ToolsDdar Blog", items });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ToolsDdar Blog</title>
    <link>${escapeXml(joinUrl(config.siteUrl, "/en/blog"))}</link>
    <description>AI tool guides, launch notes, and comparisons.</description>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid>${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;
  return new NextResponse(body, { headers: { "Content-Type": format === "atom" ? "application/atom+xml" : "application/rss+xml" } });
}

function stripMarkdown(value: string) {
  return value.replace(/[#*_`>\-[\]()]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
