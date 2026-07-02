import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@ai-tool-cms/database";
import { getEnv } from "@ai-tool-cms/config";

type LogoCandidate = {
  url: string;
  source:
    | "favicon"
    | "apple-touch-icon"
    | "apple-touch-icon-precomposed"
    | "og-image"
    | "twitter-image"
    | "visible-logo";
  priority: number;
};

type LogoFetchResult = {
  logoUrl: string;
  storageKey: string;
  source: LogoCandidate["source"];
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

  if (tool.logoUrl && !options?.force) {
    return {
      ok: true,
      skipped: true,
      reason: "logo_already_exists",
      logoUrl: tool.logoUrl,
    } as const;
  }

  const discovered = await discoverLogo(tool.website);
  if (!discovered) {
    return { ok: false, reason: "no_valid_logo_candidate" } as const;
  }

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const nextMetadata = {
    ...metadata,
    logoCollection: {
      ...(metadata.logoCollection as Record<string, unknown> | undefined),
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
      logoUrl: discovered.logoUrl,
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

async function discoverLogo(website: string): Promise<LogoFetchResult | null> {
  const pageUrl = new URL(website);
  const homepageHtml = await fetchHtml(pageUrl.toString());
  const candidates = buildCandidates(pageUrl, homepageHtml ?? "");

  for (const candidate of candidates) {
    const result = await fetchAndStoreLogo(candidate);
    if (result) {
      return result;
    }
  }

  return null;
}

function buildCandidates(pageUrl: URL, html: string): LogoCandidate[] {
  const candidates: LogoCandidate[] = [
    {
      url: new URL("/favicon.ico", pageUrl).toString(),
      source: "favicon",
      priority: 1,
    },
    {
      url: new URL("/apple-touch-icon.png", pageUrl).toString(),
      source: "apple-touch-icon",
      priority: 2,
    },
    {
      url: new URL("/apple-touch-icon-precomposed.png", pageUrl).toString(),
      source: "apple-touch-icon-precomposed",
      priority: 3,
    },
  ];

  const metaCandidates: Array<[string, LogoCandidate["source"], number]> = [
    ['property="og:image"', "og-image", 4],
    ['name="twitter:image"', "twitter-image", 5],
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
      priority: 6,
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(candidate.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AI-Tool-CMS-LogoBot/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.byteLength || buffer.byteLength > MAX_LOGO_BYTES) return null;
    if (looksLikeHtml(buffer)) return null;

    const dimension = detectDimensions(buffer, contentType);
    if (
      dimension &&
      ((dimension.width ?? 0) < MIN_DIMENSION || (dimension.height ?? 0) < MIN_DIMENSION)
    ) {
      return null;
    }

    const stored = await storeLogo(buffer, contentType);
    return {
      logoUrl: stored.logoUrl,
      storageKey: stored.storageKey,
      source: candidate.source,
      mimeType: contentType,
      byteLength: buffer.byteLength,
      width: dimension?.width ?? null,
      height: dimension?.height ?? null,
    };
  } catch {
    return null;
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

function extractVisibleLogo(html: string) {
  const regex =
    /<img[^>]+(?:class|id|src|alt)=["'][^"']*(?:logo|brand)[^"']*["'][^>]*src=["']([^"']+)["']/i;
  return html.match(regex)?.[1] ?? null;
}

function detectDimensions(buffer: Buffer, mimeType: string) {
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
