import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SOURCE_NAMES, DEFAULT_SOURCE_LIMITS, CATEGORY_WHITELIST_SET } from "./constants";
import type { CandidateDraft, SourceId, SourceRunResult } from "./types";
import {
  buildSlug,
  canonicalizeCategoryName,
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

const execFileAsync = promisify(execFile);

const AI_DISCOVERY_KEYWORDS = [
  /\bai\b/i,
  /\bllm\b/i,
  /\bagent\b/i,
  /\bmodel\b/i,
  /\bml\b/i,
  /machine learning/i,
  /artificial intelligence/i,
  /generative/i,
  /diffusion/i,
  /whisper/i,
  /embedding/i,
  /inference/i,
  /rag\b/i,
  /speech recognition/i,
  /text to image/i,
  /text-to-image/i,
  /openai/i,
  /anthropic/i,
  /chatgpt/i,
  /claude/i,
  /gemini/i,
] as const;

const BLOCKED_IMPORT_HOST_PATTERNS = [/(^|\.)github\.com$/i, /(^|\.)huggingface\.co$/i] as const;

async function fetchTextViaPowerShell(url: string, acceptHeader: string): Promise<string> {
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `$resp = Invoke-WebRequest -UseBasicParsing -Headers @{'User-Agent'='Mozilla/5.0';'Accept'='${acceptHeader}';'Accept-Language'='en-US,en;q=0.9';'Referer'='https://toolsdar.io/'} -Uri '${url}'`,
    "Write-Output $resp.Content",
  ].join("; ");
  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", command], {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

async function fetchTextViaCurl(url: string, acceptHeader: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "curl.exe",
    [
      "-L",
      "-A",
      "Mozilla/5.0",
      "-H",
      `Accept: ${acceptHeader}`,
      "-H",
      "Accept-Language: en-US,en;q=0.9",
      "-e",
      "https://toolsdar.io/",
      url,
    ],
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  return stdout;
}

async function fetchTextViaPython(url: string, acceptHeader: string): Promise<string> {
  const script = [
    "import sys, urllib.request",
    `url = ${JSON.stringify(url)}`,
    "headers = {",
    "  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',",
    `  'Accept': ${JSON.stringify(acceptHeader)},`,
    "  'Accept-Language': 'en-US,en;q=0.9',",
    "  'Referer': 'https://toolsdar.io/',",
    "}",
    "req = urllib.request.Request(url, headers=headers)",
    "with urllib.request.urlopen(req, timeout=20) as resp:",
    "    sys.stdout.buffer.write(resp.read())",
  ].join("\n");
  const psScript = [
    "$ErrorActionPreference = 'Stop'",
    "$tmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.Guid]::NewGuid().ToString() + '.py')",
    "$code = @'",
    script,
    "'@",
    "[System.IO.File]::WriteAllText($tmp, $code, [System.Text.Encoding]::UTF8)",
    "try {",
    "  python $tmp",
    "  exit $LASTEXITCODE",
    "} finally {",
    "  Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue",
    "}",
  ].join("\n");
  const encoded = Buffer.from(psScript, "utf16le").toString("base64");
  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-EncodedCommand", encoded], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  return Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchTextOnce(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unknown fetch error");
}

async function fetchTextOnce(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const acceptHeader =
    "application/json, text/html, application/xhtml+xml, application/xml, application/rss+xml;q=0.9,*/*;q=0.8";
  try {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          Accept: acceptHeader,
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://toolsdar.io/",
        },
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const snippet = cleanText(body)?.slice(0, 180);
        throw new Error(`HTTP ${response.status} for ${url}${snippet ? ` :: ${snippet}` : ""}`);
      }
      return await response.text();
    } catch (error) {
      if (process.platform !== "win32") throw error;
      try {
        return await fetchTextViaPython(url, acceptHeader);
      } catch {
        try {
          return await fetchTextViaCurl(url, acceptHeader);
        } catch {
          return await fetchTextViaPowerShell(url, acceptHeader);
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

function decodeUrlCandidate(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\\//g, "/");
}

function stripTrackingParams(value: string): string {
  try {
    const url = new URL(decodeUrlCandidate(value));
    const removableKeys = [...url.searchParams.keys()].filter((key) => {
      const normalized = key.toLowerCase();
      return (
        normalized.startsWith("utm_") ||
        normalized === "ref" ||
        normalized === "source" ||
        normalized === "campaign" ||
        normalized === "medium"
      );
    });
    for (const key of removableKeys) {
      url.searchParams.delete(key);
    }
    return url.toString().replace(/\?$/, "");
  } catch {
    return decodeUrlCandidate(value);
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2f;/gi, "/")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isBlockedImportHost(value: string | null | undefined): boolean {
  const hostname = value ? getHostname(value) : null;
  if (!hostname) return false;
  return BLOCKED_IMPORT_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFuturepediaHomepage(limit: number, html: string): RawSourceRecord[] {
  const rows: RawSourceRecord[] = [];
  const seen = new Set<string>();
  const cardRegex =
    /href="https:\/\/www\.futurepedia\.io\/tool\/([^"]+)"[\s\S]*?<img[^>]+alt="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?<a class="text-lg[^"]*" href="https:\/\/www\.futurepedia\.io\/tool\/\1">([\s\S]*?)<\/a>[\s\S]*?<div class="mt-2[^"]*">([\s\S]*?)<\/div>/gi;

  let match: RegExpExecArray | null;
  while ((match = cardRegex.exec(html)) !== null && rows.length < limit) {
    const slug = match[1]?.trim();
    const altName = stripHtml(match[2] ?? "");
    const logoUrl = cleanText(match[3]);
    const anchorName = stripHtml(match[4] ?? "");
    const shortDescription = stripHtml(match[5] ?? "");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    rows.push({
      sourceId: "futurepedia",
      sourceName: SOURCE_NAMES.futurepedia,
      sourceUrl: `https://www.futurepedia.io/tool/${slug}`,
      externalId: slug,
      name: anchorName || altName || slug,
      websiteUrl: `https://www.futurepedia.io/tool/${slug}`,
      logoUrl,
      shortDescription,
      description: shortDescription,
      tags: ["futurepedia", "directory", "ai"],
      confidenceBase: 0.68,
      metadata: { slug, source: "homepage-card" },
    });
  }

  return rows;
}

function extractFuturepediaCategoryUrls(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/href="(https:\/\/www\.futurepedia\.io\/ai-tools\/[^"#?]+)"/gi)]
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value))
        .slice(0, 12),
    ),
  ];
}

function extractFuturepediaToolSlugs(html: string): string[] {
  return [
    ...new Set(
      [...html.matchAll(/href="https:\/\/www\.futurepedia\.io\/tool\/([^"#?\/]+)"/gi)]
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function extractMetaContent(html: string, attribute: string, value: string): string | null {
  const match =
    html.match(new RegExp(`<meta[^>]+${attribute}="${value}"[^>]+content="([^"]+)"`, "i")) ??
    html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+${attribute}="${value}"`, "i"));
  return cleanText(match?.[1] ? decodeHtmlEntities(match[1]) : null);
}

function parseFuturepediaDetailRecord(slug: string, html: string): RawSourceRecord | null {
  const sourceUrl = `https://www.futurepedia.io/tool/${slug}`;
  const name =
    extractMetaContent(html, "property", "og:title")?.replace(/\s*\|\s*Futurepedia\s*$/i, "") ??
    extractMetaContent(html, "name", "twitter:title")?.replace(/\s*\|\s*Futurepedia\s*$/i, "") ??
    cleanText(
      html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*\|\s*Futurepedia\s*$/i, "") ?? null,
    );
  const normalizedName = cleanText(
    name?.replace(/\s+AI Reviews:\s+Use Cases,\s+Pricing\s*&\s*Alternatives\s*$/i, "") ?? name,
  );
  const shortDescription =
    extractMetaContent(html, "name", "description") ??
    extractMetaContent(html, "property", "og:description");
  const logoUrl =
    extractMetaContent(html, "property", "og:image") ??
    extractMetaContent(html, "name", "twitter:image");
  const categoryLinks = [
    ...html.matchAll(/href="https:\/\/www\.futurepedia\.io\/ai-tools\/([^"#?]+)"/gi),
  ]
    .map((match) => match[1]?.trim()?.replace(/-/g, " "))
    .filter((value): value is string => Boolean(value));
  const officialWebsiteUrl = (() => {
    const hrefMatch =
      html.match(/href="(https:\/\/[^"]+)"[^>]*>\s*<button[^>]*>Visit Site/i) ??
      html.match(/"href":"(https:\\\/\\\/[^"]+)"/i);
    if (!hrefMatch?.[1]) return null;
    const candidate = stripTrackingParams(hrefMatch[1]);
    if (!candidate || /futurepedia\.io/i.test(candidate)) return null;
    return candidate;
  })();

  if (!normalizedName) return null;

  return {
    sourceId: "futurepedia",
    sourceName: SOURCE_NAMES.futurepedia,
    sourceUrl,
    externalId: slug,
    name: normalizedName,
    websiteUrl: officialWebsiteUrl,
    logoUrl,
    shortDescription,
    description: shortDescription,
    category: categoryLinks[0] ?? null,
    tags: ["futurepedia", "directory", "ai"],
    confidenceBase: 0.72,
    metadata: {
      slug,
      source: "detail-page",
      categoryHints: categoryLinks.slice(0, 4),
      officialWebsiteResolved: Boolean(officialWebsiteUrl),
    },
  };
}

async function resolveFuturepediaOfficialWebsite(sourceUrl: string): Promise<string | null> {
  const html = await fetchText(sourceUrl);
  const hrefMatch =
    html.match(/href="(https:\/\/[^"]+)"[^>]*>\s*<button[^>]*>Visit Site/i) ??
    html.match(/"href":"(https:\\\/\\\/[^"]+)"/i);
  if (!hrefMatch?.[1]) return null;

  const candidate = stripTrackingParams(hrefMatch[1]);
  if (!candidate || /futurepedia\.io/i.test(candidate)) return null;
  return candidate;
}

async function enrichFuturepediaRecords(records: RawSourceRecord[]): Promise<RawSourceRecord[]> {
  const enriched: RawSourceRecord[] = [];
  for (const record of records) {
    try {
      const officialWebsiteUrl = await resolveFuturepediaOfficialWebsite(record.sourceUrl);
      enriched.push({
        ...record,
        websiteUrl: officialWebsiteUrl,
        metadata: {
          ...(record.metadata ?? {}),
          officialWebsiteResolved: Boolean(officialWebsiteUrl),
        },
      });
    } catch {
      enriched.push({
        ...record,
        websiteUrl: null,
        metadata: {
          ...(record.metadata ?? {}),
          officialWebsiteResolved: false,
        },
      });
    }
  }
  return enriched;
}

async function fetchFuturepediaRecords(limit: number): Promise<RawSourceRecord[]> {
  const homepageHtml = await fetchText("https://www.futurepedia.io/");
  const seen = new Set<string>();
  const combined: RawSourceRecord[] = [];

  const appendRecords = (records: RawSourceRecord[]) => {
    for (const record of records) {
      const key = record.externalId ?? record.sourceUrl;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(record);
      if (combined.length >= limit) break;
    }
  };

  appendRecords(parseFuturepediaHomepage(limit, homepageHtml));
  if (combined.length >= limit) {
    return enrichFuturepediaRecords(combined.slice(0, limit));
  }

  const categoryUrls = extractFuturepediaCategoryUrls(homepageHtml);
  for (const url of categoryUrls) {
    if (combined.length >= limit) break;
    try {
      const html = await fetchText(url);
      appendRecords(parseFuturepediaHomepage(limit - combined.length, html));
      if (combined.length >= limit) break;

      const slugs = extractFuturepediaToolSlugs(html);
      for (const slug of slugs) {
        if (combined.length >= limit) break;
        if (seen.has(slug)) continue;
        try {
          const detailHtml = await fetchText(`https://www.futurepedia.io/tool/${slug}`);
          const record = parseFuturepediaDetailRecord(slug, detailHtml);
          if (!record) continue;
          appendRecords([record]);
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  const needsOfficialSite = combined.filter(
    (record) => !record.websiteUrl || /futurepedia\.io/i.test(record.websiteUrl),
  );
  const enriched = await enrichFuturepediaRecords(needsOfficialSite);
  const enrichedMap = new Map(
    enriched.map((record) => [record.externalId ?? record.sourceUrl, record]),
  );
  return combined.slice(0, limit).map((record) => {
    const key = record.externalId ?? record.sourceUrl;
    return enrichedMap.get(key) ?? record;
  });
}

function parseTaaftHomepage(limit: number, html: string): RawSourceRecord[] {
  const rows: RawSourceRecord[] = [];
  const seen = new Set<string>();
  const rowRegex =
    /<div class="home-listing-row tools-table-row"[^>]*data-tools-href="([^"]+)"[\s\S]*?<img src="([^"]+)" alt="([^"]+)"[\s\S]*?<div class="tools-name-tagline">([\s\S]*?)<\/div>[\s\S]*?<a class="external_ai_link" href="([^"]+)"[\s\S]*?<a class="task_label"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span class="tools-price-popover-value">([\s\S]*?)<\/span>/gi;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null && rows.length < limit) {
    const sourceUrl = cleanText(match[1]);
    const slug = sourceUrl?.match(/\/ai\/([^/]+)\/?$/i)?.[1] ?? sourceUrl ?? "";
    if (!sourceUrl || !slug || seen.has(slug)) continue;
    seen.add(slug);

    rows.push({
      sourceId: "taaft",
      sourceName: SOURCE_NAMES.taaft,
      sourceUrl,
      externalId: slug,
      name: stripHtml(match[3] ?? "") || slug,
      websiteUrl: decodeHtmlEntities(match[5] ?? ""),
      logoUrl: cleanText(match[2]),
      shortDescription: stripHtml(match[4] ?? ""),
      description: stripHtml(match[4] ?? ""),
      category: stripHtml(match[6] ?? ""),
      tags: ["taaft", "directory", "ai"],
      pricingType: stripHtml(match[7] ?? ""),
      confidenceBase: 0.74,
      metadata: { slug, source: "homepage-row" },
    });
  }

  return rows;
}

function looksAiGithubProject(name: string, description: string | null): boolean {
  const haystack = `${name} ${description ?? ""}`;
  return AI_DISCOVERY_KEYWORDS.some((pattern) => pattern.test(haystack));
}

function looksAiStory(name: string, description: string | null): boolean {
  const haystack = `${name} ${(description ?? "").slice(0, 240)}`;
  return AI_DISCOVERY_KEYWORDS.some((pattern) => pattern.test(haystack));
}

function looksToolLikeStory(
  name: string,
  description: string | null,
  websiteUrl: string | null,
): boolean {
  const haystack = `${name} ${description ?? ""}`;
  const hostname = websiteUrl ? getHostname(websiteUrl) : null;
  const positiveSignals = [
    /\bshow hn\b/i,
    /\blaunch hn\b/i,
    /\btool\b/i,
    /\bapp\b/i,
    /\bagent\b/i,
    /\bassistant\b/i,
    /\bcopilot\b/i,
    /\bgenerator\b/i,
    /\bstudio\b/i,
    /\bplatform\b/i,
    /\bworkspace\b/i,
    /\beditor\b/i,
    /\bapi\b/i,
    /\bsdk\b/i,
    /\bopen source\b/i,
    /\bgithub\b/i,
  ];
  const negativeSignals = [
    /\.pdf$/i,
    /\breuters\b/i,
    /\bresearch paper\b/i,
    /\bstudy\b/i,
    /\bcourse\b/i,
    /\bcosts more than\b/i,
    /\bfile manager\b/i,
    /\bmac app\b/i,
  ];

  if (negativeSignals.some((pattern) => pattern.test(haystack) || pattern.test(websiteUrl ?? ""))) {
    return false;
  }
  if (hostname && /github\.com|huggingface\.co/i.test(hostname)) return true;
  return positiveSignals.some((pattern) => pattern.test(haystack));
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
        return [
          {
            sourceId: "producthunt",
            sourceName: SOURCE_NAMES.producthunt,
            sourceUrl: url,
            externalId: slug,
            name: slug.replace(/-/g, " ").trim(),
            websiteUrl: null,
            shortDescription: "AI tool launch discovered from Product Hunt.",
            description:
              "AI tool launch discovered from Product Hunt and queued for editorial review.",
            tags: ["producthunt", "new-launch"],
            confidenceBase: 0.42,
            metadata: { discoveredUrl: url },
          },
        ];
      });
    },
  },
  {
    id: "futurepedia",
    name: SOURCE_NAMES.futurepedia,
    enabledByDefault: true,
    async fetch(limit) {
      return fetchFuturepediaRecords(limit);
    },
  },
  {
    id: "taaft",
    name: SOURCE_NAMES.taaft,
    enabledByDefault: true,
    async fetch(limit) {
      const html = await fetchText("https://theresanaiforthat.com/");
      return parseTaaftHomepage(limit, html);
    },
  },
  {
    id: "github-trending",
    name: SOURCE_NAMES["github-trending"],
    enabledByDefault: true,
    async fetch(limit) {
      const html = await fetchText("https://github.com/trending?spoken_language_code=en");
      const rows: RawSourceRecord[] = [];
      const seen = new Set<string>();
      const articleRegex =
        /<article\b[^>]*class="[^"]*\bBox-row\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
      let articleMatch: RegExpExecArray | null;
      while ((articleMatch = articleRegex.exec(html)) !== null && rows.length < limit) {
        const article = articleMatch[1];
        if (!article) continue;
        const repoMatch = article.match(
          /click_target&quot;:&quot;REPOSITORY&quot;[\s\S]*?href="\/([^"/\s]+\/[^"/\s]+)"/i,
        );
        const slug = repoMatch?.[1]?.trim();
        if (!slug || seen.has(slug) || slug.includes("sponsors")) continue;
        seen.add(slug);
        const descriptionMatch = article.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
        const description = stripHtml(descriptionMatch?.[1] ?? "");
        const repoName = slug.split("/")[1] ?? slug;
        if (!looksAiGithubProject(repoName, description || null)) continue;
        rows.push({
          sourceId: "github-trending",
          sourceName: SOURCE_NAMES["github-trending"],
          sourceUrl: `https://github.com/${slug}`,
          externalId: slug,
          name: repoName.trim(),
          websiteUrl: `https://github.com/${slug}`,
          shortDescription: description || "Trending AI repository discovered from GitHub.",
          description: description || "Trending AI repository discovered from GitHub.",
          category: "Developer Tools",
          tags: ["github", "open-source", "ai"],
          pricingType: "free",
          confidenceBase: 0.62,
          metadata: { slug },
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
        const shortDescription = stripHtml(item.text ?? "");
        if (!externalUrl) continue;
        if (!looksAiStory(item.title, shortDescription)) continue;
        if (!looksToolLikeStory(item.title, shortDescription, externalUrl)) continue;
        rows.push({
          sourceId: "hackernews",
          sourceName: SOURCE_NAMES.hackernews,
          sourceUrl: item.url ?? `https://news.ycombinator.com/item?id=${id}`,
          externalId: String(id),
          name: item.title,
          websiteUrl: externalUrl,
          shortDescription,
          description: shortDescription,
          tags: ["hackernews", "ai"],
          confidenceBase: 0.52,
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
  const category = (() => {
    const rawCategory = canonicalizeCategoryName(raw.category);
    if (rawCategory && CATEGORY_WHITELIST_SET.has(rawCategory)) return rawCategory;
    return (
      canonicalizeCategoryName(
        [raw.name, raw.shortDescription ?? "", raw.description ?? "", ...(raw.tags ?? [])].join(
          " ",
        ),
      ) ??
      detectCategory(
        [raw.name, raw.shortDescription ?? "", raw.description ?? "", ...(raw.tags ?? [])].join(
          " ",
        ),
      )
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
  if (isBlockedImportHost(websiteUrl))
    warnings.push("websiteUrl uses platform host and needs official site resolution");
  if (raw.websiteUrl && !websiteUrl)
    warnings.push("source websiteUrl was rejected by safety rules");
  if (!raw.websiteUrl) warnings.push("source did not provide websiteUrl");
  if (raw.sourceId === "producthunt")
    warnings.push("Product Hunt candidate needs website verification");

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
