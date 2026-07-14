import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

function readArgValue(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function rootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "../..");
}

function loadDataset() {
  const datasetPath =
    readArgValue(process.argv.slice(2), "--input") ??
    "storage/imports/futurepedia/futurepedia-all-tools-20260711-183531.json";
  const absolutePath = path.resolve(rootDir(), datasetPath);
  const payload = JSON.parse(readFileSync(absolutePath, "utf8"));
  return { path: absolutePath, tools: Array.isArray(payload.tools) ? payload.tools : [] };
}

function normalizeDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanArray(value) {
  return Array.isArray(value)
    ? value
        .map((item) => normalizeUrl(item))
        .filter(Boolean)
        .slice(0, 6)
    : [];
}

async function findExistingTool(candidate) {
  const slug = String(candidate.slug ?? "").trim();
  const website = normalizeUrl(candidate.officialWebsiteUrl);
  const domain = website ? normalizeDomain(website) : null;
  const name = String(candidate.name ?? "").trim();

  if (slug) {
    const bySlug = await prisma.tool.findFirst({ where: { slug, deletedAt: null } });
    if (bySlug) return bySlug;
  }
  if (website) {
    const byWebsite = await prisma.tool.findFirst({ where: { website, deletedAt: null } });
    if (byWebsite) return byWebsite;
  }
  if (name) {
    const byName = await prisma.tool.findFirst({ where: { name, deletedAt: null } });
    if (byName) return byName;
  }
  if (domain) {
    const rows = await prisma.tool.findMany({
      where: { deletedAt: null },
      select: { id: true, website: true },
    });
    const matched = rows.find((item) => normalizeDomain(item.website) === domain);
    if (matched) {
      return prisma.tool.findFirst({ where: { id: matched.id, deletedAt: null } });
    }
  }
  return null;
}

async function main() {
  const { path: datasetPath, tools } = loadDataset();
  let matched = 0;
  let updated = 0;
  let withLogo = 0;
  let withScreenshots = 0;

  for (const candidate of tools) {
    const existing = await findExistingTool(candidate);
    if (!existing) continue;
    matched += 1;

    const nextLogoUrl = normalizeUrl(candidate.logoUrl) ?? existing.logoUrl ?? null;
    const nextScreenshots = cleanArray(candidate.screenshots);
    const existingMetadata =
      existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
    const nextMetadata = {
      ...existingMetadata,
      ...(nextLogoUrl ? { collectedLogoUrl: nextLogoUrl } : {}),
      ...(nextScreenshots.length > 0 ? { screenshots: nextScreenshots } : {}),
      futurepediaSourceUrl: candidate.sourceUrl ?? existingMetadata.futurepediaSourceUrl ?? null,
      futurepediaUpdatedAt: new Date().toISOString(),
    };

    const logoChanged = Boolean(nextLogoUrl) && nextLogoUrl !== existing.logoUrl;
    const screenshotsChanged =
      nextScreenshots.length > 0 &&
      JSON.stringify(nextScreenshots) !==
        JSON.stringify(
          Array.isArray(existingMetadata.screenshots) ? existingMetadata.screenshots : [],
        );

    if (!logoChanged && !screenshotsChanged) continue;

    await prisma.tool.update({
      where: { id: existing.id },
      data: {
        ...(nextLogoUrl ? { logoUrl: nextLogoUrl } : {}),
        metadata: nextMetadata,
      },
    });

    updated += 1;
    if (logoChanged) withLogo += 1;
    if (screenshotsChanged) withScreenshots += 1;
  }

  console.log(
    JSON.stringify(
      {
        input: datasetPath,
        totalCandidates: tools.length,
        matchedExisting: matched,
        updated,
        updatedLogo: withLogo,
        updatedScreenshots: withScreenshots,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
