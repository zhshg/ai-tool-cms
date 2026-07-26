import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, ToolStatus } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const CATEGORY_NAME_BY_SLUG = {
  "ai-writing": "AI Writing",
  "ai-chatbots": "AI Chatbots",
  "ai-image": "AI Image",
  "ai-video": "AI Video",
  "ai-audio": "AI Audio",
  "ai-coding": "AI Coding",
  "ai-seo": "AI SEO",
  "ai-marketing": "AI Marketing",
  "ai-productivity": "AI Productivity",
  "ai-design": "AI Design",
  "ai-business": "AI Business",
  "ai-research": "AI Research",
  "ai-education": "AI Education",
  "ai-agents": "AI Agents",
  "ai-data": "AI Data",
  "ai-presentation": "AI Presentation",
  "ai-social-media": "AI Social Media",
  "ai-customer-support": "AI Customer Support",
  "ai-developer-tools": "AI Developer Tools",
  "ai-automation": "AI Automation",
};

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
    readArgValue(process.argv.slice(2), "--input") ||
    "storage/crawler/futurepedia/tools202607122254.json";
  const absolutePath = path.resolve(rootDir(), datasetPath);
  const payload = JSON.parse(readFileSync(absolutePath, "utf8"));
  const items = Array.isArray(payload.items) ? payload.items : [];
  return { path: absolutePath, items };
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeDomain(value) {
  const url = normalizeUrl(value);
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function resolveWebsite(record) {
  return (
    normalizeUrl(record.website) ||
    normalizeUrl(record.url) ||
    normalizeUrl(record.metadata && record.metadata.sourceUrl)
  );
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function trimTo(value, maxLength) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
}

function normalizeFreeText(value, maxLength) {
  const text = trimTo(value, maxLength);
  return text || null;
}

function normalizePricingModel(value) {
  const text = trimTo(value, 120).toLowerCase();
  if (!text) return "FREEMIUM";
  if (text.includes("free") && !text.includes("paid")) return "FREE";
  if (text.includes("contact") || text.includes("custom")) return "CONTACT";
  if (text.includes("freemium")) return "FREEMIUM";
  if (text.includes("paid") || text.includes("pro") || text.includes("premium")) return "PAID";
  return "FREEMIUM";
}

function extractCategories(record) {
  const fromMetadata =
    record && record.metadata && Array.isArray(record.metadata.sourceCategories)
      ? record.metadata.sourceCategories
      : [];
  const categories = fromMetadata
    .map((item) => ({
      slug: slugify(item.slug || item.name),
      name: String(item.name || item.slug || "").trim(),
    }))
    .filter((item) => item.slug);
  if (categories.length > 0) return categories;

  const fallbackSlug = slugify((record && (record.categorySlug || record.category)) || "");
  if (fallbackSlug) {
    return [{ slug: fallbackSlug, name: CATEGORY_NAME_BY_SLUG[fallbackSlug] || fallbackSlug }];
  }

  return [];
}

function ensureFallbackCategory(categories) {
  if (categories.length > 0) return categories;
  return [{ slug: "uncategorized", name: "Uncategorized" }];
}

function extractScreenshots(record) {
  const screenshots = toStringArray(record && record.metadata && record.metadata.screenshots);
  return unique(screenshots.map((item) => normalizeUrl(item)).filter(Boolean)).slice(0, 6);
}

async function ensureCategory(category) {
  const existing = await prisma.category.findFirst({
    where: { slug: category.slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      slug: category.slug,
      name: category.name || CATEGORY_NAME_BY_SLUG[category.slug] || category.slug,
      description: `${category.name || category.slug} tools imported from Futurepedia.`,
      metaTitle: `${category.name || category.slug} AI Tools`,
      metaDescription: `Browse ${category.name || category.slug} tools imported from Futurepedia.`,
      metadata: { importSource: "futurepedia" },
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureTagIds(tags) {
  const ids = [];
  for (const tagName of unique(toStringArray(tags))) {
    const slug = slugify(tagName);
    if (!slug) continue;
    const existing = await prisma.tag.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await prisma.tag.create({
      data: {
        slug,
        name: tagName,
        description: `${tagName} tools imported from Futurepedia.`,
        metadata: { importSource: "futurepedia" },
      },
      select: { id: true },
    });
    ids.push(created.id);
  }
  return ids;
}

async function syncPrimaryCategory(toolId, categoryId) {
  await prisma.toolCategory.upsert({
    where: { toolId_categoryId: { toolId, categoryId } },
    update: { isPrimary: true, deletedAt: null },
    create: { toolId, categoryId, isPrimary: true },
  });
}

async function syncSecondaryCategories(toolId, categoryIds) {
  for (const categoryId of categoryIds) {
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId, categoryId } },
      update: { deletedAt: null, isPrimary: false },
      create: { toolId, categoryId, isPrimary: false },
    });
  }
}

async function syncTags(toolId, tagIds) {
  for (const tagId of tagIds) {
    await prisma.toolTag.upsert({
      where: { toolId_tagId: { toolId, tagId } },
      update: { deletedAt: null },
      create: { toolId, tagId },
    });
  }
}

async function findExistingTool(record) {
  const slug = slugify(record.slug || record.name);
  const website = resolveWebsite(record);
  const domain = normalizeDomain(website);
  if (slug) {
    const bySlug = await prisma.tool.findFirst({ where: { slug, deletedAt: null } });
    if (bySlug) return bySlug;
  }
  if (website) {
    const byWebsite = await prisma.tool.findFirst({ where: { website, deletedAt: null } });
    if (byWebsite) return byWebsite;
  }
  if (domain) {
    const candidates = await prisma.tool.findMany({
      where: { deletedAt: null },
      select: { id: true, website: true },
    });
    const matched = candidates.find((item) => normalizeDomain(item.website) === domain);
    if (matched) {
      return prisma.tool.findFirst({ where: { id: matched.id, deletedAt: null } });
    }
  }
  return null;
}

function buildMetadata(existingMetadata, record, screenshots) {
  const existing = existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  return {
    ...existing,
    source: "futurepedia",
    sourceUrl: (record.metadata && record.metadata.sourceUrl) || existing.sourceUrl || null,
    sourceSlug:
      (record.metadata && record.metadata.sourceSlug) || existing.sourceSlug || record.slug || null,
    sourceCategories:
      (record.metadata && record.metadata.sourceCategories) || existing.sourceCategories || [],
    sourcePricingModel:
      (record.metadata && record.metadata.sourcePricingModel) ||
      existing.sourcePricingModel ||
      null,
    screenshots,
    crawledAt: (record.metadata && record.metadata.crawledAt) || existing.crawledAt || null,
    crawlerVersion:
      (record.metadata && record.metadata.crawlerVersion) || existing.crawlerVersion || "1.0.0",
    tags: (record.metadata && record.metadata.tags) || existing.tags || [],
    importSource: "futurepedia",
    importUpdatedAt: new Date().toISOString(),
    collectedLogoUrl: normalizeUrl(record.logoUrl) || existing.collectedLogoUrl || null,
  };
}

function buildToolData(record, screenshots) {
  return {
    slug: trimTo(slugify(record.slug || record.name), 120),
    name: trimTo(record.name || "", 200),
    website: resolveWebsite(record),
    logoUrl: normalizeUrl(record.logoUrl),
    summary: normalizeFreeText(record.summary, 500),
    description: normalizeFreeText(record.description, 1800),
    longDescription: normalizeFreeText(record.longDescription, 18000),
    pricingModel: normalizePricingModel(record.pricingModel),
    status:
      String(record.status || "").toUpperCase() === "PUBLISHED"
        ? ToolStatus.PUBLISHED
        : ToolStatus.DRAFT,
    publishedAt: record.publishedAt ? new Date(record.publishedAt) : new Date(),
    metaTitle: normalizeFreeText(record.metaTitle, 160),
    metaDescription: normalizeFreeText(record.metaDescription, 320),
    metadata: buildMetadata({}, record, screenshots),
    deletedAt: null,
  };
}

async function main() {
  const { path: datasetPath, items } = loadDataset();
  let created = 0;
  let updated = 0;
  let logoUpdated = 0;
  let screenshotsUpdated = 0;
  let skipped = 0;

  for (const record of items) {
    const existing = await findExistingTool(record);
    const categories = ensureFallbackCategory(extractCategories(record));
    const primaryCategory = categories[0] || null;
    const secondaryCategories = categories.slice(1);
    const screenshots = extractScreenshots(record);
    const tags = unique([
      ...toStringArray(record.metadata && record.metadata.tags),
      ...toStringArray(record.tags),
    ]);
    const tagIds = await ensureTagIds(tags);
    const categoryIds = [];
    for (const category of categories) {
      categoryIds.push(await ensureCategory(category));
    }

    if (!existing) {
      const website = resolveWebsite(record);
      if (!website) {
        skipped += 1;
        continue;
      }

      const tool = await prisma.tool.create({
        data: buildToolData(record, screenshots),
      });

      if (primaryCategory) {
        await syncPrimaryCategory(tool.id, categoryIds[0]);
        if (categoryIds.length > 1) {
          await syncSecondaryCategories(tool.id, categoryIds.slice(1));
        }
      }
      if (tagIds.length > 0) await syncTags(tool.id, tagIds);
      created += 1;
      continue;
    }

    const nextLogoUrl = normalizeUrl(record.logoUrl);
    const nextScreenshots = screenshots;
    const existingMetadata =
      existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
    const existingScreenshots = Array.isArray(existingMetadata.screenshots)
      ? existingMetadata.screenshots.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const logoChanged = Boolean(nextLogoUrl) && nextLogoUrl !== existing.logoUrl;
    const screenshotsChanged =
      nextScreenshots.length > 0 &&
      JSON.stringify(nextScreenshots) !== JSON.stringify(existingScreenshots);

    if (logoChanged || screenshotsChanged) {
      await prisma.tool.update({
        where: { id: existing.id },
        data: {
          ...(logoChanged ? { logoUrl: nextLogoUrl } : {}),
          metadata: buildMetadata(
            existingMetadata,
            record,
            nextScreenshots.length > 0 ? nextScreenshots : existingScreenshots,
          ),
        },
      });
      updated += 1;
      if (logoChanged) logoUpdated += 1;
      if (screenshotsChanged) screenshotsUpdated += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        input: datasetPath,
        total: items.length,
        created,
        updated,
        logoUpdated,
        screenshotsUpdated,
        skipped,
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
