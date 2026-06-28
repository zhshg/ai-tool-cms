import { PricingModel, PromptStatus, ToolStatus } from "@prisma/client";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

const CATEGORY_PREFIXES = [
  "AI Writing",
  "Image",
  "Code",
  "Video",
  "Audio",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
  "Legal",
];

const TAG_WORDS = [
  "gpt",
  "llm",
  "api",
  "saas",
  "open-source",
  "enterprise",
  "mobile",
  "web",
  "automation",
  "analytics",
  "chatbot",
  "copilot",
  "generator",
  "editor",
  "workflow",
  "multimodal",
  "free",
  "paid",
  "beta",
  "integration",
];

export async function seedBulkData(actorId: string): Promise<void> {
  const categoryIds = await seedBulkCategories(actorId, 100);
  const tagIds = await seedBulkTags(actorId, 500);
  const toolIds = await seedBulkTools(actorId, 100, categoryIds, tagIds);
  await seedBulkPrompts(actorId, 50, toolIds, categoryIds);
  await seedBulkFaqs(actorId, 20, toolIds);
}

async function seedBulkCategories(actorId: string, count: number): Promise<string[]> {
  const ids: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const prefix = CATEGORY_PREFIXES[index % CATEGORY_PREFIXES.length]!;
    const name = `${prefix} ${index + 1}`;
    const slug = `category-${String(index + 1).padStart(3, "0")}`;
    const record = await upsertBySlug(
      prisma.category,
      slug,
      {
        name,
        description: `Bulk seeded category ${index + 1}`,
        sortOrder: index,
        createdById: actorId,
        parentId: index > 10 ? ids[index % 10] : undefined,
      },
      { name, deletedAt: null, updatedById: actorId },
    );
    ids.push(record.id);
  }

  return ids;
}

async function seedBulkTags(actorId: string, count: number): Promise<string[]> {
  const ids: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const word = TAG_WORDS[index % TAG_WORDS.length]!;
    const name = `${word}-${index + 1}`;
    const slug = `tag-${String(index + 1).padStart(3, "0")}`;
    const record = await upsertBySlug(
      prisma.tag,
      slug,
      { name, createdById: actorId },
      { name, deletedAt: null, updatedById: actorId },
    );
    ids.push(record.id);
  }

  return ids;
}

async function seedBulkTools(
  actorId: string,
  count: number,
  categoryIds: string[],
  tagIds: string[],
): Promise<string[]> {
  const ids: string[] = [];
  const pricingModels = [
    PricingModel.FREE,
    PricingModel.FREEMIUM,
    PricingModel.PAID,
    PricingModel.CONTACT,
  ];

  for (let index = 0; index < count; index += 1) {
    const name = `AI Tool ${index + 1}`;
    const slug = `tool-${String(index + 1).padStart(3, "0")}`;
    const pricingModel = pricingModels[index % pricingModels.length]!;
    const record = await upsertBySlug(
      prisma.tool,
      slug,
      {
        name,
        website: `https://example.com/tools/${slug}`,
        pricingModel,
        status: ToolStatus.PUBLISHED,
        publishedAt: new Date(),
        summary: `Bulk seeded tool ${index + 1}`,
        description: `Description for ${name}`,
        createdById: actorId,
        metadata: {
          features: ["Feature A", "Feature B"],
          platforms: ["web", "api"],
          screenshots: [],
          aiSummary: `AI summary for ${name}`,
        },
      },
      { name, deletedAt: null, updatedById: actorId },
    );
    ids.push(record.id);

    const categoryId = categoryIds[index % categoryIds.length]!;
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: record.id, categoryId } },
      update: { deletedAt: null },
      create: { toolId: record.id, categoryId, isPrimary: true },
    });

    for (let tagOffset = 0; tagOffset < 3; tagOffset += 1) {
      const tagId = tagIds[(index + tagOffset) % tagIds.length]!;
      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId: record.id, tagId } },
        update: { deletedAt: null },
        create: { toolId: record.id, tagId },
      });
    }
  }

  return ids;
}

async function seedBulkPrompts(
  actorId: string,
  count: number,
  toolIds: string[],
  categoryIds: string[],
): Promise<void> {
  let promptCategory = await prisma.promptCategory.findFirst({
    where: { slug: "general", deletedAt: null },
  });

  if (!promptCategory) {
    promptCategory = await prisma.promptCategory.create({
      data: {
        slug: "general",
        name: "General",
        description: "General purpose prompts",
        createdById: actorId,
      },
    });
  }

  for (let index = 0; index < count; index += 1) {
    const title = `Prompt Template ${index + 1}`;
    const slug = `prompt-${String(index + 1).padStart(3, "0")}`;
    await upsertBySlug(
      prisma.prompt,
      slug,
      {
        title,
        content: `You are a helpful assistant. Task #${index + 1}: {{input}}`,
        status: PromptStatus.PUBLISHED,
        toolId: toolIds[index % toolIds.length],
        promptCategoryId: promptCategory.id,
        modelHint: "gpt-4o-mini",
        variables: ["input"],
        createdById: actorId,
        metadata: { categoryRef: categoryIds[index % categoryIds.length] },
      },
      { title, deletedAt: null, updatedById: actorId },
    );
  }
}

async function seedBulkFaqs(actorId: string, count: number, toolIds: string[]): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const toolId = toolIds[index % toolIds.length]!;
    const slug = `faq-${String(index + 1).padStart(3, "0")}`;
    const existing = await prisma.faq.findFirst({
      where: { toolId, slug, deletedAt: null },
    });

    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: { deletedAt: null, updatedById: actorId },
      });
      continue;
    }

    await prisma.faq.create({
      data: {
        toolId,
        slug,
        question: `FAQ question ${index + 1}?`,
        answer: `FAQ answer ${index + 1}.`,
        sortOrder: index,
        createdById: actorId,
      },
    });
  }
}
