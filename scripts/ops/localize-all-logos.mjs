import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const tools = await prisma.tool.findMany({
    where: { deletedAt: null },
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
  let setWebsiteFavicon = 0;
  let setDirectFavicon = 0;
  let setFallbackLogo = 0;

  for (const tool of tools) {
    const metadata = normalizeMetadata(tool.metadata);
    const websiteLogo = buildGoogleFaviconUrl(tool.website);
    const directLogo = buildDirectFaviconUrl(tool.website);
    const fallbackLogo = resolveFallbackLogo(tool.logoUrl, metadata, tool.website);
    const nextLogoUrl = websiteLogo || directLogo || fallbackLogo;

    if (!nextLogoUrl || nextLogoUrl === tool.logoUrl) continue;

    const nextMetadata = { ...metadata };
    nextMetadata.collectedLogoUrl = nextLogoUrl;
    nextMetadata.logoUrl = nextLogoUrl;

    updated += 1;
    if (websiteLogo) setWebsiteFavicon += 1;
    else if (directLogo) setDirectFavicon += 1;
    else setFallbackLogo += 1;

    if (!dryRun) {
      await prisma.tool.update({
        where: { id: tool.id },
        data: {
          logoUrl: nextLogoUrl,
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
        setWebsiteFavicon,
        setDirectFavicon,
        setFallbackLogo,
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

function resolveFallbackLogo(primaryLogoUrl, metadata, website) {
  return (
    cleanString(primaryLogoUrl) ||
    cleanString(metadata.logoUrl) ||
    cleanString(metadata.logo) ||
    cleanString(metadata.svgLogoUrl) ||
    cleanString(metadata.officialLogoUrl) ||
    cleanString(metadata.collectedLogoUrl) ||
    buildGoogleFaviconUrl(website) ||
    buildDirectFaviconUrl(website)
  );
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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
