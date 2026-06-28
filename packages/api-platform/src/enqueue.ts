import { PLATFORM_QUEUE_NAMES, enqueuePlatformJob } from "@ai-tool-cms/queue";
import { dispatchWebhookEvent } from "./webhooks";
import type { PrismaClient, WebhookEvent } from "@ai-tool-cms/database";

export async function emitWebhookEvent(
  prisma: PrismaClient,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<{ deliveryCount: number }> {
  const deliveryIds = await dispatchWebhookEvent(prisma, event, data);
  await Promise.all(
    deliveryIds.map((deliveryId) =>
      enqueuePlatformJob(PLATFORM_QUEUE_NAMES.WEBHOOK_DELIVER, event, { deliveryId }),
    ),
  );
  return { deliveryCount: deliveryIds.length };
}

export async function enqueueNewsletterCampaign(campaignId: string): Promise<string> {
  return enqueuePlatformJob(PLATFORM_QUEUE_NAMES.NEWSLETTER_SEND, "send-campaign", {
    campaignId,
  });
}

export async function enqueueEmailSend(
  templateType: string,
  to: string,
  variables?: Record<string, string>,
): Promise<string> {
  return enqueuePlatformJob(PLATFORM_QUEUE_NAMES.EMAIL_SEND, templateType, {
    templateType,
    to,
    variables,
  });
}
