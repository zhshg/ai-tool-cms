import { getEnv } from "@ai-tool-cms/config";
import { computeNextRunAt } from "@ai-tool-cms/crawler-core";
import { runDailyAutomationPoll, runWeeklyAutomationPoll } from "@ai-tool-cms/automation";
import { disconnectPrisma, prisma } from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import { CRAWL_QUEUE_NAMES, enqueueCrawlJob } from "@ai-tool-cms/queue";

const log = createLogger({ service: "scheduler" });
const POLL_INTERVAL_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
let lastDailyAutomationAt = 0;
let lastWeeklyAutomationAt = 0;

export async function pollDueSources(): Promise<number> {
  const now = new Date();
  const dueSources = await prisma.crawlSource.findMany({
    where: {
      deletedAt: null,
      status: "ENABLED",
      schedule: { not: "MANUAL" },
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: [{ priority: "desc" }, { nextRunAt: "asc" }],
    take: 20,
  });

  let enqueued = 0;

  for (const source of dueSources) {
    const crawlJob = await prisma.crawlJob.create({
      data: {
        sourceId: source.id,
        jobType: "CRAWL_TOOL",
        status: "PENDING",
        metadata: { trigger: "scheduler", schedule: source.schedule },
      },
    });

    try {
      await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_TOOL, source.slug, {
        sourceId: source.id,
        crawlJobId: crawlJob.id,
      });

      await prisma.crawlSource.update({
        where: { id: source.id },
        data: {
          nextRunAt: computeNextRunAt(source.schedule, source.crawlIntervalMinutes, now),
        },
      });

      enqueued += 1;
      log.info("scheduled crawl enqueued", { sourceId: source.id, slug: source.slug });
    } catch (error) {
      await prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Queue unavailable",
        },
      });
      log.error("failed to enqueue scheduled crawl", { sourceId: source.id, error });
    }
  }

  return enqueued;
}

export async function pollAutomationSchedules(): Promise<Record<string, unknown>> {
  const now = Date.now();
  const result: Record<string, unknown> = {};

  if (now - lastDailyAutomationAt >= DAY_MS) {
    result.daily = await runDailyAutomationPoll(prisma);
    lastDailyAutomationAt = now;
    log.info("daily automation poll complete", { daily: result.daily });
  }

  const day = new Date().getDay();
  if (day === 1 && now - lastWeeklyAutomationAt >= DAY_MS) {
    result.weekly = await runWeeklyAutomationPoll(prisma);
    lastWeeklyAutomationAt = now;
    log.info("weekly automation poll complete", { weekly: result.weekly });
  }

  return result;
}

async function main(): Promise<void> {
  getEnv();
  log.info("Crawler scheduler started", { intervalMs: POLL_INTERVAL_MS });

  const tick = async () => {
    try {
      const count = await pollDueSources();
      const automation = await pollAutomationSchedules();
      if (count > 0) {
        log.info("scheduler tick complete", { crawl: count, automation });
      }
    } catch (error) {
      log.error("scheduler tick failed", { error });
    }
  };

  await tick();
  const timer = setInterval(() => void tick(), POLL_INTERVAL_MS);

  const shutdown = async (signal: string) => {
    log.info("Scheduler shutting down", { signal });
    clearInterval(timer);
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  log.error("Scheduler failed to start", { error });
  process.exit(1);
});
