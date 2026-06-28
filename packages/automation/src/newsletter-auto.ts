import type { NewsletterCampaignType, PrismaClient } from "@ai-tool-cms/database";
import { buildNewsletterContent } from "@ai-tool-cms/email";
import { PLATFORM_QUEUE_NAMES, enqueuePlatformJob } from "@ai-tool-cms/queue";

const WEEKLY_TYPES: NewsletterCampaignType[] = ["WEEKLY_AI", "NEW_AI", "TOP_AI", "TRENDING_AI"];

export async function scheduleWeeklyNewsletters(prisma: PrismaClient): Promise<string[]> {
  const campaignIds: string[] = [];

  for (const type of WEEKLY_TYPES) {
    const content = await buildNewsletterContent(prisma, type);
    const campaign = await prisma.newsletterCampaign.create({
      data: {
        type,
        subject: content.subject,
        contentHtml: content.html,
        status: "SCHEDULED",
        scheduledAt: new Date(),
        metadata: { trigger: "automation-newsletter-auto" },
      },
    });
    await enqueuePlatformJob(PLATFORM_QUEUE_NAMES.NEWSLETTER_SEND, type, {
      campaignId: campaign.id,
    });
    campaignIds.push(campaign.id);
  }

  return campaignIds;
}

export async function scheduleCategoryNewsletters(prisma: PrismaClient): Promise<string[]> {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });

  const campaignIds: string[] = [];
  for (const category of categories) {
    const content = await buildNewsletterContent(prisma, "CATEGORY_WEEKLY", {
      categoryId: category.id,
    });
    const campaign = await prisma.newsletterCampaign.create({
      data: {
        type: "CATEGORY_WEEKLY",
        subject: `${category.name} — ${content.subject}`,
        contentHtml: content.html,
        categoryId: category.id,
        status: "SCHEDULED",
        scheduledAt: new Date(),
        metadata: { trigger: "automation-newsletter-auto", categoryId: category.id },
      },
    });
    await enqueuePlatformJob(PLATFORM_QUEUE_NAMES.NEWSLETTER_SEND, "CATEGORY_WEEKLY", {
      campaignId: campaign.id,
    });
    campaignIds.push(campaign.id);
  }

  return campaignIds;
}
