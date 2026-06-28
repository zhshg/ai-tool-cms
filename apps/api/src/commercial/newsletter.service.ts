import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  NEWSLETTER_CAMPAIGN_LABELS,
  buildNewsletterContent,
  getConfirmedSubscribers,
} from "@ai-tool-cms/email";
import { enqueueNewsletterCampaign } from "@ai-tool-cms/api-platform";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  campaignTypes() {
    return NEWSLETTER_CAMPAIGN_LABELS;
  }

  async subscribe(email: string, locale = "zh-CN") {
    const confirmToken = randomBytes(24).toString("hex");
    return this.prisma.client.newsletterSubscriber.upsert({
      where: { email },
      update: { locale, deletedAt: null, confirmToken, status: "PENDING" },
      create: { email, locale, confirmToken, status: "PENDING" },
    });
  }

  async confirm(token: string) {
    const subscriber = await this.prisma.client.newsletterSubscriber.findFirst({
      where: { confirmToken: token, deletedAt: null },
    });
    if (!subscriber) return null;
    return this.prisma.client.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: "CONFIRMED", confirmedAt: new Date(), confirmToken: null },
    });
  }

  async listCampaigns() {
    return this.prisma.client.newsletterCampaign.findMany({
      where: activeOnly,
      orderBy: { createdAt: "desc" },
    });
  }

  async createCampaign(input: { type: string; categoryId?: string; scheduledAt?: string }) {
    const content = await buildNewsletterContent(this.prisma.client, input.type as never, {
      categoryId: input.categoryId,
    });
    return this.prisma.client.newsletterCampaign.create({
      data: {
        type: input.type as never,
        subject: content.subject,
        contentHtml: content.html,
        categoryId: input.categoryId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
      },
    });
  }

  async sendCampaign(campaignId: string) {
    await enqueueNewsletterCampaign(campaignId);
    return { queued: true, campaignId };
  }

  async getSubscriberCount() {
    return this.prisma.client.newsletterSubscriber.count({
      where: { status: "CONFIRMED", deletedAt: null },
    });
  }

  async getConfirmed() {
    return getConfirmedSubscribers(this.prisma.client);
  }
}
