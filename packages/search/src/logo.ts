export function resolveSearchLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
  website: string | null | undefined,
): string | undefined {
  const primary = cleanString(primaryLogoUrl);
  if (primary) return primary;

  const candidates = [
    metadata.logoUrl,
    metadata.logo,
    metadata.collectedLogoUrl,
    metadata.faviconUrl,
    metadata.appleTouchIconUrl,
    metadata.openGraphImageUrl,
    metadata.imageUrl,
    metadata.iconUrl,
  ];

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return value;
  }

  const favicon = buildFaviconLogoUrl(
    cleanString(website) ??
      cleanString(metadata.website) ??
      cleanString(metadata.canonicalUrl) ??
      cleanString(metadata.sourceUrl),
  );
  return favicon ?? undefined;
}

function buildFaviconLogoUrl(website: string | null): string | null {
  if (!website) return null;

  try {
    const hostname = new URL(website).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
