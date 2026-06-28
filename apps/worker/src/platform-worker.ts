import type { Job, Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";
import { deliverWebhook } from "@ai-tool-cms/api-platform";
import { prisma } from "@ai-tool-cms/database";
import {
  buildNewsletterContent,
  getConfirmedSubscribers,
  sendEmail,
  sendTemplatedEmail,
} from "@ai-tool-cms/email";
import { createLogger } from "@ai-tool-cms/logger";
import {
  PLATFORM_QUEUE_NAMES,
  createRedisConnection,
  type EmailSendJobPayload,
  type NewsletterSendJobPayload,
  type WebhookDeliverJobPayload,
} from "@ai-tool-cms/queue";

const log = createLogger({ service: "platform-worker" });
const workerConnection = () => createRedisConnection() as never;

async function handleWebhookDeliver(job: Job<WebhookDeliverJobPayload>) {
  const result = await deliverWebhook(prisma, job.data.deliveryId);
  log.info("Webhook delivered", { deliveryId: job.data.deliveryId, ...result });
}

async function handleNewsletterSend(job: Job<NewsletterSendJobPayload>) {
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: job.data.campaignId },
  });
  if (!campaign) return;

  const content =
    campaign.contentHtml ??
    (
      await buildNewsletterContent(prisma, campaign.type, {
        categoryId: campaign.categoryId ?? undefined,
      })
    ).html;

  const subscribers = await getConfirmedSubscribers(prisma);
  let sent = 0;

  for (const subscriber of subscribers) {
    await sendEmail({
      to: subscriber.email,
      subject: campaign.subject,
      html: content,
    });
    sent += 1;
  }

  await prisma.newsletterCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date(), recipientCount: sent },
  });

  log.info("Newsletter campaign sent", { campaignId: campaign.id, sent });
}

async function handleEmailSend(job: Job<EmailSendJobPayload>) {
  await sendTemplatedEmail(prisma, job.data.templateType as never, job.data.to, job.data.variables);
}

export function startPlatformWorkers(): Worker[] {
  const webhookWorker = new BullWorker<WebhookDeliverJobPayload>(
    PLATFORM_QUEUE_NAMES.WEBHOOK_DELIVER,
    async (job) => handleWebhookDeliver(job),
    { connection: workerConnection(), concurrency: 5 },
  );

  const newsletterWorker = new BullWorker<NewsletterSendJobPayload>(
    PLATFORM_QUEUE_NAMES.NEWSLETTER_SEND,
    async (job) => handleNewsletterSend(job),
    { connection: workerConnection(), concurrency: 2 },
  );

  const emailWorker = new BullWorker<EmailSendJobPayload>(
    PLATFORM_QUEUE_NAMES.EMAIL_SEND,
    async (job) => handleEmailSend(job),
    { connection: workerConnection(), concurrency: 3 },
  );

  return [webhookWorker, newsletterWorker, emailWorker];
}
