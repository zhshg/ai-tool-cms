import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";

type LogoSource =
  | "stored-logo"
  | "favicon"
  | "svg-icon"
  | "apple-touch-icon"
  | "apple-touch-icon-precomposed"
  | "simple-icons"
  | "og-image"
  | "twitter-image"
  | "visible-logo";

type LogoCandidate = {
  url: string;
  source: LogoSource;
  priority: number;
};

type LogoValidationResult = {
  candidate: LogoCandidate;
  ok: boolean;
  reason?: string;
  mimeType?: string;
  byteLength?: number;
  width?: number | null;
  height?: number | null;
};

type LogoFetchResult = {
  logoUrl: string;
  storageKey: string;
  source: LogoSource;
  mimeType: string;
  byteLength: number;
  width: number | null;
  height: number | null;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MIN_DIMENSION = 16;
const LOGO_STORAGE_DIR = ["storage", "logos"];

export async function collectToolLogo(
  prisma: PrismaClient,
  toolId: string,
  options?: { force?: boolean },
) {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    include: {
      categories: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        include: { category: true },
      },
    },
  });

  if (!tool?.website) {
    return { ok: false, reason: "tool_not_found_or_missing_website" } as const;
  }

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const logoCollection = (metadata.logoCollection ?? {}) as Record<string, unknown>;
  const cachedLogoUrl =
    typeof metadata.collectedLogoUrl === "string" ? metadata.collectedLogoUrl : null;

  if (tool.logoUrl && !options?.force) {
    return {
      ok: true,
      skipped: true,
      reason: "stored_logo_already_exists",
      logoUrl: tool.logoUrl,
      source: "stored-logo",
    } as const;
  }

  if (cachedLogoUrl && !options?.force) {
    return {
      ok: true,
      skipped: true,
      reason: "logo_cache_hit",
      logoUrl: cachedLogoUrl,
      source: logoCollection.source ?? "favicon",
    } as const;
  }

  const discovered = await discoverLogo(tool.website, tool.name);
  if (!discovered) {
    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        metadata: {
          ...metadata,
          logoCollection: {
            ...logoCollection,
            status: "FAILED",
            failedAt: new Date().toISOString(),
            reason: "no_valid_logo_candidate",
          },
        },
      },
    });
    return { ok: false, reason: "no_valid_logo_candidate" } as const;
  }

  const nextMetadata = {
    ...metadata,
    collectedLogoUrl: discovered.logoUrl,
    logoCollection: {
      ...logoCollection,
      status: "COLLECTED",
      source: discovered.source,
      storageKey: discovered.storageKey,
      mimeType: discovered.mimeType,
      byteLength: discovered.byteLength,
      width: discovered.width,
      height: discovered.height,
      collectedAt: new Date().toISOString(),
    },
  };

  await prisma.tool.update({
    where: { id: tool.id },
    data: {
      logoUrl: tool.logoUrl || discovered.logoUrl,
      metadata: nextMetadata,
    },
  });

  return {
    ok: true,
    skipped: false,
    logoUrl: discovered.logoUrl,
    source: discovered.source,
  } as const;
}

export async function previewToolLogo(prisma: PrismaClient, toolId: string) {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    select: { id: true, name: true, website: true, logoUrl: true, metadata: true },
  });

  if (!tool?.website) {
    return { ok: false, reason: "tool_not_found_or_missing_website", candidates: [] } as const;
  }

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const candidates = await previewLogoCandidates(tool.website, tool.name);
  const firstValid = candidates.find((candidate) => candidate.ok);

  return {
    ok: true,
    storedLogoUrl: tool.logoUrl,
    cachedLogoUrl: typeof metadata.collectedLogoUrl === "string" ? metadata.collectedLogoUrl : null,
    recommendedUrl: tool.logoUrl ?? firstValid?.candidate.url ?? null,
    recommendedSource: tool.logoUrl ? "stored-logo" : (firstValid?.candidate.source ?? null),
    candidates,
  } as const;
}

async function discoverLogo(website: string, toolName: string): Promise<LogoFetchResult | null> {
  const candidates = await getLogoCandidates(website, toolName);

  for (const candidate of candidates) {
    const result = await fetchAndStoreLogo(candidate);
    if (result) {
      return result;
    }
  }

  return null;
}

async function previewLogoCandidates(website: string, toolName: string) {
  const candidates = await getLogoCandidates(website, toolName);
  const results: LogoValidationResult[] = [];

  for (const candidate of candidates) {
    results.push(await validateLogoCandidate(candidate));
  }

  return results;
}

async function getLogoCandidates(website: string, toolName: string) {
  const pageUrl = new URL(website);
  const homepageHtml = await fetchHtml(pageUrl.toString());
  return buildCandidates(pageUrl, homepageHtml ?? "", toolName);
}

function buildCandidates(pageUrl: URL, html: string, toolName: string): LogoCandidate[] {
  const candidates: LogoCandidate[] = [
    {
      url: new URL("/favicon.ico", pageUrl).toString(),
      source: "favicon",
      priority: 1,
    },
  ];

  for (const href of extractLinkHrefs(html, "icon")) {
    const isSvg = href.toLowerCase().includes(".svg");
    candidates.push({
      url: new URL(href, pageUrl).toString(),
      source: isSvg ? "svg-icon" : "favicon",
      priority: isSvg ? 2 : 1,
    });
  }

  candidates.push(
    {
      url: new URL("/apple-touch-icon.png", pageUrl).toString(),
      source: "apple-touch-icon",
      priority: 3,
    },
    {
      url: new URL("/apple-touch-icon-precomposed.png", pageUrl).toString(),
      source: "apple-touch-icon-precomposed",
      priority: 3,
    },
  );

  const simpleIconsSlug = buildSimpleIconsSlug(toolName || pageUrl.hostname);
  if (simpleIconsSlug) {
    candidates.push({
      url: `https://cdn.simpleicons.org/${encodeURIComponent(simpleIconsSlug)}`,
      source: "simple-icons",
      priority: 4,
    });
  }

  const metaCandidates: Array<[string, LogoSource, number]> = [
    ['property="og:image"', "og-image", 5],
    ['name="twitter:image"', "twitter-image", 6],
  ];

  for (const [marker, source, priority] of metaCandidates) {
    const match = extractMetaContent(html, marker);
    if (match) {
      candidates.push({
        url: new URL(match, pageUrl).toString(),
        source,
        priority,
      });
    }
  }

  const visibleLogo = extractVisibleLogo(html);
  if (visibleLogo) {
    candidates.push({
      url: new URL(visibleLogo, pageUrl).toString(),
      source: "visible-logo",
      priority: 7,
    });
  }

  return dedupeCandidates(candidates).sort((a, b) => a.priority - b.priority);
}

function dedupeCandidates(candidates: LogoCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

async function fetchHtml(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AI-Tool-CMS-LogoBot/1.0",
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      return null;
    }

    return response.text();
  } catch {
    return null;
  }
}

async function fetchAndStoreLogo(candidate: LogoCandidate): Promise<LogoFetchResult | null> {
  const validation = await validateLogoCandidate(candidate, true);
  if (!validation.ok || !validation.mimeType || !validation.byteLength) return null;

  try {
    const response = await fetch(candidate.url, {
      redirect: "follow",
      headers: { "user-agent": "AI-Tool-CMS-LogoBot/1.0" },
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await storeLogo(buffer, validation.mimeType);
    return {
      logoUrl: stored.logoUrl,
      storageKey: stored.storageKey,
      source: candidate.source,
      mimeType: validation.mimeType,
      byteLength: buffer.byteLength,
      width: validation.width ?? null,
      height: validation.height ?? null,
    };
  } catch {
    return null;
  }
}

async function validateLogoCandidate(
  candidate: LogoCandidate,
  strictTimeout = false,
): Promise<LogoValidationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), strictTimeout ? 12_000 : 8_000);
    const response = await fetch(candidate.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AI-Tool-CMS-LogoBot/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return { candidate, ok: false, reason: `http_${response.status}` };

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      return { candidate, ok: false, reason: "not_image_response", mimeType: contentType };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.byteLength) return { candidate, ok: false, reason: "empty_image" };
    if (buffer.byteLength > MAX_LOGO_BYTES) {
      return { candidate, ok: false, reason: "image_too_large", byteLength: buffer.byteLength };
    }
    if (looksLikeHtml(buffer)) return { candidate, ok: false, reason: "html_response" };

    const dimension = detectDimensions(buffer, contentType);
    if (
      dimension &&
      ((dimension.width ?? 0) < MIN_DIMENSION || (dimension.height ?? 0) < MIN_DIMENSION)
    ) {
      return {
        candidate,
        ok: false,
        reason: "image_too_small",
        mimeType: contentType,
        byteLength: buffer.byteLength,
        width: dimension.width,
        height: dimension.height,
      };
    }

    return {
      candidate,
      ok: true,
      mimeType: contentType,
      byteLength: buffer.byteLength,
      width: dimension?.width ?? null,
      height: dimension?.height ?? null,
    };
  } catch {
    return { candidate, ok: false, reason: "fetch_failed" };
  }
}

async function storeLogo(buffer: Buffer, mimeType: string) {
  const env = getEnv();
  const root = process.env.LOGO_STORAGE_DIR ?? join(process.cwd(), ...LOGO_STORAGE_DIR);
  await mkdir(root, { recursive: true });

  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 20);
  const extension = extensionFromMimeType(mimeType);
  const filename = `${hash}.${extension}`;
  const filePath = join(root, filename);
  await writeFile(filePath, buffer);

  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    storageKey: filename,
    logoUrl: `${appUrl}/logos/${filename}`,
  };
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("x-icon") || mimeType.includes("ico")) return "ico";
  return "img";
}

function looksLikeHtml(buffer: Buffer) {
  const sample = buffer.subarray(0, 256).toString("utf8").toLowerCase();
  return sample.includes("<html") || sample.includes("<!doctype html");
}

function extractMetaContent(html: string, marker: string) {
  const regex = new RegExp(`<meta[^>]+${marker}[^>]+content=["']([^"']+)["']`, "i");
  return html.match(regex)?.[1] ?? null;
}

function extractLinkHrefs(html: string, relNeedle: string) {
  const hrefs: string[] = [];
  const regex = /<link\b[^>]*>/gi;
  for (const match of html.matchAll(regex)) {
    const tag = match[0];
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (!rel.includes(relNeedle)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

function extractVisibleLogo(html: string) {
  const regex =
    /<img[^>]+(?:class|id|src|alt)=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["']([^"']+)["']/i;
  return html.match(regex)?.[1] ?? null;
}

function buildSimpleIconsSlug(input: string) {
  const cleaned = input
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\.[a-z]{2,}.*$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  return cleaned || null;
}

function detectDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType.includes("svg")) {
    const sample = buffer.subarray(0, 4096).toString("utf8");
    const width = Number(sample.match(/\bwidth=["']?(\d+)/i)?.[1]);
    const height = Number(sample.match(/\bheight=["']?(\d+)/i)?.[1]);
    return {
      width: Number.isFinite(width) && width > 0 ? width : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
    };
  }

  if (mimeType.includes("png") && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if ((mimeType.includes("jpeg") || mimeType.includes("jpg")) && buffer.length > 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + size;
    }
  }

  return null;
}
