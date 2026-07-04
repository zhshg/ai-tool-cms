import { prisma, ToolStatus } from "@ai-tool-cms/database";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
  buildMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

export type SeoGrowthSegment = "industry" | "job" | "category" | "country" | "language";

export type SeoGrowthTool = {
  slug: string;
  name: string;
  summary: string | null;
};

export type SeoGrowthFacet = {
  label: string;
  href: string;
  description: string;
  count?: number;
};

export type SeoGrowthFaq = {
  question: string;
  answer: string;
};

export type SeoGrowthLandingData = {
  title: string;
  description: string;
  path: string;
  breadcrumbLabel: string;
  facets: SeoGrowthFacet[];
  relatedTools: SeoGrowthTool[];
  trendingTools: SeoGrowthTool[];
  faqs: SeoGrowthFaq[];
  jsonLd: Record<string, unknown>[];
};

type ToolMetadata = Record<string, unknown>;

type MetadataField = "industries" | "targetUsers" | "countries" | "languages";

const activeOnly = { deletedAt: null } as const;

const SEGMENT_COPY: Record<SeoGrowthSegment, { title: string; description: string; field?: MetadataField }> = {
  industry: {
    title: "AI Tools by Industry",
    description: "Explore AI tools organized by industry needs, workflows, and operational use cases.",
    field: "industries",
  },
  job: {
    title: "AI Tools by Job",
    description: "Find AI tools for writers, marketers, engineers, designers, operators, and other job roles.",
    field: "targetUsers",
  },
  category: {
    title: "AI Tools by Category",
    description: "Browse AI tools by the directory taxonomy and compare options across major software categories.",
  },
  country: {
    title: "AI Tools by Country",
    description: "Discover AI tools with country or regional availability signals where the directory has verified data.",
    field: "countries",
  },
  language: {
    title: "AI Tools by Language",
    description: "Find AI tools by supported languages and localization signals from the catalog dataset.",
    field: "languages",
  },
};

export const SEO_GROWTH_SEGMENTS = Object.keys(SEGMENT_COPY) as SeoGrowthSegment[];

function asMetadata(value: unknown): ToolMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ToolMetadata) : {};
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeText).filter((item): item is string => Boolean(item));
  }
  const text = normalizeText(value);
  return text ? [text] : [];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildFaqs(title: string): SeoGrowthFaq[] {
  return [
    {
      question: `How is ${title} curated?`,
      answer:
        "The page is generated from published tools, category mappings, tags, and structured metadata already available in the directory.",
    },
    {
      question: "Are these AI tools ranked manually?",
      answer:
        "The landing page prioritizes available catalog signals such as publication status, category coverage, tags, and freshness. Editorial rankings can be layered on top later.",
    },
    {
      question: "Can a tool appear on multiple SEO landing pages?",
      answer:
        "Yes. A tool keeps one primary category but may appear on multiple discovery pages when its tags or metadata match the page intent.",
    },
  ];
}

async function fetchTrendingTools(limit = 8): Promise<SeoGrowthTool[]> {
  return prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
    take: limit,
    select: { slug: true, name: true, summary: true },
  });
}

async function fetchTopTools(limit = 12): Promise<SeoGrowthTool[]> {
  return prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
    take: limit,
    select: { slug: true, name: true, summary: true },
  });
}

async function fetchCategoryFacets(locale: string): Promise<SeoGrowthFacet[]> {
  const categories = await prisma.category.findMany({
    where: activeOnly,
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    take: 36,
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { tools: { where: { deletedAt: null, tool: { status: ToolStatus.PUBLISHED, deletedAt: null } } } } },
    },
  });

  return categories.map((category) => ({
    label: category.name,
    href: `/${locale}/category/${category.slug}`,
    description: category.description ?? `Browse published AI tools in ${category.name}.`,
    count: category._count.tools,
  }));
}

async function fetchMetadataFacets(locale: string, segment: SeoGrowthSegment, field: MetadataField): Promise<SeoGrowthFacet[]> {
  const tools = await prisma.tool.findMany({
    where: { status: ToolStatus.PUBLISHED, ...activeOnly },
    orderBy: [{ publishedAt: "desc" }, { name: "asc" }],
    take: 500,
    select: { metadata: true },
  });

  const counts = new Map<string, number>();
  for (const tool of tools) {
    const metadata = asMetadata(tool.metadata);
    for (const value of normalizeList(metadata[field])) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 36)
    .map(([label, count]) => ({
      label,
      href: `/${locale}/search?${segment}=${encodeURIComponent(slugify(label) || label.toLowerCase())}`,
      description: `Explore AI tools associated with ${label}.`,
      count,
    }));
}

async function fetchFallbackFacets(locale: string, segment: SeoGrowthSegment): Promise<SeoGrowthFacet[]> {
  const tags = await prisma.tag.findMany({
    where: activeOnly,
    orderBy: [{ name: "asc" }],
    take: 36,
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { tools: { where: { deletedAt: null, tool: { status: ToolStatus.PUBLISHED, deletedAt: null } } } } },
    },
  });

  return tags.map((tag) => ({
    label: tag.name,
    href: `/${locale}/tag/${tag.slug}`,
    description: tag.description ?? `Explore AI tools tagged ${tag.name}.`,
    count: tag._count.tools,
  }));
}

function buildJsonLd(input: {
  locale: string;
  title: string;
  description: string;
  path: string;
  facets: SeoGrowthFacet[];
  tools: SeoGrowthTool[];
  faqs: SeoGrowthFaq[];
}) {
  const config = getSiteConfig();
  const url = joinUrl(config.siteUrl, input.path);
  const items = input.tools.length
    ? input.tools.map((tool, index) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${input.locale}/tools/${tool.slug}`),
        position: index + 1,
      }))
    : input.facets.map((facet, index) => ({
        name: facet.label,
        url: joinUrl(config.siteUrl, facet.href),
        position: index + 1,
      }));

  return [
    buildCollectionPageJsonLd({
      name: input.title,
      description: input.description,
      url,
      items,
    }),
    buildItemListJsonLd({
      name: input.title,
      description: input.description,
      url,
      items,
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${input.locale}` },
        { name: input.title, path: input.path },
      ],
      config.siteUrl,
    ),
    buildFaqPageJsonLd({ url, faqs: input.faqs }),
  ];
}

export async function getTopAiToolsLanding(locale: string) {
  const path = `/${locale}/top-ai-tools`;
  const title = "Top AI Tools";
  const description = "Discover top AI tools from the production directory, organized for fast evaluation and comparison.";
  const [relatedTools, trendingTools, facets] = await Promise.all([
    fetchTopTools(12),
    fetchTrendingTools(8),
    fetchCategoryFacets(locale),
  ]);
  const faqs = buildFaqs(title);

  return {
    metadata: buildMetadata({
      title,
      description,
      path,
      hreflang: getSiteConfig().locales.map((loc) => ({ locale: loc, path: `/${loc}/top-ai-tools` })),
    }),
    data: {
      title,
      description,
      path,
      breadcrumbLabel: title,
      facets,
      relatedTools,
      trendingTools,
      faqs,
      jsonLd: buildJsonLd({ locale, title, description, path, facets, tools: relatedTools, faqs }),
    } satisfies SeoGrowthLandingData,
  };
}

export async function getSeoGrowthLanding(segment: SeoGrowthSegment, locale: string) {
  const copy = SEGMENT_COPY[segment];
  const path = `/${locale}/ai/${segment}`;
  const [relatedTools, trendingTools, facets] = await Promise.all([
    fetchTopTools(12),
    fetchTrendingTools(8),
    copy.field ? fetchMetadataFacets(locale, segment, copy.field) : fetchCategoryFacets(locale),
  ]);
  const resolvedFacets = facets.length ? facets : await fetchFallbackFacets(locale, segment);
  const faqs = buildFaqs(copy.title);

  return {
    metadata: buildMetadata({
      title: copy.title,
      description: copy.description,
      path,
      hreflang: getSiteConfig().locales.map((loc) => ({ locale: loc, path: `/${loc}/ai/${segment}` })),
    }),
    data: {
      title: copy.title,
      description: copy.description,
      path,
      breadcrumbLabel: copy.title,
      facets: resolvedFacets,
      relatedTools,
      trendingTools,
      faqs,
      jsonLd: buildJsonLd({
        locale,
        title: copy.title,
        description: copy.description,
        path,
        facets: resolvedFacets,
        tools: relatedTools,
        faqs,
      }),
    } satisfies SeoGrowthLandingData,
  };
}
