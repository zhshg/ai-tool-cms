import { prisma, PricingModel, ReviewStatus, ToolStatus } from "@ai-tool-cms/database";
import { buildToolRecommendations } from "@ai-tool-cms/recommendation";
import { buildGeoContentBlocks, type GeoPageDocument } from "@ai-tool-cms/geo";
import {
  buildMetadata,
  buildToolPageJsonLd,
  getSiteConfig,
  joinUrl,
  normalizePlainText,
  stripHtml,
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

/**
 * 从混合文本中提取中文段落（当 locale 为中文时使用）。
 * 优先返回含中文的段落；如果没有中文段落则返回 null（由调用方回退）。
 */
function pickZhParagraphs(text: string | null | undefined): string | null {
  if (!text) return null;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);
  const zhParagraphs = paragraphs.filter((p) => hasCJK(p));
  if (zhParagraphs.length === 0) return null;
  return zhParagraphs.join("\n\n");
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

/** 标签中英文映射表（slug -> 中文） */
const TAG_ZH_MAP: Record<string, string> = {
  drafting: "草稿撰写",
  "code-help": "代码辅助",
  "ui-design": "UI 设计",
  frontend: "前端开发",
  "technical-automation": "技术自动化",
  reasoning: "推理能力",
  "rapid-prototyping": "快速原型",
  "audio-editing": "音频编辑",
  "content-strategy": "内容策略",
  api: "API",
  "content-writing": "内容写作",
  "workplace-information": "职场信息",
  ide: "集成开发环境",
  "answer-engine": "问答引擎",
  "team-workflows": "团队工作流",
  presentations: "演示文稿",
  "short-form-video": "短视频",
  productivity: "生产力",
  "app-builder": "应用构建器",
  "ai-assistant": "AI 助手",
  "reading-support": "阅读辅助",
  "marketing-content": "营销内容",
  "long-context": "长上下文",
  prompting: "提示词工程",
  transcription: "语音转写",
  coding: "编程开发",
  "matter-analysis": "事项分析",
  "design-exploration": "设计探索",
  "conversation-intelligence": "会话智能",
  operations: "运营管理",
  "pair-programming": "结对编程",
  "creative-production": "创意生产",
  "sales-content": "销售内容",
  "social-content": "社媒内容",
  enterprise: "企业级",
  "growth-content": "增长内容",
  prototyping: "原型设计",
  "generative-media": "生成式媒体",
  "brand-assets": "品牌资产",
  "company-knowledge": "企业知识",
  "document-analysis": "文档分析",
  training: "培训",
  "go-to-market": "市场推广",
  ai: "AI",
  "audio-production": "音频制作",
  "content-optimization": "内容优化",
  editing: "编辑",
  "business-decks": "商业演示",
  "follow-up": "跟进",
  "commerce-visuals": "电商视觉",
  "full-stack": "全栈开发",
  "visual-communication": "视觉传达",
  "creative-editing": "创意编辑",
  "image-generation": "图像生成",
  accessibility: "无障碍",
  "image-editing": "图像编辑",
  notes: "笔记",
  "visual-creation": "视觉创作",
  "presentation-design": "演示设计",
  "training-content": "培训内容",
  "background-removal": "背景去除",
  "marketing-copy": "营销文案",
  "search-intent": "搜索意图",
  "prompt-to-app": "提示词转应用",
  "code-assistant": "代码助手",
  chatbot: "聊天机器人",
  "developer-tools": "开发者工具",
  "visual-builder": "可视化构建器",
  "professional-communication": "专业沟通",
  "visual-assets": "视觉素材",
  "audio-experimentation": "音频实验",
  "meeting-assistant": "会议助手",
  "document-review": "文档审阅",
  "video-creation": "视频创作",
  "training-audio": "培训音频",
  "visual-concepts": "视觉概念",
  "video-generation": "视频生成",
  futurepedia: "Futurepedia",
  "voice-cloning": "语音克隆",
  "customer-service": "客户服务",
  gpt: "GPT",
  "marketing-video": "营销视频",
  localization: "本地化",
  "meeting-notes": "会议纪要",
  integrations: "集成",
  docs: "文档",
  "creative-audio": "创意音频",
  summarization: "摘要总结",
  "study-tools": "学习工具",
  "knowledge-work": "知识工作",
  "social-distribution": "社媒分发",
  "product-design": "产品设计",
  image: "图像",
  "adobe-workflow": "Adobe 工作流",
  "brand-voice": "品牌声音",
  "knowledge-base": "知识库",
  "short-video": "短视频",
  "slide-design": "幻灯片设计",
  directory: "目录",
  "script-to-video": "脚本转视频",
  taaft: "TAAFT",
};

/** 定价方案描述中英文映射表 */
const PRICING_DESC_ZH_MAP: Record<string, string> = {
  "The product is positioned as a paid offering for ongoing use.":
    "该产品定位为付费产品，供长期使用。",
  "Public access is available without a paid subscription tier in the reviewed dataset.":
    "在已审查的数据集中，无需付费订阅即可公开访问。",
  "The official product uses custom or enterprise pricing in the curated dataset.":
    "官方产品在精选数据集中采用定制或企业级定价。",
  "The product offers a free entry point before paid expansion.":
    "该产品提供免费入门，之后可升级为付费方案。",
  "Public access is available without a paid subscription tier in the curated dataset.":
    "在精选数据集中，无需付费订阅即可公开访问。",
  "The official product offers a free entry point or trial before paid expansion.":
    "官方产品提供免费入门或试用，之后可升级为付费方案。",
  "The official product is positioned as a paid offering for ongoing use.":
    "官方产品定位为付费产品，供长期使用。",
};

/** 翻译标签名 */
function translateTagName(slug: string, name: string, isEN: boolean): string {
  if (isEN) return name;
  return TAG_ZH_MAP[slug] ?? name;
}

/** 翻译定价方案描述 */
function translatePricingDescription(description: string | null, isEN: boolean): string | null {
  if (!description) return null;
  if (isEN) return pickEN(description, null);
  return PRICING_DESC_ZH_MAP[description] ?? description;
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

  // 中文 locale 下优先使用 metadata 中的中文版字段（aiFeaturesZh 等）
  const zhFeatures = normalizeStringList(metadata.aiFeaturesZh);
  const zhUseCases = normalizeStringList(metadata.aiUseCasesZh);
  const zhPros = normalizeStringList(metadata.aiProsZh);
  const zhCons = normalizeStringList(metadata.aiConsZh);

  const pros = isEN
    ? filterCJKList(normalizeStringList(metadata.aiPros))
    : zhPros.length > 0
      ? zhPros
      : normalizeStringList(metadata.aiPros);
  const cons = isEN
    ? filterCJKList(normalizeStringList(metadata.aiCons))
    : zhCons.length > 0
      ? zhCons
      : normalizeStringList(metadata.aiCons);
  const baseUseCases = isEN
    ? filterCJKList(normalizeStringList(metadata.aiUseCases ?? metadata.useCases))
    : zhUseCases.length > 0
      ? zhUseCases
      : normalizeStringList(metadata.aiUseCases ?? metadata.useCases);
  const baseFeatures = isEN
    ? filterCJKList(buildFeatureList(metadata))
    : zhFeatures.length > 0
      ? zhFeatures
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
    (isEN
      ? `${tool.name} is an AI tool listed in our directory.`
      : `${tool.name} 是一个已收录在我们目录中的 AI 工具。`);
  const description =
    normalizePlainText(
      isEN
        ? pickENWithParagraphFallback(
            localizedTranslation?.longDescription ?? tool.description,
            tool.summary,
          )
        : (localizedTranslation?.longDescription ??
            pickZhParagraphs(tool.longDescription) ??
            pickZhParagraphs(tool.description) ??
            tool.description),
    ) || null;
  const longDescription = isEN
    ? stripHtml(
        pickENWithParagraphFallback(
          localizedTranslation?.longDescription ?? tool.longDescription ?? tool.description,
          tool.description,
          tool.summary,
        ),
      ).trim() || null
    : normalizePlainText(
        localizedTranslation?.longDescription ??
          pickZhParagraphs(tool.longDescription) ??
          pickZhParagraphs(tool.description) ??
          tool.longDescription ??
          tool.description,
      ) || null;
  const summary =
    normalizePlainText(
      isEN
        ? pickEN(localizedTranslation?.summary ?? tool.summary, tool.description)
        : (localizedTranslation?.summary ?? tool.summary),
    ) || null;

  const config = getSiteConfig();
  const primaryCategory = tool.categories[0]?.category;

  // 加载分类翻译（先加载 tool 自身的分类，后续再补充 relatedCategories）
  const toolCategoryIds = tool.categories.map((item) => item.category.id);
  const categoryTranslationMap = await fetchCategoryTranslationsForToolPage(
    toolCategoryIds,
    locale,
  );

  const categories = tool.categories.map((item) => ({
    slug: item.category.slug,
    name: categoryTranslationMap.get(item.category.id)?.name ?? item.category.name,
    iconUrl: item.category.iconUrl,
    isPrimary: item.isPrimary,
  }));
  const tags = tool.tags.map((item) => ({
    slug: item.tag.slug,
    name: translateTagName(item.tag.slug, item.tag.name, isEN),
  }));
  const primaryCategoryName = primaryCategory
    ? (categoryTranslationMap.get(primaryCategory.id)?.name ?? primaryCategory.name)
    : isEN
      ? "AI Tool"
      : "AI 工具";
  const useCases = ensureMinimumUseCases(
    baseUseCases,
    tool.name,
    primaryCategoryName,
    summary,
    isEN,
  );
  const features = ensureMinimumFeatures(
    baseFeatures,
    tool.name,
    primaryCategoryName,
    summary,
    tool.pricingModel,
    isEN,
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
    hydrateRecommendedToolCards(recommendations.alternatives, locale),
    hydrateRecommendedToolCards(recommendations.similarTools, locale),
    hydrateRecommendedToolCards(recommendations.moreLikeThis, locale),
    hydrateRecommendedToolCards(recommendations.trendingTools, locale),
  ]);
  const alternatives = await ensureMinimumAlternatives(
    tool.id,
    tool.slug,
    recommendedAlternatives,
    metadata,
    tool.categories.map((item) => item.category.slug),
    locale,
  );
  const enrichedFaqs = ensureMinimumFaqs(
    faqs,
    tool.name,
    tool.summary,
    tool.pricingModel,
    alternatives,
    isEN,
  );
  // 补充加载 relatedCategories 的翻译
  const relatedCategoryIds = recommendations.relatedCategories
    .map((cat) => cat.id)
    .filter((id): id is string => Boolean(id) && !categoryTranslationMap.has(id));
  if (relatedCategoryIds.length > 0) {
    const extraMap = await fetchCategoryTranslationsForToolPage(relatedCategoryIds, locale);
    for (const [k, v] of extraMap) categoryTranslationMap.set(k, v);
  }
  const relatedCategories = recommendations.relatedCategories.map((category) => ({
    slug: category.slug,
    name: categoryTranslationMap.get(category.id)?.name ?? category.name,
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
      applicationCategory: primaryCategoryName ?? "BusinessApplication",
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
        ? [{ name: primaryCategoryName, path: `/${locale}/category/${primaryCategory.slug}` }]
        : []),
      { name: tool.name, path: `/${locale}/tools/${tool.slug}` },
    ],
    faqs: enrichedFaqs,
  });

  return {
    metadata: buildMetadata({
      title:
        localizedTranslation?.metaTitle ??
        (isEN
          ? `${tool.name} Review, Pricing, Features & Alternatives`
          : `${tool.name} 评测、定价、功能与替代工具`),
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
        description: translatePricingDescription(plan.description, isEN),
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
  locale: string = DEFAULT_LOCALE,
): Promise<RecommendedToolCard[]> {
  if (!recommendations.length) return [];

  const details = await prisma.tool.findMany({
    where: {
      slug: { in: recommendations.map((item) => item.slug) },
      status: ToolStatus.PUBLISHED,
      ...activeOnly,
    },
    select: {
      id: true,
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

  // 中文 locale 下批量加载翻译
  const isZh = locale.startsWith("zh");
  const translationMap =
    isZh && details.length > 0
      ? await fetchRecommendedToolTranslations(
          details.map((d) => d.id),
          locale,
        )
      : new Map<string, string | null>();

  const cards: RecommendedToolCard[] = [];
  for (const item of recommendations) {
    const detail = detailBySlug.get(item.slug);
    if (!detail) continue;

    const zhSummary = translationMap.get(detail.id);
    cards.push({
      slug: detail.slug,
      name: detail.name,
      summary: zhSummary ?? detail.summary,
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

/** 批量获取推荐工具的中文 summary 翻译 */
async function fetchRecommendedToolTranslations(
  toolIds: string[],
  locale: string,
): Promise<Map<string, string | null>> {
  if (!locale.startsWith("zh") || toolIds.length === 0) return new Map();
  const translations = await prisma.toolTranslation.findMany({
    where: { toolId: { in: toolIds }, locale, status: "PUBLISHED", deletedAt: null },
    select: { toolId: true, summary: true },
  });
  return new Map(translations.map((t) => [t.toolId, t.summary]));
}

/** 批量获取分类的中文翻译（工具详情页用） */
async function fetchCategoryTranslationsForToolPage(
  categoryIds: string[],
  locale: string,
): Promise<Map<string, { name: string; description: string | null }>> {
  if (!locale.startsWith("zh") || categoryIds.length === 0) return new Map();
  const translations = await prisma.categoryTranslation.findMany({
    where: { categoryId: { in: categoryIds }, locale, deletedAt: null },
    select: { categoryId: true, name: true, description: true },
  });
  return new Map(
    translations.map((t) => [t.categoryId, { name: t.name, description: t.description }]),
  );
}

async function ensureMinimumAlternatives(
  toolId: string,
  toolSlug: string,
  recommended: RecommendedToolCard[],
  metadata: Record<string, unknown>,
  categorySlugs: string[],
  locale: string = DEFAULT_LOCALE,
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

  const fallbackCards = await hydrateRecommendedToolCards(fallbackRecommendations, locale);
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
  isEN: boolean,
): string[] {
  const next = dedupeStrings(features);

  const defaults = isEN
    ? [
        summary
          ? `Supports ${summary.toLowerCase().replace(/\.$/, "")}`
          : `${toolName} supports common ${categoryName.toLowerCase()} workflows`,
        `${toolName} can be evaluated for ${categoryName.toLowerCase()} use cases`,
        `${toolName} offers a ${pricingModel.toLowerCase()} pricing model`,
        `Teams can compare ${toolName} against alternatives by workflow fit and feature coverage`,
      ]
    : [
        summary ? `支持${summary}` : `${toolName} 支持常见的${categoryName}工作流`,
        `${toolName} 可用于${categoryName}相关场景`,
        `${toolName} 提供${pricingModel.toLowerCase()}定价模式`,
        `团队可以从工作流适配和功能覆盖角度对比${toolName}与替代方案`,
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
  isEN: boolean,
): string[] {
  const next = dedupeStrings(useCases);
  const defaults = isEN
    ? [
        `Evaluate ${toolName} for day-to-day ${categoryName.toLowerCase()} tasks`,
        `Compare ${toolName} with other tools before adopting a workflow`,
        summary
          ? `Use ${toolName} when you need ${summary.toLowerCase().replace(/\.$/, "")}`
          : `Use ${toolName} for repeatable ${categoryName.toLowerCase()} work`,
      ]
    : [
        `在日常${categoryName}任务中评估${toolName}`,
        `在采用某个工作流之前，将${toolName}与其他工具对比`,
        summary
          ? `当你需要${summary}时使用${toolName}`
          : `在可重复的${categoryName}工作中使用${toolName}`,
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
  isEN: boolean,
): Array<{ question: string; answer: string }> {
  const next = [...faqs];

  if (next.length === 0) {
    next.push({
      question: isEN ? `What is ${toolName}?` : `${toolName} 是什么？`,
      answer:
        summary ??
        (isEN
          ? `${toolName} is an AI tool listed in the directory.`
          : `${toolName} 是一个已收录在目录中的 AI 工具。`),
    });
  }

  if (next.length < 2) {
    next.push({
      question: isEN ? `How is ${toolName} priced?` : `${toolName} 的定价如何？`,
      answer: isEN
        ? `${toolName} is currently listed with a ${pricingModel.toLowerCase()} pricing model.`
        : `${toolName} 目前的定价模式为 ${pricingModel.toLowerCase()}。`,
    });
  }

  if (next.length < 3) {
    next.push({
      question: isEN
        ? `What are the best alternatives to ${toolName}?`
        : `${toolName} 的最佳替代工具有哪些？`,
      answer:
        alternatives.length > 0
          ? isEN
            ? `Popular alternatives include ${alternatives
                .slice(0, 3)
                .map((tool) => tool.name)
                .join(", ")}.`
            : `热门替代工具包括 ${alternatives
                .slice(0, 3)
                .map((tool) => tool.name)
                .join("、")}。`
          : isEN
            ? `${toolName} can be compared with other published tools in the same category for pricing, features, and workflow fit.`
            : `可以将 ${toolName} 与同分类下的其他已发布工具在定价、功能和工作流适配方面进行对比。`,
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
