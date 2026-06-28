import { slugify } from "@ai-tool-cms/common";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";

const DEFAULT_CATEGORIES = [
  { name: "AI Writing", description: "Text generation and writing assistants" },
  { name: "Image Generation", description: "Image and art generation tools" },
  { name: "Code Assistant", description: "Developer and coding copilots" },
  { name: "Productivity", description: "Workflow and productivity AI" },
  { name: "Video & Audio", description: "Multimedia generation and editing" },
];

const DEFAULT_TAGS = [
  "chatbot",
  "gpt",
  "open-source",
  "api",
  "no-code",
  "enterprise",
  "free-tier",
  "multimodal",
];

export async function seedDefaultTaxonomy(actorId: string): Promise<{
  categoryIds: string[];
  tagIds: string[];
}> {
  const categoryIds: string[] = [];

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    const slug = slugify(category.name);
    const record = await upsertBySlug(
      prisma.category,
      slug,
      {
        name: category.name,
        description: category.description,
        sortOrder: index,
        createdById: actorId,
        metaTitle: `${category.name} AI Tools`,
        metaDescription: category.description,
      },
      {
        name: category.name,
        description: category.description,
        sortOrder: index,
        deletedAt: null,
        updatedById: actorId,
      },
    );
    categoryIds.push(record.id);
  }

  const tagIds: string[] = [];
  for (const tagName of DEFAULT_TAGS) {
    const slug = slugify(tagName);
    const record = await upsertBySlug(
      prisma.tag,
      slug,
      { name: tagName, createdById: actorId },
      { name: tagName, deletedAt: null, updatedById: actorId },
    );
    tagIds.push(record.id);
  }

  return { categoryIds, tagIds };
}
