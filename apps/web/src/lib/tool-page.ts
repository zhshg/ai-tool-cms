import {
  InternalLinkType,
  prisma,
  PricingModel,
  SeoComparePageType,
  ToolStatus,
} from "@ai-tool-cms/database";
import { buildGeoContentBlocks, type GeoPageDocument } from "@ai-tool-cms/geo";
import {
  buildToolMetadata,
  buildToolPageJsonLd,
  getSiteConfig,
  joinUrl,
  type BuiltMetadata,
} from "@ai-tool-cms/seo";

const activeOnly = { deletedAt: null } as const;

export type ToolPageLink = {
  anchor: string;
  href: string;
  type: string;
};

type ToolFaqRow = {
  question: string;
  answer: string;
};

type ToolInternalLinkRow = {
  anchorText: string;
  href: string;
  linkType: string;
};

export type ToolPageData = {
  slug: string;
  name: string;
  website: string;
  logoUrl: string | null;
  pricingModel: PricingModel;
  summary: string | null;
  longDescription: string | null;
  aiSummary: string;
  features: string[];
  pros: string[];
  cons: string[];
  useCases: string[];
  categories: Array<{ slug: string; name: string; iconUrl: string | null; isPrimary: boolean }>;
  tags: Array<{ slug: string; name: string }>;
  pricingPlans: Array<{
    name: string;
    pricingModel: PricingModel;
    price: string | null;
    billingPeriod: string | null;
    description: string | null;
    isFeatured: boolean;
  }>;
  screenshots: Array<{
    variant: string;
    imageUrl: string;
    targetUrl: string;
    width: number;
    height: number;
  }>;
  alternatives: ToolPageLink[];
  similarTools: Array<{
    slug: string;
    name: string;
    summary: string | null;
    logoUrl: string | null;
    categoryIconUrl: string | null;
    pricingModel: PricingModel;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  internalLinks: ToolPageLink[];
  geoBlocks: ReturnType<typeof buildGeoContentBlocks>;
  jsonLd: Record<string, unknown>[];
};

export async function getToolPage(
  slug: string,
  locale: string,
): Promise<{ metadata: BuiltMetadata; data: ToolPageData } | null> {
  const tool = await prisma.tool.findFirst({
    where: { slug, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: {
        where: activeOnly,
        include: { category: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      tags: { where: activeOnly, include: { tag: true }, orderBy: { createdAt: "asc" } },
      pricingPlans: {
        where: activeOnly,
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
      toolScreenshots: { orderBy: { capturedAt: "desc" }, take: 6 },
      faqs: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 10 },
      internalLinks: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 24 },
    },
  });
  if (!tool) return null;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const geoDocument = metadata.geoDocument as GeoPageDocument | undefined;
  const geoBlocks = geoDocument ? buildGeoContentBlocks(geoDocument) : [];

  const pros = (metadata.aiPros as string[] | undefined) ?? [];
  const cons = (metadata.aiCons as string[] | undefined) ?? [];
  const useCases = (metadata.aiUseCases as string[] | undefined) ?? [];
  const features = (metadata.aiFeatures as string[] | undefined) ?? [];

  const aiSummary =
    geoDocument?.llmSummary ??
    tool.summary ??
    tool.description ??
    `${tool.name} is an AI tool listed in our directory.`;

  const config = getSiteConfig();
  const primaryCategory = tool.categories[0]?.category;
  const categories = tool.categories.map((item) => ({
    slug: item.category.slug,
    name: item.category.name,
    iconUrl: item.category.iconUrl,
    isPrimary: item.isPrimary,
  }));
  const tags = tool.tags.map((item) => ({
    slug: item.tag.slug,
    name: item.tag.name,
  }));
  const faqs = tool.faqs.map((f: ToolFaqRow) => ({ question: f.question, answer: f.answer }));
  const categoryIds = tool.categories.map((item) => item.categoryId);
  const tagIds = tool.tags.map((item) => item.tagId);
  const similarToolsPromise = prisma.tool.findMany({
    where: {
      id: { not: tool.id },
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      OR: [
        ...(categoryIds.length
          ? [{ categories: { some: { ...activeOnly, categoryId: { in: categoryIds } } } }]
          : []),
        ...(tagIds.length ? [{ tags: { some: { ...activeOnly, tagId: { in: tagIds } } } }] : []),
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { name: "asc" }],
    take: 6,
    select: {
      slug: true,
      name: true,
      summary: true,
      logoUrl: true,
      categories: {
        where: activeOnly,
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          category: {
            select: {
              iconUrl: true,
            },
          },
        },
      },
      pricingModel: true,
    },
  });
  const alternativesPromise = prisma.seoComparePage.findMany({
    where: {
      type: SeoComparePageType.ALTERNATIVES,
      status: ToolStatus.PUBLISHED,
      toolId: tool.id,
      ...activeOnly,
    },
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    take: 6,
    select: { title: true, slug: true },
  });
  const [similarTools, alternativePages] = await Promise.all([
    categoryIds.length || tagIds.length ? similarToolsPromise : Promise.resolve([]),
    alternativesPromise,
  ]);
  const alternativeLinks = [
    ...tool.internalLinks
      .filter((link: ToolInternalLinkRow) => link.linkType === InternalLinkType.ALTERNATIVE)
      .map((link: ToolInternalLinkRow) => ({
        anchor: link.anchorText,
        href: link.href,
        type: link.linkType,
      })),
    ...alternativePages.map((page) => ({
      anchor: page.title,
      href: `/${locale}/compare/${page.slug}`,
      type: SeoComparePageType.ALTERNATIVES,
    })),
  ];
  const firstPricingPlan = tool.pricingPlans[0];

  const jsonLd = buildToolPageJsonLd({
    baseUrl: config.siteUrl,
    locale,
    tool: {
      slug: tool.slug,
      name: tool.name,
      description: tool.metaDescription ?? tool.summary ?? undefined,
      url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
      applicationCategory: primaryCategory?.name ?? "BusinessApplication",
      operatingSystem: "Web",
      image: tool.logoUrl ?? undefined,
      offers: firstPricingPlan
        ? {
            price: firstPricingPlan.amount?.toString() ?? undefined,
            priceCurrency: firstPricingPlan.currency,
            description: firstPricingPlan.description ?? firstPricingPlan.name,
          }
        : undefined,
    },
    breadcrumbs: [
      { name: "Home", path: `/${locale}` },
      ...(primaryCategory
        ? [{ name: primaryCategory.name, path: `/${locale}/category/${primaryCategory.slug}` }]
        : []),
      { name: tool.name, path: `/${locale}/tools/${tool.slug}` },
    ],
    faqs,
  });

  return {
    metadata: buildToolMetadata(tool, locale),
    data: {
      slug: tool.slug,
      name: tool.name,
      website: tool.website,
      logoUrl: tool.logoUrl,
      pricingModel: tool.pricingModel,
      summary: tool.summary,
      longDescription: tool.longDescription,
      aiSummary,
      features,
      pros,
      cons,
      useCases: useCases.length ? useCases : features.slice(0, 5),
      categories,
      tags,
      pricingPlans: tool.pricingPlans.map((plan) => ({
        name: plan.name,
        pricingModel: plan.pricingModel,
        price: plan.amount?.toString() ?? null,
        billingPeriod: plan.billingPeriod,
        description: plan.description,
        isFeatured: plan.isFeatured,
      })),
      screenshots: tool.toolScreenshots
        .map((screenshot) => ({
          variant: screenshot.variant,
          imageUrl: resolveScreenshotUrl(screenshot.storageKey, screenshot.metadata),
          targetUrl: screenshot.targetUrl,
          width: screenshot.width,
          height: screenshot.height,
        }))
        .filter((screenshot): screenshot is NonNullable<typeof screenshot> & { imageUrl: string } =>
          Boolean(screenshot.imageUrl),
        ),
      alternatives: alternativeLinks,
      similarTools: similarTools.map((item) => ({
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        logoUrl: item.logoUrl,
        categoryIconUrl: item.categories[0]?.category.iconUrl ?? null,
        pricingModel: item.pricingModel,
      })),
      faqs,
      internalLinks: tool.internalLinks.map((link: ToolInternalLinkRow) => ({
        anchor: link.anchorText,
        href: link.href,
        type: link.linkType,
      })),
      geoBlocks,
      jsonLd,
    },
  };
}

function resolveScreenshotUrl(storageKey: string, metadata: unknown): string {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) return storageKey;
  if (!metadata || typeof metadata !== "object") return "";

  const record = metadata as Record<string, unknown>;
  for (const key of ["publicUrl", "imageUrl", "url", "src", "href"]) {
    const value = record[key];
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }
  return "";
}
