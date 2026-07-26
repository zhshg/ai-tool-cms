import { BillingPeriod, PricingModel, ToolStatus } from "../../packages/database/generated/client";
import {
  STANDARD_AI_CATEGORIES,
  resolveCanonicalCategorySlug,
  resolveCanonicalCategorySlugs,
  slugify,
} from "@ai-tool-cms/common";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

type ImportToolRecord = {
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

type AlternativeContext = {
  alternativeSlugs: string[];
  alternativeNames: string[];
};

type ValidationResult = {
  toolCount: number;
  errors: string[];
};

type CategorySeed = {
  name: string;
  description: string;
  sortOrder: number;
};

const PRIMARY_CATEGORIES: CategorySeed[] = [
  ...STANDARD_AI_CATEGORIES.map((category) => ({
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
  })),
];

const ALLOWED_PRICING = new Set(["Free", "Freemium", "Paid", "Custom", "Trial", "Open Source"]);

function datasetPath(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  return path.resolve(currentDir, "../../docs/import/first-50-ai-tools.json");
}

function loadCuratedTools(): ImportToolRecord[] {
  const raw = readFileSync(datasetPath(), "utf8");
  return JSON.parse(raw) as ImportToolRecord[];
}

function normalizeWebsite(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
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

function validateCuratedTools(tools: ImportToolRecord[]): ValidationResult {
  const errors: string[] = [];
  const slugSet = new Set<string>();
  const websiteSet = new Set<string>();
  const categorySet = new Set(PRIMARY_CATEGORIES.map((category) => category.name));

  if (tools.length !== 50) {
    errors.push(`Expected 50 tools but found ${tools.length}`);
  }

  for (const tool of tools) {
    const requiredFields = [
      ["name", tool.name],
      ["slug", tool.slug],
      ["website", tool.website],
      ["summary", tool.summary],
      ["description", tool.description],
      ["primary_category", tool.primary_category],
      ["pricing", tool.pricing],
      ["seo_title", tool.seo_title],
      ["seo_description", tool.seo_description],
    ] as const;

    for (const [field, value] of requiredFields) {
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`${tool.slug || tool.name}: missing required field ${field}`);
      }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) {
      errors.push(`${tool.slug}: invalid slug format`);
    }

    if (slugSet.has(tool.slug)) {
      errors.push(`${tool.slug}: duplicate slug`);
    }
    slugSet.add(tool.slug);

    if (!/^https?:\/\//.test(tool.website)) {
      errors.push(`${tool.slug}: invalid website URL`);
    }

    const normalizedWebsite = normalizeWebsite(tool.website);
    if (websiteSet.has(normalizedWebsite)) {
      errors.push(`${tool.slug}: duplicate website`);
    }
    websiteSet.add(normalizedWebsite);

    const primaryCategoryName = getCanonicalCategoryName(tool.primary_category);
    if (!primaryCategoryName || !categorySet.has(primaryCategoryName)) {
      errors.push(`${tool.slug}: invalid primary category ${tool.primary_category}`);
    }

    const secondarySeen = new Set<string>();
    for (const category of tool.secondary_categories ?? []) {
      const canonicalSecondaryName = getCanonicalCategoryName(category);
      if (!canonicalSecondaryName || !categorySet.has(canonicalSecondaryName)) {
        errors.push(`${tool.slug}: invalid secondary category ${category}`);
      }
      if (canonicalSecondaryName === primaryCategoryName) {
        errors.push(`${tool.slug}: primary category repeated in secondary categories`);
      }
      if (canonicalSecondaryName && secondarySeen.has(canonicalSecondaryName)) {
        errors.push(`${tool.slug}: duplicate secondary category ${category}`);
      }
      if (canonicalSecondaryName) secondarySeen.add(canonicalSecondaryName);
    }

    const tagSeen = new Set<string>();
    for (const tag of tool.tags ?? []) {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) {
        errors.push(`${tool.slug}: empty tag`);
      }
      if (tagSeen.has(normalizedTag)) {
        errors.push(`${tool.slug}: duplicate tag ${tag}`);
      }
      if (categorySet.has(tag)) {
        errors.push(`${tool.slug}: tag duplicates category ${tag}`);
      }
      tagSeen.add(normalizedTag);
    }

    if (!ALLOWED_PRICING.has(tool.pricing)) {
      errors.push(`${tool.slug}: invalid pricing ${tool.pricing}`);
    }
  }

  return { toolCount: tools.length, errors };
}

function mapPricingModel(pricing: ImportToolRecord["pricing"]): PricingModel {
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

function buildLongDescription(tool: ImportToolRecord): string {
  const features = (tool.features ?? []).slice(0, 4).join(", ");
  const useCases = (tool.use_cases ?? []).slice(0, 4).join(", ");
  const targetUsers = (tool.target_users ?? []).slice(0, 4).join(", ");
  return [
    tool.description,
    `${tool.name} is listed in ToolsDar as a practical AI tool for teams comparing features, pricing, and workflow fit before adopting a new product.`,
    useCases ? `Popular workflows include ${useCases.toLowerCase()}.` : "",
    features ? `Core capabilities include ${features.toLowerCase()}.` : "",
    targetUsers ? `It is especially relevant for ${targetUsers.toLowerCase()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildFaq(
  tool: ImportToolRecord,
  alternatives: AlternativeContext,
): Array<{ slug: string; question: string; answer: string }> {
  return [
    {
      slug: `what-is-${tool.slug}`,
      question: `What is ${tool.name} used for?`,
      answer: `${tool.name} is used to ${tool.use_cases?.[0]?.toLowerCase() ?? "support practical AI workflows"} and help ${tool.target_users?.[0]?.toLowerCase() ?? "teams"} work more efficiently.`,
    },
    {
      slug: `who-should-use-${tool.slug}`,
      question: `Who should use ${tool.name}?`,
      answer: `${tool.name} is a strong fit for ${(tool.target_users ?? ["teams"]).join(", ").toLowerCase()} who need ${tool.summary.toLowerCase()}.`,
    },
    {
      slug: `best-alternatives-to-${tool.slug}`,
      question: `What are the best alternatives to ${tool.name}?`,
      answer:
        alternatives.alternativeNames.length > 0
          ? `Common alternatives to ${tool.name} include ${alternatives.alternativeNames.join(", ")} depending on your workflow, pricing needs, and preferred category.`
          : `${tool.name} can also be compared with other published tools in the same category when you want different pricing, workflow depth, or platform support.`,
    },
  ];
}

function buildPricingPlan(tool: ImportToolRecord): {
  slug: string;
  name: string;
  pricingModel: PricingModel;
  description: string;
  amount?: number;
  billingPeriod?: BillingPeriod;
} {
  const pricingModel = mapPricingModel(tool.pricing);

  if (tool.pricing === "Free" || tool.pricing === "Open Source") {
    return {
      slug: "free",
      name: tool.pricing,
      pricingModel,
      description:
        "Public access is available without a paid subscription tier in the curated dataset.",
      amount: 0,
    };
  }

  if (tool.pricing === "Freemium" || tool.pricing === "Trial") {
    return {
      slug: "starter",
      name: tool.pricing,
      pricingModel,
      description: "The official product offers a free entry point or trial before paid expansion.",
      billingPeriod: BillingPeriod.MONTHLY,
    };
  }

  if (tool.pricing === "Paid") {
    return {
      slug: "paid",
      name: "Paid",
      pricingModel,
      description: "The official product is positioned as a paid offering for ongoing use.",
      billingPeriod: BillingPeriod.MONTHLY,
    };
  }

  return {
    slug: "custom",
    name: "Custom",
    pricingModel,
    description: "The official product uses custom or enterprise pricing in the curated dataset.",
    billingPeriod: BillingPeriod.CUSTOM,
  };
}

function buildSnapshot(tool: ImportToolRecord): Record<string, unknown> {
  return {
    name: tool.name,
    pricing: {
      model: mapPricingModel(tool.pricing),
      tiers: [buildPricingPlan(tool)],
      languages: tool.languages ?? [],
      platforms: tool.platform ?? [],
    },
    features: tool.features ?? [],
    useCases: tool.use_cases ?? [],
    targetUsers: tool.target_users ?? [],
    platforms: tool.platform ?? [],
    aiSummary: tool.summary,
  };
}

function buildAlternativeContextMap(tools: ImportToolRecord[]): Map<string, AlternativeContext> {
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const context = new Map<string, AlternativeContext>();

  for (const tool of tools) {
    const primarySlug = resolveCanonicalCategorySlug(tool.primary_category);
    const secondarySlugs = new Set(
      (tool.secondary_categories ?? [])
        .flatMap((category) => resolveCanonicalCategorySlugs(category))
        .filter(Boolean),
    );

    const candidates = tools
      .filter((candidate) => candidate.slug !== tool.slug)
      .map((candidate) => {
        const candidatePrimary = resolveCanonicalCategorySlug(candidate.primary_category);
        const candidateSecondary = new Set(
          (candidate.secondary_categories ?? [])
            .flatMap((category) => resolveCanonicalCategorySlugs(category))
            .filter(Boolean),
        );
        let score = 0;
        if (primarySlug && candidatePrimary === primarySlug) score += 10;
        if (secondarySlugs.has(candidatePrimary ?? "")) score += 4;
        if (candidateSecondary.has(primarySlug ?? "")) score += 3;
        for (const slug of secondarySlugs) {
          if (candidateSecondary.has(slug)) score += 2;
        }
        if ((tool.tags ?? []).some((tag) => (candidate.tags ?? []).includes(tag))) score += 1;
        return { slug: candidate.slug, score };
      })
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
      .slice(0, 3);

    const alternativeSlugs = candidates.map((candidate) => candidate.slug);
    context.set(tool.slug, {
      alternativeSlugs,
      alternativeNames: alternativeSlugs
        .map((slug) => bySlug.get(slug)?.name)
        .filter((name): name is string => Boolean(name)),
    });
  }

  return context;
}

function buildSeoTitle(toolName: string): string {
  return `${toolName} Review, Features, Pricing and Alternatives`.slice(0, 160);
}

function buildSeoDescription(
  tool: ImportToolRecord,
  alternatives: AlternativeContext,
): string {
  const categoryLabel =
    getCanonicalCategoryName(tool.primary_category) ?? tool.primary_category ?? "AI";
  const alternativeText =
    alternatives.alternativeNames.length > 0
      ? ` Compare it with ${alternatives.alternativeNames.join(", ")}.`
      : "";
  const description = `${tool.name} helps teams ${tool.use_cases?.[0]?.toLowerCase() ?? "work faster"} with ${categoryLabel.toLowerCase()} workflows, pricing insights, key features, and real alternatives.${alternativeText}`;
  return description.slice(0, 155);
}

function buildPros(tool: ImportToolRecord): string[] {
  return [
    ...(tool.features ?? []).slice(0, 2).map((feature) => `${feature} supports daily workflows`),
    tool.use_cases?.[0] ? `${tool.use_cases[0]} without a long setup cycle` : "",
    tool.pricing === "Free" || tool.pricing === "Freemium"
      ? "Lower barrier to entry for evaluation and testing"
      : "Positioned for committed teams that need stronger output quality",
  ].filter(Boolean);
}

function buildCons(tool: ImportToolRecord): string[] {
  return [
    tool.pricing === "Paid" || tool.pricing === "Custom"
      ? "Full value may depend on paid access or sales-led plans"
      : "Advanced teams may still need deeper workflow customization",
    tool.platform?.includes("API")
      ? "API and integration depth can vary by plan and use case"
      : "Automation depth may be lighter than API-first tools",
    "Output quality still benefits from human review before publishing",
  ].filter(Boolean);
}

export async function seedCuratedTools(
  actorId: string,
): Promise<{ categoryIds: string[]; tagIds: string[]; toolIds: string[] }> {
  const tools = loadCuratedTools();
  const validation = validateCuratedTools(tools);
  const alternativeContextBySlug = buildAlternativeContextMap(tools);

  if (validation.errors.length > 0) {
    throw new Error(`Curated tool dataset validation failed:\n${validation.errors.join("\n")}`);
  }

  const categoryIdBySlug = new Map<string, string>();
  for (const category of STANDARD_AI_CATEGORIES) {
    const record = await upsertBySlug(
      prisma.category,
      category.slug,
      {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        createdById: actorId,
        metaTitle: category.seoTitle,
        metaDescription: category.seoDescription,
        metadata: { featured: category.isFeatured },
      },
      {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        deletedAt: null,
        updatedById: actorId,
        metaTitle: category.seoTitle,
        metaDescription: category.seoDescription,
        metadata: { featured: category.isFeatured },
      },
    );
    categoryIdBySlug.set(category.slug, record.id);
  }

  const tagNames = [
    ...new Set(
      tools
        .flatMap((tool) => tool.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const tagIdBySlug = new Map<string, string>();
  for (const tagName of tagNames) {
    const slug = slugify(tagName);
    const record = await upsertBySlug(
      prisma.tag,
      slug,
      {
        name: tagName,
        description: `${tagName} related AI tools and workflows`,
        createdById: actorId,
      },
      {
        name: tagName,
        description: `${tagName} related AI tools and workflows`,
        deletedAt: null,
        updatedById: actorId,
      },
    );
    tagIdBySlug.set(slug, record.id);
  }

  const toolIds: string[] = [];

  for (const [toolIndex, tool] of tools.entries()) {
    const alternatives = alternativeContextBySlug.get(tool.slug) ?? {
      alternativeSlugs: [],
      alternativeNames: [],
    };
    const canonicalCategorySlug = resolveCanonicalCategorySlug(tool.primary_category);
    const logoUrl = buildLogoUrl(tool.website);
    const metaTitle = buildSeoTitle(tool.name);
    const metaDescription = buildSeoDescription(tool, alternatives);
    const record = await upsertBySlug(
      prisma.tool,
      tool.slug,
      {
        name: tool.name,
        website: tool.website,
        logoUrl,
        pricingModel: mapPricingModel(tool.pricing),
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        summary: tool.summary,
        description: tool.description,
        longDescription: buildLongDescription(tool),
        createdById: actorId,
        metaTitle,
        metaDescription,
        metadata: {
          aiSummary: tool.summary,
          aiFeatures: tool.features ?? [],
          aiUseCases: tool.use_cases ?? [],
          aiPros: buildPros(tool),
          aiCons: buildCons(tool),
          aiAlternatives: alternatives.alternativeNames,
          alternativeSlugs: alternatives.alternativeSlugs,
          categorySlug: canonicalCategorySlug,
          tags: tool.tags ?? [],
          isFeatured: toolIndex < 12,
          isPublished: true,
          website: tool.website,
          logoUrl,
          features: tool.features ?? [],
          useCases: tool.use_cases ?? [],
          targetUsers: tool.target_users ?? [],
          languages: tool.languages ?? [],
          platforms: tool.platform ?? [],
          secondaryCategories: tool.secondary_categories ?? [],
          screenshots: [],
          sourceUrls: [tool.website],
          importSource: "docs/import/first-50-ai-tools.json",
        },
      },
      {
        name: tool.name,
        website: tool.website,
        logoUrl,
        pricingModel: mapPricingModel(tool.pricing),
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        summary: tool.summary,
        description: tool.description,
        longDescription: buildLongDescription(tool),
        deletedAt: null,
        updatedById: actorId,
        metaTitle,
        metaDescription,
        metadata: {
          aiSummary: tool.summary,
          aiFeatures: tool.features ?? [],
          aiUseCases: tool.use_cases ?? [],
          aiPros: buildPros(tool),
          aiCons: buildCons(tool),
          aiAlternatives: alternatives.alternativeNames,
          alternativeSlugs: alternatives.alternativeSlugs,
          categorySlug: canonicalCategorySlug,
          tags: tool.tags ?? [],
          isFeatured: toolIndex < 12,
          isPublished: true,
          website: tool.website,
          logoUrl,
          features: tool.features ?? [],
          useCases: tool.use_cases ?? [],
          targetUsers: tool.target_users ?? [],
          languages: tool.languages ?? [],
          platforms: tool.platform ?? [],
          secondaryCategories: tool.secondary_categories ?? [],
          screenshots: [],
          sourceUrls: [tool.website],
          importSource: "docs/import/first-50-ai-tools.json",
        },
      },
    );
    toolIds.push(record.id);

    const primaryCategorySlug = resolveCanonicalCategorySlug(tool.primary_category);
    const primaryCategoryId = primaryCategorySlug ? categoryIdBySlug.get(primaryCategorySlug) : null;
    if (!primaryCategoryId) {
      throw new Error(`Missing primary category ${tool.primary_category} for ${tool.slug}`);
    }

    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: record.id, categoryId: primaryCategoryId } },
      update: { isPrimary: true, deletedAt: null },
      create: { toolId: record.id, categoryId: primaryCategoryId, isPrimary: true },
    });

    for (const categoryName of tool.secondary_categories ?? []) {
      for (const categorySlug of resolveCanonicalCategorySlugs(categoryName)) {
        const categoryId = categoryIdBySlug.get(categorySlug);
        if (!categoryId || categoryId === primaryCategoryId) continue;

        await prisma.toolCategory.upsert({
          where: { toolId_categoryId: { toolId: record.id, categoryId } },
          update: { isPrimary: false, deletedAt: null },
          create: { toolId: record.id, categoryId, isPrimary: false },
        });
      }
    }

    for (const tagName of tool.tags ?? []) {
      const tagId = tagIdBySlug.get(slugify(tagName));
      if (!tagId) continue;

      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId: record.id, tagId } },
        update: { deletedAt: null },
        create: { toolId: record.id, tagId },
      });
    }

    const pricingPlan = buildPricingPlan(tool);
    const existingPlan = await prisma.pricingPlan.findFirst({
      where: { toolId: record.id, slug: pricingPlan.slug, deletedAt: null },
    });

    if (existingPlan) {
      await prisma.pricingPlan.update({
        where: { id: existingPlan.id },
        data: {
          name: pricingPlan.name,
          pricingModel: pricingPlan.pricingModel,
          amount: pricingPlan.amount,
          billingPeriod: pricingPlan.billingPeriod,
          description: pricingPlan.description,
          isFeatured: true,
          sortOrder: 0,
          deletedAt: null,
          updatedById: actorId,
        },
      });
    } else {
      await prisma.pricingPlan.create({
        data: {
          toolId: record.id,
          slug: pricingPlan.slug,
          name: pricingPlan.name,
          pricingModel: pricingPlan.pricingModel,
          amount: pricingPlan.amount,
          billingPeriod: pricingPlan.billingPeriod,
          description: pricingPlan.description,
          isFeatured: true,
          sortOrder: 0,
          createdById: actorId,
        },
      });
    }

    await prisma.toolVersion.upsert({
      where: { toolId_versionNumber: { toolId: record.id, versionNumber: 1 } },
      update: {
        slug: "v1",
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        deletedAt: null,
        snapshot: buildSnapshot(tool),
      },
      create: {
        toolId: record.id,
        slug: "v1",
        versionNumber: 1,
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        createdById: actorId,
        changelog: "Initial curated AI directory import",
        snapshot: buildSnapshot(tool),
      },
    });

    for (const [index, faq] of buildFaq(tool, alternatives).entries()) {
      const existingFaq = await prisma.faq.findFirst({
        where: { toolId: record.id, slug: faq.slug, deletedAt: null },
      });

      if (existingFaq) {
        await prisma.faq.update({
          where: { id: existingFaq.id },
          data: {
            question: faq.question,
            answer: faq.answer,
            sortOrder: index,
            deletedAt: null,
            updatedById: actorId,
          },
        });
      } else {
        await prisma.faq.create({
          data: {
            toolId: record.id,
            slug: faq.slug,
            question: faq.question,
            answer: faq.answer,
            sortOrder: index,
            createdById: actorId,
          },
        });
      }
    }
  }

  return {
    categoryIds: [...categoryIdBySlug.values()],
    tagIds: [...tagIdBySlug.values()],
    toolIds,
  };
}

function getCanonicalCategoryName(input: string): string | null {
  const slug = resolveCanonicalCategorySlug(input);
  return STANDARD_AI_CATEGORIES.find((category) => category.slug === slug)?.name ?? null;
}
