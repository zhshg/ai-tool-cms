const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const TOOLS_DAR_LOGO_HOSTS = new Set(["img.toolsdar.io"]);

export function buildFaviconLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;

  try {
    const hostname = new URL(website).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
}

export function resolveToolLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website?: string | null,
): string | null {
  const candidates = buildOrderedLogoCandidates(primaryLogoUrl, metadata, website);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isPreferredPrimaryLogo(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return buildFaviconLogoUrl(resolveLogoWebsite(metadata, website));
}

export function resolveToolFallbackLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website?: string | null,
): string | null {
  const primary = resolveToolLogoUrl(primaryLogoUrl, metadata, website);
  const favicon = buildFaviconLogoUrl(resolveLogoWebsite(metadata, website));
  const fallbackCandidates = [
    ...buildOrderedLogoCandidates(primaryLogoUrl, metadata, website),
    favicon,
  ];

  for (const candidate of fallbackCandidates) {
    if (candidate && candidate !== primary) {
      return candidate;
    }
  }
  return null;
}

export function resolveClientAssetUrl(url: string | null | undefined): string | null {
  const value = cleanString(url);
  if (!value) return null;
  if (ABSOLUTE_URL_PATTERN.test(value) || value.startsWith("data:")) return value;

  const base =
    cleanString(process.env.NEXT_PUBLIC_APP_URL) ??
    cleanString(process.env.NEXT_PUBLIC_API_URL) ??
    (typeof window !== "undefined" ? window.location.origin : null);

  if (!base) return value;

  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function getMetadataLogoCandidates(metadata: Record<string, unknown>): Array<string | null> {
  return [
    cleanString(metadata.logoUrl),
    cleanString(metadata.logo),
    cleanString(metadata.svgLogoUrl),
    cleanString(metadata.officialLogoUrl),
    cleanString(metadata.collectedLogoUrl),
    cleanString(metadata.faviconUrl),
    cleanString(metadata.appleTouchIconUrl),
    cleanString(metadata.openGraphImageUrl),
    cleanString(metadata.imageUrl),
    cleanString(metadata.iconUrl),
  ];
}

function resolveLogoWebsite(
  metadata: Record<string, unknown>,
  website?: string | null,
): string | null {
  return (
    cleanString(website) ??
    cleanString(metadata.website) ??
    cleanString(metadata.canonicalUrl) ??
    cleanString(metadata.sourceUrl) ??
    (Array.isArray(metadata.sourceUrls) ? cleanString(metadata.sourceUrls[0]) : null)
  );
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildOrderedLogoCandidates(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website?: string | null,
) {
  const primary = cleanString(primaryLogoUrl);
  const directFavicon = buildDirectWebsiteFaviconUrl(resolveLogoWebsite(metadata, website));

  return [primary, ...getMetadataLogoCandidates(metadata), directFavicon];
}

function buildDirectWebsiteFaviconUrl(website: string | null | undefined): string | null {
  const source = cleanString(website);
  if (!source) return null;

  try {
    const url = new URL(source);
    if (!url.hostname) return null;
    return new URL("/favicon.ico", url).toString();
  } catch {
    return null;
  }
}

function isPreferredPrimaryLogo(value: string): boolean {
  if (value.startsWith("/logos/") || value.startsWith("/storage/")) return true;
  if (!ABSOLUTE_URL_PATTERN.test(value)) return false;

  try {
    const url = new URL(value);
    if (TOOLS_DAR_LOGO_HOSTS.has(url.hostname.toLowerCase())) return true;
    if (url.pathname.startsWith("/logos/")) return true;
    if (url.pathname.includes("/storage/logos/")) return true;
    return false;
  } catch {
    return false;
  }
}
