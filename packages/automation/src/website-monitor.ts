import { createHash } from "node:crypto";
import type { PrismaClient } from "@ai-tool-cms/database";
import { startAiPipeline } from "@ai-tool-cms/ai";
import {
  CRAWL_QUEUE_NAMES,
  enqueueAiJob,
  enqueueCrawlJob,
  type AiQueueName,
} from "@ai-tool-cms/queue";

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function checkWebsiteMonitor(
  prisma: PrismaClient,
  monitorId: string,
): Promise<{ changed: boolean }> {
  const monitor = await prisma.websiteMonitor.findFirst({
    where: { id: monitorId, deletedAt: null },
    include: { tool: { select: { id: true, slug: true, name: true } } },
  });
  if (!monitor || monitor.status !== "ACTIVE") {
    return { changed: false };
  }

  const response = await fetch(monitor.url, {
    headers: { "User-Agent": "ai-tool-cms-website-monitor/1.0" },
    redirect: "follow",
  });
  const body = await response.text();
  const contentHash = hashContent(body.slice(0, 50_000));
  const etag = response.headers.get("etag");
  const now = new Date();
  const changed = Boolean(monitor.contentHash && monitor.contentHash !== contentHash);

  if (changed) {
    await prisma.websiteMonitorEvent.create({
      data: {
        monitorId,
        changeType: "CONTENT_CHANGED",
        beforeHash: monitor.contentHash,
        afterHash: contentHash,
        snapshot: { status: response.status, bytes: body.length },
      },
    });

    await prisma.websiteMonitor.update({
      where: { id: monitorId },
      data: {
        contentHash,
        etag: etag ?? undefined,
        lastCheckedAt: now,
        lastChangedAt: now,
      },
    });

    // 触发重新采集 + AI 流水线
    const crawlSource = await prisma.crawlSource.findFirst({
      where: { deletedAt: null, status: "ENABLED" },
      orderBy: { priority: "desc" },
    });
    if (crawlSource) {
      const crawlJob = await prisma.crawlJob.create({
        data: {
          sourceId: crawlSource.id,
          jobType: "CRAWL_DETAIL",
          status: "PENDING",
          metadata: { trigger: "website_monitor", monitorId, toolId: monitor.toolId },
        },
      });
      await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_DETAIL, monitor.tool.slug, {
        sourceId: crawlSource.id,
        crawlJobId: crawlJob.id,
        externalId: monitor.tool.slug,
        item: { website: monitor.url, name: monitor.tool.name },
      });
    }

    await startAiPipeline(monitor.toolId, (queue, job, payload) =>
      enqueueAiJob(queue as AiQueueName, job, payload),
    );
  } else {
    await prisma.websiteMonitor.update({
      where: { id: monitorId },
      data: {
        contentHash: monitor.contentHash ?? contentHash,
        etag: etag ?? monitor.etag,
        lastCheckedAt: now,
      },
    });
  }

  return { changed };
}

export async function ensureWebsiteMonitorsForPublishedTools(
  prisma: PrismaClient,
): Promise<number> {
  const tools = await prisma.tool.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { id: true, website: true },
    take: 500,
  });
  let created = 0;
  for (const tool of tools) {
    const existing = await prisma.websiteMonitor.findFirst({
      where: { toolId: tool.id, url: tool.website, deletedAt: null },
    });
    if (existing) continue;
    await prisma.websiteMonitor.create({
      data: { toolId: tool.id, url: tool.website, status: "ACTIVE" },
    });
    created += 1;
  }
  return created;
}

export async function pollWebsiteMonitors(prisma: PrismaClient): Promise<string[]> {
  const monitors = await prisma.websiteMonitor.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
    take: 20,
    select: { id: true },
  });
  return monitors.map((m) => m.id);
}
