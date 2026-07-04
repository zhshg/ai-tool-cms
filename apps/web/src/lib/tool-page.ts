import { prisma, PricingModel, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { buildToolRecommendations } from "@ai-tool-cms/recommendation";
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


type SerializedScreenshot = {
  variant: string;
  imageUrl: string;
  targetUrl: string;
  width: number;
  height: number;
};

type SerializedVideo = {
  title: string;
  url: string;
  thumbnailUrl: string | null;
};

type SerializedReview = {
  title: string | null;
  content: string;
  rating: number;
  authorName: string | null;
  createdAt: string;
};

type RecommendedToolCard = {
  slug: string;
  name: string;
  summary: string | null;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  categoryIconUrl: string | null;
  pricingModel: PricingModel;
  reason: string | null;
};

export type ToolPageData = {
  slug: string;
  name: string;
  website: string;
  logoUrl: string | null;
  collectedLogoUrl: string | null;
  pricingModel: PricingModel;
  summary: string | null;
  longDescription: string | null;
  aiSummary: string;
  features: string[];
  pros: string[];
  cons: string[];
  useCases: string[];
  apiAccess: string[];
  platforms: string[];
  languages: string[];
  videos: SerializedVideo[];
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
  alternatives: Array<{
    slug: string;
    name: string;
    summary: string | null;
    logoUrl: string | null;
    collectedLogoUrl: string | null;
    categoryIconUrl: string | null;
    pricingModel: PricingModel;
    reason: string | null;
  }>;
  similarTools: RecommendedToolCard[];
  moreLikeThis: RecommendedToolCard[];
  trendingTools: RecommendedToolCard[];
  relatedCategories: Array<{`r`n    slug: string;`r`n    name: string;`r`n    iconUrl: string | null;`r`n    toolCount: number;`r`n    reason: string;`r`n  }>;
  faqs: Array<{ question: string; answer: string }>;
  reviews: SerializedReview[];
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
      reviews: {
        where: { status: ReviewStatus.APPROVED, ...activeOnly },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      internalLinks: { where: activeOnly, orderBy: { sortOrder: "asc" }, take: 24 },
    },
  });
  if (!tool) return null;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const geoDocument = metadata.geoDocument as GeoPageDocument | undefined;
  const geoBlocks = geoDocument ? buildGeoContentBlocks(geoDocument) : [];

  const pros = normalizeStringList(metadata.aiPros);
  const cons = normalizeStringList(metadata.aiCons);
  const useCases = normalizeStringList(metadata.aiUseCases);
  const features = buildFeatureList(metadata);
  const apiAccess = buildApiAccess(metadata);
  const platforms = normalizeStringList(metadata.aiPlatforms ?? metadata.platforms);
  const languages = normalizeStringList(metadata.aiLanguages ?? metadata.languages);
  const videos = buildVideos(metadata);
  const collectedLogoUrl = resolveCollectedLogoUrl(tool.logoUrl, metadata);

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
  const screenshots = buildToolScreenshots(tool.toolScreenshots, metadata, tool.website);
  const recommendations = await buildToolRecommendations(prisma, tool.id, 6);
  const [alternatives, similarTools, moreLikeThis, trendingTools] = await Promise.all([
    hydrateRecommendedToolCards(recommendations.alternatives),
    hydrateRecommendedToolCards(recommendations.similarTools),
    hydrateRecommendedToolCards(recommendations.moreLikeThis),
    hydrateRecommendedToolCards(recommendations.trendingTools),
  ]);
  const relatedCategories = recommendations.relatedCategories.map((category) => ({
    slug: category.slug,
    name: category.name,
    iconUrl: category.iconUrl ?? null,
    toolCount: category.toolCount,
    reason: category.reason,
  }));
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
      collectedLogoUrl,
      pricingModel: tool.pricingModel,
      summary: tool.summary,
      longDescription: tool.longDescription,
      aiSummary,
      features,
      pros,
      cons,
      useCases: useCases.length ? useCases : features.slice(0, 5),
      apiAccess,
      platforms,
      languages,
      videos,
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
      screenshots,
      alternatives,
      similarTools,
      moreLikeThis,
      trendingTools,
      relatedCategories,
      faqs,
      reviews: tool.reviews.map((review) => ({
        title: review.title,
        content: review.content,
        rating: review.rating,
        authorName: review.authorName,
        createdAt: review.createdAt.toISOString(),
      })),
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

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

async function hydrateRecommendedToolCards(
  recommendations: Array<{ slug: string; reason: string }>,
): Promise<RecommendedToolCard[]> {
  if (!recommendations.length) return [];

  const details = await prisma.tool.findMany({
    where: {
      slug: { in: recommendations.map((item) => item.slug) },
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
    },
    select: {
      slug: true,
      name: true,
      summary: true,
      logoUrl: true,
      metadata: true,
      pricingModel: true,
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
    },
  });
  const detailBySlug = new Map(details.map((detail) => [detail.slug, detail]));

  const cards: RecommendedToolCard[] = [];
  for (const item of recommendations) {
    const detail = detailBySlug.get(item.slug);
    if (!detail) continue;

    cards.push({
      slug: detail.slug,
      name: detail.name,
      summary: detail.summary,
      logoUrl: detail.logoUrl,
      collectedLogoUrl: resolveCollectedLogoUrl(
        detail.logoUrl,
        (detail.metadata ?? {}) as Record<string, unknown>,
      ),
      categoryIconUrl: detail.categories[0]?.category.iconUrl ?? null,
      pricingModel: detail.pricingModel,
      reason: item.reason,
    });
  }

  return cards;
}
function buildFeatureList(metadata: Record<string, unknown>): string[] {
  const explicitFeatures = normalizeStringList(metadata.aiFeatures);
  if (explicitFeatures.length) {
    return explicitFeatures.slice(0, 8);
  }

  const storedFeatures = normalizeStringList(metadata.features);
  if (storedFeatures.length) {
    return storedFeatures.slice(0, 8);
  }

  const useCases = normalizeStringList(metadata.aiUseCases);
  if (useCases.length) {
    return useCases.slice(0, 6);
  }

  return [];
}

function resolveCollectedLogoUrl(
  primaryLogoUrl: string | null | undefined,
  metadata: Record<string, unknown>,
): string | null {
  const candidates = [
    metadata.logoUrl,
    metadata.logo,
    metadata.collectedLogoUrl,
    metadata.faviconUrl,
    metadata.appleTouchIconUrl,
    metadata.openGraphImageUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() && candidate !== primaryLogoUrl) {
      return candidate.trim();
    }
  }

  return null;
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

function buildApiAccess(metadata: Record<string, unknown>): string[] {
  const explicit = normalizeStringList(metadata.aiApiAccess ?? metadata.apiAccess ?? metadata.api);
  if (explicit.length) return explicit.slice(0, 6);

  const integrations = normalizeStringList(metadata.aiIntegrations ?? metadata.integrations);
  const hasApi =
    Boolean(metadata.hasApi) ||
    integrations.some((item) => /api|webhook|zapier|make|n8n/i.test(item));

  return hasApi
    ? ["API or automation integrations may be available", ...integrations.slice(0, 4)]
    : [];
}

function buildVideos(metadata: Record<string, unknown>): SerializedVideo[] {
  const raw = metadata.videos ?? metadata.demoVideos ?? metadata.aiVideos;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (typeof item === "string") {
        return { title: `Video ${index + 1}`, url: item, thumbnailUrl: null };
      }
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const url =
        typeof record.url === "string"
          ? record.url
          : typeof record.href === "string"
            ? record.href
            : "";
      if (!url) return null;

      return {
        title: typeof record.title === "string" ? record.title : `Video ${index + 1}`,
        url,
        thumbnailUrl: typeof record.thumbnailUrl === "string" ? record.thumbnailUrl : null,
      };
    })
    .filter((item): item is SerializedVideo => Boolean(item))
    .slice(0, 6);
}
function buildToolScreenshots(
  toolScreenshots: Array<{
    variant: string;
    storageKey: string;
    metadata: unknown;
    targetUrl: string;
    width: number;
    height: number;
  }>,
  metadata: Record<string, unknown>,
  website: string,
): SerializedScreenshot[] {
  const relationScreenshots = toolScreenshots
    .map((screenshot) => ({
      variant: screenshot.variant,
      imageUrl: resolveScreenshotUrl(screenshot.storageKey, screenshot.metadata),
      targetUrl: screenshot.targetUrl,
      width: screenshot.width,
      height: screenshot.height,
    }))
    .filter((screenshot): screenshot is SerializedScreenshot => Boolean(screenshot.imageUrl));

  if (relationScreenshots.length > 0) {
    return relationScreenshots;
  }

  const metadataScreenshots = normalizeStringList(metadata.screenshots);
  return metadataScreenshots.map((imageUrl, index) => ({
    variant: `MANUAL_${index + 1}`,
    imageUrl,
    targetUrl: website,
    width: 1280,
    height: 720,
  }));
}
