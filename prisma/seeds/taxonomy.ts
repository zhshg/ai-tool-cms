import { STANDARD_AI_CATEGORIES } from "@ai-tool-cms/common";
import { prisma } from "./context";
import { upsertBySlug } from "./helpers";
import { slugify } from "@ai-tool-cms/common";

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
