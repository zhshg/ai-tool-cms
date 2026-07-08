import { BillingPeriod, PricingModel, ToolStatus } from "../../packages/database/generated/client";
import { STANDARD_AI_CATEGORIES, resolveCanonicalCategorySlug, slugify } from "@ai-tool-cms/common";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

type AutoDiscoveredToolRecord = {
  name: string;
  slug: string;
  website: string;
  logo_url: string | null;
  summary: string;
  description: string;
  primary_category: string;
  primary_category_slug: string;
  tags?: string[];
  pricing: "Free" | "Freemium" | "Paid" | "Custom";
  features?: string[];
  use_cases?: string[];
  target_users?: string[];
  languages?: string[];
  platform?: string[];
  seo_title: string;
  seo_description: string;
  source_name: string;
  source_url: string;
  confidence_score?: number;
};

type AlternativeContext = {
  alternativeSlugs: string[];
  alternativeNames: string[];
};

type ValidationResult = {
  toolCount: number;
  errors: string[];
};

type ExistingToolLite = {
  id: string;
  slug: string;
  name: string;
  website: string;
};

const ALLOWED_PRICING = new Set(["Free", "Freemium", "Paid", "Custom"]);

function datasetPath(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  return path.resolve(currentDir, "../../docs/import/auto-discovered-tools-2026-07-08.json");
}

function loadAutoDiscoveredTools(): AutoDiscoveredToolRecord[] {
  const raw = readFileSync(datasetPath(), "utf8");
  return JSON.parse(raw) as AutoDiscoveredToolRecord[];
}

function normalizeWebsite(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function getWebsiteHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function findMatchingExistingTool(
  tool: AutoDiscoveredToolRecord,
  existingTools: ExistingToolLite[],
): ExistingToolLite | null {
  const targetSlug = tool.slug.trim().toLowerCase();
  const targetName = tool.name.trim().toLowerCase();
  const targetHost = getWebsiteHost(tool.website);

  for (const existing of existingTools) {
    if (existing.slug.trim().toLowerCase() === targetSlug) return existing;
    if (existing.name.trim().toLowerCase() === targetName) return existing;
    if (targetHost && getWebsiteHost(existing.website) === targetHost) return existing;
  }

  return null;
}

function validateAutoDiscoveredTools(tools: AutoDiscoveredToolRecord[]): ValidationResult {
  const errors: string[] = [];
  const slugSet = new Set<string>();
  const websiteSet = new Set<string>();
  const categorySet = new Set(STANDARD_AI_CATEGORIES.map((category) => category.slug));

  if (tools.length < 1) {
    errors.push("Expected at least 1 auto-discovered tool.");
  }

  for (const tool of tools) {
    const label = tool.slug || tool.name || "unknown-tool";
    const requiredFields = [
      ["name", tool.name],
      ["slug", tool.slug],
      ["website", tool.website],
      ["summary", tool.summary],
      ["description", tool.description],
      ["primary_category", tool.primary_category],
      ["primary_category_slug", tool.primary_category_slug],
      ["pricing", tool.pricing],
      ["seo_title", tool.seo_title],
      ["seo_description", tool.seo_description],
    ] as const;

    for (const [field, value] of requiredFields) {
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`${label}: missing required field ${field}`);
      }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) {
      errors.push(`${label}: invalid slug format`);
    }
    if (slugSet.has(tool.slug)) {
      errors.push(`${label}: duplicate slug`);
    }
    slugSet.add(tool.slug);

    if (!/^https:\/\//.test(tool.website)) {
      errors.push(`${label}: invalid website URL`);
    }
    const normalizedWebsite = normalizeWebsite(tool.website);
    if (websiteSet.has(normalizedWebsite)) {
      errors.push(`${label}: duplicate website`);
    }
    websiteSet.add(normalizedWebsite);

    const canonicalSlug = resolveCanonicalCategorySlug(tool.primary_category);
    if (!canonicalSlug || canonicalSlug !== tool.primary_category_slug) {
      errors.push(`${label}: invalid primary category mapping`);
    }
    if (!categorySet.has(tool.primary_category_slug)) {
      errors.push(`${label}: unknown primary category slug ${tool.primary_category_slug}`);
    }

    if (!ALLOWED_PRICING.has(tool.pricing)) {
      errors.push(`${label}: invalid pricing ${tool.pricing}`);
    }
  }

  return { toolCount: tools.length, errors };
}

function mapPricingModel(pricing: AutoDiscoveredToolRecord["pricing"]): PricingModel {
  switch (pricing) {
    case "Free":
      return PricingModel.FREE;
    case "Freemium":
      return PricingModel.FREEMIUM;
    case "Paid":
      return PricingModel.PAID;
    case "Custom":
      return PricingModel.CONTACT;
    default:
      return PricingModel.FREE;
  }
}

function buildLongDescription(tool: AutoDiscoveredToolRecord): string {
  const features = (tool.features ?? []).slice(0, 4).join(", ");
  const useCases = (tool.use_cases ?? []).slice(0, 4).join(", ");
  return [
    tool.description,
    useCases ? `Common workflows include ${useCases.toLowerCase()}.` : "",
    features ? `Notable capabilities include ${features.toLowerCase()}.` : "",
    "This record was prepared from the reviewed auto-discovery pipeline for toolsdar.io.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildFaq(
  tool: AutoDiscoveredToolRecord,
  alternatives: AlternativeContext,
): Array<{ slug: string; question: string; answer: string }> {
  return [
    {
      slug: `what-is-${tool.slug}`,
      question: `What is ${tool.name} used for?`,
      answer: `${tool.name} is used for ${tool.use_cases?.[0]?.toLowerCase() ?? "practical AI workflows"} and supports teams that need faster, clearer output.`,
    },
    {
      slug: `who-should-use-${tool.slug}`,
      question: `Who should use ${tool.name}?`,
      answer: `${tool.name} is a strong fit for ${(tool.target_users ?? ["teams"]).join(", ").toLowerCase()} who want ${tool.summary.toLowerCase()}.`,
    },
    {
      slug: `alternatives-to-${tool.slug}`,
      question: `What are alternatives to ${tool.name}?`,
      answer:
        alternatives.alternativeNames.length > 0
          ? `${tool.name} can be compared with ${alternatives.alternativeNames.join(", ")} depending on pricing, workflow depth, and team needs.`
          : `${tool.name} can be compared with other published tools in the same category depending on pricing and workflow fit.`,
    },
  ];
}

function buildPricingPlan(tool: AutoDiscoveredToolRecord) {
  const pricingModel = mapPricingModel(tool.pricing);

  if (tool.pricing === "Free") {
    return {
      slug: "free",
      name: "Free",
      pricingModel,
      description:
        "Public access is available without a paid subscription tier in the reviewed dataset.",
      amount: 0,
    };
  }

  if (tool.pricing === "Freemium") {
    return {
      slug: "starter",
      name: "Freemium",
      pricingModel,
      description: "The product offers a free entry point before paid expansion.",
      billingPeriod: BillingPeriod.MONTHLY,
    };
  }

  if (tool.pricing === "Paid") {
    return {
      slug: "paid",
      name: "Paid",
      pricingModel,
      description: "The product is positioned as a paid offering for ongoing use.",
      billingPeriod: BillingPeriod.MONTHLY,
    };
  }

  return {
    slug: "custom",
    name: "Custom",
    pricingModel,
    description: "The product uses custom or sales-led pricing.",
    billingPeriod: BillingPeriod.CUSTOM,
  };
}

function buildSnapshot(tool: AutoDiscoveredToolRecord): Record<string, unknown> {
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

function buildAlternativeContextMap(
  tools: AutoDiscoveredToolRecord[],
): Map<string, AlternativeContext> {
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const context = new Map<string, AlternativeContext>();

  for (const tool of tools) {
    const candidates = tools
      .filter((candidate) => candidate.slug !== tool.slug)
      .map((candidate) => {
        let score = 0;
        if (candidate.primary_category_slug === tool.primary_category_slug) score += 10;
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

export async function seedAutoDiscoveredTools(
  actorId: string,
): Promise<{ toolIds: string[]; tagIds: string[] }> {
  const tools = loadAutoDiscoveredTools();
  const validation = validateAutoDiscoveredTools(tools);
  const alternativeContextBySlug = buildAlternativeContextMap(tools);

  if (validation.errors.length > 0) {
    throw new Error(
      `Auto-discovered tool dataset validation failed:\n${validation.errors.join("\n")}`,
    );
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
    const record = await upsertBySlug(
      prisma.tag,
      slugify(tagName),
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
    tagIdBySlug.set(slugify(tagName), record.id);
  }

  const categoryIdBySlug = new Map<string, string>();
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  });
  for (const category of categories) {
    categoryIdBySlug.set(category.slug, category.id);
  }

  const toolIds: string[] = [];
  const existingTools = await prisma.tool.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true, website: true },
  });

  for (const [toolIndex, tool] of tools.entries()) {
    const alternatives = alternativeContextBySlug.get(tool.slug) ?? {
      alternativeSlugs: [],
      alternativeNames: [],
    };

    const createData = {
      name: tool.name,
      website: tool.website,
      logoUrl: tool.logo_url,
      pricingModel: mapPricingModel(tool.pricing),
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      summary: tool.summary,
      description: tool.description,
      longDescription: buildLongDescription(tool),
      createdById: actorId,
      metaTitle: tool.seo_title,
      metaDescription: tool.seo_description,
      metadata: {
        aiSummary: tool.summary,
        aiFeatures: tool.features ?? [],
        aiUseCases: tool.use_cases ?? [],
        aiAlternatives: alternatives.alternativeNames,
        alternativeSlugs: alternatives.alternativeSlugs,
        categorySlug: tool.primary_category_slug,
        tags: tool.tags ?? [],
        isFeatured: toolIndex < 24,
        isPublished: true,
        website: tool.website,
        logoUrl: tool.logo_url,
        features: tool.features ?? [],
        useCases: tool.use_cases ?? [],
        targetUsers: tool.target_users ?? [],
        languages: tool.languages ?? [],
        platforms: tool.platform ?? [],
        screenshots: [],
        sourceUrls: [tool.website, tool.source_url],
        importSource: "docs/import/auto-discovered-tools-2026-07-08.json",
        discoverySource: tool.source_name,
        confidenceScore: tool.confidence_score ?? null,
      },
    };
    const updateData = {
      name: tool.name,
      website: tool.website,
      logoUrl: tool.logo_url,
      pricingModel: mapPricingModel(tool.pricing),
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      summary: tool.summary,
      description: tool.description,
      longDescription: buildLongDescription(tool),
      deletedAt: null,
      updatedById: actorId,
      metaTitle: tool.seo_title,
      metaDescription: tool.seo_description,
      metadata: {
        aiSummary: tool.summary,
        aiFeatures: tool.features ?? [],
        aiUseCases: tool.use_cases ?? [],
        aiAlternatives: alternatives.alternativeNames,
        alternativeSlugs: alternatives.alternativeSlugs,
        categorySlug: tool.primary_category_slug,
        tags: tool.tags ?? [],
        isFeatured: toolIndex < 24,
        isPublished: true,
        website: tool.website,
        logoUrl: tool.logo_url,
        features: tool.features ?? [],
        useCases: tool.use_cases ?? [],
        targetUsers: tool.target_users ?? [],
        languages: tool.languages ?? [],
        platforms: tool.platform ?? [],
        screenshots: [],
        sourceUrls: [tool.website, tool.source_url],
        importSource: "docs/import/auto-discovered-tools-2026-07-08.json",
        discoverySource: tool.source_name,
        confidenceScore: tool.confidence_score ?? null,
      },
    };

    const matchedExisting = findMatchingExistingTool(tool, existingTools);
    const record = matchedExisting
      ? await prisma.tool.update({
          where: { id: matchedExisting.id },
          data: updateData,
        })
      : await upsertBySlug(prisma.tool, tool.slug, createData, updateData);
    toolIds.push(record.id);

    if (!matchedExisting) {
      existingTools.push({
        id: record.id,
        slug: record.slug,
        name: record.name,
        website: record.website,
      });
    } else {
      matchedExisting.slug = record.slug;
      matchedExisting.name = record.name;
      matchedExisting.website = record.website;
    }

    const primaryCategoryId = categoryIdBySlug.get(tool.primary_category_slug);
    if (!primaryCategoryId) {
      throw new Error(`Missing primary category ${tool.primary_category_slug} for ${tool.slug}`);
    }

    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: record.id, categoryId: primaryCategoryId } },
      update: { isPrimary: true, deletedAt: null },
      create: { toolId: record.id, categoryId: primaryCategoryId, isPrimary: true },
    });

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
        changelog: "Auto-discovered tools import",
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
    toolIds,
    tagIds: [...tagIdBySlug.values()],
  };
}
