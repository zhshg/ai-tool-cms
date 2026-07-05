const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

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
  const primary = cleanString(primaryLogoUrl);
  if (primary) return primary;

  for (const candidate of getMetadataLogoCandidates(metadata)) {
    if (candidate) return candidate;
  }

  return buildFaviconLogoUrl(resolveLogoWebsite(metadata, website));
}

export function resolveToolFallbackLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website?: string | null,
): string | null {
  const primary = cleanString(primaryLogoUrl);

  for (const candidate of getMetadataLogoCandidates(metadata)) {
    if (candidate && candidate !== primary) {
      return candidate;
    }
  }

  const favicon = buildFaviconLogoUrl(resolveLogoWebsite(metadata, website));
  if (favicon && favicon !== primary) return favicon;
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
