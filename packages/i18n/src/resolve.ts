import type { PrismaClient } from "@ai-tool-cms/database";
import { DEFAULT_LOCALE } from "./locales";

export type LocalizedToolContent = {
  locale: string;
  summary: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  faqJson: unknown;
  status: string;
  isFallback: boolean;
};

const activeOnly = { deletedAt: null } as const;

/** Resolve tool content with locale fallback chain (Commit 071). */
export async function resolveLocalizedTool(
  prisma: PrismaClient,
  toolId: string,
  locale: string,
): Promise<LocalizedToolContent | null> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, ...activeOnly },
    select: {
      summary: true,
      longDescription: true,
      metaTitle: true,
      metaDescription: true,
    },
  });
  if (!tool) return null;

  const chain = buildFallbackChain(locale);
  for (const loc of chain) {
    if (loc === DEFAULT_LOCALE) {
      return {
        locale: DEFAULT_LOCALE,
        summary: tool.summary,
        longDescription: tool.longDescription,
        metaTitle: tool.metaTitle,
        metaDescription: tool.metaDescription,
        faqJson: [],
        status: "PUBLISHED",
        isFallback: loc !== locale,
      };
    }
    const translation = await prisma.toolTranslation.findFirst({
      where: {
        toolId,
        locale: loc,
        status: "PUBLISHED",
        ...activeOnly,
      },
    });
    if (translation) {
      return {
        locale: translation.locale,
        summary: translation.summary,
        longDescription: translation.longDescription,
        metaTitle: translation.metaTitle,
        metaDescription: translation.metaDescription,
        faqJson: translation.faqJson,
        status: translation.status,
        isFallback: loc !== locale,
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE,
    summary: tool.summary,
    longDescription: tool.longDescription,
    metaTitle: tool.metaTitle,
    metaDescription: tool.metaDescription,
    faqJson: [],
    status: "PUBLISHED",
    isFallback: true,
  };
}

export function buildFallbackChain(locale: string): string[] {
  const chain: string[] = [locale];
  if (locale !== DEFAULT_LOCALE) chain.push(DEFAULT_LOCALE);
  if (locale.startsWith("zh") && locale !== "zh-CN") chain.push("zh-CN");
  return [...new Set(chain)];
}

export async function getTranslationStatusSummary(prisma: PrismaClient, toolId: string) {
  const rows = await prisma.toolTranslation.findMany({
    where: { toolId, ...activeOnly },
    select: { locale: true, status: true, updatedAt: true },
  });
  return rows;
}
