import type { Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";
import { prisma } from "@ai-tool-cms/database";
import { runTranslationWorkflow } from "@ai-tool-cms/i18n";
import { createLogger } from "@ai-tool-cms/logger";
import {
  I18N_QUEUE_NAMES,
  createRedisConnection,
  type TranslationWorkflowJobPayload,
} from "@ai-tool-cms/queue";

const log = createLogger({ service: "translation-worker" });
const workerConnection = () => createRedisConnection() as never;

export function startTranslationWorker(): Worker {
  return new BullWorker<TranslationWorkflowJobPayload>(
    I18N_QUEUE_NAMES.TRANSLATION_WORKFLOW,
    async (job) => {
      const { translationJobId, toolId, targetLocale } = job.data;
      await runTranslationWorkflow(prisma, translationJobId, toolId, targetLocale);
      log.info("Translation workflow completed", { translationJobId, toolId, targetLocale });
    },
    { connection: workerConnection(), concurrency: 3 },
  );
}
