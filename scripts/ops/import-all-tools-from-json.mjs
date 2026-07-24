import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const DEFAULT_FALLBACK_LOGO = (website) => buildGoogleFaviconUrl(website);

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

function loadJson(relativePath) {
  const absolutePath = path.resolve(rootDir(), relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractDomain(value) {
  const url = normalizeUrl(value);
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function buildGoogleFaviconUrl(website) {
  const domain = extractDomain(website);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function toJsonSafe(value) {
  if (value === undefined) return {};
  return JSON.parse(JSON.stringify(value));
}

function resolveWebsite(record) {
  return (
    normalizeUrl(record.website) ||
    normalizeUrl(record.websiteUrl) ||
    normalizeUrl(record.officialWebsiteUrl)
  );
}

function resolveLogoUrl(record) {
  return normalizeUrl(record.logoUrl) || DEFAULT_FALLBACK_LOGO(resolveWebsite(record)) || null;
}

function resolveStatus(sourceStatus, forceDraft) {
  if (forceDraft) return ToolStatus.DRAFT;
  return String(sourceStatus || "").toUpperCase() === "PUBLISHED"
    ? ToolStatus.PUBLISHED
    : ToolStatus.DRAFT;
}

async function ensureCategory(category) {
  const slug = slugify(category.slug || category.name);
  const name = normalizeText(category.name || category.slug);
  if (!slug || !name) return null;

  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      slug,
      name,
      description: normalizeText(category.description) || null,
      sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
      iconUrl: normalizeUrl(category.iconUrl),
      metaTitle: normalizeText(category.metaTitle) || null,
      metaDescription: normalizeText(category.metaDescription) || null,
      metadata: toJsonSafe(category.metadata),
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureTag(tag) {
  const slug = slugify(tag.slug || tag.name);
  const name = normalizeText(tag.name || tag.slug);
  if (!slug || !name) return null;

  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.tag.create({
    data: {
      slug,
      name,
      description: normalizeText(tag.description) || null,
      metadata: toJsonSafe(tag.metadata),
    },
    select: { id: true },
  });
  return created.id;
}

async function linkCategories(toolId, categories) {
  const uniqueCategories = unique(categories);
  for (let index = 0; index < uniqueCategories.length; index += 1) {
    const categoryId = uniqueCategories[index];
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId, categoryId } },
      update: { deletedAt: null, isPrimary: index === 0 },
      create: { toolId, categoryId, isPrimary: index === 0 },
    });
  }
}

async function linkTags(toolId, tagIds) {
  for (const tagId of unique(tagIds)) {
    await prisma.toolTag.upsert({
      where: { toolId_tagId: { toolId, tagId } },
      update: { deletedAt: null },
      create: { toolId, tagId },
    });
  }
}

async function clearAllTools() {
  await prisma.$transaction([
    prisma.toolTag.deleteMany({ where: { deletedAt: null } }),
    prisma.toolCategory.deleteMany({ where: { deletedAt: null } }),
    prisma.tool.deleteMany({ where: { deletedAt: null } }),
  ]);
}

async function importDataset(payload, options) {
  const items = Array.isArray(payload.tools) ? payload.tools : [];
  let created = 0;
  let updated = 0;
  let linkedCategories = 0;
  let linkedTags = 0;

  for (const record of items) {
    const website = resolveWebsite(record);
    if (!website) continue;

    const slug = slugify(record.slug || record.name);
    const categoryIds = [];
    for (const category of Array.isArray(record.categories) ? record.categories : []) {
      const categoryId = await ensureCategory(category);
      if (categoryId) categoryIds.push(categoryId);
    }

    const tagIds = [];
    for (const tag of Array.isArray(record.tags) ? record.tags : []) {
      const tagId = await ensureTag(tag);
      if (tagId) tagIds.push(tagId);
    }

    const data = {
      slug,
      name: normalizeText(record.name),
      website,
      logoUrl: resolveLogoUrl(record),
      pricingModel: mapPricingModel(record.pricingModel),
      status: resolveStatus(record.status, options.forceDraft),
      summary: normalizeText(record.summary) || null,
      description: normalizeText(record.description) || null,
      longDescription: normalizeText(record.longDescription) || null,
      metaTitle: normalizeText(record.metaTitle) || null,
      metaDescription: normalizeText(record.metaDescription) || null,
      publishedAt: options.forceDraft
        ? null
        : record.publishedAt
          ? new Date(record.publishedAt)
          : new Date(),
      scheduledAt: record.scheduledAt ? new Date(record.scheduledAt) : null,
      metadata: {
        ...(toJsonSafe(record.metadata) || {}),
        importSource: options.importSource,
        importUpdatedAt: new Date().toISOString(),
        sourceWebsite: website,
        collectedLogoUrl: resolveLogoUrl(record),
      },
      deletedAt: null,
    };

    const existing = await prisma.tool.findFirst({
      where: {
        deletedAt: null,
        OR: [{ slug }, { website }],
      },
      select: { id: true },
    });

    if (!existing) {
      const tool = await prisma.tool.create({ data });
      await linkCategories(tool.id, categoryIds);
      await linkTags(tool.id, tagIds);
      created += 1;
      linkedCategories += categoryIds.length;
      linkedTags += tagIds.length;
      continue;
    }

    await prisma.tool.update({
      where: { id: existing.id },
      data,
    });
    await linkCategories(existing.id, categoryIds);
    await linkTags(existing.id, tagIds);
    updated += 1;
    linkedCategories += categoryIds.length;
    linkedTags += tagIds.length;
  }

  return {
    total: items.length,
    created,
    updated,
    linkedCategories,
    linkedTags,
  };
}

function mapPricingModel(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return "FREE";
  if (text.includes("freemium")) return "FREEMIUM";
  if (text.includes("paid")) return "PAID";
  if (text.includes("contact") || text.includes("custom")) return "CONTACT";
  return "FREE";
}

async function main() {
  const clear = process.argv.includes("--clear");
  const verifiedPath =
    readArgValue(process.argv.slice(2), "--verified") ||
    "storage/imports/all-tools-website-verified.json";
  const inaccessiblePath =
    readArgValue(process.argv.slice(2), "--inaccessible") ||
    "storage/imports/all-tools-inaccessible-records.json";

  const verified = loadJson(verifiedPath);
  const inaccessible = loadJson(inaccessiblePath);

  if (clear) {
    await clearAllTools();
  }

  const verifiedResult = await importDataset(verified, {
    forceDraft: false,
    importSource: "all-tools-website-verified",
  });
  const inaccessibleResult = await importDataset(inaccessible, {
    forceDraft: true,
    importSource: "all-tools-inaccessible-records",
  });

  console.log(
    JSON.stringify(
      {
        clear,
        verified: verifiedResult,
        inaccessible: inaccessibleResult,
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
