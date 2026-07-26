import { PrismaClient } from "../../packages/database/generated/client/index.js";
import {
  CATEGORIES_INDEX,
  TAGS_INDEX,
  TOOLS_INDEX,
  ensureSearchIndexes,
  getMeiliClient,
} from "../../packages/search/dist/index.js";

const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 10 * 60 * 1000;
const prisma = new PrismaClient();

await main();

async function main() {
  const meili = getMeiliClient();
  if (!meili) {
    throw new Error("MeiliSearch is not configured.");
  }

  await ensureSearchIndexes();

  const [tools, categories, tags] = await Promise.all([
    loadToolDocuments(),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.tag.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);

  const results = {};
  if (tools.length > 0) {
    const task = await meili.index(TOOLS_INDEX).addDocuments(tools);
    results.toolsTask = task.taskUid;
    await waitForTask(meili, task.taskUid);
  }
  if (categories.length > 0) {
    const task = await meili.index(CATEGORIES_INDEX).addDocuments(
      categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        updatedAt: category.updatedAt.toISOString(),
        searchableText: [category.name, category.slug, category.description]
          .filter(Boolean)
          .join(" "),
      })),
    );
    results.categoriesTask = task.taskUid;
    await waitForTask(meili, task.taskUid);
  }
  if (tags.length > 0) {
    const task = await meili.index(TAGS_INDEX).addDocuments(
      tags.map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        name: tag.name,
        description: tag.description,
        updatedAt: tag.updatedAt.toISOString(),
        searchableText: [tag.name, tag.slug, tag.description].filter(Boolean).join(" "),
      })),
    );
    results.tagsTask = task.taskUid;
    await waitForTask(meili, task.taskUid);
  }

  console.log(
    JSON.stringify(
      {
        configured: true,
        indexes: [TOOLS_INDEX, CATEGORIES_INDEX, TAGS_INDEX],
        imported: { tools: tools.length, categories: categories.length, tags: tags.length },
        ...results,
      },
      null,
      2,
    ),
  );
}

async function loadToolDocuments() {
  const tools = await prisma.tool.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    include: {
      categories: { where: { deletedAt: null }, include: { category: true } },
      tags: { where: { deletedAt: null }, include: { tag: true } },
      reviews: { where: { status: "APPROVED", deletedAt: null } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tools.map((tool) => {
    const metadata = tool.metadata ?? {};
    const tagSlugs = tool.tags.map((item) => item.tag.slug);
    const popularityScore = Number(metadata.popularityScore ?? metadata.overallScore ?? 0);
    const document = {
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      description: tool.description ?? undefined,
      summary: tool.summary ?? undefined,
      website: tool.website,
      logoUrl: tool.logoUrl ?? undefined,
      pricingModel: tool.pricingModel,
      categorySlugs: tool.categories.map((item) => item.category.slug),
      categoryNames: tool.categories.map((item) => item.category.name),
      tagSlugs,
      tagNames: tool.tags.map((item) => item.tag.name),
      platforms: normalizeStringList(metadata.aiPlatforms ?? metadata.platforms),
      languages: normalizeStringList(metadata.aiLanguages ?? metadata.languages),
      features: normalizeStringList(metadata.aiFeatures ?? metadata.features),
      useCases: normalizeStringList(metadata.aiUseCases ?? metadata.useCases),
      hasApi: hasApiAccess(metadata),
      isFree: tool.pricingModel === "FREE" || tool.pricingModel === "FREEMIUM",
      isOpenSource: isOpenSourceTool(metadata, tagSlugs),
      popularityScore,
      trendingScore: Number(metadata.trendingScore ?? popularityScore),
      reviewScore:
        tool.reviews.length > 0
          ? tool.reviews.reduce((sum, review) => sum + review.rating, 0) / tool.reviews.length
          : 0,
      publishedAt: tool.publishedAt?.toISOString(),
      updatedAt: tool.updatedAt.toISOString(),
      searchableText: "",
    };
    document.searchableText = [document.name, document.summary, document.description]
      .filter(Boolean)
      .join(" ");
    return document;
  });
}

async function waitForTask(meili, taskUid) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < TIMEOUT_MS) {
    const task = await meili.getTask(taskUid);
    if (task.status === "succeeded") return task;
    if (task.status === "failed") {
      throw new Error(`Meili task ${taskUid} failed: ${task.error?.message ?? "unknown error"}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timed out waiting for Meili task ${taskUid}`);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function hasApiAccess(metadata) {
  const explicit = metadata.hasApi ?? metadata.apiAccess ?? metadata.aiApiAccess ?? metadata.api;
  if (typeof explicit === "boolean") return explicit;
  const integrations = normalizeStringList(metadata.aiIntegrations ?? metadata.integrations);
  return integrations.some((item) => /api|webhook|zapier|make|n8n/i.test(item));
}

function isOpenSourceTool(metadata, tagSlugs) {
  if (metadata.openSource === true || metadata.isOpenSource === true) return true;
  return tagSlugs.some((slug) => ["open-source", "opensource", "oss"].includes(slug));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
