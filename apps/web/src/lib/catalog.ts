import { prisma, PricingModel, ToolStatus } from "@ai-tool-cms/database";
import type { ComparePageSpec } from "@ai-tool-cms/seo";
import {
  buildMetadata,
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
  category?: string;
  pricing?: string;
  tag?: string;
  degraded?: boolean;
  error?: string | null;
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

export type CatalogSearchFilterOption = {
  slug: string;
  name: string;
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

export type SearchPageFilters = {
  categories: CatalogSearchFilterOption[];
  tags: CatalogSearchFilterOption[];
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

type CollectionPageSlug =
  | "best-ai-tools"
  | "free-ai-tools"
  | "new-ai-tools"
  | "trending-ai-tools";

async function fetchPublishedTools(limit = 12): Promise<CatalogTool[]> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { slug: true, name: true, summary: true },
  });
  return tools;
}

async function fetchPopularTools(limit = 12): Promise<CatalogTool[]> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: [
      { popularitySnapshots: { _count: "desc" } },
      { publishedAt: "desc" },
      { name: "asc" },
    ],
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
  category?: string;
  pricing?: string;
  tag?: string;
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
  if (input.category?.trim()) {
    params.set("category", input.category.trim());
  }
  if (input.pricing?.trim()) {
    params.set("pricing", input.pricing.trim());
  }
  if (input.tag?.trim()) {
    params.set("tag", input.tag.trim());
  }

  try {
    const response = await fetch(`${getInternalApiUrl()}/v1/search?${params.toString()}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return {
        query: input.query?.trim() ?? "",
        category: input.category?.trim() ?? "",
        pricing: input.pricing?.trim() ?? "",
        tag: input.tag?.trim() ?? "",
        hits: [],
        page,
        pageSize,
        totalHits: 0,
        totalPages: 1,
        processingTimeMs: 0,
        degraded: true,
        error: `Search API returned ${response.status}`,
      };
    }

    const result = (await response.json()) as CatalogSearchResult;
    return {
      ...result,
      category: input.category?.trim() ?? "",
      pricing: input.pricing?.trim() ?? "",
      tag: input.tag?.trim() ?? "",
      degraded: false,
      error: null,
    };
  } catch (error) {
    return {
      query: input.query?.trim() ?? "",
      category: input.category?.trim() ?? "",
      pricing: input.pricing?.trim() ?? "",
      tag: input.tag?.trim() ?? "",
      hits: [],
      page,
      pageSize,
      totalHits: 0,
      totalPages: 1,
      processingTimeMs: 0,
      degraded: true,
      error: error instanceof Error ? error.message : "Search API unavailable",
    };
  }
}

export async function getSearchPageFilters(): Promise<SearchPageFilters> {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: activeOnly,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 24,
      select: { slug: true, name: true },
    }),
    prisma.tag.findMany({
      where: activeOnly,
      orderBy: { name: "asc" },
      take: 40,
      select: { slug: true, name: true },
    }),
  ]);

  return { categories, tags };
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

function buildCollectionFaqs(title: string, tools: CatalogTool[], locale: string): CatalogFaq[] {
  const topNames = tools
    .slice(0, 3)
    .map((tool) => tool.name)
    .join(", ");

  if (locale === "zh") {
    return [
      {
        question: `${title} 页面如何排序？`,
        answer: topNames
          ? `当前优先展示 ${topNames} 等工具，并结合页面主题使用发布时间、定价或站内热度进行排序。`
          : `当前列表会根据页面主题使用发布时间、定价或站内热度进行排序。`,
      },
      {
        question: `这些工具数据来自哪里？`,
        answer: `页面直接使用站内已发布的真实工具数据，不使用额外的营销占位内容。`,
      },
      {
        question: `如何继续筛选更多工具？`,
        answer: `你可以继续进入工具详情页、分类页，或打开完整 Tools 与 Search 页面做进一步筛选。`,
      },
    ];
  }

  return [
    {
      question: `How is ${title} ranked?`,
      answer: topNames
        ? `This page currently highlights ${topNames} and ranks tools by the page theme, using publish recency, pricing, or on-site popularity signals.`
        : `This page ranks tools by the page theme, using publish recency, pricing, or on-site popularity signals.`,
    },
    {
      question: `Where does the data come from?`,
      answer: `The page uses real published tools already available in the directory and avoids placeholder marketing content.`,
    },
    {
      question: `How can I refine this list further?`,
      answer: `Open tool detail pages, category pages, or continue into the main Tools and Search pages for deeper filtering.`,
    },
  ];
}

function buildCollectionMetadata(input: {
  locale: string;
  slug: CollectionPageSlug;
  title: string;
  description: string;
}) {
  return buildMetadata({
    title: input.title,
    description: input.description,
    path: `/${input.locale}/${input.slug}`,
    keywords: ["AI tools", "AI directory", input.slug.replace(/-/g, " ")],
  });
}

function getCollectionCopy(slug: CollectionPageSlug, locale: string) {
  const isZh = locale === "zh";

  switch (slug) {
    case "best-ai-tools":
      return {
        title: isZh ? "最佳 AI 工具榜单" : "Best AI Tools",
        description: isZh
          ? "浏览目录中值得优先评估的 AI 工具，查看排序、摘要和内部导航。"
          : "Browse the most useful AI tools in the directory with ranked picks, summaries, and internal links.",
      };
    case "free-ai-tools":
      return {
        title: isZh ? "免费 AI 工具" : "Free AI Tools",
        description: isZh
          ? "查看可免费使用或低门槛试用的 AI 工具，快速找到适合入门和验证的选项。"
          : "Discover AI tools you can use for free or try with a low barrier before making a larger commitment.",
      };
    case "new-ai-tools":
      return {
        title: isZh ? "最新 AI 工具" : "New AI Tools",
        description: isZh
          ? "按发布时间查看最新收录的 AI 工具，持续追踪目录里的新增产品。"
          : "Track the newest AI tools added to the directory, ordered by recency and ready for review.",
      };
    case "trending-ai-tools":
      return {
        title: isZh ? "趋势 AI 工具" : "Trending AI Tools",
        description: isZh
          ? "查看当前更受关注的 AI 工具，结合站内热度与目录数据快速完成发现。"
          : "Explore AI tools drawing attention right now, ranked with on-site popularity signals and directory data.",
      };
    default:
      return {
        title: "AI Tools",
        description: "Browse AI tools from the directory.",
      };
  }
}

export async function getCollectionLanding(
  slug: CollectionPageSlug,
  locale: string,
): Promise<{
  metadata: ReturnType<typeof buildCollectionMetadata>;
  data: LandingPageData;
} | null> {
  const copy = getCollectionCopy(slug, locale);
  const config = getSiteConfig();
  const path = `/${locale}/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const [latestTools, popularTools, freeOnlyTools, freemiumTools] = await Promise.all([
    fetchPublishedTools(12),
    fetchPopularTools(12),
    fetchHomePageTools({ take: 10, pricingModels: [PricingModel.FREE] }),
    fetchHomePageTools({ take: 10, pricingModels: [PricingModel.FREEMIUM] }),
  ]);

  const trendingTools = popularTools.slice(0, 6);

  let rankedTools: CatalogTool[] = [];
  switch (slug) {
    case "best-ai-tools":
      rankedTools = popularTools.slice(0, 10);
      break;
    case "free-ai-tools":
      rankedTools = [
        ...freeOnlyTools,
        ...freemiumTools.filter((tool) => !freeOnlyTools.some((freeTool) => freeTool.id === tool.id)),
      ]
        .slice(0, 10)
        .map((tool) => ({ slug: tool.slug, name: tool.name, summary: tool.summary }));
      break;
    case "new-ai-tools":
      rankedTools = latestTools.slice(0, 10);
      break;
    case "trending-ai-tools":
      rankedTools = popularTools
        .filter((tool) => latestTools.some((latestTool) => latestTool.slug === tool.slug))
        .slice(0, 10);
      if (!rankedTools.length) {
        rankedTools = popularTools.slice(0, 10);
      }
      break;
    default:
      return null;
  }

  const faqs = buildCollectionFaqs(copy.title, rankedTools, locale);
  const jsonLd = [
    buildCollectionPageJsonLd({
      name: copy.title,
      url,
      description: copy.description,
      items: rankedTools.map((tool) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        description: tool.summary ?? undefined,
      })),
    }),
    buildItemListJsonLd({
      name: copy.title,
      url,
      items: rankedTools.map((tool, index) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        position: index + 1,
      })),
    }),
    buildFaqPageJsonLd({ url, faqs }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: copy.title, path },
      ],
      config.siteUrl,
    ),
  ];

  return {
    metadata: buildCollectionMetadata({
      locale,
      slug,
      title: copy.title,
      description: copy.description,
    }),
    data: {
      title: copy.title,
      aiSummary: copy.description,
      faqs,
      relatedTools: rankedTools,
      trendingTools,
      jsonLd,
    },
  };
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
