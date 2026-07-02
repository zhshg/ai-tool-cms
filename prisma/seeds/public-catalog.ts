import { BillingPeriod, PricingModel, ToolStatus } from "@prisma/client";
import { slugify } from "@ai-tool-cms/common";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

type CategorySeed = { name: string; description: string };
type ToolSeed = {
  name: string;
  categorySlug: string;
  pricingModel: PricingModel;
  summary: string;
  description: string;
  longDescription: string;
  features: string[];
  platforms: string[];
  tagSlugs: string[];
  pricingPlans: Array<{ slug: string; name: string; amount?: number; billingPeriod?: BillingPeriod; description: string; isFeatured?: boolean }>;
  faq: Array<{ slug: string; question: string; answer: string }>;
};

const CATEGORIES: CategorySeed[] = [
  { name: "AI Writing", description: "Draft articles, product copy, and campaign content faster." },
  { name: "Image Generation", description: "Create illustrations, product shots, and marketing visuals." },
  { name: "Code Assistant", description: "Ship software with AI pair programming and code review support." },
  { name: "Productivity", description: "Automate notes, planning, and internal knowledge workflows." },
  { name: "Video & Audio", description: "Generate voice, edit clips, and repurpose media with AI." },
  { name: "Research", description: "Summarize documents, compare sources, and gather evidence." },
  { name: "Presentation", description: "Turn outlines into decks, visuals, and presenter notes." },
  { name: "Design", description: "Support UI, branding, and creative production with AI." },
  { name: "Sales", description: "Prospect accounts, prep outreach, and automate sales follow-up." },
  { name: "Marketing", description: "Plan campaigns, landing pages, SEO content, and reporting." },
  { name: "SEO", description: "Research keywords, optimize pages, and grow search visibility." },
  { name: "Customer Support", description: "Deflect tickets and assist agents with AI workflows." },
  { name: "Education", description: "Build lessons, quizzes, and learning assistants." },
  { name: "Finance", description: "Handle reporting, scenario planning, and spreadsheet analysis." },
  { name: "HR", description: "Improve hiring, onboarding, and people operations." },
  { name: "Legal", description: "Review contracts, extract clauses, and prepare summaries." },
  { name: "Data Analysis", description: "Query datasets, explain trends, and build dashboards." },
  { name: "Automation", description: "Connect apps and trigger AI-powered workflows." },
  { name: "E-commerce", description: "Merchandise catalogs, optimize listings, and answer shoppers." },
  { name: "Recruiting", description: "Source candidates and standardize interview prep." },
  { name: "Translation", description: "Localize product copy, docs, and support material." },
  { name: "Social Media", description: "Draft posts, repurpose content, and track channel ideas." },
];

const TAGS = [
  "chatbot", "agent", "workflow", "api", "browser-based", "team-collaboration", "free-tier", "enterprise-ready",
  "text-generation", "image-generation", "voice-ai", "video-editing", "code-completion", "knowledge-base", "seo",
  "sales-outreach", "customer-support", "analytics", "spreadsheet", "automation", "research", "summarization",
  "translation", "presentation", "design", "notetaking", "crm", "recruiting", "compliance", "ecommerce",
  "social-media", "marketing", "developer-tools", "reporting", "transcription", "landing-pages", "document-ai",
  "prompting", "review-assistant", "multilingual", "finance", "legal"
] as const;

const TOOL_SUFFIXES = ["Pilot", "Forge", "Flow"] as const;
const PRICING_MODELS = [PricingModel.FREE, PricingModel.FREEMIUM, PricingModel.PAID, PricingModel.CONTACT] as const;

function titleBase(categoryName: string): string {
  return categoryName.replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).map((part) => part[0]!.toUpperCase() + part.slice(1)).join("");
}

function buildTagSlugs(categorySlug: string, index: number): string[] {
  const categoryMap: Record<string, string[]> = {
    "ai-writing": ["text-generation", "marketing", "free-tier"],
    "image-generation": ["image-generation", "design", "marketing"],
    "code-assistant": ["developer-tools", "code-completion", "api"],
    "productivity": ["notetaking", "knowledge-base", "team-collaboration"],
    "video-audio": ["voice-ai", "video-editing", "transcription"],
    research: ["research", "summarization", "document-ai"],
    presentation: ["presentation", "reporting", "team-collaboration"],
    design: ["design", "image-generation", "prompting"],
    sales: ["sales-outreach", "crm", "reporting"],
    marketing: ["marketing", "landing-pages", "social-media"],
    seo: ["seo", "analytics", "reporting"],
    "customer-support": ["customer-support", "knowledge-base", "review-assistant"],
    education: ["text-generation", "document-ai", "summarization"],
    finance: ["finance", "spreadsheet", "analytics"],
    hr: ["recruiting", "team-collaboration", "workflow"],
    legal: ["legal", "compliance", "review-assistant"],
    "data-analysis": ["analytics", "spreadsheet", "api"],
    automation: ["automation", "workflow", "api"],
    "e-commerce": ["ecommerce", "marketing", "customer-support"],
    recruiting: ["recruiting", "document-ai", "team-collaboration"],
    translation: ["translation", "multilingual", "api"],
    "social-media": ["social-media", "marketing", "analytics"],
  };
  const tags = categoryMap[categorySlug] ?? ["workflow", "team-collaboration", "free-tier"];
  if (index === 0) return [...tags, "free-tier", "browser-based"];
  if (index === 1) return [...tags, "team-collaboration", "api"];
  return [...tags, "enterprise-ready", "browser-based"];
}

function buildPlans(pricingModel: PricingModel): ToolSeed["pricingPlans"] {
  if (pricingModel === PricingModel.FREE) {
    return [{ slug: "free", name: "Free", amount: 0, description: "Free starter access.", isFeatured: true }];
  }
  if (pricingModel === PricingModel.FREEMIUM) {
    return [
      { slug: "free", name: "Free", amount: 0, description: "Starter workspace." },
      { slug: "pro", name: "Pro", amount: 19, billingPeriod: BillingPeriod.MONTHLY, description: "Full workflow access.", isFeatured: true },
    ];
  }
  if (pricingModel === PricingModel.PAID) {
    return [{ slug: "team", name: "Team", amount: 29, billingPeriod: BillingPeriod.MONTHLY, description: "Team plan for production use.", isFeatured: true }];
  }
  return [{ slug: "enterprise", name: "Enterprise", description: "Custom deployment and governance support.", isFeatured: true }];
}

function buildTools(): ToolSeed[] {
  return CATEGORIES.flatMap((category, categoryIndex) => {
    const categorySlug = slugify(category.name);
    return TOOL_SUFFIXES.map((suffix, index) => {
      const pricingModel = PRICING_MODELS[(categoryIndex + index) % PRICING_MODELS.length]!;
      const name = `${titleBase(category.name)}${suffix}`;
      const summary = `${category.name} assistant for faster teams and repeatable AI workflows.`;
      return {
        name,
        categorySlug,
        pricingModel,
        summary,
        description: `${name} helps teams work on ${category.name.toLowerCase()} tasks with structured AI assistance and cleaner execution paths.`,
        longDescription: `${name} is seeded as a production-style directory entry with practical metadata, pricing, taxonomy links, and content sections so public pages render meaningful catalog content instead of placeholder marketing copy.`,
        features: ["Structured workspace", "Reusable prompts", "Team review"],
        platforms: index === 0 ? ["web"] : index === 1 ? ["web", "api"] : ["web", "api", "mobile"],
        tagSlugs: buildTagSlugs(categorySlug, index),
        pricingPlans: buildPlans(pricingModel),
        faq: [{ slug: `what-is-${slugify(name)}`, question: `What is ${name}?`, answer: `${name} is an AI tool for ${category.name.toLowerCase()} workflows with production-style directory metadata.` }],
      };
    });
  });
}

function buildWebsite(slug: string): string {
  return "https://" + slug + ".example.com";
}

function buildLogoUrl(slug: string): string {
  return "https://cdn.example.com/logos/" + slug + ".png";
}

function buildSnapshot(tool: ToolSeed): Record<string, unknown> {
  return {
    name: tool.name,
    pricing: { model: tool.pricingModel === PricingModel.CONTACT ? "ENTERPRISE" : tool.pricingModel, tiers: tool.pricingPlans, platforms: tool.platforms },
    features: tool.features,
    platforms: tool.platforms,
    aiSummary: tool.summary,
  };
}

export async function seedPublicCatalog(actorId: string): Promise<{ categoryIds: string[]; tagIds: string[]; toolIds: string[] }> {
  const categoryIdBySlug = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = slugify(category.name);
    const record = await upsertBySlug(prisma.category, slug, {
      name: category.name,
      description: category.description,
      sortOrder: index,
      createdById: actorId,
      metaTitle: `${category.name} AI Tools`,
      metaDescription: category.description,
    }, {
      name: category.name,
      description: category.description,
      sortOrder: index,
      deletedAt: null,
      updatedById: actorId,
      metaTitle: `${category.name} AI Tools`,
      metaDescription: category.description,
    });
    categoryIdBySlug.set(slug, record.id);
  }

  const tagIdBySlug = new Map<string, string>();
  for (const tagName of TAGS) {
    const slug = slugify(tagName);
    const record = await upsertBySlug(prisma.tag, slug, {
      name: tagName,
      description: `${tagName} related AI tools and workflows`,
      createdById: actorId,
    }, {
      name: tagName,
      description: `${tagName} related AI tools and workflows`,
      deletedAt: null,
      updatedById: actorId,
    });
    tagIdBySlug.set(slug, record.id);
  }

  const toolIds: string[] = [];
  for (const tool of buildTools()) {
    const slug = slugify(tool.name);
    const record = await upsertBySlug(prisma.tool, slug, {
      name: tool.name,
      website: buildWebsite(slug),
      logoUrl: buildLogoUrl(slug),
      pricingModel: tool.pricingModel,
      summary: tool.summary,
      description: tool.description,
      longDescription: tool.longDescription,
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      createdById: actorId,
      metaTitle: `${tool.name} Review, Pricing, Features & Alternatives`,
      metaDescription: tool.summary,
      metadata: { features: tool.features, platforms: tool.platforms, screenshots: [], aiSummary: tool.summary },
    }, {
      name: tool.name,
      website: buildWebsite(slug),
      logoUrl: buildLogoUrl(slug),
      pricingModel: tool.pricingModel,
      summary: tool.summary,
      description: tool.description,
      longDescription: tool.longDescription,
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      deletedAt: null,
      updatedById: actorId,
      metaTitle: `${tool.name} Review, Pricing, Features & Alternatives`,
      metaDescription: tool.summary,
      metadata: { features: tool.features, platforms: tool.platforms, screenshots: [], aiSummary: tool.summary },
    });
    toolIds.push(record.id);

    const categoryId = categoryIdBySlug.get(tool.categorySlug);
    if (categoryId) {
      await prisma.toolCategory.upsert({ where: { toolId_categoryId: { toolId: record.id, categoryId } }, update: { isPrimary: true, deletedAt: null }, create: { toolId: record.id, categoryId, isPrimary: true } });
    }

    for (const tagSlug of tool.tagSlugs) {
      const tagId = tagIdBySlug.get(tagSlug);
      if (!tagId) continue;
      await prisma.toolTag.upsert({ where: { toolId_tagId: { toolId: record.id, tagId } }, update: { deletedAt: null }, create: { toolId: record.id, tagId } });
    }

    for (const [index, plan] of tool.pricingPlans.entries()) {
      const existingPlan = await prisma.pricingPlan.findFirst({ where: { toolId: record.id, slug: plan.slug, deletedAt: null } });
      if (existingPlan) {
        await prisma.pricingPlan.update({ where: { id: existingPlan.id }, data: { name: plan.name, pricingModel: tool.pricingModel, amount: plan.amount, billingPeriod: plan.billingPeriod, description: plan.description, isFeatured: plan.isFeatured ?? index === 0, sortOrder: index, deletedAt: null, updatedById: actorId } });
      } else {
        await prisma.pricingPlan.create({ data: { toolId: record.id, slug: plan.slug, name: plan.name, pricingModel: tool.pricingModel, amount: plan.amount, billingPeriod: plan.billingPeriod, description: plan.description, isFeatured: plan.isFeatured ?? index === 0, sortOrder: index, createdById: actorId } });
      }
    }

    await prisma.toolVersion.upsert({ where: { toolId_versionNumber: { toolId: record.id, versionNumber: 1 } }, update: { slug: "v1", status: ToolStatus.PUBLISHED, publishedAt: new Date(), deletedAt: null, snapshot: buildSnapshot(tool) }, create: { toolId: record.id, slug: "v1", versionNumber: 1, status: ToolStatus.PUBLISHED, publishedAt: new Date(), createdById: actorId, changelog: "Initial directory seed version", snapshot: buildSnapshot(tool) } });

    for (const [index, faq] of tool.faq.entries()) {
      const existingFaq = await prisma.faq.findFirst({ where: { toolId: record.id, slug: faq.slug, deletedAt: null } });
      if (existingFaq) {
        await prisma.faq.update({ where: { id: existingFaq.id }, data: { question: faq.question, answer: faq.answer, sortOrder: index, deletedAt: null, updatedById: actorId } });
      } else {
        await prisma.faq.create({ data: { toolId: record.id, slug: faq.slug, question: faq.question, answer: faq.answer, sortOrder: index, createdById: actorId } });
      }
    }
  }

  return { categoryIds: [...categoryIdBySlug.values()], tagIds: [...tagIdBySlug.values()], toolIds };
}
