import {
  SOURCE_NAMES,
  DEFAULT_SOURCE_LIMITS,
  CATEGORY_WHITELIST_SET,
} from "./constants";
import type { CandidateDraft, SourceId, SourceRunResult } from "./types";
import {
  buildSlug,
  cleanText,
  detectCategory,
  getHostname,
  looksPlaceholder,
  mapPricingType,
  normalizeLogoUrl,
  normalizeLongDescription,
  normalizeShortDescription,
  normalizeTags,
  normalizeWebsiteUrl,
  scoreConfidence,
} from "./utils";

type RawSourceRecord = {
  sourceId: SourceId;
  sourceName: string;
  sourceUrl: string;
  externalId?: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  pricingType?: string | null;
  confidenceBase?: number;
  metadata?: Record<string, unknown>;
};

type SourceAdapter = {
  id: SourceId;
  name: string;
  enabledByDefault: boolean;
  fetch: (limit: number) => Promise<RawSourceRecord[]>;
};

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "toolsdar-auto-update/1.0",
        Accept: "application/json, text/html, application/xml, application/rss+xml",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const adapters: SourceAdapter[] = [
  {
    id: "producthunt",
    name: SOURCE_NAMES.producthunt,
    enabledByDefault: true,
    async fetch(limit) {
      const html = await fetchText("https://www.producthunt.com/topics/artificial-intelligence");
      const matches = [...html.matchAll(/href="(https:\/\/www\.producthunt\.com\/posts\/[^"]+)"/g)];
      const seen = new Set<string>();
      return matches.slice(0, limit).flatMap((match) => {
        const url = match[1];
        if (!url || seen.has(url)) return [];
        seen.add(url);
        const slug = url.split("/").pop() ?? url;
        return [{
        sourceId: "producthunt",
        sourceName: SOURCE_NAMES.producthunt,
        sourceUrl: url,
        externalId: slug,
        name: slug.replace(/-/g, " ").trim(),
        websiteUrl: null,
        shortDescription: "AI tool launch discovered from Product Hunt.",
        description: "AI tool launch discovered from Product Hunt and queued for editorial review.",
        tags: ["producthunt", "new-launch"],
        confidenceBase: 0.42,
        metadata: { discoveredUrl: url },
      }];
      });
    },
  },
  {
    id: "futurepedia",
    name: SOURCE_NAMES.futurepedia,
    enabledByDefault: true,
    async fetch(limit) {
      const json = JSON.parse(
        await fetchText(`https://www.futurepedia.io/api/v1/tools?page=1&limit=${Math.min(limit, 20)}`),
      ) as { tools?: Array<Record<string, unknown>> };
      return (json.tools ?? []).slice(0, limit).map((item) => ({
        sourceId: "futurepedia",
        sourceName: SOURCE_NAMES.futurepedia,
        sourceUrl: String(
          item.slug
            ? `https://www.futurepedia.io/tool/${item.slug}`
            : item.tool_url ?? item.url ?? "https://www.futurepedia.io",
        ),
        externalId: String(item.id ?? item._id ?? ""),
        name: String(item.tool_name ?? item.name ?? item.title ?? "").trim(),
        websiteUrl:
          typeof item.tool_url === "string"
            ? item.tool_url
            : typeof item.website === "string"
              ? item.website
              : null,
        logoUrl:
          typeof item.image === "string"
            ? item.image
            : typeof item.logo === "string"
              ? item.logo
              : null,
        shortDescription:
          typeof item.short_description === "string"
            ? item.short_description
            : typeof item.summary === "string"
              ? item.summary
              : null,
        description: typeof item.description === "string" ? item.description : null,
        category: typeof item.category === "string" ? item.category : null,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
        pricingType: typeof item.pricing === "string" ? item.pricing : null,
        confidenceBase: 0.72,
      }));
    },
  },
  {
    id: "taaft",
    name: SOURCE_NAMES.taaft,
    enabledByDefault: true,
    async fetch(limit) {
      const json = JSON.parse(
        await fetchText(`https://theresanaiforthat.com/api/tools/?offset=0&limit=${Math.min(limit, 20)}`),
      ) as { results?: Array<Record<string, unknown>> };
      return (json.results ?? []).slice(0, limit).map((item) => ({
        sourceId: "taaft",
        sourceName: SOURCE_NAMES.taaft,
        sourceUrl: String(
          item.slug
            ? `https://theresanaiforthat.com/ai/${item.slug}/`
            : item.website ?? "https://theresanaiforthat.com",
        ),
        externalId: String(item.id ?? item.uuid ?? ""),
        name: String(item.name ?? item.title ?? "").trim(),
        websiteUrl:
          typeof item.website === "string"
            ? item.website
            : typeof item.external_url === "string"
              ? item.external_url
              : null,
        logoUrl:
          typeof item.logo === "string"
            ? item.logo
            : typeof item.image_url === "string"
              ? item.image_url
              : null,
        shortDescription:
          typeof item.short_description === "string"
            ? item.short_description
            : typeof item.summary === "string"
              ? item.summary
              : null,
        description:
          typeof item.description === "string"
            ? item.description
            : typeof item.long_description === "string"
              ? item.long_description
              : null,
        category:
          Array.isArray(item.categories) && item.categories.length ? String(item.categories[0]) : null,
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
        confidenceBase: 0.78,
      }));
    },
  },
  {
    id: "github-trending",
    name: SOURCE_NAMES["github-trending"],
    enabledByDefault: true,
    async fetch(limit) {
      const html = await fetchText("https://github.com/trending?spoken_language_code=en");
      const repoRegex = /href="\/([^/]+\/[^"]+)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/gi;
      const rows: RawSourceRecord[] = [];
      const seen = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = repoRegex.exec(html)) !== null && rows.length < limit) {
        const slug = match[1];
        const title = match[2];
        if (!slug || !title || seen.has(slug) || slug.includes("sponsors")) continue;
        seen.add(slug);
        rows.push({
        sourceId: "github-trending",
        sourceName: SOURCE_NAMES["github-trending"],
        sourceUrl: `https://github.com/${slug}`,
        externalId: slug,
        name: title.trim(),
        websiteUrl: `https://github.com/${slug}`,
        shortDescription: "Trending AI repository discovered from GitHub.",
        description: "Trending AI repository discovered from GitHub.",
        category: "Developer Tools",
        tags: ["github", "open-source", "ai"],
        pricingType: "free",
        confidenceBase: 0.55,
      });
      }
      return rows;
    },
  },
  {
    id: "huggingface-spaces",
    name: SOURCE_NAMES["huggingface-spaces"],
    enabledByDefault: true,
    async fetch(limit) {
      const html = await fetchText("https://huggingface.co/spaces?sort=trending");
      const matches = [...html.matchAll(/href="(\/spaces\/[^"/]+\/[^"/?#]+)"/g)];
      const seen = new Set<string>();
      const rows: RawSourceRecord[] = [];
      for (const match of matches) {
        const path = match[1];
        if (!path || seen.has(path)) continue;
        seen.add(path);
        const parts = path.split("/").filter(Boolean);
        const name = parts[2] ?? path;
        const url = `https://huggingface.co${path}`;
        rows.push({
          sourceId: "huggingface-spaces",
          sourceName: SOURCE_NAMES["huggingface-spaces"],
          sourceUrl: url,
          externalId: path,
          name,
          websiteUrl: url,
          shortDescription: "Trending Hugging Face Space discovered from the spaces directory.",
          description: "Trending Hugging Face Space discovered from the spaces directory.",
          category: "Developer Tools",
          tags: ["huggingface", "space", "ai"],
          pricingType: "free",
          confidenceBase: 0.58,
        });
        if (rows.length >= limit) break;
      }
      return rows;
    },
  },
  {
    id: "hackernews",
    name: SOURCE_NAMES.hackernews,
    enabledByDefault: true,
    async fetch(limit) {
      const ids = JSON.parse(
        await fetchText("https://hacker-news.firebaseio.com/v0/topstories.json"),
      ) as number[];
      const rows: RawSourceRecord[] = [];
      for (const id of ids.slice(0, limit * 3)) {
        const item = JSON.parse(
          await fetchText(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
        ) as { title?: string; url?: string; text?: string };
        if (!item.title) continue;
        const hostname = item.url ? getHostname(item.url) : null;
        const externalUrl =
          hostname && item.url && !/news\.ycombinator\.com/i.test(hostname) ? item.url : null;
        rows.push({
          sourceId: "hackernews",
          sourceName: SOURCE_NAMES.hackernews,
          sourceUrl: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
          externalId: String(id),
          name: item.title,
          websiteUrl: externalUrl,
          shortDescription: cleanText(item.text),
          description: cleanText(item.text),
          tags: ["hackernews", "ai"],
          confidenceBase: 0.38,
        });
        if (rows.length >= limit) break;
      }
      return rows;
    },
  },
  {
    id: "reddit-ai",
    name: SOURCE_NAMES["reddit-ai"],
    enabledByDefault: true,
    async fetch(limit) {
      const json = JSON.parse(
        await fetchText("https://www.reddit.com/r/artificial/new.json?limit=25"),
      ) as {
        data?: {
          children?: Array<{
            data?: { id?: string; title?: string; url?: string; selftext?: string };
          }>;
        };
      };
      return (json.data?.children ?? [])
        .map((child) => child.data)
        .filter((item): item is NonNullable<typeof item> => Boolean(item?.title))
        .slice(0, limit)
        .map((item) => {
        const hostname = item.url ? getHostname(item.url) : null;
        const externalUrl = hostname && !/reddit\.com/i.test(hostname) ? item.url : null;
        return {
          sourceId: "reddit-ai",
          sourceName: SOURCE_NAMES["reddit-ai"],
          sourceUrl: item.url ?? `https://reddit.com/comments/${item.id}`,
          externalId: item.id,
          name: item.title!,
          websiteUrl: externalUrl,
          shortDescription: cleanText(item.selftext),
          description: cleanText(item.selftext),
          tags: ["reddit", "ai"],
          confidenceBase: 0.34,
        };
      });
    },
  },
];

function normalizeCandidate(raw: RawSourceRecord): CandidateDraft {
  const websiteUrl = normalizeWebsiteUrl(raw.websiteUrl ?? null);
  const shortDescription = normalizeShortDescription(
    raw.shortDescription ?? raw.description ?? null,
  );
  const category =
    (() => {
      const rawCategory = cleanText(raw.category);
      if (rawCategory && CATEGORY_WHITELIST_SET.has(rawCategory)) return rawCategory;
      return detectCategory(
        [raw.name, raw.shortDescription ?? "", raw.description ?? "", ...(raw.tags ?? [])].join(" "),
      );
    })();
  const description = normalizeLongDescription(
    raw.description ?? raw.shortDescription,
    raw.name,
    raw.sourceName,
  );
  const logoUrl = normalizeLogoUrl(raw.logoUrl, websiteUrl);
  const tags = normalizeTags(raw.tags ?? []);
  const slug = buildSlug(raw.name, websiteUrl);
  const placeholder = looksPlaceholder(raw.name, websiteUrl, shortDescription, description);
  const confidenceScore = scoreConfidence({
    base: raw.confidenceBase ?? 0.35,
    websiteUrl,
    logoUrl,
    shortDescription,
    description,
    category,
    placeholder,
  });
  const validationErrors: string[] = [];
  const warnings: string[] = [];

  if (!cleanText(raw.name)) validationErrors.push("name is empty");
  if (!websiteUrl) validationErrors.push("websiteUrl must be a valid https URL");
  if (!slug) validationErrors.push("slug is empty");
  if (!shortDescription) validationErrors.push("shortDescription is too short");
  if (!category) validationErrors.push("category is missing");
  if (!logoUrl) validationErrors.push("logoUrl is missing");
  if (placeholder) validationErrors.push("placeholder content detected");
  if (raw.websiteUrl && !websiteUrl) warnings.push("source websiteUrl was rejected by safety rules");
  if (!raw.websiteUrl) warnings.push("source did not provide websiteUrl");
  if (raw.sourceId === "producthunt") warnings.push("Product Hunt candidate needs website verification");

  return {
    sourceId: raw.sourceId,
    sourceName: raw.sourceName,
    sourceUrl: raw.sourceUrl,
    externalId: raw.externalId,
    name: raw.name.trim(),
    websiteUrl,
    logoUrl,
    shortDescription,
    description,
    category,
    tags,
    pricingType: mapPricingType(raw.pricingType),
    slug,
    confidenceScore,
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings,
    discoveredAt: new Date().toISOString(),
    metadata: raw.metadata ?? {},
  };
}

export async function runSources(sourceIds: SourceId[], limit: number): Promise<SourceRunResult[]> {
  const selected = adapters.filter((adapter) => sourceIds.includes(adapter.id));
  const results: SourceRunResult[] = [];
  for (const adapter of selected) {
    const requestedLimit = Math.min(limit, DEFAULT_SOURCE_LIMITS[adapter.id]);
    try {
      const records = await adapter.fetch(requestedLimit);
      results.push({
        sourceId: adapter.id,
        sourceName: adapter.name,
        enabled: adapter.enabledByDefault,
        requestedLimit,
        fetchedCount: records.length,
        candidates: records.map(normalizeCandidate),
        errors: [],
      });
    } catch (error) {
      results.push({
        sourceId: adapter.id,
        sourceName: adapter.name,
        enabled: adapter.enabledByDefault,
        requestedLimit,
        fetchedCount: 0,
        candidates: [],
        errors: [error instanceof Error ? error.message : "Unknown fetch error"],
      });
    }
  }
  return results;
}
