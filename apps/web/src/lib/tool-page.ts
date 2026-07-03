import { prisma, PricingModel, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
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

type RelatedAlternative = {
  slug: string;
  name: string;
  summary: string | null;
  score: number;
  reason: string;
};

type SerializedScreenshot = {
  variant: string;
  imageUrl: string;
  targetUrl: string;
  width: number;
  height: number;
};

function buildStableJitter(sourceId: string, candidateId: string) {
  const seed = `${sourceId}:${candidateId}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000;
  }

  return hash / 1000;
}

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
  similarTools: Array<{
    slug: string;
    name: string;
    summary: string | null;
    logoUrl: string | null;
    collectedLogoUrl: string | null;
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
  const useCases = normalizeStringList(metadata.aiUseCases);
  const features = buildFeatureList(metadata);
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
      metadata: true,
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
  const recommendedAlternativesPromise = computeToolAlternatives(tool.id, 5);
  const [similarTools, recommendedAlternatives] = await Promise.all([
    categoryIds.length || tagIds.length ? similarToolsPromise : Promise.resolve([]),
    recommendedAlternativesPromise,
  ]);
  const alternativeLookup = new Map<string, RelatedAlternative>(
    recommendedAlternatives.map((item: RelatedAlternative) => [item.slug, item]),
  );
  const alternativeDetails = recommendedAlternatives.length
    ? await prisma.tool.findMany({
        where: {
          slug: { in: recommendedAlternatives.map((item: RelatedAlternative) => item.slug) },
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
      })
    : [];
  const alternatives = recommendedAlternatives
    .map((item: RelatedAlternative) => {
      const detail = alternativeDetails.find((candidate) => candidate.slug === item.slug);
      if (!detail) return null;

      return {
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
        reason: alternativeLookup.get(detail.slug)?.reason ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
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
      similarTools: similarTools.map((item) => ({
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        logoUrl: item.logoUrl,
        collectedLogoUrl: resolveCollectedLogoUrl(
          item.logoUrl,
          (item.metadata ?? {}) as Record<string, unknown>,
        ),
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

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

async function computeToolAlternatives(toolId: string, limit = 5): Promise<RelatedAlternative[]> {
  const source = await prisma.tool.findFirst({
    where: { id: toolId, status: ToolStatus.PUBLISHED, ...activeOnly },
    include: {
      categories: { where: activeOnly },
      tags: { where: activeOnly },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
    },
  });
  if (!source) return [];

  const sourceCategoryIds = new Set(source.categories.map((item) => item.categoryId));
  const sourceTagIds = new Set(source.tags.map((item) => item.tagId));

  const candidates = await prisma.tool.findMany({
    where: {
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
      NOT: { id: toolId },
      OR: [
        ...(sourceTagIds.size
          ? [{ tags: { some: { ...activeOnly, tagId: { in: [...sourceTagIds] } } } }]
          : []),
        ...(sourceCategoryIds.size
          ? [
              {
                categories: { some: { ...activeOnly, categoryId: { in: [...sourceCategoryIds] } } },
              },
            ]
          : []),
      ],
    },
    include: {
      categories: { where: activeOnly },
      tags: { where: activeOnly },
      reviews: { where: { status: ReviewStatus.APPROVED, ...activeOnly } },
    },
    take: 60,
    orderBy: [{ updatedAt: "desc" }, { publishedAt: "desc" }],
  });

  const clickCounts = await prisma.searchClickLog.groupBy({
    by: ["toolId"],
    _count: { toolId: true },
  });
  const clickMap = new Map(clickCounts.map((item) => [item.toolId, item._count.toolId]));

  const scored = candidates
    .map((candidate) => {
      const metadata = (candidate.metadata ?? {}) as Record<string, unknown>;
      const candidateCategoryIds = new Set(candidate.categories.map((item) => item.categoryId));
      const candidateTagIds = new Set(candidate.tags.map((item) => item.tagId));
      const reviews = candidate.reviews;
      const averageRating = reviews.length
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0;
      const sharedCategories = [...sourceCategoryIds].filter((id) => candidateCategoryIds.has(id));
      const sharedTags = [...sourceTagIds].filter((id) => candidateTagIds.has(id));
      const clickBoost = Math.log10((clickMap.get(candidate.id) ?? 0) + 1) * 2;
      const popularityBoost =
        typeof metadata.popularityScore === "number" ? metadata.popularityScore * 0.05 : 0;
      const jitter = buildStableJitter(source.id, candidate.id);

      return {
        slug: candidate.slug,
        name: candidate.name,
        summary: candidate.summary,
        score:
          sharedTags.length * 100 +
          sharedCategories.length * 20 +
          averageRating * 3 +
          clickBoost +
          popularityBoost +
          jitter,
        reason: sharedTags.length
          ? `shared ${sharedTags.length > 1 ? "tags" : "tag"}`
          : sharedCategories.length
            ? "same category"
            : "related tool",
        sharedTags: sharedTags.length,
        sharedCategories: sharedCategories.length,
      };
    })
    .filter((candidate) => candidate.sharedTags > 0 || candidate.sharedCategories > 0);

  const primaryMatches = scored.filter((candidate) => candidate.sharedTags > 0);
  const fallbackMatches = scored.filter(
    (candidate) => candidate.sharedTags === 0 && candidate.sharedCategories > 0,
  );

  return [...primaryMatches, ...fallbackMatches]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ slug, name, summary, score, reason }) => ({
      slug,
      name,
      summary,
      score,
      reason,
    }));
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
