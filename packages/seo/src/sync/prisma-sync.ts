import type { PrismaClient } from "@ai-tool-cms/database";
import { InternalLinkType, SeoComparePageType, ToolStatus } from "@ai-tool-cms/database";
import {
  PRESET_COMPARE_PAGES,
  buildToolInternalLinks,
  generateAlternativesPages,
  generateToolVsPages,
} from "../internal-links";
import { pingSearchEngines } from "../sitemap";
import { getSiteConfig } from "../site-config";

const activeOnly = { deletedAt: null } as const;

function mapCompareType(kind: string): SeoComparePageType {
  switch (kind) {
    case "tool_vs":
      return SeoComparePageType.TOOL_VS;
    case "alternatives":
      return SeoComparePageType.ALTERNATIVES;
    case "top_list":
    default:
      return SeoComparePageType.TOP_LIST;
  }
}

function mapLinkType(type: string): InternalLinkType {
  const map: Record<string, InternalLinkType> = {
    alternative: InternalLinkType.ALTERNATIVE,
    compare: InternalLinkType.COMPARE,
    category: InternalLinkType.CATEGORY,
    tag: InternalLinkType.TAG,
    prompt: InternalLinkType.PROMPT,
    faq: InternalLinkType.FAQ,
    related: InternalLinkType.RELATED,
    trending: InternalLinkType.TRENDING,
  };
  return map[type] ?? InternalLinkType.RELATED;
}

export async function syncComparePages(
  prisma: PrismaClient,
): Promise<{ created: number; updated: number }> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    select: {
      id: true,
      slug: true,
      name: true,
      categories: {
        where: activeOnly,
        include: { category: true },
        take: 1,
      },
    },
  });

  const mapped = tools.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    categorySlug: t.categories[0]?.category.slug,
  }));

  const specs = [
    ...PRESET_COMPARE_PAGES,
    ...generateToolVsPages(mapped),
    ...generateAlternativesPages(mapped),
  ];

  let created = 0;
  let updated = 0;
  for (const spec of specs) {
    const type = mapCompareType(spec.kind);
    const existing = await prisma.seoComparePage.findFirst({
      where: { slug: spec.slug, deletedAt: null },
    });
    const data = {
      slug: spec.slug,
      type,
      title: spec.title,
      status: ToolStatus.PUBLISHED,
      publishedAt: new Date(),
      metadata: spec as unknown as object,
    };
    if (existing) {
      await prisma.seoComparePage.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.seoComparePage.create({ data });
      created += 1;
    }
  }
  return { created, updated };
}

export async function syncInternalLinks(
  prisma: PrismaClient,
  toolId?: string,
): Promise<{ tools: number; links: number }> {
  const tools = await prisma.tool.findMany({
    where: {
      ...(toolId ? { id: toolId } : {}),
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
    },
    include: {
      categories: { where: activeOnly, include: { category: true } },
      tags: { where: activeOnly, include: { tag: true } },
      faqs: { where: activeOnly, take: 5 },
    },
  });

  const allPublished = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    select: { slug: true, name: true },
    take: 30,
  });

  let linkCount = 0;
  for (const tool of tools) {
    const primaryCategory = tool.categories.find((c) => c.isPrimary) ?? tool.categories[0];
    const related = allPublished
      .filter((t) => t.slug !== tool.slug)
      .slice(0, 12)
      .map((t) => ({ slug: t.slug, name: t.name }));

    const links = buildToolInternalLinks({
      slug: tool.slug,
      name: tool.name,
      categorySlug: primaryCategory?.category.slug,
      categoryName: primaryCategory?.category.name,
      tagSlugs: tool.tags.map((tt) => tt.tag.slug),
      relatedTools: related.slice(0, 8),
      trendingTools: related.slice(0, 5),
      faqAnchors: tool.faqs.map((f) => f.slug),
    });

    await prisma.internalLink.updateMany({
      where: { sourceToolId: tool.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (let i = 0; i < links.length; i += 1) {
      const link = links[i]!;
      await prisma.internalLink.create({
        data: {
          sourceToolId: tool.id,
          targetSlug: link.targetSlug,
          targetKind: link.targetKind,
          linkType: mapLinkType(link.type),
          anchorText: link.anchor,
          href: link.href,
          sortOrder: i,
        },
      });
    }
    linkCount += links.length;
  }

  return { tools: tools.length, links: linkCount };
}

export async function pingSitemapsAfterPublish(): Promise<unknown> {
  const config = getSiteConfig();
  const sitemapIndexUrl = `${config.siteUrl}/sitemap.xml`;
  return pingSearchEngines(sitemapIndexUrl);
}
