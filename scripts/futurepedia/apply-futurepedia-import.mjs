import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PrismaClient,
  PricingModel,
  ToolStatus,
} from "../../packages/database/generated/client/index.js";

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

function loadImportDataset() {
  const datasetPath =
    readArgValue(process.argv.slice(2), "--input") ??
    "storage/imports/futurepedia/futurepedia-all-import-with-media.json";
  const absolutePath = path.resolve(rootDir(), datasetPath);
  return {
    path: absolutePath,
    records: JSON.parse(readFileSync(absolutePath, "utf8")),
  };
}

function normalizeDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function toMetadata(existingMetadata, record) {
  const existing = existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const nextScreenshots = toStringArray(record.screenshots).slice(0, 6);
  return {
    ...existing,
    features: toStringArray(record.features),
    useCases: toStringArray(record.useCases),
    alternatives: toStringArray(record.alternatives),
    alternativeSlugs: toStringArray(record.alternatives)
      .map((item) =>
        item
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      )
      .filter(Boolean),
    tags: toStringArray(record.tags),
    categorySlug: record.categorySlug,
    importSource: "futurepedia",
    importSourceUrl: record.sourceUrl ?? null,
    importUpdatedAt: new Date().toISOString(),
    screenshots: nextScreenshots,
    collectedLogoUrl: record.logoUrl ?? existing.collectedLogoUrl ?? null,
  };
}

function mapPricingModel(value) {
  switch (String(value ?? "").toUpperCase()) {
    case "FREE":
      return PricingModel.FREE;
    case "FREEMIUM":
      return PricingModel.FREEMIUM;
    case "PAID":
      return PricingModel.PAID;
    case "CONTACT":
      return PricingModel.CONTACT;
    default:
      return PricingModel.FREEMIUM;
  }
}

async function ensureCategoryId(categorySlug) {
  const existing = await prisma.category.findFirst({
    where: { slug: categorySlug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const name = CATEGORY_NAME_BY_SLUG[categorySlug] ?? categorySlug;
  const created = await prisma.category.create({
    data: {
      slug: categorySlug,
      name,
      description: `${name} tools imported from Futurepedia.`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse ${name} tools imported from Futurepedia and reviewed in ToolsDar.`,
      sortOrder: 999,
      metadata: { importSource: "futurepedia" },
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureTagIds(tags) {
  const ids = [];
  for (const tagName of toStringArray(tags)) {
    const slug = tagName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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
  const slug = String(record.slug ?? "").trim();
  const website = String(record.websiteUrl ?? record.website ?? "").trim();
  const domain = normalizeDomain(website);
  if (slug) {
    const bySlug = await prisma.tool.findFirst({
      where: { slug, deletedAt: null },
    });
    if (bySlug) return bySlug;
  }
  if (website) {
    const byWebsite = await prisma.tool.findFirst({
      where: { website, deletedAt: null },
    });
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

async function main() {
  const { path: datasetPath, records } = loadImportDataset();
  let created = 0;
  let updated = 0;
  let mediaUpdated = 0;

  for (const record of records) {
    const categoryId = await ensureCategoryId(record.categorySlug);
    const tagIds = await ensureTagIds(record.tags);
    const existing = await findExistingTool(record);
    const metadata = toMetadata(existing?.metadata, record);

    const toolData = {
      name: record.name,
      website: record.websiteUrl ?? record.website,
      logoUrl: record.logoUrl ?? existing?.logoUrl ?? null,
      summary: record.summary ?? record.shortDescription ?? null,
      description: record.description ?? null,
      longDescription: record.description ?? null,
      pricingModel: mapPricingModel(record.pricingModel),
      status: record.status === "Published" ? ToolStatus.PUBLISHED : ToolStatus.DRAFT,
      publishedAt:
        record.status === "Published"
          ? (existing?.publishedAt ?? new Date())
          : (existing?.publishedAt ?? null),
      metaTitle: record.metaTitle ?? record.seoTitle ?? null,
      metaDescription: record.metaDescription ?? record.seoDescription ?? null,
      metadata,
      deletedAt: null,
    };

    let tool;
    if (existing) {
      tool = await prisma.tool.update({
        where: { id: existing.id },
        data: toolData,
      });
      updated += 1;
      if (record.logoUrl || toStringArray(record.screenshots).length > 0) {
        mediaUpdated += 1;
      }
    } else {
      tool = await prisma.tool.create({
        data: {
          slug: record.slug,
          ...toolData,
        },
      });
      created += 1;
    }

    await syncPrimaryCategory(tool.id, categoryId);
    await syncTags(tool.id, tagIds);
  }

  console.log(
    JSON.stringify(
      {
        input: datasetPath,
        total: records.length,
        created,
        updated,
        mediaUpdated,
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
