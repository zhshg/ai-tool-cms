import type { DiscoveryAdapter } from "../types";
import { fetchText, hashExternalId, parseRssItems, scoreAiRelevance } from "../utils";

export const hackerNewsAdapter: DiscoveryAdapter = {
  kind: "HACKER_NEWS",
  async discover() {
    const ids = (await fetchText("https://hacker-news.firebaseio.com/v0/topstories.json").then(
      (t) => JSON.parse(t),
    )) as number[];
    const candidates = [];
    for (const id of ids.slice(0, 40)) {
      const item = (await fetchText(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
        (t) => JSON.parse(t),
      )) as { title?: string; url?: string; text?: string };
      if (!item.title) continue;
      const score = scoreAiRelevance(item.title, item.text);
      if (score < 0.25) continue;
      candidates.push({
        externalId: String(id),
        title: item.title,
        url: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
        description: item.text,
        relevanceScore: score,
      });
    }
    return candidates;
  },
};

export const githubTrendingAdapter: DiscoveryAdapter = {
  kind: "GITHUB_TRENDING",
  async discover(ctx) {
    const url = ctx.sourceUrl ?? "https://github.com/trending";
    const html = await fetchText(url);
    const repoRegex = /href="\/([^/]+\/[^"]+)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/gi;
    const candidates = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = repoRegex.exec(html)) !== null) {
      const slug = match[1]!;
      if (seen.has(slug) || slug.includes("sponsors")) continue;
      seen.add(slug);
      const title = match[2]!.trim();
      const repoUrl = `https://github.com/${slug}`;
      const score = scoreAiRelevance(title);
      if (score < 0.2) continue;
      candidates.push({
        externalId: hashExternalId(repoUrl),
        title,
        url: repoUrl,
        relevanceScore: score,
      });
      if (candidates.length >= 25) break;
    }
    return candidates;
  },
};

export const redditAiAdapter: DiscoveryAdapter = {
  kind: "REDDIT_AI",
  async discover(ctx) {
    const url =
      (ctx.sourceUrl as string | undefined) ??
      "https://www.reddit.com/r/artificial/new.json?limit=25";
    const json = (await fetchText(url).then((t) => JSON.parse(t))) as {
      data?: {
        children?: Array<{
          data?: { id?: string; title?: string; url?: string; selftext?: string };
        }>;
      };
    };
    return (json.data?.children ?? [])
      .map((child) => child.data)
      .filter((post): post is NonNullable<typeof post> => Boolean(post?.title))
      .map((post) => ({
        externalId: post.id,
        title: post.title!,
        url: post.url ?? `https://reddit.com/comments/${post.id}`,
        description: post.selftext,
        relevanceScore: scoreAiRelevance(post.title!, post.selftext),
      }))
      .filter((c) => c.relevanceScore >= 0.2);
  },
};

export const huggingFaceAdapter: DiscoveryAdapter = {
  kind: "HUGGING_FACE",
  async discover() {
    const html = await fetchText("https://huggingface.co/models?sort=trending");
    const cardRegex = /href="(\/[^"]+)"[^>]*class="[^"]*model-card[^"]*"/gi;
    const candidates = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = cardRegex.exec(html)) !== null) {
      const path = match[1]!;
      if (!path.startsWith("/") || seen.has(path)) continue;
      seen.add(path);
      const name = path.split("/").pop() ?? path;
      const url = `https://huggingface.co${path}`;
      candidates.push({
        externalId: hashExternalId(url),
        title: name,
        url,
        relevanceScore: scoreAiRelevance(name),
      });
      if (candidates.length >= 20) break;
    }
    return candidates;
  },
};

export const productHuntAdapter: DiscoveryAdapter = {
  kind: "PRODUCT_HUNT",
  async discover(ctx) {
    const url = ctx.sourceUrl ?? "https://www.producthunt.com/topics/artificial-intelligence";
    const html = await fetchText(url);
    const linkRegex = /href="(https:\/\/www\.producthunt\.com\/posts\/[^"]+)"/gi;
    const candidates = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const postUrl = match[1]!;
      if (seen.has(postUrl)) continue;
      seen.add(postUrl);
      const slug = postUrl.split("/").pop() ?? postUrl;
      const title = slug.replace(/-/g, " ");
      candidates.push({
        externalId: hashExternalId(postUrl),
        title,
        url: postUrl,
        relevanceScore: scoreAiRelevance(title) + 0.2,
      });
      if (candidates.length >= 15) break;
    }
    return candidates;
  },
};

export const googleNewsAdapter: DiscoveryAdapter = {
  kind: "GOOGLE_NEWS_AI",
  async discover() {
    const query = encodeURIComponent("artificial intelligence tools");
    const rss = await fetchText(
      `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
    );
    return parseRssItems(rss)
      .map((item) => ({
        externalId: hashExternalId(item.link),
        title: item.title,
        url: item.link,
        description: item.description,
        relevanceScore: scoreAiRelevance(item.title, item.description),
      }))
      .filter((c) => c.relevanceScore >= 0.2)
      .slice(0, 20);
  },
};

export const rssFeedAdapter: DiscoveryAdapter = {
  kind: "RSS_FEED",
  async discover(ctx) {
    const url = ctx.sourceUrl;
    if (!url) return [];
    const xml = await fetchText(url);
    return parseRssItems(xml)
      .map((item) => ({
        externalId: hashExternalId(item.link),
        title: item.title,
        url: item.link,
        description: item.description,
        relevanceScore: scoreAiRelevance(item.title, item.description),
      }))
      .filter((c) => c.relevanceScore >= 0.15)
      .slice(0, 25);
  },
};

export const officialBlogAdapter: DiscoveryAdapter = {
  kind: "OFFICIAL_BLOG",
  async discover(ctx) {
    return rssFeedAdapter.discover(ctx);
  },
};

export const xAiAdapter: DiscoveryAdapter = {
  kind: "X_AI",
  async discover() {
    // X API 需要密钥；无密钥时从公开 Nitter RSS 镜像降级抓取（可能不可用）
    const fallbackFeeds = [
      "https://nitter.net/search/rss?f=tweets&q=AI%20tool",
      "https://nitter.net/search/rss?f=tweets&q=new%20AI%20launch",
    ];
    for (const feed of fallbackFeeds) {
      try {
        const xml = await fetchText(feed);
        const items = parseRssItems(xml);
        if (items.length > 0) {
          return items.slice(0, 15).map((item) => ({
            externalId: hashExternalId(item.link),
            title: item.title,
            url: item.link,
            description: item.description,
            relevanceScore: scoreAiRelevance(item.title, item.description),
          }));
        }
      } catch {
        // try next feed
      }
    }
    return [];
  },
};
