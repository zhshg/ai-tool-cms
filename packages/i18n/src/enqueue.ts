import type { PrismaClient } from "@ai-tool-cms/database";
import { I18N_QUEUE_NAMES, enqueueI18nJob } from "@ai-tool-cms/queue";

export async function enqueueTranslationWorkflow(
  prisma: PrismaClient,
  toolId: string,
  targetLocale: string,
  sourceLocale = "en",
): Promise<string> {
  const job = await prisma.translationJob.create({
    data: {
      toolId,
      targetLocale,
      sourceLocale,
      status: "PENDING",
      stage: "ENGLISH",
    },
  });

  await enqueueI18nJob(I18N_QUEUE_NAMES.TRANSLATION_WORKFLOW, "translate", {
    translationJobId: job.id,
    toolId,
    targetLocale,
    sourceLocale,
  });

  return job.id;
}

export async function enqueueAllLocaleTranslations(
  prisma: PrismaClient,
  toolId: string,
  locales: string[],
  sourceLocale = "en",
): Promise<string[]> {
  const ids: string[] = [];
  for (const locale of locales) {
    if (locale === sourceLocale) continue;
    ids.push(await enqueueTranslationWorkflow(prisma, toolId, locale, sourceLocale));
  }
  return ids;
}
