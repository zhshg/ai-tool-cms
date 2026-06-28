import type { PrismaClient } from "@ai-tool-cms/database";
import { LOCALE_LABELS, type SupportedLocale } from "./locales";

export type LocaleContentInput = {
  name: string;
  summary: string | null;
  longDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
};

/** Commit 072 — per-locale AI-style content (not machine translation). */
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
      longDescription: true,
      metaTitle: true,
      metaDescription: true,
    },
  });

  const generated = generateLocaleContent(
    {
      name: tool.name,
      summary: tool.summary,
      longDescription: tool.longDescription,
      metaTitle: tool.metaTitle,
      metaDescription: tool.metaDescription,
    },
    targetLocale as SupportedLocale,
  );

  await prisma.translationJob.update({
    where: { id: translationJobId },
    data: { stage: "SEO" },
  });

  const existing = await prisma.toolTranslation.findFirst({
    where: { toolId, locale: targetLocale, deletedAt: null },
  });

  if (existing) {
    await prisma.toolTranslation.update({
      where: { id: existing.id },
      data: {
        summary: generated.summary,
        longDescription: generated.longDescription,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        faqJson: generated.faqJson as never,
        status: "AI_GENERATED",
      },
    });
  } else {
    await prisma.toolTranslation.create({
      data: {
        toolId,
        locale: targetLocale,
        summary: generated.summary,
        longDescription: generated.longDescription,
        metaTitle: generated.metaTitle,
        metaDescription: generated.metaDescription,
        faqJson: generated.faqJson as never,
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
