import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const tools = await prisma.tool.findMany({
    where: {
      deletedAt: null,
      status: ToolStatus.PUBLISHED,
      OR: [{ logoUrl: null }, { logoUrl: "" }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      website: true,
      logoUrl: true,
      metadata: true,
    },
  });

  let updated = 0;
  let setPrimaryLogo = 0;
  let setFallbackLogo = 0;
  let setMetadataLogo = 0;

  for (const tool of tools) {
    const metadata = normalizeMetadata(tool.metadata);
    const primary = resolvePrimaryLogo(tool.logoUrl, metadata, tool.website);
    const fallback = resolveFallbackLogo(tool.logoUrl, metadata, tool.website);

    const nextData = {};
    let changed = false;

    if (primary) {
      nextData.logoUrl = primary;
      changed = true;
      setPrimaryLogo += 1;
    }

    const nextMetadata = { ...metadata };
    if (!metadata.collectedLogoUrl && fallback) {
      nextMetadata.collectedLogoUrl = fallback;
      changed = true;
      setFallbackLogo += 1;
      setMetadataLogo += 1;
    }

    if (!changed) continue;
    updated += 1;

    if (!dryRun) {
      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          ...nextData,
          metadata: nextMetadata,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        totalCandidates: tools.length,
        updated,
        setPrimaryLogo,
        setFallbackLogo,
        setMetadataLogo,
      },
      null,
      2,
    ),
  );
}

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return { ...metadata };
}

function resolvePrimaryLogo(primaryLogoUrl, metadata, website) {
  const candidates = buildLogoCandidates(primaryLogoUrl, metadata, website);
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isPreferredLogo(candidate)) return candidate;
  }
  return null;
}

function resolveFallbackLogo(primaryLogoUrl, metadata, website) {
  const primary = resolvePrimaryLogo(primaryLogoUrl, metadata, website);
  const candidates = buildLogoCandidates(primaryLogoUrl, metadata, website);
  for (const candidate of candidates) {
    if (candidate && candidate !== primary) return candidate;
  }
  return null;
}

function buildLogoCandidates(primaryLogoUrl, metadata, website) {
  return [
    cleanString(primaryLogoUrl),
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
    buildDirectFaviconUrl(website),
    buildGoogleFaviconUrl(website),
  ];
}

function buildDirectFaviconUrl(website) {
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

function buildGoogleFaviconUrl(website) {
  const source = cleanString(website);
  if (!source) return null;
  try {
    const url = new URL(source);
    if (!url.hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${url.hostname}`;
  } catch {
    return null;
  }
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPreferredLogo(value) {
  if (!ABSOLUTE_URL_PATTERN.test(value))
    return value.startsWith("/logos/") || value.startsWith("/storage/");
  try {
    const url = new URL(value);
    return /toolsdar\.io|google\.com$/i.test(url.hostname) || url.pathname.startsWith("/logos/");
  } catch {
    return false;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
