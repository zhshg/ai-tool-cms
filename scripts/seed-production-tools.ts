import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PricingModel, ToolStatus } from "../packages/database/generated/client";
import { prisma } from "../prisma/seeds/context";
import { slugify } from "@ai-tool-cms/common";

type CuratedToolRecord = {
  name: string;
  slug: string;
  website: string;
  summary: string;
  description: string;
  primary_category: string;
  secondary_categories?: string[];
  tags?: string[];
  pricing: "Free" | "Freemium" | "Paid" | "Custom" | "Trial" | "Open Source";
  features?: string[];
  use_cases?: string[];
  target_users?: string[];
  languages?: string[];
  platform?: string[];
  seo_title: string;
  seo_description: string;
};

type ToolPlan = {
  slug: string;
  website: string;
  mode: "create" | "update" | "skip";
  reasons: string[];
  matchedToolId: string | null;
  nextStatus: ToolStatus;
  logoUrl: string | null;
};

type ExistingToolRow = {
  id: string;
  slug: string;
  name: string;
  website: string;
  logoUrl: string | null;
  summary: string | null;
  description: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: ToolStatus;
  metadata: Record<string, unknown>;
  deletedAt: Date | null;
};

const FEATURED_SLUGS = new Set([
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "cursor",
  "github-copilot",
  "midjourney",
  "runway",
]);

async function main() {
  const args = new Set(process.argv.slice(2));
  const shouldApply = args.has("--apply");
  const isDryRun = !shouldApply;
  const dataset = loadDataset();

  const existingRows = await prisma.tool.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      website: true,
      logoUrl: true,
      summary: true,
      description: true,
      longDescription: true,
      metaTitle: true,
      metaDescription: true,
      status: true,
      metadata: true,
      deletedAt: true,
    },
  });

  const existingTools = existingRows.map((row) => ({
    ...row,
    metadata: toRecord(row.metadata),
  })) satisfies ExistingToolRow[];

  const plan = buildPlan(dataset, existingTools);
  const currentStats = await loadCurrentStats();
  const suspectedFake = detectSuspectedFakeTools(existingTools);

  printReport({
    isDryRun,
    currentStats,
    datasetCount: dataset.length,
    plan,
    suspectedFake,
  });

  if (isDryRun) return;

  await applyPlan(dataset, existingTools, plan);
  console.info("[seed:tools] apply complete");
}

function loadDataset(): CuratedToolRecord[] {
  const currentFilePath = fileURLToPath(import.meta.url);
  const rootDir = path.resolve(path.dirname(currentFilePath), "..");
  const datasetPath = path.join(rootDir, "docs", "import", "first-50-ai-tools.json");
  return JSON.parse(readFileSync(datasetPath, "utf8")) as CuratedToolRecord[];
}

function buildPlan(dataset: CuratedToolRecord[], existingTools: ExistingToolRow[]): ToolPlan[] {
  const bySlug = new Map(existingTools.map((tool) => [tool.slug, tool]));
  const byWebsite = new Map(existingTools.map((tool) => [normalizeWebsite(tool.website), tool]));

  return dataset.map((record) => {
    const normalizedSlug = slugify(record.slug || record.name);
    const normalizedWebsite = normalizeWebsite(record.website);
    const existing = bySlug.get(normalizedSlug) ?? byWebsite.get(normalizedWebsite) ?? null;
    const logoUrl = buildLogoUrl(record.website);
    const reasons: string[] = [];

    if (!existing) {
      reasons.push("missing in database");
      return {
        slug: normalizedSlug,
        website: record.website,
        mode: "create",
        reasons,
        matchedToolId: null,
        nextStatus: ToolStatus.PUBLISHED,
        logoUrl,
      };
    }

    const needsSummary = isEmpty(existing.summary);
    const needsDescription = isEmpty(existing.description);
    const needsLongDescription = isEmpty(existing.longDescription);
    const needsLogo = isEmpty(existing.logoUrl);
    const needsSeo = isEmpty(existing.metaTitle) || isEmpty(existing.metaDescription);
    const suspicious = isLikelyPlaceholder(existing);
    const websiteChanged = normalizeWebsite(existing.website) !== normalizedWebsite;

    if (needsSummary) reasons.push("missing summary");
    if (needsDescription) reasons.push("missing description");
    if (needsLongDescription) reasons.push("missing longDescription");
    if (needsLogo && logoUrl) reasons.push("missing logoUrl");
    if (needsSeo) reasons.push("missing SEO");
    if (websiteChanged) reasons.push("website differs from curated dataset");
    if (suspicious) reasons.push("suspected placeholder content");
    if (existing.status !== ToolStatus.PUBLISHED) reasons.push("not published");

    return {
      slug: normalizedSlug,
      website: record.website,
      mode: reasons.length ? "update" : "skip",
      reasons,
      matchedToolId: existing.id,
      nextStatus: ToolStatus.PUBLISHED,
      logoUrl,
    };
  });
}

async function loadCurrentStats() {
  const [total, published, withLogo, withSummary, withCategory] = await Promise.all([
    prisma.tool.count({ where: { deletedAt: null } }),
    prisma.tool.count({ where: { deletedAt: null, status: ToolStatus.PUBLISHED } }),
    prisma.tool.count({ where: { deletedAt: null, NOT: { logoUrl: null } } }),
    prisma.tool.count({ where: { deletedAt: null, NOT: { summary: null } } }),
    prisma.tool.count({
      where: {
        deletedAt: null,
        categories: { some: { deletedAt: null } },
      },
    }),
  ]);

  return { total, published, withLogo, withSummary, withCategory };
}

function detectSuspectedFakeTools(existingTools: ExistingToolRow[]) {
  return existingTools
    .filter((tool) => isLikelyPlaceholder(tool))
    .map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      website: tool.website,
      status: tool.status,
    }));
}

function printReport(input: {
  isDryRun: boolean;
  currentStats: Awaited<ReturnType<typeof loadCurrentStats>>;
  datasetCount: number;
  plan: ToolPlan[];
  suspectedFake: Array<{ slug: string; name: string; website: string; status: ToolStatus }>;
}) {
  const createCount = input.plan.filter((item) => item.mode === "create").length;
  const updateCount = input.plan.filter((item) => item.mode === "update").length;
  const skipCount = input.plan.filter((item) => item.mode === "skip").length;

  console.info(`[seed:tools] mode=${input.isDryRun ? "dry-run" : "apply"}`);
  console.info(
    `[seed:tools] current total=${input.currentStats.total}, published=${input.currentStats.published}, withLogo=${input.currentStats.withLogo}, withSummary=${input.currentStats.withSummary}, withCategory=${input.currentStats.withCategory}`,
  );
  console.info(
    `[seed:tools] dataset=${input.datasetCount}, create=${createCount}, update=${updateCount}, skip=${skipCount}, suspectedFake=${input.suspectedFake.length}`,
  );

  for (const item of input.plan.slice(0, 12)) {
    console.info(
      `[seed:tools] plan ${item.mode.toUpperCase()} ${item.slug} ${item.reasons.length ? `(${item.reasons.join("; ")})` : ""}`,
    );
  }

  if (input.suspectedFake.length) {
    console.info("[seed:tools] suspected placeholder tools:");
    for (const item of input.suspectedFake.slice(0, 10)) {
      console.info(`  - ${item.slug} | ${item.website} | ${item.status}`);
    }
    console.info(
      "[seed:tools] recommendation: review these rows manually and archive them only after validating they are not real curated entries.",
    );
  }
}

async function applyPlan(
  dataset: CuratedToolRecord[],
  existingTools: ExistingToolRow[],
  plan: ToolPlan[],
) {
  const bySlug = new Map(existingTools.map((tool) => [tool.slug, tool]));
  const byWebsite = new Map(existingTools.map((tool) => [normalizeWebsite(tool.website), tool]));

  for (const record of dataset) {
    const normalizedSlug = slugify(record.slug || record.name);
    const existing = bySlug.get(normalizedSlug) ?? byWebsite.get(normalizeWebsite(record.website)) ?? null;
    const primaryCategoryId = await upsertCategory(record.primary_category);
    const secondaryCategoryIds = await Promise.all(
      (record.secondary_categories ?? []).map((category) => upsertCategory(category)),
    );
    const tagIds = await Promise.all((record.tags ?? []).map((tag) => upsertTag(tag)));
    const logoUrl = buildLogoUrl(record.website);
    const metadata = buildToolMetadata(record, existing?.metadata ?? {});

    if (!existing) {
      const created = await prisma.tool.create({
        data: {
          slug: normalizedSlug,
          name: record.name,
          website: record.website,
          logoUrl,
          summary: record.summary,
          description: record.description,
          longDescription: buildLongDescription(record),
          pricingModel: mapPricing(record.pricing),
          status: ToolStatus.PUBLISHED,
          publishedAt: new Date(),
          metaTitle: record.seo_title,
          metaDescription: record.seo_description,
          metadata,
        },
      });
      await syncToolCategories(created.id, [primaryCategoryId, ...secondaryCategoryIds]);
      await syncToolTags(created.id, tagIds);
      continue;
    }

    await prisma.tool.update({
      where: { id: existing.id },
      data: {
        name: chooseValue(existing.name, record.name, false),
        website: chooseValue(existing.website, record.website, isLikelyPlaceholder(existing)),
        logoUrl: chooseValue(existing.logoUrl, logoUrl, isLikelyPlaceholder(existing)),
        summary: chooseValue(existing.summary, record.summary, isLikelyPlaceholder(existing)),
        description: chooseValue(existing.description, record.description, isLikelyPlaceholder(existing)),
        longDescription: chooseValue(
          existing.longDescription,
          buildLongDescription(record),
          isLikelyPlaceholder(existing),
        ),
        pricingModel: mapPricing(record.pricing),
        status: ToolStatus.PUBLISHED,
        publishedAt: existing.status === ToolStatus.PUBLISHED ? undefined : new Date(),
        metaTitle: chooseValue(existing.metaTitle, record.seo_title, isLikelyPlaceholder(existing)),
        metaDescription: chooseValue(
          existing.metaDescription,
          record.seo_description,
          isLikelyPlaceholder(existing),
        ),
        metadata,
      },
    });

    await syncToolCategories(existing.id, [primaryCategoryId, ...secondaryCategoryIds]);
    await syncToolTags(existing.id, tagIds);
  }
}

async function upsertCategory(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.category.create({
    data: {
      slug,
      name,
      description: `${name} AI tools category`,
      metaTitle: `${name} AI Tools`,
      metaDescription: `Browse AI tools for ${name.toLowerCase()} workflows.`,
    },
  });
  return created.id;
}

async function upsertTag(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await prisma.tag.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.tag.create({
    data: {
      slug,
      name,
      description: `${name} related AI tools`,
    },
  });
  return created.id;
}

async function syncToolCategories(toolId: string, categoryIds: string[]) {
  const uniqueIds = [...new Set(categoryIds)].filter(Boolean);
  for (const [index, categoryId] of uniqueIds.entries()) {
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId, categoryId } },
      update: { deletedAt: null, isPrimary: index === 0 },
      create: { toolId, categoryId, isPrimary: index === 0 },
    });
  }
}

async function syncToolTags(toolId: string, tagIds: string[]) {
  const uniqueIds = [...new Set(tagIds)].filter(Boolean);
  for (const tagId of uniqueIds) {
    await prisma.toolTag.upsert({
      where: { toolId_tagId: { toolId, tagId } },
      update: { deletedAt: null },
      create: { toolId, tagId },
    });
  }
}

function buildToolMetadata(
  record: CuratedToolRecord,
  existingMetadata: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existingMetadata,
    features: uniqueStrings(record.features ?? []),
    useCases: uniqueStrings(record.use_cases ?? []),
    languages: uniqueStrings(record.languages ?? []),
    platforms: uniqueStrings(record.platform ?? []),
    targetUsers: uniqueStrings(record.target_users ?? []),
    faviconUrl: buildLogoUrl(record.website),
    canonicalUrl: record.website,
    featured: FEATURED_SLUGS.has(record.slug),
    seedSource: "production-curated-tools",
    seedUpdatedAt: new Date().toISOString(),
  };
}

function buildLongDescription(record: CuratedToolRecord): string {
  const useCases = uniqueStrings(record.use_cases ?? []).slice(0, 4).join(", ");
  const features = uniqueStrings(record.features ?? []).slice(0, 4).join(", ");
  const targetUsers = uniqueStrings(record.target_users ?? []).slice(0, 4).join(", ");

  return [
    record.description,
    useCases ? `${record.name} is commonly used to ${useCases.toLowerCase()}.` : "",
    features ? `Core capabilities include ${features.toLowerCase()}.` : "",
    targetUsers ? `Typical users include ${targetUsers.toLowerCase()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function mapPricing(pricing: CuratedToolRecord["pricing"]): PricingModel {
  switch (pricing) {
    case "Free":
    case "Open Source":
      return PricingModel.FREE;
    case "Freemium":
    case "Trial":
      return PricingModel.FREEMIUM;
    case "Paid":
      return PricingModel.PAID;
    case "Custom":
      return PricingModel.CONTACT;
    default:
      return PricingModel.FREE;
  }
}

function buildLogoUrl(website: string): string | null {
  try {
    const hostname = new URL(website).hostname;
    if (!hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
}

function chooseValue<T extends string | null>(
  currentValue: T,
  nextValue: string | null,
  allowReplace: boolean,
): T | string | undefined {
  if (!isEmpty(currentValue) && !allowReplace) return undefined;
  if (isEmpty(nextValue)) return undefined;
  return nextValue;
}

function isLikelyPlaceholder(tool: ExistingToolRow): boolean {
  const combinedText = [
    tool.name,
    tool.summary,
    tool.description,
    tool.longDescription,
    tool.metaTitle,
    tool.metaDescription,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    normalizeWebsite(tool.website).includes("example.com") ||
    /bulk seeded|production-style|placeholder|demo data|seeded tool|pilot|forge|flow/.test(
      combinedText,
    )
  );
}

function normalizeWebsite(website: string): string {
  return website.trim().replace(/\/+$/, "").toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isEmpty(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

main()
  .catch((error) => {
    console.error("[seed:tools] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
