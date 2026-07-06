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
import { resolveToolFallbackLogoUrl, resolveToolLogoUrl } from "./tool-logo";

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

export type CategoriesPageCategory = HomePageCategory & {
  iconUrl: string | null;
  isFeatured: boolean;
  shortDescription: string;
  ctaHint: string;
};

export type HomePageTool = CatalogTool & {
  id: string;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  pricingModel: PricingModel;
  publishedAt: string | null;
  category: { slug: string; name: string; iconUrl: string | null } | null;
  tagSlugs: string[];
};

export type CatalogSearchTool = CatalogTool & {
  id: string;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  pricingModel?: string;
  platforms: string[];
  languages: string[];
  hasApi?: boolean;
  isFree?: boolean;
  isOpenSource?: boolean;
  reviewScore?: number;
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
  platform?: string;
  language?: string;
  api?: boolean;
  free?: boolean;
  openSource?: boolean;
  sort?: string;
  degraded?: boolean;
  error?: string | null;
};

export type ToolsDirectorySort = "latest" | "popular" | "name";

export type ToolsDirectoryTool = CatalogTool & {
  id: string;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  pricingModel: PricingModel;
  publishedAt: string | null;
  primaryCategory: { slug: string; name: string; iconUrl: string | null } | null;
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
  platforms: CatalogSearchFilterOption[];
  languages: CatalogSearchFilterOption[];
  suggestions: string[];
  recentSearches: string[];
  popularSearches: string[];
  synonyms: string[];
};

export type PublicShellData = {
  categories: HomePageCategory[];
  popularTools: CatalogTool[];
};

export type CategoriesPageData = {
  categories: CategoriesPageCategory[];
  featuredTools: HomePageTool[];
  stats: {
    categoryCount: number;
    toolCount: number;
    featuredCount: number;
  };
};

export type CategoryDetailTool = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  categoryIconUrl: string | null;
  pricingModel: PricingModel;
  pricingLabel: string;
  rating: number | null;
  ratingLabel: string | null;
  publishedAt: string | null;
  categories: Array<{ slug: string; name: string }>;
};

export type CategorySidebarLink = {
  href: string;
  label: string;
  description?: string | null;
};

export type CategoryLandingData = {
  title: string;
  aiSummary: string;
  faqs: CatalogFaq[];
  relatedTools: CatalogTool[];
  trendingTools: CategoryDetailTool[];
  jsonLd: Record<string, unknown>[];
  category: {
    slug: string;
    name: string;
    title: string;
    description: string;
    toolCount: number;
    updatedAt: string;
    updatedLabel: string;
    iconUrl: string | null;
    isFeatured: boolean;
  };
  featuredTools: CategoryDetailTool[];
  allTools: CategoryDetailTool[];
  relatedCategories: CategoriesPageCategory[];
  popularCategories: CategoriesPageCategory[];
  popularCollections: CategorySidebarLink[];
  sidebar: {
    topCategories: CategorySidebarLink[];
    newestTools: CategorySidebarLink[];
    popularCollections: CategorySidebarLink[];
    blogGuides: CategorySidebarLink[];
  };
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
  lastUpdatedLabel?: string;
};

type CollectionPageSlug =
  | "best-ai-tools"
  | "best-ai-writing-tools"
  | "best-ai-image-generators"
  | "best-ai-video-generators"
  | "best-ai-coding-tools"
  | "best-ai-seo-tools"
  | "free-ai-tools"
  | "new-ai-tools"
  | "trending-ai-tools"
  | "ai-tools-for-productivity";

const COLLECTION_PAGE_DEFS: Array<{
  slug: CollectionPageSlug;
  label: string;
  description: string;
}> = [
  {
    slug: "best-ai-tools",
    label: "Best AI Tools",
    description: "Browse the strongest tools across the directory.",
  },
  {
    slug: "best-ai-writing-tools",
    label: "Best AI Writing Tools",
    description: "Compare top AI writing tools for drafting, editing, and content workflows.",
  },
  {
    slug: "best-ai-image-generators",
    label: "Best AI Image Generators",
    description: "Explore leading AI image tools for art, design assets, and creative production.",
  },
  {
    slug: "best-ai-video-generators",
    label: "Best AI Video Generators",
    description: "Discover AI video tools for generation, editing, clips, and multimedia production.",
  },
  {
    slug: "best-ai-coding-tools",
    label: "Best AI Coding Tools",
    description: "Find AI coding assistants, developer copilots, and product building tools.",
  },
  {
    slug: "best-ai-seo-tools",
    label: "Best AI SEO Tools",
    description: "Review AI SEO tools for keyword research, content optimization, and growth workflows.",
  },
  {
    slug: "free-ai-tools",
    label: "Free AI Tools",
    description: "Find tools with free access or easy trial entry points.",
  },
  {
    slug: "new-ai-tools",
    label: "New AI Tools",
    description: "Track the latest published tools added to the directory.",
  },
  {
    slug: "trending-ai-tools",
    label: "Trending AI Tools",
    description: "Follow tools drawing attention right now.",
  },
  {
    slug: "ai-tools-for-productivity",
    label: "AI Tools for Productivity",
    description: "Browse AI productivity tools for notes, planning, meetings, and day-to-day execution.",
  },
];

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

async function fetchPopularHomePageTools(limit = 8): Promise<HomePageTool[]> {
  const tools = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
    },
    orderBy: [
      { popularitySnapshots: { _count: "desc" } },
      { publishedAt: "desc" },
      { name: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      website: true,
      logoUrl: true,
      metadata: true,
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
              iconUrl: true,
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
    logoUrl: resolveToolLogoUrl(
      tool.logoUrl,
      (tool.metadata ?? {}) as Record<string, unknown>,
      tool.website,
    ),
    collectedLogoUrl: resolveToolFallbackLogoUrl(
      tool.logoUrl,
      (tool.metadata ?? {}) as Record<string, unknown>,
      tool.website,
    ),
    pricingModel: tool.pricingModel,
    publishedAt: tool.publishedAt?.toISOString() ?? null,
    category: tool.categories[0]?.category ?? null,
    tagSlugs: tool.tags.map((tag) => tag.tag.slug),
  }));
}

async function fetchCategoryDirectoryData(limit = 16): Promise<HomePageCategory[]> {
  const categories = await prisma.category.findMany({
    where: activeOnly,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
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

  return categories
    .map((category: CategoryWithCount) => ({
      slug: category.slug,
      name: category.name,
      description: category.description ?? null,
      toolCount: category._count.tools,
    }))
    .sort((left, right) => right.toolCount - left.toolCount || left.name.localeCompare(right.name));
}

async function fetchRichCategoryDirectoryData(limit = 24): Promise<CategoriesPageCategory[]> {
  const categories = await prisma.category.findMany({
    where: activeOnly,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
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

  return categories
    .map((category) => {
      const metadata =
        category.metadata && typeof category.metadata === "object"
          ? (category.metadata as Record<string, unknown>)
          : {};
      const shortDescription =
        category.description ??
        `Browse ${category.name} tools, compare options, and continue into related directory pages.`;
      return {
        slug: category.slug,
        name: category.name,
        description: category.description ?? null,
        toolCount: category._count.tools,
        iconUrl: category.iconUrl ?? null,
        isFeatured:
          Boolean(metadata.featured) || category._count.tools >= 3 || category.sortOrder < 6,
        shortDescription,
        ctaHint:
          category._count.tools > 0
            ? `Explore ${category._count.tools} tools`
            : "Open category hub",
      } satisfies CategoriesPageCategory;
    })
    .sort((left, right) => {
      if (Number(right.isFeatured) !== Number(left.isFeatured)) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }
      return right.toolCount - left.toolCount || left.name.localeCompare(right.name);
    });
}

function formatPricingLabel(pricingModel: PricingModel): string {
  switch (pricingModel) {
    case PricingModel.FREE:
      return "Free";
    case PricingModel.FREEMIUM:
      return "Freemium";
    case PricingModel.PAID:
      return "Paid";
    case PricingModel.CONTACT:
      return "Contact Sales";
    default:
      return pricingModel;
  }
}

function formatDateLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

async function fetchCategoryDetailTools(
  categoryId: string,
  limit = 12,
): Promise<CategoryDetailTool[]> {
  const toolLinks = await prisma.toolCategory.findMany({
    where: {
      categoryId,
      ...activeOnly,
      tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
    },
    orderBy: [{ isPrimary: "desc" }, { tool: { publishedAt: "desc" } }],
    take: limit,
    select: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          summary: true,
          website: true,
          logoUrl: true,
          metadata: true,
          pricingModel: true,
          publishedAt: true,
          categories: {
            where: activeOnly,
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            select: {
              category: {
                select: {
                  slug: true,
                  name: true,
                  iconUrl: true,
                },
              },
            },
          },
          reviews: {
            where: { ...activeOnly, status: "APPROVED" },
            select: {
              rating: true,
            },
          },
        },
      },
    },
  });

  return toolLinks.map((link) => {
    const ratings = link.tool.reviews.map((review) => review.rating);
    const averageRating = ratings.length
      ? ratings.reduce((total, value) => total + value, 0) / ratings.length
      : null;
    return {
      id: link.tool.id,
      slug: link.tool.slug,
      name: link.tool.name,
      summary: link.tool.summary,
      website: link.tool.website,
      logoUrl: resolveToolLogoUrl(
        link.tool.logoUrl,
        (link.tool.metadata ?? {}) as Record<string, unknown>,
        link.tool.website,
      ),
      collectedLogoUrl: resolveToolFallbackLogoUrl(
        link.tool.logoUrl,
        (link.tool.metadata ?? {}) as Record<string, unknown>,
        link.tool.website,
      ),
      categoryIconUrl: link.tool.categories[0]?.category.iconUrl ?? null,
      pricingModel: link.tool.pricingModel,
      pricingLabel: formatPricingLabel(link.tool.pricingModel),
      rating: averageRating,
      ratingLabel: averageRating ? averageRating.toFixed(1) : null,
      publishedAt: link.tool.publishedAt?.toISOString() ?? null,
      categories: link.tool.categories.map((item) => item.category),
    } satisfies CategoryDetailTool;
  });
}

function buildCollectionLinks(locale: string): CategorySidebarLink[] {
  return COLLECTION_PAGE_DEFS.map((item) => ({
    href: `/${locale}/${item.slug}`,
    label: item.label,
    description: item.description,
  }));
}

function buildBlogGuideLinks(locale: string): CategorySidebarLink[] {
  const dateLabel = locale === "zh" ? "���͵���" : "Blog guide";
  return [
    {
      href: `/${locale}/blog`,
      label: locale === "zh" ? "AI ����Ŀ¼����" : "AI Tool Directory Blog",
      description: dateLabel,
    },
    {
      href: `/${locale}/blog`,
      label: locale === "zh" ? "Ŀ¼��뷢��" : "Launch and production notes",
      description: dateLabel,
    },
    {
      href: `/${locale}/blog`,
      label: locale === "zh" ? "�Ƚ�ҳ�뵼������" : "Comparison and navigation guides",
      description: dateLabel,
    },
  ];
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
      logoUrl: true,
      metadata: true,
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
              iconUrl: true,
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
    logoUrl: resolveToolLogoUrl(
      tool.logoUrl,
      (tool.metadata ?? {}) as Record<string, unknown>,
      tool.website,
    ),
    collectedLogoUrl: resolveToolFallbackLogoUrl(
      tool.logoUrl,
      (tool.metadata ?? {}) as Record<string, unknown>,
      tool.website,
    ),
    pricingModel: tool.pricingModel,
    publishedAt: tool.publishedAt?.toISOString() ?? null,
    category: tool.categories[0]?.category ?? null,
    tagSlugs: tool.tags.map((tag) => tag.tag.slug),
  }));
}

async function fetchCollectionToolsByCategorySlugs(
  categorySlugs: string[],
  limit = 10,
): Promise<CatalogTool[]> {
  if (!categorySlugs.length) return [];

  const tools = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      categories: {
        some: {
          ...activeOnly,
          category: {
            ...activeOnly,
            slug: { in: categorySlugs },
          },
        },
      },
    },
    orderBy: [
      { popularitySnapshots: { _count: "desc" } },
      { publishedAt: "desc" },
      { updatedAt: "desc" },
      { name: "asc" },
    ],
    take: limit,
    select: {
      slug: true,
      name: true,
      summary: true,
    },
  });

  return tools;
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
        metadata: true,
        pricingModel: true,
        publishedAt: true,
        categories: {
          where: activeOnly,
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            isPrimary: true,
            category: { select: { slug: true, name: true, iconUrl: true } },
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
        logoUrl: resolveToolLogoUrl(
          tool.logoUrl,
          (tool.metadata ?? {}) as Record<string, unknown>,
          tool.website,
        ),
        collectedLogoUrl: resolveToolFallbackLogoUrl(
          tool.logoUrl,
          (tool.metadata ?? {}) as Record<string, unknown>,
          tool.website,
        ),
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
  platform?: string;
  language?: string;
  api?: boolean;
  free?: boolean;
  openSource?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<CatalogSearchResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 12));
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort: input.sort ?? (input.query ? "relevance" : "newest"),
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
  if (input.platform?.trim()) {
    params.set("platform", input.platform.trim());
  }
  if (input.language?.trim()) {
    params.set("language", input.language.trim());
  }
  if (input.api) {
    params.set("api", "true");
  }
  if (input.free) {
    params.set("free", "true");
  }
  if (input.openSource) {
    params.set("openSource", "true");
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
        platform: input.platform?.trim() ?? "",
        language: input.language?.trim() ?? "",
        api: Boolean(input.api),
        free: Boolean(input.free),
        openSource: Boolean(input.openSource),
        sort: input.sort ?? (input.query ? "relevance" : "newest"),
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
      hits: result.hits.map((hit) => ({
        ...hit,
        document: {
          ...hit.document,
          website: hit.document.website,
          logoUrl:
            hit.document.logoUrl ??
            resolveToolLogoUrl(null, {}, hit.document.website) ??
            null,
          collectedLogoUrl:
            hit.document.collectedLogoUrl ??
            resolveToolFallbackLogoUrl(hit.document.logoUrl, {}, hit.document.website),
        },
      })),
      category: input.category?.trim() ?? "",
      pricing: input.pricing?.trim() ?? "",
      tag: input.tag?.trim() ?? "",
      platform: input.platform?.trim() ?? "",
      language: input.language?.trim() ?? "",
      api: Boolean(input.api),
      free: Boolean(input.free),
      openSource: Boolean(input.openSource),
      sort: input.sort ?? (input.query ? "relevance" : "newest"),
      degraded: false,
      error: null,
    };
  } catch (error) {
    return {
      query: input.query?.trim() ?? "",
      category: input.category?.trim() ?? "",
      pricing: input.pricing?.trim() ?? "",
      tag: input.tag?.trim() ?? "",
      platform: input.platform?.trim() ?? "",
      language: input.language?.trim() ?? "",
      api: Boolean(input.api),
      free: Boolean(input.free),
      openSource: Boolean(input.openSource),
      sort: input.sort ?? (input.query ? "relevance" : "newest"),
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
  const [categories, tags, tools, recentQueries, apiSuggestions] = await Promise.all([
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
    prisma.tool.findMany({
      where: { status: ToolStatus.PUBLISHED, ...activeOnly },
      orderBy: [{ publishedAt: "desc" }, { name: "asc" }],
      take: 200,
      select: { name: true, metadata: true },
    }),
    prisma.searchQueryLog.groupBy({
      by: ["query"],
      where: { hadResults: true, query: { not: "" } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 8,
    }),
    fetchSearchSuggestions(),
  ]);

  const platformMap = new Map<string, string>();
  const languageMap = new Map<string, string>();
  const suggestions = new Set<string>();

  for (const tool of tools) {
    suggestions.add(tool.name);
    const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
    for (const platform of normalizeCatalogStringList(metadata.aiPlatforms ?? metadata.platforms)) {
      platformMap.set(slugifyFilterValue(platform), platform);
    }
    for (const language of normalizeCatalogStringList(metadata.aiLanguages ?? metadata.languages)) {
      languageMap.set(slugifyFilterValue(language), language);
    }
  }

  return {
    categories,
    tags,
    platforms: [...platformMap.values()].map((name) => ({ slug: name, name })).slice(0, 24),
    languages: [...languageMap.values()].map((name) => ({ slug: name, name })).slice(0, 24),
    suggestions: dedupeStrings([
      ...apiSuggestions.autocomplete.map((item) => item.label),
      ...apiSuggestions.synonyms,
      ...suggestions,
    ]).slice(0, 12),
    recentSearches: dedupeStrings([
      ...apiSuggestions.recent.map((item) => item.query),
      ...recentQueries.map((item) => item.query).filter(Boolean),
    ]).slice(0, 8),
    popularSearches: apiSuggestions.popular.map((item) => item.query).slice(0, 8),
    synonyms: apiSuggestions.synonyms.slice(0, 8),
  };
}

type SearchSuggestionsResponse = {
  autocomplete: Array<{ type: string; label: string; value: string }>;
  synonyms: string[];
  popular: Array<{ query: string; count: number }>;
  recent: Array<{ query: string; createdAt: string }>;
};

async function fetchSearchSuggestions(): Promise<SearchSuggestionsResponse> {
  try {
    const response = await fetch(`${getInternalApiUrl()}/v1/search/suggestions?limit=12`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Search suggestions API returned ${response.status}`);
    return (await response.json()) as SearchSuggestionsResponse;
  } catch {
    return { autocomplete: [], synonyms: [], popular: [], recent: [] };
  }
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = item.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function normalizeCatalogStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function slugifyFilterValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export async function getPublicShellData(): Promise<PublicShellData> {
  const [categories, popularTools] = await Promise.all([
    fetchCategoryDirectoryData(8),
    fetchPopularTools(6),
  ]);

  return { categories, popularTools };
}

export async function getCategoriesPageData(locale: string): Promise<CategoriesPageData> {
  const [categories, featuredTools, categoryCount, toolCount] = await Promise.all([
    fetchRichCategoryDirectoryData(24),
    fetchPopularHomePageTools(6),
    prisma.category.count({ where: activeOnly }),
    prisma.tool.count({ where: { status: ToolStatus.PUBLISHED, ...activeOnly } }),
  ]);

  void locale;

  return {
    categories,
    featuredTools,
    stats: {
      categoryCount,
      toolCount,
      featuredCount: categories.filter((category) => category.isFeatured).length,
    },
  };
}

function buildCategoryFaqs(categoryName: string, tools: CatalogTool[]): CatalogFaq[] {
  const toolsLabel = buildCategoryToolsLabel(categoryName).toLowerCase();
  const topNames = tools
    .slice(0, 3)
    .map((t) => t.name)
    .join(", ");
  return [
    {
      question: `What are the best ${toolsLabel}?`,
      answer: topNames
        ? `Top picks include ${topNames}. Compare features, pricing, and reviews on this page.`
        : `Browse curated ${toolsLabel} with reviews and comparisons.`,
    },
    {
      question: `How do I choose a ${buildCategoryToolsLabel(categoryName)
        .toLowerCase()
        .replace(/tools$/u, "tool")}?`,
      answer: `Compare use cases, pricing, integrations, and user reviews. Start with the tools listed here and open individual tool pages for detailed FAQs.`,
    },
    {
      question: `Are there free ${toolsLabel}?`,
      answer: `Many ${toolsLabel} offer free tiers. Filter by tags such as free-tier or open-source to find options that match your budget.`,
    },
  ];
}

function normalizeCategoryLabel(categoryName: string): string {
  return categoryName.endsWith(" AI") ? categoryName.slice(0, -3) : categoryName;
}

function buildCategoryToolsLabel(categoryName: string): string {
  const normalizedName = normalizeCategoryLabel(categoryName);
  return /^AI\b/u.test(normalizedName) ? `${normalizedName} Tools` : `${normalizedName} AI Tools`;
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
        question: `${title} ҳ���������`,
        answer: topNames
          ? `��ǰ����չʾ ${topNames} �ȹ��ߣ������ҳ������ʹ�÷���ʱ�䡢���ۻ�վ���ȶȽ�������`
          : `��ǰ�б�����ҳ������ʹ�÷���ʱ�䡢���ۻ�վ���ȶȽ�������`,
      },
      {
        question: `��Щ���������������`,
        answer: `ҳ��ֱ��ʹ��վ���ѷ�������ʵ�������ݣ���ʹ�ö����Ӫ��ռλ���ݡ�`,
      },
      {
        question: `��μ���ɸѡ���๤�ߣ�`,
        answer: `����Լ������빤������ҳ������ҳ��������� Tools �� Search ҳ������һ��ɸѡ��`,
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
        title: isZh ? "���?AI ���߰�" : "Best AI Tools",
        description: isZh
          ? "���Ŀ¼��ֵ������������?AI ���ߣ��鿴����ժҪ���ڲ�������"
          : "Browse the most useful AI tools in the directory with ranked picks, summaries, and internal links.",
      };
    case "best-ai-writing-tools":
      return {
        title: isZh ? "最佳 AI 写作工具" : "Best AI Writing Tools",
        description: isZh
          ? "筛选适合写作、编辑、营销文案与内容工作流的 AI 工具。"
          : "Compare AI writing tools for drafting, editing, blogs, marketing copy, and repeatable content workflows.",
      };
    case "best-ai-image-generators":
      return {
        title: isZh ? "最佳 AI 图片生成工具" : "Best AI Image Generators",
        description: isZh
          ? "发现适合图片生成、视觉资产制作与创意设计的 AI 工具。"
          : "Explore AI image generators and creative tools for artwork, design assets, product visuals, and branded content.",
      };
    case "best-ai-video-generators":
      return {
        title: isZh ? "最佳 AI 视频生成工具" : "Best AI Video Generators",
        description: isZh
          ? "对比视频生成、剪辑、数字人和内容再利用场景中的 AI 工具。"
          : "Review AI video tools for generation, editing, avatars, repurposing, and multimedia production.",
      };
    case "best-ai-coding-tools":
      return {
        title: isZh ? "最佳 AI 编程工具" : "Best AI Coding Tools",
        description: isZh
          ? "查找适合代码补全、调试、重构与产品开发的 AI 编程工具。"
          : "Find AI coding tools for code completion, refactoring, debugging, prototyping, and shipping software faster.",
      };
    case "best-ai-seo-tools":
      return {
        title: isZh ? "最佳 AI SEO 工具" : "Best AI SEO Tools",
        description: isZh
          ? "浏览用于关键词研究、内容优化、搜索增长与站点运营的 AI SEO 工具。"
          : "Browse AI SEO tools for keyword research, content optimization, internal workflows, and organic growth execution.",
      };
    case "free-ai-tools":
      return {
        title: isZh ? "���?AI ����" : "Free AI Tools",
        description: isZh
          ? "�鿴�����ʹ�û���ż����õ� AI ���ߣ������ҵ��ʺ����ź���֤��ѡ�"
          : "Discover AI tools you can use for free or try with a low barrier before making a larger commitment.",
      };
    case "new-ai-tools":
      return {
        title: isZh ? "���� AI ����" : "New AI Tools",
        description: isZh
          ? "������ʱ��������¼���Ŀ¼�� AI ���ߣ��ʺ�׷����Ʒ�Ϳ���������"
          : "Track the newest AI tools added to the directory, ordered by recency and ready for review.",
      };
    case "trending-ai-tools":
      return {
        title: isZh ? "���� AI ����" : "Trending AI Tools",
        description: isZh
          ? "�鿴��ǰ���ܹ�ע�� AI ���ߣ����վ���ȶ���Ŀ¼���ݿ�����ɷ��֡�"
          : "Explore AI tools drawing attention right now, ranked with on-site popularity signals and directory data.",
      };
    case "ai-tools-for-productivity":
      return {
        title: isZh ? "效率场景 AI 工具" : "AI Tools for Productivity",
        description: isZh
          ? "查看适合笔记、会议、总结、计划与日常执行流程的 AI 效率工具。"
          : "Browse AI productivity tools for notes, meetings, planning, summaries, and day-to-day execution across teams.",
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

  const [
    latestTools,
    popularTools,
    freeOnlyTools,
    freemiumTools,
    writingTools,
    imageTools,
    videoTools,
    codingTools,
    seoTools,
    productivityTools,
  ] = await Promise.all([
    fetchPublishedTools(12),
    fetchPopularTools(12),
    fetchHomePageTools({ take: 10, pricingModels: [PricingModel.FREE] }),
    fetchHomePageTools({ take: 10, pricingModels: [PricingModel.FREEMIUM] }),
    fetchCollectionToolsByCategorySlugs(["writing", "ai-writing"], 12),
    fetchCollectionToolsByCategorySlugs(["image", "image-generation"], 12),
    fetchCollectionToolsByCategorySlugs(["video", "video-audio"], 12),
    fetchCollectionToolsByCategorySlugs(["code", "code-assistant"], 12),
    fetchCollectionToolsByCategorySlugs(["seo"], 12),
    fetchCollectionToolsByCategorySlugs(["productivity"], 12),
  ]);

  const trendingTools = popularTools.slice(0, 6);

  let rankedTools: CatalogTool[] = [];
  switch (slug) {
    case "best-ai-tools":
      rankedTools = popularTools.slice(0, 10);
      break;
    case "best-ai-writing-tools":
      rankedTools = writingTools.slice(0, 10);
      break;
    case "best-ai-image-generators":
      rankedTools = imageTools.slice(0, 10);
      break;
    case "best-ai-video-generators":
      rankedTools = videoTools.slice(0, 10);
      break;
    case "best-ai-coding-tools":
      rankedTools = codingTools.slice(0, 10);
      break;
    case "best-ai-seo-tools":
      rankedTools = seoTools.slice(0, 10);
      break;
    case "free-ai-tools":
      rankedTools = [
        ...freeOnlyTools,
        ...freemiumTools.filter(
          (tool) => !freeOnlyTools.some((freeTool) => freeTool.id === tool.id),
        ),
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
    case "ai-tools-for-productivity":
      rankedTools = productivityTools.slice(0, 10);
      break;
    default:
      return null;
  }

  const faqs = buildCollectionFaqs(copy.title, rankedTools, locale);
  const lastUpdatedLabel = formatDateLabel(new Date(), locale);
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
      lastUpdatedLabel,
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
    .filter(
      (tool) => tool.pricingModel !== PricingModel.FREE || tool.tagSlugs.includes("multimodal"),
    )
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
        name: "ToolsDdar",
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
  data: CategoryLandingData;
} | null> {
  const category = await prisma.category.findFirst({
    where: { slug, ...activeOnly },
  });
  if (!category) return null;

  const [allTools, trendingTools, popularCategories, newestTools, categoryCount] =
    await Promise.all([
      fetchCategoryDetailTools(category.id, 12),
      fetchPopularHomePageTools(6),
      fetchRichCategoryDirectoryData(8),
      fetchHomePageTools({ take: 5 }),
      prisma.toolCategory.count({
        where: {
          categoryId: category.id,
          ...activeOnly,
          tool: { status: ToolStatus.PUBLISHED, ...activeOnly },
        },
      }),
    ]);

  const config = getSiteConfig();
  const path = `/${locale}/category/${slug}`;
  const url = joinUrl(config.siteUrl, path);

  const aiSummary =
    category.description ??
    `Discover the best ${buildCategoryToolsLabel(category.name).toLowerCase()}. Compare features, pricing, alternatives, and related tools in one place.`;

  const simpleTools = allTools.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    summary: tool.summary,
  }));
  const faqs = buildCategoryFaqs(category.name, simpleTools);
  const relatedTools = simpleTools.slice(0, 8).map((t: CatalogTool) => ({
    slug: t.slug,
    name: t.name,
    summary: t.summary,
  }));
  const categoryLabel = buildCategoryToolsLabel(category.name);
  const relatedCategories = popularCategories
    .filter((item) => item.slug !== category.slug)
    .slice(0, 6);
  const collectionLinks = buildCollectionLinks(locale);
  const blogGuides = buildBlogGuideLinks(locale);
  const featuredTools = allTools.slice(0, 4);
  const updatedLabel = formatDateLabel(category.updatedAt, locale);
  const metadata =
    category.metadata && typeof category.metadata === "object"
      ? (category.metadata as Record<string, unknown>)
      : {};
  const isFeatured = Boolean(metadata.featured) || categoryCount >= 3 || category.sortOrder < 6;

  const jsonLd = [
    buildCollectionPageJsonLd({
      name: `Best ${categoryLabel}`,
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
        { name: "Categories", path: `/${locale}/categories` },
        { name: category.name, path },
      ],
      config.siteUrl,
    ),
  ];

  return {
    metadata: buildCategoryLandingMetadata(category, locale),
    data: {
      title: `Best ${categoryLabel}`,
      aiSummary,
      faqs,
      relatedTools,
      trendingTools: trendingTools.map((tool) => ({
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        summary: tool.summary,
        website: tool.website,
        logoUrl: resolveToolLogoUrl(
          tool.logoUrl,
          tool.category ? { iconUrl: tool.category.iconUrl } : {},
          tool.website,
        ),
        collectedLogoUrl: resolveToolFallbackLogoUrl(
          tool.logoUrl,
          tool.category ? { iconUrl: tool.category.iconUrl } : {},
          tool.website,
        ),
        categoryIconUrl: tool.category?.iconUrl ?? null,
        pricingModel: tool.pricingModel,
        pricingLabel: formatPricingLabel(tool.pricingModel),
        rating: null,
        ratingLabel: null,
        publishedAt: tool.publishedAt,
        categories: tool.category ? [tool.category] : [],
      })),
      jsonLd,
      category: {
        slug: category.slug,
        name: category.name,
        title: `Best ${categoryLabel}`,
        description: aiSummary,
        toolCount: categoryCount,
        updatedAt: category.updatedAt.toISOString(),
        updatedLabel,
        iconUrl: category.iconUrl,
        isFeatured,
      },
      featuredTools,
      allTools,
      relatedCategories,
      popularCategories,
      popularCollections: collectionLinks,
      sidebar: {
        topCategories: popularCategories.slice(0, 6).map((item) => ({
          href: `/${locale}/category/${item.slug}`,
          label: item.name,
          description: `${item.toolCount} ${locale === "zh" ? "������" : "tools"}`,
        })),
        newestTools: newestTools.map((tool) => ({
          href: `/${locale}/tools/${tool.slug}`,
          label: tool.name,
          description: tool.category?.name ?? tool.publishedAt ?? undefined,
        })),
        popularCollections: collectionLinks,
        blogGuides,
      },
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

  const aiSummary = `AI tools tagged "${tag.name}" �?reviews, pricing, and alternatives.`;
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
