import { createHmac, randomBytes } from "node:crypto";
import type { PrismaClient, WebhookEvent } from "@ai-tool-cms/database";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function signWebhookPayload(secret: string, payload: string, timestamp: number): string {
  const signed = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signed).digest("hex");
}

export async function dispatchWebhookEvent(
  prisma: PrismaClient,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<string[]> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      events: { has: event },
    },
  });

  const deliveryIds: string[] = [];

  for (const webhook of webhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: { event, data, timestamp: new Date().toISOString() } as never,
        status: "PENDING",
      },
    });
    deliveryIds.push(delivery.id);
  }

  return deliveryIds;
}

export async function deliverWebhook(
  prisma: PrismaClient,
  deliveryId: string,
): Promise<{ ok: boolean; statusCode?: number }> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery || delivery.status === "DELIVERED") {
    return { ok: true };
  }

  const payload = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(delivery.webhook.secret, payload, timestamp);

  try {
    const response = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": String(timestamp),
      },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = await response.text().catch(() => "");

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? "DELIVERED" : "FAILED",
        statusCode: response.status,
        responseBody: responseBody.slice(0, 4000),
        attempts: delivery.attempts + 1,
        deliveredAt: response.ok ? new Date() : undefined,
      },
    });

    return { ok: response.ok, statusCode: response.status };
  } catch {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        attempts: delivery.attempts + 1,
      },
    });
    return { ok: false };
  }
}
