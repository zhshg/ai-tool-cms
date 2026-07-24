import { prisma, PricingModel, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { buildToolRecommendations } from "@ai-tool-cms/recommendation";
import { buildGeoContentBlocks, type GeoPageDocument } from "@ai-tool-cms/geo";
import {
  buildMetadata,
  buildToolPageJsonLd,
  getSiteConfig,
  joinUrl,
  normalizePlainText,
  type BuiltMetadata,
} from "@ai-tool-cms/seo";
import { resolveToolFallbackLogoUrl, resolveToolLogoUrl } from "./tool-logo";

const activeOnly = { deletedAt: null } as const;
const DEFAULT_LOCALE = "en";

const CJK_REGEX =
  /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}\u3000-\u303f\uff00-\uffef]/u;

function hasCJK(text: string | null | undefined): boolean {
  if (!text) return false;
  return CJK_REGEX.test(text);
}

function pickEN<T extends string | null | undefined>(...candidates: T[]): T {
  for (const candidate of candidates) {
    if (candidate && !hasCJK(candidate)) return candidate;
  }
  return candidates[candidates.length - 1] ?? (null as T);
}

/**
 * 段落级中文过滤：将文本按段落分割，移除含中文的段落，保留英文段落。
 * 当文本混合中英文时（如 long_description 开头是中文，后面是英文），
 * 只丢弃中文段落，保留有价值的英文内容。
 */
function stripCJKParagraphs(text: string | null | undefined): string | null {
  if (!text) return null;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  const enParagraphs = paragraphs.filter((p) => !hasCJK(p));
  if (enParagraphs.length === 0) return null;
  return enParagraphs.join("\n\n");
}

/**
 * 从含中文的混合文本中提取英文内容：
 * 1. 先尝试段落级过滤（保留英文段落）
 * 2. 如果段落级过滤后仍有内容，使用过滤后的结果
 * 3. 否则回退到候选字段
 */
function pickENWithParagraphFallback(
  primary: string | null | undefined,
  ...fallbacks: Array<string | null | undefined>
): string | null {
  if (primary) {
    const stripped = stripCJKParagraphs(primary);
    if (stripped) return stripped;
  }
  for (const fallback of fallbacks) {
    if (fallback && !hasCJK(fallback)) return fallback;
  }
  // 最后尝试对 fallback 也做段落过滤
  for (const fallback of fallbacks) {
    const stripped = stripCJKParagraphs(fallback);
    if (stripped) return stripped;
  }
  return null;
}

/** 过滤数组中包含中文的条目（当 locale 为英文时使用） */
function filterCJKList(items: string[]): string[] {
  return items.filter((item) => !hasCJK(item));
}

/** 过滤推荐工具卡片中 summary 含中文的条目，并将 reason 中的中文替换 */
function filterCJKFromRecommendedCards<T extends { summary: string | null; reason: string | null }>(
  cards: T[],
): T[] {
  return cards
    .filter((card) => !hasCJK(card.summary))
    .map((card) => ({
      ...card,
      reason: pickEN(card.reason, card.reason),
    }));
}

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
  description: string | null;
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
  relatedCategories: Array<{
    slug: string;
    name: string;
    iconUrl: string | null;
    toolCount: number;
    reason: string;
  }>;
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

  const translationChain = buildLocaleFallbackChain(locale);
  const translations =
    locale === DEFAULT_LOCALE
      ? []
      : await prisma.toolTranslation.findMany({
          where: {
            toolId: tool.id,
            locale: { in: translationChain.filter((item: string) => item !== DEFAULT_LOCALE) },
            status: "PUBLISHED",
            ...activeOnly,
          },
        });
  const publishedTranslations = await prisma.toolTranslation.findMany({
    where: {
      toolId: tool.id,
      status: "PUBLISHED",
      ...activeOnly,
    },
    select: {
      locale: true,
    },
  });
  const translationByLocale = new Map(translations.map((item) => [item.locale, item]));
  const localizedTranslation =
    locale === DEFAULT_LOCALE
      ? null
      : (translationChain
          .filter((item: string) => item !== DEFAULT_LOCALE)
          .map((item: string) => translationByLocale.get(item) ?? null)
          .find((item): item is NonNullable<typeof item> => item !== null) ?? null);
  const hasExactTranslation = Boolean(locale !== DEFAULT_LOCALE && translationByLocale.has(locale));
  const canonicalLocale =
    hasExactTranslation || locale === DEFAULT_LOCALE ? locale : DEFAULT_LOCALE;
  const shouldNoIndex = canonicalLocale !== locale;
  const hreflang = [
    { locale: "x-default", path: `/${DEFAULT_LOCALE}/tools/${tool.slug}` },
    { locale: DEFAULT_LOCALE, path: `/${DEFAULT_LOCALE}/tools/${tool.slug}` },
    ...publishedTranslations
      .map((item) => item.locale)
      .filter((item) => item !== DEFAULT_LOCALE)
      .map((item) => ({ locale: item, path: `/${item}/tools/${tool.slug}` })),
  ];

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const geoDocument = metadata.geoDocument as GeoPageDocument | undefined;
  const geoBlocks = geoDocument ? buildGeoContentBlocks(geoDocument) : [];

  const isEN = locale === DEFAULT_LOCALE || locale.startsWith("en");

  const pros = isEN
    ? filterCJKList(normalizeStringList(metadata.aiPros))
    : normalizeStringList(metadata.aiPros);
  const cons = isEN
    ? filterCJKList(normalizeStringList(metadata.aiCons))
    : normalizeStringList(metadata.aiCons);
  const baseUseCases = isEN
    ? filterCJKList(normalizeStringList(metadata.aiUseCases ?? metadata.useCases))
    : normalizeStringList(metadata.aiUseCases ?? metadata.useCases);
  const baseFeatures = isEN
    ? filterCJKList(buildFeatureList(metadata))
    : buildFeatureList(metadata);
  const apiAccess = isEN ? filterCJKList(buildApiAccess(metadata)) : buildApiAccess(metadata);
  const platforms = isEN
    ? filterCJKList(normalizeStringList(metadata.aiPlatforms ?? metadata.platforms))
    : normalizeStringList(metadata.aiPlatforms ?? metadata.platforms);
  const languages = isEN
    ? filterCJKList(normalizeStringList(metadata.aiLanguages ?? metadata.languages))
    : normalizeStringList(metadata.aiLanguages ?? metadata.languages);
  const videos = buildVideos(metadata);
  const resolvedLogoUrl = resolveToolLogoUrl(tool.logoUrl, metadata, tool.website);
  const collectedLogoUrl = resolveToolFallbackLogoUrl(tool.logoUrl, metadata, tool.website);

  const aiSummary =
    normalizePlainText(geoDocument?.llmSummary) ||
    normalizePlainText(localizedTranslation?.summary) ||
    normalizePlainText(isEN ? pickEN(tool.summary, tool.description) : tool.summary) ||
    normalizePlainText(localizedTranslation?.longDescription) ||
    normalizePlainText(isEN ? pickEN(tool.description, tool.summary) : tool.description) ||
    `${tool.name} is an AI tool listed in our directory.`;
  const description =
    normalizePlainText(
      isEN
        ? pickENWithParagraphFallback(
            localizedTranslation?.longDescription ?? tool.description,
            tool.summary,
          )
        : (localizedTranslation?.longDescription ?? tool.description),
    ) || null;
  const longDescription =
    normalizePlainText(
      isEN
        ? pickENWithParagraphFallback(
            localizedTranslation?.longDescription ?? tool.longDescription ?? tool.description,
            tool.description,
            tool.summary,
          )
        : (localizedTranslation?.longDescription ?? tool.longDescription ?? tool.description),
    ) || null;
  const summary =
    normalizePlainText(
      isEN
        ? pickEN(localizedTranslation?.summary ?? tool.summary, tool.description)
        : (localizedTranslation?.summary ?? tool.summary),
    ) || null;

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
  const primaryCategoryName = primaryCategory?.name ?? "AI Tool";
  const useCases = ensureMinimumUseCases(baseUseCases, tool.name, primaryCategoryName, summary);
  const features = ensureMinimumFeatures(
    baseFeatures,
    tool.name,
    primaryCategoryName,
    summary,
    tool.pricingModel,
  );
  const translatedFaqs = normalizeFaqList(localizedTranslation?.faqJson);
  const rawFaqs = (
    translatedFaqs.length
      ? translatedFaqs
      : tool.faqs.map((f: ToolFaqRow) => ({ question: f.question, answer: f.answer }))
  ) as Array<{
    question: string;
    answer: string;
  }>;
  const faqs = isEN ? rawFaqs.filter((f) => !hasCJK(f.question) && !hasCJK(f.answer)) : rawFaqs;
  const screenshots = buildToolScreenshots(tool.toolScreenshots, metadata, tool.website);
  const recommendations = await buildToolRecommendations(prisma, tool.id, 6);
  const [recommendedAlternatives, similarTools, moreLikeThis, trendingTools] = await Promise.all([
    hydrateRecommendedToolCards(recommendations.alternatives),
    hydrateRecommendedToolCards(recommendations.similarTools),
    hydrateRecommendedToolCards(recommendations.moreLikeThis),
    hydrateRecommendedToolCards(recommendations.trendingTools),
  ]);
  const alternatives = await ensureMinimumAlternatives(
    tool.id,
    tool.slug,
    recommendedAlternatives,
    metadata,
    tool.categories.map((item) => item.category.slug),
  );
  const enrichedFaqs = ensureMinimumFaqs(
    faqs,
    tool.name,
    tool.summary,
    tool.pricingModel,
    alternatives,
  );
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
      description:
        normalizePlainText(tool.metaDescription ?? tool.summary ?? undefined) || undefined,
      url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
      applicationCategory: primaryCategory?.name ?? "BusinessApplication",
      operatingSystem: "Web",
      image: resolvedLogoUrl ?? undefined,
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
    faqs: enrichedFaqs,
  });

  return {
    metadata: buildMetadata({
      title:
        localizedTranslation?.metaTitle ?? `${tool.name} Review, Pricing, Features & Alternatives`,
      description:
        normalizePlainText(localizedTranslation?.metaDescription ?? summary ?? undefined) ||
        undefined,
      path: `/${locale}/tools/${tool.slug}`,
      canonical: joinUrl(config.siteUrl, `/${canonicalLocale}/tools/${tool.slug}`),
      noIndex: shouldNoIndex,
      hreflang,
      ogImage: tool.logoUrl ?? undefined,
      ogType: "article",
    }),
    data: {
      slug: tool.slug,
      name: tool.name,
      website: tool.website,
      logoUrl: resolvedLogoUrl,
      collectedLogoUrl,
      pricingModel: tool.pricingModel,
      summary,
      description,
      longDescription,
      aiSummary,
      features,
      pros,
      cons,
      useCases,
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
        description: isEN ? pickEN(plan.description, null) : plan.description,
        isFeatured: plan.isFeatured,
      })),
      screenshots,
      alternatives: isEN ? filterCJKFromRecommendedCards(alternatives) : alternatives,
      similarTools: isEN ? filterCJKFromRecommendedCards(similarTools) : similarTools,
      moreLikeThis: isEN ? filterCJKFromRecommendedCards(moreLikeThis) : moreLikeThis,
      trendingTools: isEN ? filterCJKFromRecommendedCards(trendingTools) : trendingTools,
      relatedCategories: isEN
        ? relatedCategories.map((cat) => ({ ...cat, reason: pickEN(cat.reason, cat.reason) }))
        : relatedCategories,
      faqs: enrichedFaqs,
      reviews: isEN
        ? tool.reviews
            .filter((review) => !hasCJK(review.title) && !hasCJK(review.content))
            .map((review) => ({
              title: review.title,
              content: review.content,
              rating: review.rating,
              authorName: review.authorName,
              createdAt: review.createdAt.toISOString(),
            }))
        : tool.reviews.map((review) => ({
            title: review.title,
            content: review.content,
            rating: review.rating,
            authorName: review.authorName,
            createdAt: review.createdAt.toISOString(),
          })),
      internalLinks: isEN
        ? tool.internalLinks
            .filter((link: ToolInternalLinkRow) => !hasCJK(link.anchorText))
            .map((link: ToolInternalLinkRow) => ({
              anchor: link.anchorText,
              href: link.href,
              type: link.linkType,
            }))
        : tool.internalLinks.map((link: ToolInternalLinkRow) => ({
            anchor: link.anchorText,
            href: link.href,
            type: link.linkType,
          })),
      geoBlocks,
      jsonLd,
    },
  };
}

function normalizeFaqList(value: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question =
        typeof (item as { question?: unknown }).question === "string"
          ? (item as { question: string }).question.trim()
          : "";
      const answer =
        typeof (item as { answer?: unknown }).answer === "string"
          ? (item as { answer: string }).answer.trim()
          : "";
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is { question: string; answer: string } => item !== null);
}

function buildLocaleFallbackChain(locale: string): string[] {
  const chain: string[] = [locale];
  if (locale !== DEFAULT_LOCALE) chain.push(DEFAULT_LOCALE);
  if (locale.startsWith("zh") && locale !== "zh-CN") chain.push("zh-CN");
  return [...new Set(chain)];
}

function slugifyLocal(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const text = typeof item === "string" ? item.trim() : "";
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
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
      logoUrl: resolveToolLogoUrl(
        detail.logoUrl,
        (detail.metadata ?? {}) as Record<string, unknown>,
        null,
      ),
      collectedLogoUrl: resolveToolFallbackLogoUrl(
        detail.logoUrl,
        (detail.metadata ?? {}) as Record<string, unknown>,
        null,
      ),
      categoryIconUrl: detail.categories[0]?.category.iconUrl ?? null,
      pricingModel: detail.pricingModel,
      reason: item.reason,
    });
  }

  return cards;
}

async function ensureMinimumAlternatives(
  toolId: string,
  toolSlug: string,
  recommended: RecommendedToolCard[],
  metadata: Record<string, unknown>,
  categorySlugs: string[],
): Promise<RecommendedToolCard[]> {
  if (recommended.length >= 3) {
    return recommended.slice(0, 6);
  }

  const alternativeSlugs = normalizeStringList(metadata.alternativeSlugs);
  const alternativeNames = normalizeStringList(metadata.alternatives ?? metadata.alternativeNames);
  const needed = 3 - recommended.length;
  const exclusion = new Set([toolSlug, ...recommended.map((item) => item.slug)]);
  const fallbackRecommendations = alternativeSlugs
    .filter((slug) => !exclusion.has(slug))
    .map((slug) => ({ slug, reason: "seeded alternatives" }));

  for (const alternative of alternativeNames) {
    const slug = slugifyLocal(alternative);
    if (!slug || exclusion.has(slug)) continue;
    fallbackRecommendations.push({ slug, reason: "manual alternatives" });
    exclusion.add(slug);
  }

  if (fallbackRecommendations.length < needed && categorySlugs.length > 0) {
    const extraTools = await prisma.tool.findMany({
      where: {
        status: ToolStatus.PUBLISHED,
        ...activeOnly,
        id: { not: toolId },
        categories: {
          some: {
            deletedAt: null,
            category: {
              slug: { in: categorySlugs },
              deletedAt: null,
            },
          },
        },
      },
      select: { slug: true },
      take: 6,
    });

    for (const tool of extraTools) {
      if (exclusion.has(tool.slug)) continue;
      fallbackRecommendations.push({ slug: tool.slug, reason: "same category" });
      exclusion.add(tool.slug);
    }
  }

  const fallbackCards = await hydrateRecommendedToolCards(fallbackRecommendations);
  return [...recommended, ...fallbackCards].slice(0, 6);
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

  const useCases = normalizeStringList(metadata.aiUseCases ?? metadata.useCases);
  if (useCases.length) {
    return useCases.slice(0, 6);
  }

  return [];
}

function ensureMinimumFeatures(
  features: string[],
  toolName: string,
  categoryName: string,
  summary: string | null,
  pricingModel: PricingModel,
): string[] {
  const next = dedupeStrings(features);

  const defaults = [
    summary
      ? `Supports ${summary.toLowerCase().replace(/\.$/, "")}`
      : `${toolName} supports common ${categoryName.toLowerCase()} workflows`,
    `${toolName} can be evaluated for ${categoryName.toLowerCase()} use cases`,
    `${toolName} offers a ${pricingModel.toLowerCase()} pricing model`,
    `Teams can compare ${toolName} against alternatives by workflow fit and feature coverage`,
  ];

  for (const item of defaults) {
    if (next.length >= 4) break;
    if (item.trim()) next.push(item.trim());
  }

  return dedupeStrings(next).slice(0, 8);
}

function ensureMinimumUseCases(
  useCases: string[],
  toolName: string,
  categoryName: string,
  summary: string | null,
): string[] {
  const next = dedupeStrings(useCases);
  const defaults = [
    `Evaluate ${toolName} for day-to-day ${categoryName.toLowerCase()} tasks`,
    `Compare ${toolName} with other tools before adopting a workflow`,
    summary
      ? `Use ${toolName} when you need ${summary.toLowerCase().replace(/\.$/, "")}`
      : `Use ${toolName} for repeatable ${categoryName.toLowerCase()} work`,
  ];

  for (const item of defaults) {
    if (next.length >= 3) break;
    if (item.trim()) next.push(item.trim());
  }

  return dedupeStrings(next).slice(0, 6);
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

function ensureMinimumFaqs(
  faqs: Array<{ question: string; answer: string }>,
  toolName: string,
  summary: string | null,
  pricingModel: PricingModel,
  alternatives: Array<{ name: string }>,
): Array<{ question: string; answer: string }> {
  const next = [...faqs];

  if (next.length === 0) {
    next.push({
      question: `What is ${toolName}?`,
      answer: summary ?? `${toolName} is an AI tool listed in the directory.`,
    });
  }

  if (next.length < 2) {
    next.push({
      question: `How is ${toolName} priced?`,
      answer: `${toolName} is currently listed with a ${pricingModel.toLowerCase()} pricing model.`,
    });
  }

  if (next.length < 3) {
    next.push({
      question: `What are the best alternatives to ${toolName}?`,
      answer:
        alternatives.length > 0
          ? `Popular alternatives include ${alternatives
              .slice(0, 3)
              .map((tool) => tool.name)
              .join(", ")}.`
          : `${toolName} can be compared with other published tools in the same category for pricing, features, and workflow fit.`,
    });
  }

  return next.slice(0, 10);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
  }

  return next;
}
