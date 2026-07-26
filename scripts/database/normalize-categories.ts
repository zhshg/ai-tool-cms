import * as aiCategories from "../../packages/common/src/ai-categories";
import { prisma } from "../../prisma/seeds/context";

const STANDARD_AI_CATEGORIES = Array.isArray(aiCategories.STANDARD_AI_CATEGORIES)
  ? aiCategories.STANDARD_AI_CATEGORIES
  : [];
const resolveCanonicalCategorySlug =
  aiCategories.resolveCanonicalCategorySlug ?? ((_: string) => null);
const resolveCanonicalCategorySlugs =
  aiCategories.resolveCanonicalCategorySlugs ?? ((_: string) => [] as string[]);

type ExistingCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metadata: Record<string, unknown>;
};

async function main() {
  const shouldApply = process.argv.includes("--apply");
  const existingCategories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      metadata: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const normalizedCategories = existingCategories.map((category) => ({
    ...category,
    metadata:
      category.metadata && typeof category.metadata === "object"
        ? (category.metadata as Record<string, unknown>)
        : {},
  })) satisfies ExistingCategory[];

  const bySlug = new Map(normalizedCategories.map((category) => [category.slug, category]));
  const canonicalIds = new Map<string, string>();
  const upserts = STANDARD_AI_CATEGORIES.map((category) => {
    const existing = bySlug.get(category.slug) ?? null;
    if (existing) {
      canonicalIds.set(category.slug, existing.id);
    }
    return {
      slug: category.slug,
      exists: Boolean(existing),
      target: category,
    };
  });

  const links = await prisma.toolCategory.findMany({
    where: { deletedAt: null },
    select: { toolId: true, categoryId: true, isPrimary: true, category: { select: { slug: true, name: true } } },
  });

  const migrationPlan = links.flatMap((link) => {
    const targetSlugs = resolveCanonicalCategorySlugs(link.category.slug || link.category.name);
    return targetSlugs.map((targetSlug) => ({
      toolId: link.toolId,
      sourceCategoryId: link.categoryId,
      sourceSlug: link.category.slug,
      targetSlug,
      isPrimary: link.isPrimary,
    }));
  });

  const uniqueTargetPairs = new Map<string, { toolId: string; targetSlug: string; isPrimary: boolean }>();
  for (const item of migrationPlan) {
    const key = `${item.toolId}:${item.targetSlug}`;
    if (!uniqueTargetPairs.has(key)) {
      uniqueTargetPairs.set(key, {
        toolId: item.toolId,
        targetSlug: item.targetSlug,
        isPrimary: item.isPrimary,
      });
    } else if (item.isPrimary) {
      uniqueTargetPairs.get(key)!.isPrimary = true;
    }
  }

  console.info(`[normalize-categories] mode=${shouldApply ? "apply" : "dry-run"}`);
  console.info(`[normalize-categories] standardCategories=${STANDARD_AI_CATEGORIES.length}`);
  console.info(
    `[normalize-categories] upsert categories create=${upserts.filter((item) => !item.exists).length} update=${upserts.filter((item) => item.exists).length}`,
  );
  console.info(
    `[normalize-categories] tool category migrations planned=${uniqueTargetPairs.size}`,
  );

  const legacyCategories = normalizedCategories
    .filter((category) => {
      const canonical = resolveCanonicalCategorySlug(category.slug) ?? resolveCanonicalCategorySlug(category.name);
      return !STANDARD_AI_CATEGORIES.some((item) => item.slug === category.slug) && Boolean(canonical);
    })
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      canonical: resolveCanonicalCategorySlug(category.slug) ?? resolveCanonicalCategorySlug(category.name),
    }));

  if (legacyCategories.length) {
    console.info("[normalize-categories] legacy categories detected:");
    for (const category of legacyCategories) {
      console.info(`  - ${category.slug} -> ${category.canonical}`);
    }
  }

  if (!shouldApply) return;

  for (const category of STANDARD_AI_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { slug: category.slug, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          metaTitle: category.seoTitle,
          metaDescription: category.seoDescription,
          metadata: { featured: category.isFeatured },
          deletedAt: null,
        },
      });
      canonicalIds.set(category.slug, existing.id);
      continue;
    }

    const created = await prisma.category.create({
      data: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        metaTitle: category.seoTitle,
        metaDescription: category.seoDescription,
        metadata: { featured: category.isFeatured },
      },
    });
    canonicalIds.set(category.slug, created.id);
  }

  for (const item of uniqueTargetPairs.values()) {
    const categoryId = canonicalIds.get(item.targetSlug);
    if (!categoryId) continue;
    await prisma.toolCategory.upsert({
      where: { toolId_categoryId: { toolId: item.toolId, categoryId } },
      update: { deletedAt: null, isPrimary: item.isPrimary },
      create: { toolId: item.toolId, categoryId, isPrimary: item.isPrimary },
    });
  }

  console.info("[normalize-categories] apply complete");
}

main()
  .catch((error) => {
    console.error("[normalize-categories] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
