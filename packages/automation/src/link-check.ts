import type { BrokenLinkIssueType, PrismaClient } from "@ai-tool-cms/database";

export type LinkCheckResult = {
  isHealthy: boolean;
  httpStatus?: number;
  issues: Array<{ issueType: BrokenLinkIssueType; message: string }>;
};

export async function checkUrlHealth(url: string): Promise<LinkCheckResult> {
  const issues: LinkCheckResult["issues"] = [];

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      issues.push({ issueType: "OTHER", message: `Unsupported protocol: ${parsed.protocol}` });
      return { isHealthy: false, issues };
    }
  } catch {
    issues.push({ issueType: "DNS_ERROR", message: "Invalid URL" });
    return { isHealthy: false, issues };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ai-tool-cms-link-check/1.0" },
    });
    clearTimeout(timer);

    const httpStatus = response.status;
    if (httpStatus >= 400) {
      issues.push({
        issueType: "HTTP_ERROR",
        message: `HTTP ${httpStatus}`,
      });
    }

    if (response.redirected && response.url !== url) {
      const hops = response.headers.get("x-redirect-count");
      if (hops && Number(hops) > 5) {
        issues.push({ issueType: "REDIRECT_LOOP", message: "Too many redirects" });
      }
    }

    return { isHealthy: issues.length === 0, httpStatus, issues };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const issueType: BrokenLinkIssueType = message.includes("abort")
      ? "TIMEOUT"
      : message.toLowerCase().includes("ssl")
        ? "SSL_ERROR"
        : "DNS_ERROR";
    issues.push({ issueType, message });
    return { isHealthy: false, issues };
  }
}

export async function runLinkCheck(
  prisma: PrismaClient,
  targetType: string,
  targetId: string,
  url: string,
): Promise<LinkCheckResult> {
  const result = await checkUrlHealth(url);
  const checkedAt = new Date();

  const check = await prisma.brokenLinkCheck.create({
    data: {
      targetType,
      targetId,
      url,
      httpStatus: result.httpStatus,
      isHealthy: result.isHealthy,
      checkedAt,
      metadata: {},
    },
  });

  for (const issue of result.issues) {
    await prisma.brokenLinkIssue.create({
      data: {
        checkId: check.id,
        issueType: issue.issueType,
        message: issue.message,
      },
    });
  }

  return result;
}

export async function auditPublishedToolLinks(prisma: PrismaClient): Promise<string[]> {
  const tools = await prisma.tool.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { id: true, website: true },
    take: 50,
  });
  return tools.map((t) => t.id);
}

export async function auditToolLinks(prisma: PrismaClient, toolId: string): Promise<number> {
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, deletedAt: null },
    select: { id: true, website: true },
  });
  if (!tool) return 0;

  const urls = [tool.website];
  const affiliateLinks = await prisma.affiliateLink.findMany({
    where: { toolId, deletedAt: null, status: "ACTIVE" },
    select: { affiliateUrl: true },
    take: 20,
  });
  for (const link of affiliateLinks) {
    urls.push(link.affiliateUrl);
  }

  let checked = 0;
  for (const url of urls) {
    await runLinkCheck(prisma, "tool", tool.id, url);
    checked += 1;
  }
  return checked;
}
