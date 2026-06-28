import { prisma, ToolStatus } from "@ai-tool-cms/database";
import type { ComparePageSpec } from "@ai-tool-cms/seo";
import {
  buildBreadcrumbJsonLd,
  buildCategoryLandingMetadata,
  buildCollectionPageJsonLd,
  buildComparePageJsonLd,
  buildComparePageMetadata,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildTagLandingMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

const activeOnly = { deletedAt: null } as const;

export type CatalogTool = {
  slug: string;
  name: string;
  summary: string | null;
};

export type CatalogFaq = {
  question: string;
  answer: string;
};

export type LandingPageData = {
  title: string;
  aiSummary: string;
  faqs: CatalogFaq[];
  relatedTools: CatalogTool[];
  trendingTools: CatalogTool[];
  jsonLd: Record<string, unknown>[];
};

async function fetchPublishedTools(limit = 12): Promise<CatalogTool[]> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { slug: true, name: true, summary: true },
  });
  return tools;
}

function buildCategoryFaqs(categoryName: string, tools: CatalogTool[]): CatalogFaq[] {
  const topNames = tools
    .slice(0, 3)
    .map((t) => t.name)
    .join(", ");
  return [
    {
      question: `What are the best ${categoryName} AI tools?`,
      answer: topNames
        ? `Top picks include ${topNames}. Compare features, pricing, and reviews on this page.`
        : `Browse curated ${categoryName} AI tools with reviews and comparisons.`,
    },
    {
      question: `How do I choose a ${categoryName} AI tool?`,
      answer: `Compare use cases, pricing, integrations, and user reviews. Start with the tools listed here and open individual tool pages for detailed FAQs.`,
    },
    {
      question: `Are there free ${categoryName} AI tools?`,
      answer: `Many ${categoryName} tools offer free tiers. Filter by tags such as free-tier or open-source to find options that match your budget.`,
    },
  ];
}

function buildTagFaqs(tagName: string): CatalogFaq[] {
  return [
    {
      question: `Which AI tools are tagged ${tagName}?`,
      answer: `This page lists AI tools tagged "${tagName}" with summaries, related tools, and comparison links.`,
    },
    {
      question: `How is the ${tagName} tag used?`,
      answer: `Tags group tools by capability, pricing model, or deployment style so you can discover alternatives faster.`,
    },
  ];
}

export async function getCategoryLanding(
  slug: string,
  locale: string,
): Promise<{
  metadata: ReturnType<typeof buildCategoryLandingMetadata>;
  data: LandingPageData;
} | null> {
  const category = await prisma.category.findFirst({
    where: { slug, ...activeOnly },
  });
  if (!category) return null;

  const toolLinks = await prisma.toolCategory.findMany({
    where: {
      categoryId: category.id,
      ...activeOnly,
      tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
    },
    include: {
      tool: { select: { slug: true, name: true, summary: true, publishedAt: true } },
    },
    orderBy: { tool: { publishedAt: "desc" } },
    take: 12,
  });

  const tools = toolLinks.map((link) => link.tool);
  const trending = await fetchPublishedTools(6);
  const config = getSiteConfig();
  const path = `/${locale}/category/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const aiSummary =
    category.description ??
    `Discover the best ${category.name} AI tools. Compare features, pricing, and alternatives in one place.`;

  const faqs = buildCategoryFaqs(category.name, tools);
  const relatedTools = tools.slice(0, 8).map((t) => ({
    slug: t.slug,
    name: t.name,
    summary: t.summary,
  }));

  const jsonLd = [
    buildCollectionPageJsonLd({
      name: `Best ${category.name} AI Tools`,
      url,
      description: aiSummary,
      items: relatedTools.map((t) => ({
        name: t.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${t.slug}`),
      })),
    }),
    buildFaqPageJsonLd({ url, faqs }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: category.name, path },
      ],
      config.siteUrl,
    ),
  ];

  return {
    metadata: buildCategoryLandingMetadata(category, locale),
    data: {
      title: `Best ${category.name} AI Tools`,
      aiSummary,
      faqs,
      relatedTools,
      trendingTools: trending,
      jsonLd,
    },
  };
}

export async function getTagLanding(
  slug: string,
  locale: string,
): Promise<{ metadata: ReturnType<typeof buildTagLandingMetadata>; data: LandingPageData } | null> {
  const tag = await prisma.tag.findFirst({
    where: { slug, ...activeOnly },
  });
  if (!tag) return null;

  const toolTags = await prisma.toolTag.findMany({
    where: { tagId: tag.id, ...activeOnly, tool: { status: ToolStatus.PUBLISHED, ...activeOnly } },
    include: {
      tool: { select: { slug: true, name: true, summary: true, publishedAt: true } },
    },
    orderBy: { tool: { publishedAt: "desc" } },
    take: 12,
  });

  const tools = toolTags.map((link) => link.tool);
  const trending = await fetchPublishedTools(6);
  const config = getSiteConfig();
  const path = `/${locale}/tag/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const aiSummary = `AI tools tagged "${tag.name}" — reviews, pricing, and alternatives.`;
  const faqs = buildTagFaqs(tag.name);
  const relatedTools = tools.slice(0, 8).map((t) => ({
    slug: t.slug,
    name: t.name,
    summary: t.summary,
  }));

  const jsonLd = [
    buildItemListJsonLd({
      name: `${tag.name} AI Tools`,
      url,
      items: relatedTools.map((t, index) => ({
        name: t.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${t.slug}`),
        position: index + 1,
      })),
    }),
    buildFaqPageJsonLd({ url, faqs }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: tag.name, path },
      ],
      config.siteUrl,
    ),
  ];

  return {
    metadata: buildTagLandingMetadata(tag, locale),
    data: {
      title: `${tag.name} AI Tools`,
      aiSummary,
      faqs,
      relatedTools,
      trendingTools: trending,
      jsonLd,
    },
  };
}

export async function getCompareLanding(
  slug: string,
  locale: string,
): Promise<{
  metadata: ReturnType<typeof buildComparePageMetadata>;
  data: LandingPageData;
} | null> {
  const page = await prisma.seoComparePage.findFirst({
    where: { slug, status: ToolStatus.PUBLISHED, ...activeOnly },
  });
  if (!page) return null;

  const spec = page.metadata as ComparePageSpec;
  const config = getSiteConfig();
  const trending = await fetchPublishedTools(6);

  let relatedTools: CatalogTool[] = [];
  if (spec.toolSlugs?.length) {
    const tools = await prisma.tool.findMany({
      where: { slug: { in: spec.toolSlugs }, status: ToolStatus.PUBLISHED, ...activeOnly },
      select: { slug: true, name: true, summary: true },
    });
    relatedTools = tools;
  } else if (spec.categorySlug) {
    const category = await prisma.category.findFirst({
      where: { slug: spec.categorySlug, ...activeOnly },
    });
    if (category) {
      const links = await prisma.toolCategory.findMany({
        where: { categoryId: category.id, ...activeOnly },
        include: { tool: { select: { slug: true, name: true, summary: true } } },
        take: 10,
      });
      relatedTools = links.map((l) => l.tool);
    }
  }

  const comparePath = `/${locale}/compare/${slug}`;
  const compareUrl = joinUrl(config.siteUrl, comparePath);

  const aiSummary = `${page.title}: compare features, pricing, and which option fits your workflow.`;
  const faqs: CatalogFaq[] = [
    {
      question: `What is the difference in ${page.title}?`,
      answer: aiSummary,
    },
    {
      question: `Which tool should I choose?`,
      answer: `Review pricing, integrations, and use-case fit. Open each tool page for detailed AI-generated summaries and FAQs.`,
    },
  ];

  const jsonLd = [
    buildComparePageJsonLd(spec, locale),
    buildFaqPageJsonLd({ url: compareUrl, faqs }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: "Compare", path: `/${locale}/compare/${slug}` },
      ],
      config.siteUrl,
    ),
  ];

  return {
    metadata: buildComparePageMetadata(spec, locale),
    data: {
      title: page.title,
      aiSummary,
      faqs,
      relatedTools,
      trendingTools: trending,
      jsonLd,
    },
  };
}
