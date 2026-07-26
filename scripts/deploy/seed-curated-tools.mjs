import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, PricingModel, ToolStatus, BillingPeriod } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const STANDARD_CATEGORIES = [
  ["ai-writing", "AI Writing", "AI writing tools for drafting, rewriting, summarization, and content workflows."],
  ["ai-chatbots", "AI Chatbots", "AI chatbot tools for assistants, support, and conversational workflows."],
  ["ai-image", "AI Image", "AI image tools for generation, editing, design, and visual content."],
  ["ai-video", "AI Video", "AI video tools for generation, editing, repurposing, and production workflows."],
  ["ai-audio", "AI Audio", "AI audio tools for speech, dubbing, transcription, and voice workflows."],
  ["ai-coding", "AI Coding", "AI coding tools for development, code generation, debugging, and engineering workflows."],
  ["ai-seo", "AI SEO", "AI SEO tools for research, optimization, content planning, and search growth."],
  ["ai-marketing", "AI Marketing", "AI marketing tools for campaigns, content, distribution, and growth."],
  ["ai-productivity", "AI Productivity", "AI productivity tools for daily work, planning, docs, and team execution."],
  ["ai-design", "AI Design", "AI design tools for interfaces, brand assets, layouts, and creative workflows."],
  ["ai-business", "AI Business", "AI business tools for operations, sales, customer workflows, and commercial teams."],
  ["ai-research", "AI Research", "AI research tools for discovery, source analysis, synthesis, and knowledge work."],
  ["ai-education", "AI Education", "AI education tools for learning, tutoring, lesson creation, and study support."],
  ["ai-agents", "AI Agents", "AI agent tools for autonomous workflows, orchestration, and task execution."],
  ["ai-data", "AI Data", "AI data tools for structured information, analysis, reporting, and operational workflows."],
  ["ai-presentation", "AI Presentation", "AI presentation tools for decks, storytelling, and business communication."],
  ["ai-social-media", "AI Social Media", "AI social media tools for short-form content, scheduling, and channel growth."],
  ["ai-customer-support", "AI Customer Support", "AI customer support tools for service, ticket deflection, and help flows."],
  ["ai-developer-tools", "AI Developer Tools", "AI developer tools for technical teams, APIs, and engineering productivity."],
  ["ai-automation", "AI Automation", "AI automation tools for workflows, triggers, agents, and repeatable operations."],
];

const CATEGORY_ALIASES = new Map([
  ["writing", "ai-writing"],
  ["image", "ai-image"],
  ["image generation", "ai-image"],
  ["video", "ai-video"],
  ["audio", "ai-audio"],
  ["code", "ai-coding"],
  ["productivity", "ai-productivity"],
  ["design", "ai-design"],
  ["marketing", "ai-marketing"],
  ["seo", "ai-seo"],
  ["business", "ai-business"],
  ["research", "ai-research"],
  ["education", "ai-education"],
  ["automation", "ai-automation"],
  ["data", "ai-data"],
  ["customer support", "ai-customer-support"],
  ["sales", "ai-business"],
]);

function datasetPath() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../../docs/import/first-50-ai-tools.json");
}

function readDataset() {
  return JSON.parse(readFileSync(datasetPath(), "utf8"));
}

function normalizeCategory(input) {
  return CATEGORY_ALIASES.get(String(input || "").trim().toLowerCase()) ?? "ai-productivity";
}

function mapPricingModel(pricing) {
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

function buildLogoUrl(website) {
  try {
    const hostname = new URL(website).hostname;
    return hostname ? `https://www.google.com/s2/favicons?sz=128&domain=${hostname}` : null;
  } catch {
    return null;
  }
}

function buildSeoTitle(name) {
  return `${name} Review, Features, Pricing and Alternatives`.slice(0, 160);
}

function buildAlternativeMap(tools) {
  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const result = new Map();

  for (const tool of tools) {
    const primary = normalizeCategory(tool.primary_category);
    const candidates = tools
      .filter((candidate) => candidate.slug !== tool.slug)
      .map((candidate) => {
        let score = 0;
        if (normalizeCategory(candidate.primary_category) === primary) score += 10;
        if ((tool.tags || []).some((tag) => (candidate.tags || []).includes(tag))) score += 1;
        return { slug: candidate.slug, score };
      })
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
      .slice(0, 3);

    const slugs = candidates.map((candidate) => candidate.slug);
    result.set(tool.slug, {
      slugs,
      names: slugs.map((slug) => bySlug.get(slug)?.name).filter(Boolean),
    });
  }

  return result;
}

function buildSeoDescription(tool, alternatives) {
  const category = STANDARD_CATEGORIES.find(([slug]) => slug === normalizeCategory(tool.primary_category))?.[1] ?? "AI";
  const base = `${tool.name} helps teams ${String(tool.use_cases?.[0] || "work faster").toLowerCase()} with ${category.toLowerCase()} workflows, key features, pricing context, and practical alternatives.`;
  const suffix = alternatives.names.length ? ` Compare it with ${alternatives.names.join(", ")}.` : "";
  return `${base}${suffix}`.slice(0, 155);
}

function buildLongDescription(tool) {
  const parts = [
    tool.description,
    `${tool.name} is listed in ToolsDar as a practical AI tool for teams comparing features, pricing, and workflow fit before adopting a new product.`,
    (tool.use_cases || []).length ? `Popular workflows include ${(tool.use_cases || []).slice(0, 4).join(", ").toLowerCase()}.` : "",
    (tool.features || []).length ? `Core capabilities include ${(tool.features || []).slice(0, 4).join(", ").toLowerCase()}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function buildPros(tool) {
  return [
    ...((tool.features || []).slice(0, 2).map((item) => `${item} supports daily workflows`)),
    tool.use_cases?.[0] ? `${tool.use_cases[0]} without a long setup cycle` : "",
    tool.pricing === "Free" || tool.pricing === "Freemium"
      ? "Lower barrier to entry for evaluation and testing"
      : "Positioned for committed teams that need stronger output quality",
  ].filter(Boolean);
}

function buildCons(tool) {
  return [
    tool.pricing === "Paid" || tool.pricing === "Custom"
      ? "Full value may depend on paid access or sales-led plans"
      : "Advanced teams may still need deeper workflow customization",
    tool.platform?.includes("API")
      ? "API and integration depth can vary by plan and use case"
      : "Automation depth may be lighter than API-first tools",
    "Output quality still benefits from human review before publishing",
  ];
}

function buildFaq(tool, alternatives) {
  return [
    {
      slug: `what-is-${tool.slug}`,
      question: `What is ${tool.name} used for?`,
      answer: `${tool.name} is used to ${String(tool.use_cases?.[0] || "support practical AI workflows").toLowerCase()} and help ${String(tool.target_users?.[0] || "teams").toLowerCase()} work more efficiently.`,
    },
    {
      slug: `who-should-use-${tool.slug}`,
      question: `Who should use ${tool.name}?`,
      answer: `${tool.name} is a strong fit for ${(tool.target_users || ["teams"]).join(", ").toLowerCase()} who need ${String(tool.summary || "").toLowerCase()}.`,
    },
    {
      slug: `best-alternatives-to-${tool.slug}`,
      question: `What are the best alternatives to ${tool.name}?`,
      answer: alternatives.names.length
        ? `Common alternatives to ${tool.name} include ${alternatives.names.join(", ")} depending on workflow, pricing, and category fit.`
        : `${tool.name} can be compared with other published tools in the same category for pricing, features, and workflow depth.`,
    },
  ];
}

function buildPricingPlan(tool) {
  const pricingModel = mapPricingModel(tool.pricing);
  if (tool.pricing === "Free" || tool.pricing === "Open Source") {
    return { slug: "free", name: tool.pricing, pricingModel, amount: 0, description: "Free starter access.", billingPeriod: null };
  }
  if (tool.pricing === "Freemium" || tool.pricing === "Trial") {
    return { slug: "starter", name: tool.pricing, pricingModel, amount: null, description: "Free entry point before paid expansion.", billingPeriod: BillingPeriod.MONTHLY };
  }
  if (tool.pricing === "Paid") {
    return { slug: "paid", name: "Paid", pricingModel, amount: null, description: "Paid plan for ongoing use.", billingPeriod: BillingPeriod.MONTHLY };
  }
  return { slug: "custom", name: "Custom", pricingModel, amount: null, description: "Custom or enterprise pricing.", billingPeriod: BillingPeriod.CUSTOM };
}

async function upsertCategory(slug, name, description, sortOrder) {
  const existing = await prisma.category.findFirst({ where: { slug, deletedAt: null } });
  const data = {
    slug,
    name,
    description,
    sortOrder,
    metaTitle: `${name} AI Tools`,
    metaDescription: description,
    metadata: { featured: sortOrder < 8 },
  };
  if (existing) {
    return prisma.category.update({ where: { id: existing.id }, data: { ...data, deletedAt: null } });
  }
  return prisma.category.create({ data });
}

async function upsertTag(name) {
  const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const existing = await prisma.tag.findFirst({ where: { slug, deletedAt: null } });
  if (existing) {
    return prisma.tag.update({ where: { id: existing.id }, data: { name, description: `${name} related AI tools and workflows`, deletedAt: null } });
  }
  return prisma.tag.create({ data: { slug, name, description: `${name} related AI tools and workflows` } });
}

async function main() {
  const tools = readDataset();
  const alternativesBySlug = buildAlternativeMap(tools);

  const categoryIds = new Map();
  for (const [index, [slug, name, description]] of STANDARD_CATEGORIES.entries()) {
    const category = await upsertCategory(slug, name, description, index);
    categoryIds.set(slug, category.id);
  }

  const tagIds = new Map();
  for (const tagName of [...new Set(tools.flatMap((tool) => tool.tags || []))]) {
    const tag = await upsertTag(tagName);
    tagIds.set(tag.name, tag.id);
  }

  for (const [index, tool] of tools.entries()) {
    const alternatives = alternativesBySlug.get(tool.slug) ?? { slugs: [], names: [] };
    const categorySlug = normalizeCategory(tool.primary_category);
    const logoUrl = buildLogoUrl(tool.website);
    const existing = await prisma.tool.findFirst({ where: { slug: tool.slug, deletedAt: null } });

    const toolData = {
      name: tool.name,
      website: tool.website,
      logoUrl,
      summary: tool.summary,
      description: tool.description,
      longDescription: buildLongDescription(tool),
      pricingModel: mapPricingModel(tool.pricing),
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      metaTitle: buildSeoTitle(tool.name),
      metaDescription: buildSeoDescription(tool, alternatives),
      metadata: {
        aiSummary: tool.summary,
        aiFeatures: tool.features || [],
        aiUseCases: tool.use_cases || [],
        aiPros: buildPros(tool),
        aiCons: buildCons(tool),
        aiAlternatives: alternatives.names,
        alternativeSlugs: alternatives.slugs,
        categorySlug,
        tags: tool.tags || [],
        targetUsers: tool.target_users || [],
        languages: tool.languages || [],
        platforms: tool.platform || [],
        website: tool.website,
        logoUrl,
        features: tool.features || [],
        useCases: tool.use_cases || [],
        isFeatured: index < 12,
        isPublished: true,
        screenshots: [],
        sourceUrls: [tool.website],
        importSource: "docs/import/first-50-ai-tools.json",
      },
    };

    const record = existing
      ? await prisma.tool.update({ where: { id: existing.id }, data: { ...toolData, deletedAt: null } })
      : await prisma.tool.create({ data: { slug: tool.slug, ...toolData } });

    const primaryCategoryId = categoryIds.get(categorySlug);
    if (primaryCategoryId) {
      await prisma.toolCategory.upsert({
        where: { toolId_categoryId: { toolId: record.id, categoryId: primaryCategoryId } },
        update: { isPrimary: true, deletedAt: null },
        create: { toolId: record.id, categoryId: primaryCategoryId, isPrimary: true },
      });
    }

    for (const secondary of tool.secondary_categories || []) {
      const secondarySlug = normalizeCategory(secondary);
      const secondaryId = categoryIds.get(secondarySlug);
      if (!secondaryId || secondaryId === primaryCategoryId) continue;
      await prisma.toolCategory.upsert({
        where: { toolId_categoryId: { toolId: record.id, categoryId: secondaryId } },
        update: { isPrimary: false, deletedAt: null },
        create: { toolId: record.id, categoryId: secondaryId, isPrimary: false },
      });
    }

    for (const tagName of tool.tags || []) {
      const tagId = tagIds.get(tagName);
      if (!tagId) continue;
      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId: record.id, tagId } },
        update: { deletedAt: null },
        create: { toolId: record.id, tagId },
      });
    }

    const plan = buildPricingPlan(tool);
    const existingPlan = await prisma.pricingPlan.findFirst({ where: { toolId: record.id, slug: plan.slug, deletedAt: null } });
    if (existingPlan) {
      await prisma.pricingPlan.update({
        where: { id: existingPlan.id },
        data: {
          name: plan.name,
          pricingModel: plan.pricingModel,
          amount: plan.amount,
          billingPeriod: plan.billingPeriod,
          description: plan.description,
          isFeatured: true,
          sortOrder: 0,
          deletedAt: null,
        },
      });
    } else {
      await prisma.pricingPlan.create({
        data: {
          toolId: record.id,
          slug: plan.slug,
          name: plan.name,
          pricingModel: plan.pricingModel,
          amount: plan.amount,
          billingPeriod: plan.billingPeriod,
          description: plan.description,
          isFeatured: true,
          sortOrder: 0,
        },
      });
    }

    const existingVersion = await prisma.toolVersion.findFirst({ where: { toolId: record.id, versionNumber: 1, deletedAt: null } });
    const snapshot = {
      name: tool.name,
      pricing: { model: mapPricingModel(tool.pricing), tiers: [plan], languages: tool.languages || [], platforms: tool.platform || [] },
      features: tool.features || [],
      useCases: tool.use_cases || [],
      targetUsers: tool.target_users || [],
      platforms: tool.platform || [],
      aiSummary: tool.summary,
    };
    if (existingVersion) {
      await prisma.toolVersion.update({
        where: { id: existingVersion.id },
        data: { slug: "v1", status: ToolStatus.PUBLISHED, publishedAt: new Date(), snapshot, deletedAt: null },
      });
    } else {
      await prisma.toolVersion.create({
        data: { toolId: record.id, slug: "v1", versionNumber: 1, status: ToolStatus.PUBLISHED, publishedAt: new Date(), changelog: "Curated production tool update", snapshot },
      });
    }

    for (const [faqIndex, faq] of buildFaq(tool, alternatives).entries()) {
      const existingFaq = await prisma.faq.findFirst({ where: { toolId: record.id, slug: faq.slug, deletedAt: null } });
      if (existingFaq) {
        await prisma.faq.update({ where: { id: existingFaq.id }, data: { question: faq.question, answer: faq.answer, sortOrder: faqIndex, deletedAt: null } });
      } else {
        await prisma.faq.create({ data: { toolId: record.id, slug: faq.slug, question: faq.question, answer: faq.answer, sortOrder: faqIndex } });
      }
    }
  }

  const publishedCount = await prisma.tool.count({ where: { status: ToolStatus.PUBLISHED, deletedAt: null } });
  console.log(JSON.stringify({ updatedTools: tools.length, publishedCount }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
