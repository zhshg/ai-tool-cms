import type { Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";
import { runDiscoveryTask } from "@ai-tool-cms/discovery";
import { prisma } from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import {
  AUTOMATION_QUEUE_NAMES,
  createRedisConnection,
  type AiRefreshJobPayload,
  type DiscoveryRunJobPayload,
  type IndexSubmitJobPayload,
  type LinkCheckJobPayload,
  type NewsletterAutoJobPayload,
  type PriceMonitorJobPayload,
  type ScreenshotCaptureJobPayload,
  type SocialPostJobPayload,
  type WebsiteMonitorJobPayload,
} from "@ai-tool-cms/queue";
import { captureToolScreenshots } from "@ai-tool-cms/screenshot";
import {
  checkPriceMonitor,
  checkWebsiteMonitor,
  createAutomationRun,
  finishAutomationRun,
  publishSocialPost,
  runAiRefresh,
  runLinkCheck,
  scheduleCategoryNewsletters,
  scheduleWeeklyNewsletters,
  submitToSearchEngine,
} from "@ai-tool-cms/automation";

const log = createLogger({ service: "automation-worker" });
const workerConnection = () => createRedisConnection() as never;

async function withRun<T>(
  kind: Parameters<typeof createAutomationRun>[1],
  referenceId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const run = await createAutomationRun(prisma, kind, referenceId);
  try {
    const result = await fn();
    await finishAutomationRun(prisma, run.id, { ok: true, result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed";
    await finishAutomationRun(prisma, run.id, {}, message);
    throw error;
  }
}

export function startAutomationWorkers(): Worker[] {
  const discoveryWorker = new BullWorker<DiscoveryRunJobPayload>(
    AUTOMATION_QUEUE_NAMES.DISCOVERY_RUN,
    async (job) =>
      withRun("DISCOVERY", job.data.taskId, async () => {
        const result = await runDiscoveryTask(prisma, job.data.taskId);
        log.info("Discovery run complete", result);
        return result;
      }),
    { connection: workerConnection(), concurrency: 2 },
  );

  const websiteWorker = new BullWorker<WebsiteMonitorJobPayload>(
    AUTOMATION_QUEUE_NAMES.WEBSITE_MONITOR,
    async (job) =>
      withRun("WEBSITE_MONITOR", job.data.monitorId, () =>
        checkWebsiteMonitor(prisma, job.data.monitorId),
      ),
    { connection: workerConnection(), concurrency: 3 },
  );

  const priceWorker = new BullWorker<PriceMonitorJobPayload>(
    AUTOMATION_QUEUE_NAMES.PRICE_MONITOR,
    async (job) =>
      withRun("PRICE_MONITOR", job.data.monitorId, () =>
        checkPriceMonitor(prisma, job.data.monitorId),
      ),
    { connection: workerConnection(), concurrency: 3 },
  );

  const screenshotWorker = new BullWorker<ScreenshotCaptureJobPayload>(
    AUTOMATION_QUEUE_NAMES.SCREENSHOT_CAPTURE,
    async (job) =>
      withRun("SCREENSHOT", job.data.toolId, async () => {
        const saved = await captureToolScreenshots(prisma, job.data.toolId, job.data.variants);
        return { saved };
      }),
    { connection: workerConnection(), concurrency: 1 },
  );

  const linkWorker = new BullWorker<LinkCheckJobPayload>(
    AUTOMATION_QUEUE_NAMES.LINK_CHECK,
    async (job) =>
      withRun("LINK_CHECK", job.data.targetId, () =>
        runLinkCheck(prisma, job.data.targetType, job.data.targetId, job.data.url),
      ),
    { connection: workerConnection(), concurrency: 5 },
  );

  const aiRefreshWorker = new BullWorker<AiRefreshJobPayload>(
    AUTOMATION_QUEUE_NAMES.AI_REFRESH,
    async (job) =>
      withRun("AI_REFRESH", job.data.scheduleId, () =>
        runAiRefresh(prisma, job.data.scheduleId, job.data.toolId),
      ),
    { connection: workerConnection(), concurrency: 2 },
  );

  const socialWorker = new BullWorker<SocialPostJobPayload>(
    AUTOMATION_QUEUE_NAMES.SOCIAL_POST,
    async (job) =>
      withRun("SOCIAL_POST", job.data.postId, async () => {
        await publishSocialPost(prisma, job.data.postId);
        return { published: true };
      }),
    { connection: workerConnection(), concurrency: 2 },
  );

  const newsletterWorker = new BullWorker<NewsletterAutoJobPayload>(
    AUTOMATION_QUEUE_NAMES.NEWSLETTER_AUTO,
    async (job) =>
      withRun("NEWSLETTER", undefined, async () => {
        if (job.data.campaignType === "weekly") {
          const ids = await scheduleWeeklyNewsletters(prisma);
          return { campaignIds: ids };
        }
        const ids = await scheduleCategoryNewsletters(prisma);
        return { campaignIds: ids };
      }),
    { connection: workerConnection(), concurrency: 1 },
  );

  const indexWorker = new BullWorker<IndexSubmitJobPayload>(
    AUTOMATION_QUEUE_NAMES.INDEX_SUBMIT,
    async (job) =>
      withRun("INDEX_SUBMIT", job.data.submissionId, async () => {
        await submitToSearchEngine(prisma, job.data.submissionId, job.data.url, job.data.provider);
        return { submitted: true };
      }),
    { connection: workerConnection(), concurrency: 3 },
  );

  return [
    discoveryWorker,
    websiteWorker,
    priceWorker,
    screenshotWorker,
    linkWorker,
    aiRefreshWorker,
    socialWorker,
    newsletterWorker,
    indexWorker,
  ];
}
