import type { PrismaClient } from "@ai-tool-cms/database";
import { ensureDefaultDiscoverySources, pollDueDiscoverySources } from "@ai-tool-cms/discovery";
import { enqueueDiscoveryRun } from "@ai-tool-cms/discovery";
import { pollDueAiRefresh } from "./ai-refresh";
import { auditPublishedToolLinks } from "./link-check";
import { indexPublishedTools } from "./index-submit";
import { pollPriceMonitors } from "./price-monitor";
import { generateSocialPosts } from "./social";
import { pollWebsiteMonitors } from "./website-monitor";
import {
  enqueueAiRefresh,
  enqueueIndexSubmit,
  enqueueLinkCheck,
  enqueuePriceMonitor,
  enqueueSocialPost,
  enqueueWebsiteMonitor,
} from "./enqueue";
import { ensureAiRefreshSchedules } from "./ai-refresh";
import { ensurePriceMonitorsForPublishedTools } from "./price-monitor";
import { ensureWebsiteMonitorsForPublishedTools } from "./website-monitor";

export async function bootstrapAutomation(prisma: PrismaClient): Promise<Record<string, number>> {
  const [discoverySources, websiteMonitors, priceMonitors, aiRefreshSchedules] = await Promise.all([
    ensureDefaultDiscoverySources(prisma),
    ensureWebsiteMonitorsForPublishedTools(prisma),
    ensurePriceMonitorsForPublishedTools(prisma),
    ensureAiRefreshSchedules(prisma),
  ]);
  return { discoverySources, websiteMonitors, priceMonitors, aiRefreshSchedules };
}

export async function runDailyAutomationPoll(
  prisma: PrismaClient,
): Promise<Record<string, number>> {
  const counts = {
    discovery: 0,
    website: 0,
    price: 0,
    link: 0,
    aiRefresh: 0,
    social: 0,
    index: 0,
  };

  const discoveryTaskIds = await pollDueDiscoverySources(prisma);
  for (const taskId of discoveryTaskIds) {
    await enqueueDiscoveryRun(taskId);
    counts.discovery += 1;
  }

  for (const monitorId of await pollWebsiteMonitors(prisma)) {
    await enqueueWebsiteMonitor(monitorId);
    counts.website += 1;
  }

  for (const monitorId of await pollPriceMonitors(prisma)) {
    await enqueuePriceMonitor(monitorId);
    counts.price += 1;
  }

  for (const toolId of await auditPublishedToolLinks(prisma)) {
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: { website: true },
    });
    if (tool) {
      await enqueueLinkCheck("tool", toolId, tool.website);
      counts.link += 1;
    }
  }

  for (const item of await pollDueAiRefresh(prisma)) {
    await enqueueAiRefresh(item.scheduleId, item.toolId);
    counts.aiRefresh += 1;
  }

  const socialPostIds = await generateSocialPosts(prisma, "WEEKLY_AI");
  for (const postId of socialPostIds) {
    await enqueueSocialPost(postId);
    counts.social += 1;
  }

  const submissionIds = await indexPublishedTools(prisma);
  for (const submissionId of submissionIds) {
    const submission = await prisma.indexSubmission.findUnique({ where: { id: submissionId } });
    if (submission) {
      await enqueueIndexSubmit(submission.id, submission.url, submission.provider);
      counts.index += 1;
    }
  }

  return counts;
}

export async function runWeeklyAutomationPoll(
  prisma: PrismaClient,
): Promise<{ newsletters: number }> {
  const { scheduleWeeklyNewsletters, scheduleCategoryNewsletters } =
    await import("./newsletter-auto");
  const weekly = await scheduleWeeklyNewsletters(prisma);
  const category = await scheduleCategoryNewsletters(prisma);
  return { newsletters: weekly.length + category.length };
}
