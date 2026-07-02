import { prisma, PricingModel, ToolStatus } from "@ai-tool-cms/database";
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

export type HomePageCategory = {
  slug: string;
  name: string;
  description: string | null;
  toolCount: number;
};

export type HomePageTool = CatalogTool & {
  id: string;
  website: string;
  pricingModel: PricingModel;
  publishedAt: string | null;
  category: { slug: string; name: string } | null;
  tagSlugs: string[];
};

export type CatalogSearchTool = CatalogTool & {
  id: string;
  website?: string;
  pricingModel?: string;
  categorySlugs: string[];
  categoryNames: string[];
  tagSlugs: string[];
  tagNames: string[];
};

export type CatalogSearchResult = {
  query: string;
  hits: Array<{ document: CatalogSearchTool; score: number }>;
  page: number;
  pageSize: number;
  totalHits: number;
  totalPages: number;
  processingTimeMs: number;
};

export type ToolsDirectorySort = "latest" | "popular" | "name";

export type ToolsDirectoryTool = CatalogTool & {
  id: string;
  website: string;
  logoUrl: string | null;
  pricingModel: PricingModel;
  publishedAt: string | null;
  primaryCategory: { slug: string; name: string } | null;
  categories: Array<{ slug: string; name: string }>;
  tags: Array<{ slug: string; name: string }>;
};

export type ToolsDirectoryCategory = {
  slug: string;
  name: string;
  toolCount: number;
};

export type ToolsDirectoryResult = {
  query: string;
  page: number;
  pageSize: number;
  totalHits: number;
  totalPages: number;
  sort: ToolsDirectorySort;
  category: string;
  pricing: PricingModel | "";
  categories: ToolsDirectoryCategory[];
  tools: ToolsDirectoryTool[];
};

type CategoryWithCount = {
  slug: string;
  name: string;
  description: string | null;
  _count: { tools: number };
};

type ToolLinkWithTool = {
  tool: CatalogTool;
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

async function fetchHomePageTools(input: {
  take: number;
  skip?: number;
  pricingModels?: PricingModel[];
  excludeIds?: string[];
}): Promise<HomePageTool[]> {
  const tools = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      ...(input.pricingModels?.length ? { pricingModel: { in: input.pricingModels } } : {}),
      ...(input.excludeIds?.length ? { id: { notIn: input.excludeIds } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    skip: input.skip ?? 0,
    take: input.take,
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      website: true,
      pricingModel: true,
      publishedAt: true,
      categories: {
        where: activeOnly,
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          category: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
      tags: {
        where: activeOnly,
        take: 4,
        select: {
          tag: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  return tools.map((tool) => ({
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    summary: tool.summary,
    website: tool.website,
    pricingModel: tool.pricingModel,
    publishedAt: tool.publishedAt?.toISOString() ?? null,
    category: tool.categories[0]?.category ?? null,
    tagSlugs: tool.tags.map((tag) => tag.tag.slug),
  }));
}

function getInternalApiUrl() {
  return process.env.INTERNAL_API_URL ?? process.env.API_URL ?? "http://localhost:4000";
}

function parseToolsDirectorySort(sort?: string): ToolsDirectorySort {
  if (sort === "popular" || sort === "name") return sort;
  return "latest";
}

function parsePricingModel(pricing?: string): PricingModel | "" {
  if (
    pricing === PricingModel.FREE ||
    pricing === PricingModel.FREEMIUM ||
    pricing === PricingModel.PAID ||
    pricing === PricingModel.CONTACT
  ) {
    return pricing;
  }
  return "";
}

function getToolsDirectoryOrderBy(sort: ToolsDirectorySort) {
  if (sort === "name") {
    return [{ name: "asc" as const }];
  }

  if (sort === "popular") {
    return [
      { popularitySnapshots: { _count: "desc" as const } },
      { publishedAt: "desc" as const },
      { name: "asc" as const },
    ];
  }

  return [
    { publishedAt: "desc" as const },
    { updatedAt: "desc" as const },
    { createdAt: "desc" as const },
  ];
}

export async function getToolsDirectory(input: {
  locale: string;
  query?: string;
  category?: string;
  pricing?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<ToolsDirectoryResult> {
  const query = input.query?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const pricing = parsePricingModel(input.pricing);
  const sort = parseToolsDirectorySort(input.sort);
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? 12));
  const skip = (page - 1) * pageSize;
  const publishedToolWhere = { status: ToolStatus.PUBLISHED, ...activeOnly };
  const where = {
    ...publishedToolWhere,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { summary: { contains: query, mode: "insensitive" as const } },
            { description: { contains: query, mode: "insensitive" as const } },
            {
              categories: {
                some: {
                  ...activeOnly,
                  category: {
                    ...activeOnly,
                    name: { contains: query, mode: "insensitive" as const },
                  },
                },
              },
            },
            {
              tags: {
                some: {
                  ...activeOnly,
                  tag: {
                    ...activeOnly,
                    name: { contains: query, mode: "insensitive" as const },
                  },
                },
              },
            },
          ],
        }
      : {}),
    ...(category
      ? {
          categories: {
            some: {
              ...activeOnly,
              category: { slug: category, ...activeOnly },
            },
          },
        }
      : {}),
    ...(pricing ? { pricingModel: pricing } : {}),
  };

  const [totalHits, tools, categories] = await Promise.all([
    prisma.tool.count({ where }),
    prisma.tool.findMany({
      where,
      orderBy: getToolsDirectoryOrderBy(sort),
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        website: true,
        logoUrl: true,
        pricingModel: true,
        publishedAt: true,
        categories: {
          where: activeOnly,
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            isPrimary: true,
            category: { select: { slug: true, name: true } },
          },
        },
        tags: {
          where: activeOnly,
          orderBy: { createdAt: "asc" },
          take: 5,
          select: {
            tag: { select: { slug: true, name: true } },
          },
        },
      },
    }),
    prisma.category.findMany({
      where: activeOnly,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 24,
      include: {
        _count: {
          select: {
            tools: {
              where: { deletedAt: null, tool: publishedToolWhere },
            },
          },
        },
      },
    }),
  ]);

  void input.locale;
  return {
    query,
    page,
    pageSize,
    totalHits,
    totalPages: Math.max(1, Math.ceil(totalHits / pageSize)),
    sort,
    category,
    pricing,
    categories: categories.map((item) => ({
      slug: item.slug,
      name: item.name,
      toolCount: item._count.tools,
    })),
    tools: tools.map((tool) => {
      const categories = tool.categories.map((item) => item.category);
      const primaryCategory =
        tool.categories.find((item) => item.isPrimary)?.category ?? categories[0] ?? null;
      return {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        summary: tool.summary,
        website: tool.website,
        logoUrl: tool.logoUrl,
        pricingModel: tool.pricingModel,
        publishedAt: tool.publishedAt?.toISOString() ?? null,
        primaryCategory,
        categories,
        tags: tool.tags.map((item) => item.tag),
      };
    }),
  };
}

export async function searchCatalogTools(input: {
  locale: string;
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<CatalogSearchResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 12));
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort: input.query ? "relevance" : "newest",
  });

  if (input.query?.trim()) {
    params.set("q", input.query.trim());
  }

  const response = await fetch(`${getInternalApiUrl()}/v1/search?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Search API returned ${response.status}`);
  }

  void input.locale;
  return response.json() as Promise<CatalogSearchResult>;
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

export async function getHomePageData(locale: string): Promise<{
  categories: HomePageCategory[];
  featuredTools: HomePageTool[];
  trendingTools: HomePageTool[];
  latestTools: HomePageTool[];
  freeTools: HomePageTool[];
  stats: {
    toolCount: number;
    categoryCount: number;
    freeToTryCount: number;
  };
}> {
  const categories = await prisma.category.findMany({
    where: activeOnly,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 12,
    include: {
      _count: {
        select: {
          tools: {
            where: { deletedAt: null, tool: { status: ToolStatus.PUBLISHED, deletedAt: null } },
          },
        },
      },
    },
  });

  const [latestTools, freeOnlyTools, freemiumTools, toolCount, categoryCount, freeToTryCount] =
    await Promise.all([
      fetchHomePageTools({ take: 8 }),
      fetchHomePageTools({ take: 6, pricingModels: [PricingModel.FREE] }),
      fetchHomePageTools({ take: 6, pricingModels: [PricingModel.FREEMIUM] }),
      prisma.tool.count({
        where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      }),
      prisma.category.count({
        where: activeOnly,
      }),
      prisma.tool.count({
        where: {
          status: ToolStatus.PUBLISHED,
          ...activeOnly,
          pricingModel: { in: [PricingModel.FREE, PricingModel.FREEMIUM] },
        },
      }),
    ]);

  const featuredTools = latestTools.slice(0, 4);
  const trendingTools = latestTools
    .filter((tool) => tool.pricingModel !== PricingModel.FREE || tool.tagSlugs.includes("multimodal"))
    .slice(0, 6);
  const freeTools = [
    ...freeOnlyTools,
    ...freemiumTools.filter((tool) => !freeOnlyTools.some((freeTool) => freeTool.id === tool.id)),
  ].slice(0, 6);

  const sortedCategories = categories
    .map((category: CategoryWithCount) => ({
      slug: category.slug,
      name: category.name,
      description: category.description ?? null,
      toolCount: category._count.tools,
    }))
    .sort((left, right) => right.toolCount - left.toolCount || left.name.localeCompare(right.name));

  void locale;

  return {
    categories: sortedCategories,
    featuredTools,
    trendingTools,
    latestTools,
    freeTools,
    stats: {
      toolCount,
      categoryCount,
      freeToTryCount,
    },
  };
}

export async function getHomePageSeoData(locale: string): Promise<{
  jsonLd: Record<string, unknown>[];
}> {
  const config = getSiteConfig();
  const url = joinUrl(config.siteUrl, `/${locale}`);
  const featuredTools = await fetchHomePageTools({ take: 6 });

  return {
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "AI Tool Directory",
        url,
        potentialAction: {
          "@type": "SearchAction",
          target: joinUrl(config.siteUrl, `/${locale}/search?q={search_term_string}`),
          "query-input": "required name=search_term_string",
        },
      },
      buildItemListJsonLd({
        name: "Featured AI Tools",
        url,
        items: featuredTools.map((tool, index) => ({
          name: tool.name,
          url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
          position: index + 1,
        })),
      }),
    ],
  };
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

  const tools = toolLinks.map((link: ToolLinkWithTool) => link.tool);
  const trending = await fetchPublishedTools(6);
  const config = getSiteConfig();
  const path = `/${locale}/category/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const aiSummary =
    category.description ??
    `Discover the best ${category.name} AI tools. Compare features, pricing, and alternatives in one place.`;

  const faqs = buildCategoryFaqs(category.name, tools);
  const relatedTools = tools.slice(0, 8).map((t: CatalogTool) => ({
    slug: t.slug,
    name: t.name,
    summary: t.summary,
  }));

  const jsonLd = [
    buildCollectionPageJsonLd({
      name: `Best ${category.name} AI Tools`,
      url,
      description: aiSummary,
      items: relatedTools.map((t: CatalogTool) => ({
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

  const tools = toolTags.map((link: ToolLinkWithTool) => link.tool);
  const trending = await fetchPublishedTools(6);
  const config = getSiteConfig();
  const path = `/${locale}/tag/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const aiSummary = `AI tools tagged "${tag.name}" — reviews, pricing, and alternatives.`;
  const faqs = buildTagFaqs(tag.name);
  const relatedTools = tools.slice(0, 8).map((t: CatalogTool) => ({
    slug: t.slug,
    name: t.name,
    summary: t.summary,
  }));

  const jsonLd = [
    buildItemListJsonLd({
      name: `${tag.name} AI Tools`,
      url,
      items: relatedTools.map((t: CatalogTool, index: number) => ({
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
      relatedTools = links.map((l: ToolLinkWithTool) => l.tool);
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
