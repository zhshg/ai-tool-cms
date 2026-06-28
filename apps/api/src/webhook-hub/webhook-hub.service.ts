import { Injectable, NotFoundException } from "@nestjs/common";
import { dispatchWebhookEvent } from "@ai-tool-cms/api-platform";
import { PLATFORM_QUEUE_NAMES, enqueuePlatformJob } from "@ai-tool-cms/queue";
import type { WebhookEvent } from "@ai-tool-cms/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WebhookHubService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async listDeliveries(webhookId?: string, limit = 50) {
    return this.db.webhookDelivery.findMany({
      where: webhookId ? { webhookId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { webhook: { select: { name: true, url: true } } },
    });
  }

  async retryDelivery(deliveryId: string) {
    const delivery = await this.db.webhookDelivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");

    await this.db.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "PENDING", attempts: delivery.attempts },
    });

    await enqueuePlatformJob(PLATFORM_QUEUE_NAMES.WEBHOOK_DELIVER, "retry", {
      deliveryId,
    });

    return { deliveryId, status: "queued" };
  }

  async emitTestEvent(webhookId: string) {
    const webhook = await this.db.webhook.findFirst({
      where: { id: webhookId, deletedAt: null },
    });
    if (!webhook) throw new NotFoundException("Webhook not found");

    const deliveryIds = await dispatchWebhookEvent(this.db, "TOOL_UPDATED", {
      test: true,
      webhookId,
      timestamp: new Date().toISOString(),
    });

    for (const deliveryId of deliveryIds) {
      await enqueuePlatformJob(PLATFORM_QUEUE_NAMES.WEBHOOK_DELIVER, "test", { deliveryId });
    }

    return { deliveryIds };
  }

  eventCatalog() {
    const events: WebhookEvent[] = [
      "TOOL_ADDED",
      "TOOL_UPDATED",
      "TOOL_DELETED",
      "AI_GENERATED",
      "CRAWLER_FINISHED",
      "SEO_UPDATED",
    ];
    return {
      events: events.map((event) => ({
        event,
        aliases: eventAliases(event),
        integrations: ["n8n", "Make", "Zapier", "custom"],
      })),
    };
  }
}

function eventAliases(event: WebhookEvent): string[] {
  const map: Partial<Record<WebhookEvent, string[]>> = {
    TOOL_ADDED: ["ToolCreated"],
    TOOL_UPDATED: ["ToolUpdated"],
    TOOL_DELETED: ["ToolDeleted"],
    CRAWLER_FINISHED: ["CrawlerCompleted"],
    AI_GENERATED: ["AICompleted"],
    SEO_UPDATED: ["SEOCompleted"],
  };
  return map[event] ?? [];
}
