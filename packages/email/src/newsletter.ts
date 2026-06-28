import type { NewsletterCampaignType, PrismaClient } from "@ai-tool-cms/database";

export const NEWSLETTER_CAMPAIGN_LABELS: Record<NewsletterCampaignType, string> = {
  WEEKLY_AI: "Weekly AI",
  TOP_AI: "Top AI",
  NEW_AI: "New AI",
  TRENDING_AI: "Trending AI",
  CATEGORY_WEEKLY: "Category Weekly",
};

export async function buildNewsletterContent(
  prisma: PrismaClient,
  type: NewsletterCampaignType,
  options: { categoryId?: string; limit?: number } = {},
): Promise<{ subject: string; html: string }> {
  const limit = options.limit ?? 10;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let tools: { name: string; slug: string; summary: string | null }[] = [];

  switch (type) {
    case "NEW_AI":
      tools = await prisma.tool.findMany({
        where: { status: "PUBLISHED", deletedAt: null, publishedAt: { gte: since } },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: { name: true, slug: true, summary: true },
      });
      break;
    case "TRENDING_AI":
      tools = await prisma.tool.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: { name: true, slug: true, summary: true },
      });
      break;
    case "CATEGORY_WEEKLY":
      if (options.categoryId) {
        tools = await prisma.tool.findMany({
          where: {
            status: "PUBLISHED",
            deletedAt: null,
            categories: { some: { categoryId: options.categoryId, deletedAt: null } },
          },
          orderBy: { publishedAt: "desc" },
          take: limit,
          select: { name: true, slug: true, summary: true },
        });
      }
      break;
    case "TOP_AI":
    case "WEEKLY_AI":
    default:
      tools = await prisma.tool.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: { name: true, slug: true, summary: true },
      });
      break;
  }

  const label = NEWSLETTER_CAMPAIGN_LABELS[type];
  const subject = `${label} — AI Tool CMS`;
  const items = tools
    .map(
      (t) =>
        `<li><strong>${t.name}</strong>${t.summary ? ` — ${t.summary}` : ""} <a href="/tools/${t.slug}">查看</a></li>`,
    )
    .join("\n");

  const html = `<h1>${label}</h1><ul>${items}</ul><p><a href="/rss">RSS 订阅</a></p>`;
  return { subject, html };
}

export async function getConfirmedSubscribers(prisma: PrismaClient) {
  return prisma.newsletterSubscriber.findMany({
    where: { status: "CONFIRMED", deletedAt: null },
    select: { id: true, email: true, locale: true },
  });
}
