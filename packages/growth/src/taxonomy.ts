import { slugify } from "@ai-tool-cms/common";
import type { PrismaClient } from "@ai-tool-cms/database";
import { SeoEntityType, ToolStatus } from "@ai-tool-cms/database";

const activeOnly = { deletedAt: null } as const;

export type CrawlCategoryInput = {
  externalId: string;
  name: string;
  slug: string;
};

/** Persist crawl categories so tools can link by externalId/slug. */
export async function persistCrawlCategories(
  prisma: PrismaClient,
  categories: CrawlCategoryInput[],
  actorId?: string,
): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const [index, category] of categories.entries()) {
    const slug = category.slug || slugify(category.name);
    const existing = await prisma.category.findFirst({
      where: { slug, ...activeOnly },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          sortOrder: index,
          updatedById: actorId,
          metadata: {
            ...((existing.metadata ?? {}) as Record<string, unknown>),
            externalId: category.externalId,
          },
        },
      });
    } else {
      await prisma.category.create({
        data: {
          slug,
          name: category.name,
          sortOrder: index,
          createdById: actorId,
          metaTitle: `${category.name} AI Tools`,
          metaDescription: `Discover top ${category.name} AI tools.`,
          metadata: { externalId: category.externalId },
        },
      });
    }
    upserted += 1;
  }
  return { upserted };
}

/** Link tool to categories/tags from normalized ToolDTO fields. */
export async function syncToolTaxonomyFromNames(
  prisma: PrismaClient,
  toolId: string,
  input: { categories?: string[]; tags?: string[] },
  actorId?: string,
): Promise<{ categories: number; tags: number }> {
  const categorySlugs = (input.categories ?? []).map((c) => slugify(c));
  const tagSlugs = (input.tags ?? []).map((t) => slugify(t));

  if (categorySlugs.length) {
    await prisma.toolCategory.updateMany({
      where: { toolId, ...activeOnly },
      data: { deletedAt: new Date() },
    });
    for (const [index, slug] of categorySlugs.entries()) {
      let category = await prisma.category.findFirst({ where: { slug, ...activeOnly } });
      if (!category) {
        const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        category = await prisma.category.create({
          data: {
            slug,
            name,
            createdById: actorId,
            metaTitle: `${name} AI Tools`,
            metaDescription: `Discover top ${name} AI tools.`,
          },
        });
      }
      await prisma.toolCategory.upsert({
        where: { toolId_categoryId: { toolId, categoryId: category.id } },
        update: { deletedAt: null, isPrimary: index === 0 },
        create: { toolId, categoryId: category.id, isPrimary: index === 0 },
      });
    }
  }

  if (tagSlugs.length) {
    await prisma.toolTag.updateMany({
      where: { toolId, ...activeOnly },
      data: { deletedAt: new Date() },
    });
    for (const slug of tagSlugs) {
      let tag = await prisma.tag.findFirst({ where: { slug, ...activeOnly } });
      if (!tag) {
        const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        tag = await prisma.tag.create({
          data: { slug, name, createdById: actorId },
        });
      }
      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId, tagId: tag.id } },
        update: { deletedAt: null },
        create: { toolId, tagId: tag.id },
      });
    }
  }

  return { categories: categorySlugs.length, tags: tagSlugs.length };
}

/** Ensure published tools have at least one category for landing/compare pages. */
export async function ensureDefaultCategory(
  prisma: PrismaClient,
  toolId: string,
): Promise<{ assigned: boolean; categorySlug?: string }> {
  const links = await prisma.toolCategory.count({
    where: { toolId, ...activeOnly },
  });
  if (links > 0) return { assigned: false };

  const fallback =
    (await prisma.category.findFirst({ where: { slug: "productivity", ...activeOnly } })) ??
    (await prisma.category.findFirst({ where: activeOnly, orderBy: { sortOrder: "asc" } }));
  if (!fallback) return { assigned: false };

  await prisma.toolCategory.create({
    data: { toolId, categoryId: fallback.id, isPrimary: true },
  });
  return { assigned: true, categorySlug: fallback.slug };
}

/** Refresh category/tag SEO metadata after a tool publishes. */
export async function refreshTaxonomySeoMetadata(
  prisma: PrismaClient,
  toolId: string,
  actorId?: string,
): Promise<{ categories: number; tags: number }> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      tags: { where: activeOnly, include: { tag: true } },
    },
  });
  if (!tool) return { categories: 0, tags: 0 };

  let categories = 0;
  for (const link of tool.categories) {
    const category = link.category;
    const toolCount = await prisma.toolCategory.count({
      where: {
        categoryId: category.id,
        ...activeOnly,
        tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
      },
    });
    const metaTitle = `Best ${category.name} AI Tools (${toolCount})`;
    const metaDescription =
      category.description ??
      `Discover ${toolCount} ${category.name} AI tools with reviews, comparisons, and alternatives.`;

    await prisma.category.update({
      where: { id: category.id },
      data: { metaTitle, metaDescription, updatedAt: new Date() },
    });
    await prisma.seoMetadata.upsert({
      where: {
        entityType_entityId: { entityType: SeoEntityType.CATEGORY, entityId: category.id },
      },
      create: {
        entityType: SeoEntityType.CATEGORY,
        entityId: category.id,
        metaTitle,
        metaDescription,
        createdById: actorId,
      },
      update: { metaTitle, metaDescription, updatedById: actorId },
    });
    categories += 1;
  }

  let tags = 0;
  for (const link of tool.tags) {
    const tag = link.tag;
    const toolCount = await prisma.toolTag.count({
      where: {
        tagId: tag.id,
        ...activeOnly,
        tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
      },
    });
    const metaTitle = `${tag.name} AI Tools (${toolCount})`;
    const metaDescription = `Browse ${toolCount} AI tools tagged ${tag.name}.`;

    await prisma.tag.update({
      where: { id: tag.id },
      data: { updatedAt: new Date() },
    });
    await prisma.seoMetadata.upsert({
      where: {
        entityType_entityId: { entityType: SeoEntityType.TAG, entityId: tag.id },
      },
      create: {
        entityType: SeoEntityType.TAG,
        entityId: tag.id,
        metaTitle,
        metaDescription,
        createdById: actorId,
      },
      update: { metaTitle, metaDescription, updatedById: actorId },
    });
    tags += 1;
  }

  return { categories, tags };
}
