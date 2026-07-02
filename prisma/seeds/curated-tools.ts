import { BillingPeriod, PricingModel, ToolStatus } from "@prisma/client";
import { slugify } from "@ai-tool-cms/common";
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
  {
    name: "Writing",
    description: "AI tools for drafting, editing, and improving written communication.",
    sortOrder: 0,
  },
  {
    name: "Image",
    description: "AI tools for image generation, editing, and visual asset creation.",
    sortOrder: 1,
  },
  {
    name: "Video",
    description: "AI tools for generating, editing, and repurposing video content.",
    sortOrder: 2,
  },
  {
    name: "Audio",
    description: "AI tools for speech, music, voice, and audio production workflows.",
    sortOrder: 3,
  },
  {
    name: "Code",
    description: "AI tools for software development, coding help, and product building.",
    sortOrder: 4,
  },
  {
    name: "Productivity",
    description: "AI tools for notes, planning, meetings, and day-to-day knowledge work.",
    sortOrder: 5,
  },
  {
    name: "Marketing",
    description: "AI tools for campaigns, copy, content, and growth workflows.",
    sortOrder: 6,
  },
  {
    name: "SEO",
    description: "AI tools for keyword research, content optimization, and search growth.",
    sortOrder: 7,
  },
  {
    name: "Research",
    description: "AI tools for discovery, synthesis, source review, and analysis.",
    sortOrder: 8,
  },
  {
    name: "Education",
    description: "AI tools for study support, tutoring, and learning content creation.",
    sortOrder: 9,
  },
  {
    name: "Automation",
    description: "AI tools for connecting apps, orchestrating workflows, and reducing manual work.",
    sortOrder: 10,
  },
  {
    name: "Business",
    description: "AI tools for operations, services, and company knowledge workflows.",
    sortOrder: 11,
  },
  {
    name: "Design",
    description: "AI tools for creative direction, presentations, and interface design.",
    sortOrder: 12,
  },
  {
    name: "Data",
    description: "AI tools for structured records, data workflows, and operational analysis.",
    sortOrder: 13,
  },
  {
    name: "Sales",
    description: "AI tools for outreach, enablement, and revenue team workflows.",
    sortOrder: 14,
  },
  {
    name: "Customer Support",
    description: "AI tools for service operations, support automation, and knowledge workflows.",
    sortOrder: 15,
  },
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

    if (!categorySet.has(tool.primary_category)) {
      errors.push(`${tool.slug}: invalid primary category ${tool.primary_category}`);
    }

    const secondarySeen = new Set<string>();
    for (const category of tool.secondary_categories ?? []) {
      if (!categorySet.has(category)) {
        errors.push(`${tool.slug}: invalid secondary category ${category}`);
      }
      if (category === tool.primary_category) {
        errors.push(`${tool.slug}: primary category repeated in secondary categories`);
      }
      if (secondarySeen.has(category)) {
        errors.push(`${tool.slug}: duplicate secondary category ${category}`);
      }
      secondarySeen.add(category);
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
    useCases ? `${tool.name} is often used to ${useCases.toLowerCase()}.` : "",
    features ? `Core capabilities typically include ${features.toLowerCase()}.` : "",
    targetUsers ? `It is especially relevant for ${targetUsers.toLowerCase()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildFaq(
  tool: ImportToolRecord,
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

export async function seedCuratedTools(
  actorId: string,
): Promise<{ categoryIds: string[]; tagIds: string[]; toolIds: string[] }> {
  const tools = loadCuratedTools();
  const validation = validateCuratedTools(tools);

  if (validation.errors.length > 0) {
    throw new Error(`Curated tool dataset validation failed:\n${validation.errors.join("\n")}`);
  }

  const categoryIdByName = new Map<string, string>();
  for (const category of PRIMARY_CATEGORIES) {
    const slug = slugify(category.name);
    const record = await upsertBySlug(
      prisma.category,
      slug,
      {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        createdById: actorId,
        metaTitle: `${category.name} AI Tools`,
        metaDescription: category.description,
      },
      {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        deletedAt: null,
        updatedById: actorId,
        metaTitle: `${category.name} AI Tools`,
        metaDescription: category.description,
      },
    );
    categoryIdByName.set(category.name, record.id);
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

  for (const tool of tools) {
    const record = await upsertBySlug(
      prisma.tool,
      tool.slug,
      {
        name: tool.name,
        website: tool.website,
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

    const primaryCategoryId = categoryIdByName.get(tool.primary_category);
    if (!primaryCategoryId) {
      throw new Error(`Missing primary category ${tool.primary_category} for ${tool.slug}`);
    }

    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: record.id, categoryId: primaryCategoryId } },
      update: { isPrimary: true, deletedAt: null },
      create: { toolId: record.id, categoryId: primaryCategoryId, isPrimary: true },
    });

    for (const categoryName of tool.secondary_categories ?? []) {
      const categoryId = categoryIdByName.get(categoryName);
      if (!categoryId) continue;

      await prisma.toolCategory.upsert({
        where: { toolId_categoryId: { toolId: record.id, categoryId } },
        update: { isPrimary: false, deletedAt: null },
        create: { toolId: record.id, categoryId, isPrimary: false },
      });
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

    for (const [index, faq] of buildFaq(tool).entries()) {
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
    categoryIds: [...categoryIdByName.values()],
    tagIds: [...tagIdBySlug.values()],
    toolIds,
  };
}
