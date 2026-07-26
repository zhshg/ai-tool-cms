import {
  AIFactory,
  PromptEngine,
  parseJsonFromLlm,
  type AIProvider,
  type ChatMessage,
  type PromptVariables,
} from "@ai-tool-cms/ai";
import type { PrismaClient } from "@ai-tool-cms/database";
import { LOCALE_LABELS, type SupportedLocale } from "./locales";

export type LocaleContentInput = {
  name: string;
  summary: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
};

/** 翻译结果结构 */
export type TranslatedContent = {
  summary: string;
  description: string;
  longDescription: string;
  features: string[];
  faqs: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDescription: string;
};

/** 类别翻译结果结构 */
export type TranslatedCategoryContent = {
  name: string;
  description: string;
  shortDescription: string;
};

/**
 * Commit 072 — per-locale AI-style content (not machine translation).
 * @deprecated 仅作为回退使用，新代码应使用 generateTranslatedContent 进行真正的 AI 翻译。
 */
export function generateLocaleContent(
  source: LocaleContentInput,
  targetLocale: SupportedLocale,
): {
  summary: string;
  longDescription: string;
  metaTitle: string;
  metaDescription: string;
  faqJson: Array<{ question: string; answer: string }>;
} {
  const label = LOCALE_LABELS[targetLocale] ?? targetLocale;
  const baseSummary = source.summary ?? source.name;
  const baseLong = source.longDescription ?? baseSummary;

  return {
    summary: `[${label}] ${baseSummary}`.slice(0, 500),
    longDescription: `## ${source.name} (${label})\n\n${baseLong}`,
    metaTitle: `${source.name} — ${label}`.slice(0, 160),
    metaDescription: `${baseSummary} | ${label}`.slice(0, 320),
    faqJson: [
      {
        question: `What is ${source.name}?`,
        answer: baseSummary,
      },
      {
        question: `Who is ${source.name} for?`,
        answer: baseLong.slice(0, 300),
      },
    ],
  };
}

/** 安全截断字符串，避免空值 */
function safeSlice(value: string | null | undefined, max: number): string {
  if (!value) return "";
  return value.length > max ? value.slice(0, max) : value;
}

/** 从工具 metadata 中提取 features 数组（字符串） */
function extractFeaturesFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const meta = metadata as Record<string, unknown>;
  const features = meta.aiFeatures ?? meta.features;
  if (Array.isArray(features)) {
    return features.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
  }
  return [];
}

/** 从工具 metadata 中提取 FAQs 数组 */
function extractFaqsFromMetadata(metadata: unknown): Array<{ question: string; answer: string }> {
  if (!metadata || typeof metadata !== "object") return [];
  const meta = metadata as Record<string, unknown>;
  const faqs = meta.aiFaqs ?? meta.faqs;
  if (Array.isArray(faqs)) {
    return faqs
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({
        question: String(f.question ?? "").trim(),
        answer: String(f.answer ?? "").trim(),
      }))
      .filter((f) => f.question && f.answer);
  }
  return [];
}

/**
 * 调用 AI 真正翻译工具内容到目标语言。
 * 如果 AI 不可用（mock provider 或无 API key），回退到 generateLocaleContent 的伪翻译。
 */
export async function generateTranslatedContent(params: {
  toolName: string;
  website: string | null;
  category: string | null;
  summary: string | null;
  description: string | null;
  longDescription: string | null;
  features: string[];
  faqs: Array<{ question: string; answer: string }>;
  targetLocale: string;
  provider?: AIProvider;
}): Promise<TranslatedContent> {
  const targetLocale = params.targetLocale as SupportedLocale;
  const provider = params.provider ?? AIFactory.createDefault();

  // mock provider 回退到伪翻译
  if (provider.id === "mock") {
    const fallback = generateLocaleContent(
      {
        name: params.toolName,
        summary: params.summary,
        longDescription: params.longDescription,
        metaTitle: null,
        metaDescription: null,
      },
      targetLocale,
    );
    return {
      summary: fallback.summary,
      description: params.description ?? fallback.summary,
      longDescription: fallback.longDescription,
      features: params.features,
      faqs: fallback.faqJson,
      metaTitle: fallback.metaTitle,
      metaDescription: fallback.metaDescription,
    };
  }

  const engine = new PromptEngine();
  const resolved = engine.resolve({ templateId: "translate", locale: targetLocale });
  const variables: PromptVariables = {
    tool_name: params.toolName,
    website: params.website ?? "",
    category: params.category ?? "",
    summary: params.summary ?? "",
    description: params.description ?? "",
    long_description: params.longDescription ?? "",
    features: params.features.join("\n"),
    faqs: JSON.stringify(params.faqs, null, 2),
  };
  const systemMsg = engine.render(resolved.system, variables);
  const userMsg = engine.render(resolved.user, variables);
  const messages: ChatMessage[] = [
    { role: "system", content: systemMsg },
    { role: "user", content: userMsg },
  ];

  const response = await provider.chat({
    messages,
    maxTokens: 4000,
    temperature: 0.3,
  });

  const parsed = parseJsonFromLlm<{
    summary?: string;
    description?: string;
    longDescription?: string;
    features?: string[];
    faqs?: Array<{ question: string; answer: string }>;
  }>(response.content);

  // 安全兜底：如果某个字段缺失，回退到原文
  return {
    summary: safeSlice(parsed.summary ?? params.summary ?? params.toolName, 500),
    description: parsed.description ?? params.description ?? params.summary ?? params.toolName,
    longDescription:
      parsed.longDescription ?? params.longDescription ?? params.summary ?? params.toolName,
    features:
      Array.isArray(parsed.features) && parsed.features.length > 0
        ? parsed.features.slice(0, 20)
        : params.features,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 10) : params.faqs,
    metaTitle: safeSlice(
      `${params.toolName} — ${LOCALE_LABELS[targetLocale] ?? targetLocale}`,
      160,
    ),
    metaDescription: safeSlice(parsed.summary ?? params.summary ?? params.toolName, 320),
  };
}

/**
 * 调用 AI 翻译类别信息到目标语言。
 */
export async function generateTranslatedCategoryContent(params: {
  categoryName: string;
  categoryDescription: string | null;
  categoryShortDescription: string | null;
  exampleTools: string[];
  targetLocale: string;
  provider?: AIProvider;
}): Promise<TranslatedCategoryContent> {
  const targetLocale = params.targetLocale as SupportedLocale;
  const provider = params.provider ?? AIFactory.createDefault();

  // mock provider 回退到原文
  if (provider.id === "mock") {
    return {
      name: params.categoryName,
      description: params.categoryDescription ?? params.categoryName,
      shortDescription:
        params.categoryShortDescription ?? params.categoryDescription ?? params.categoryName,
    };
  }

  const engine = new PromptEngine();
  const resolved = engine.resolve({ templateId: "translate-category", locale: targetLocale });
  const variables: PromptVariables = {
    category_name: params.categoryName,
    category_description: params.categoryDescription ?? "",
    category_short_description: params.categoryShortDescription ?? "",
    example_tools: params.exampleTools.join(", "),
  };
  const systemMsg = engine.render(resolved.system, variables);
  const userMsg = engine.render(resolved.user, variables);
  const messages: ChatMessage[] = [
    { role: "system", content: systemMsg },
    { role: "user", content: userMsg },
  ];

  const response = await provider.chat({
    messages,
    maxTokens: 1500,
    temperature: 0.3,
  });

  const parsed = parseJsonFromLlm<{
    name?: string;
    description?: string;
    shortDescription?: string;
  }>(response.content);

  return {
    name: parsed.name ?? params.categoryName,
    description: parsed.description ?? params.categoryDescription ?? params.categoryName,
    shortDescription:
      parsed.shortDescription ??
      params.categoryShortDescription ??
      parsed.description ??
      params.categoryName,
  };
}

export async function runTranslationWorkflow(
  prisma: PrismaClient,
  translationJobId: string,
  toolId: string,
  targetLocale: string,
): Promise<void> {
  await prisma.translationJob.update({
    where: { id: translationJobId },
    data: { status: "RUNNING", stage: "AI_GENERATE" },
  });

  const tool = await prisma.tool.findFirstOrThrow({
    where: { id: toolId, deletedAt: null },
    select: {
      name: true,
      summary: true,
      description: true,
      longDescription: true,
      metaTitle: true,
      metaDescription: true,
      website: true,
      metadata: true,
      categories: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { category: { select: { name: true } } },
      },
    },
  });

  const features = extractFeaturesFromMetadata(tool.metadata);
  const faqs = extractFaqsFromMetadata(tool.metadata);
  const primaryCategoryName = tool.categories[0]?.category?.name ?? null;

  let translated: TranslatedContent;
  try {
    translated = await generateTranslatedContent({
      toolName: tool.name,
      website: tool.website,
      category: primaryCategoryName,
      summary: tool.summary,
      description: tool.description,
      longDescription: tool.longDescription,
      features,
      faqs,
      targetLocale,
    });
  } catch (error) {
    // AI 翻译失败，回退到伪翻译
    console.error("[i18n] AI 翻译失败，回退到伪翻译:", error);
    const fallback = generateLocaleContent(
      {
        name: tool.name,
        summary: tool.summary,
        longDescription: tool.longDescription,
        metaTitle: tool.metaTitle,
        metaDescription: tool.metaDescription,
      },
      targetLocale as SupportedLocale,
    );
    translated = {
      summary: fallback.summary,
      description: tool.description ?? fallback.summary,
      longDescription: fallback.longDescription,
      features,
      faqs: fallback.faqJson,
      metaTitle: fallback.metaTitle,
      metaDescription: fallback.metaDescription,
    };
  }

  await prisma.translationJob.update({
    where: { id: translationJobId },
    data: { stage: "SEO" },
  });

  const existing = await prisma.toolTranslation.findFirst({
    where: { toolId, locale: targetLocale, deletedAt: null },
  });

  const faqJson = (translated.faqs ?? []) as never;

  if (existing) {
    await prisma.toolTranslation.update({
      where: { id: existing.id },
      data: {
        summary: translated.summary,
        longDescription: translated.longDescription,
        metaTitle: translated.metaTitle,
        metaDescription: translated.metaDescription,
        faqJson,
        status: "AI_GENERATED",
      },
    });
  } else {
    await prisma.toolTranslation.create({
      data: {
        toolId,
        locale: targetLocale,
        summary: translated.summary,
        longDescription: translated.longDescription,
        metaTitle: translated.metaTitle,
        metaDescription: translated.metaDescription,
        faqJson,
        status: "AI_GENERATED",
      },
    });
  }

  await prisma.translationJob.update({
    where: { id: translationJobId },
    data: { stage: "PUBLISH", status: "SUCCEEDED", finishedAt: new Date() },
  });

  await prisma.toolTranslation.updateMany({
    where: { toolId, locale: targetLocale, deletedAt: null },
    data: { status: "PUBLISHED" },
  });
}

/**
 * 类别翻译 workflow — 翻译类别名和描述到目标语言，写入 CategoryTranslation 表。
 * 不创建 TranslationJob（因为 TranslationJob 表当前只关联 toolId）。
 */
export async function runCategoryTranslationWorkflow(
  prisma: PrismaClient,
  categoryId: string,
  targetLocale: string,
  options?: { provider?: AIProvider },
): Promise<void> {
  const category = await prisma.category.findFirstOrThrow({
    where: { id: categoryId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      metadata: true,
      tools: {
        where: { deletedAt: null, tool: { status: "PUBLISHED", deletedAt: null } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { tool: { select: { name: true } } },
      },
    },
  });

  const meta = (category.metadata ?? {}) as Record<string, unknown>;
  const shortDescription = typeof meta.shortDescription === "string" ? meta.shortDescription : null;
  const exampleTools = category.tools.map((t) => t.tool.name);

  const translated = await generateTranslatedCategoryContent({
    categoryName: category.name,
    categoryDescription: category.description,
    categoryShortDescription: shortDescription,
    exampleTools,
    targetLocale,
    provider: options?.provider,
  });

  const existing = await prisma.categoryTranslation.findFirst({
    where: { categoryId, locale: targetLocale, deletedAt: null },
  });

  // CategoryTranslation 表无 shortDescription 字段，存入 metadata
  const translationMetadata = { shortDescription: translated.shortDescription } as never;

  if (existing) {
    await prisma.categoryTranslation.update({
      where: { id: existing.id },
      data: {
        name: translated.name,
        description: translated.description,
        metadata: translationMetadata,
      },
    });
  } else {
    await prisma.categoryTranslation.create({
      data: {
        categoryId,
        locale: targetLocale,
        name: translated.name,
        description: translated.description,
        metadata: translationMetadata,
      },
    });
  }
}
