import { AUTOMATION_QUEUE_NAMES, enqueueAutomationJob } from "@ai-tool-cms/queue";

export async function enqueueWebsiteMonitor(monitorId: string): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.WEBSITE_MONITOR, "website-monitor", {
    monitorId,
  });
}

export async function enqueueToolLogoCollect(toolId: string, force = false): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.TOOL_LOGO_COLLECT, "collect-tool-logo", {
    toolId,
    force,
  });
}

export async function enqueuePriceMonitor(monitorId: string): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.PRICE_MONITOR, "price-monitor", {
    monitorId,
  });
}

export async function enqueueLinkCheck(
  targetType: string,
  targetId: string,
  url: string,
): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.LINK_CHECK, "link-check", {
    targetType,
    targetId,
    url,
  });
}

export async function enqueueAiRefresh(scheduleId: string, toolId: string): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.AI_REFRESH, "ai-refresh", {
    scheduleId,
    toolId,
  });
}

export async function enqueueSocialPost(postId: string): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.SOCIAL_POST, "social-post", { postId });
}

export async function enqueueNewsletterAuto(
  campaignType: string,
  categoryId?: string,
): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.NEWSLETTER_AUTO, "newsletter-auto", {
    campaignType,
    categoryId,
  });
}

export async function enqueueIndexSubmit(
  submissionId: string,
  url: string,
  provider: "GOOGLE" | "BING",
): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.INDEX_SUBMIT, "index-submit", {
    submissionId,
    url,
    provider,
  });
}
