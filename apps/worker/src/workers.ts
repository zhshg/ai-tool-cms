import type { Job } from "bullmq";
import { Worker } from "bullmq";
import {
  CRAWL_QUEUE_NAMES,
  enqueueCrawlJob,
  type CrawlCategoryJobPayload,
  type CrawlDetailJobPayload,
  type CrawlImageJobPayload,
  type CrawlToolJobPayload,
  type NormalizeJobPayload,
} from "@ai-tool-cms/queue";
import { createRedisConnection } from "@ai-tool-cms/queue";
import { prisma } from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import { registerSiteAdapters } from "@ai-tool-cms/crawler-core";
import {
  createWorkerContext,
  ingestDetails,
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
  parseDetail,
  parseListItem,
  resolveStructuredAdapter,
} from "./crawl-runtime";

const log = createLogger({ service: "crawl-worker" });
const workerConnection = () => createRedisConnection() as never;

registerSiteAdapters();

export function startCrawlToolWorker(): Worker<CrawlToolJobPayload> {
  return new Worker<CrawlToolJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_TOOL,
    async (job: Job<CrawlToolJobPayload>) => {
      const { sourceId, crawlJobId } = job.data;
      log.info("crawl-tool job started", { sourceId, crawlJobId });

      await markJobRunning(crawlJobId);

      const source = await prisma.crawlSource.findFirst({
        where: { id: sourceId, deletedAt: null },
      });
      if (!source) {
        await markJobFailed(crawlJobId, "Source not found");
        return;
      }

      await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_CATEGORY, "categories", {
        sourceId,
        crawlJobId,
      });

      const adapter = await resolveStructuredAdapter(source.adapterType);
      const ctx = createWorkerContext(source.adapterType, crawlJobId);
      const { items } = await adapter.getTools(ctx);

      await prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          metadata: {
            trigger: "crawl-tool",
            expectedDetails: items.length,
            completedDetails: 0,
          },
        },
      });

      if (items.length === 0) {
        await markJobSucceeded(crawlJobId, sourceId, {
          itemsFound: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
        });
        return;
      }

      for (const item of items) {
        await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_DETAIL, item.externalId, {
          sourceId,
          crawlJobId,
          externalId: item.externalId,
          item: item as unknown as Record<string, unknown>,
        });
      }

      log.info("crawl-tool enqueued detail jobs", { count: items.length });
    },
    { connection: workerConnection(), concurrency: 2 },
  );
}

export function startCrawlCategoryWorker(): Worker<CrawlCategoryJobPayload> {
  return new Worker<CrawlCategoryJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_CATEGORY,
    async (job: Job<CrawlCategoryJobPayload>) => {
      const { sourceId, crawlJobId } = job.data;
      const source = await prisma.crawlSource.findFirst({
        where: { id: sourceId, deletedAt: null },
      });
      if (!source) return;

      const adapter = await resolveStructuredAdapter(source.adapterType);
      const ctx = createWorkerContext(source.adapterType, crawlJobId);
      const categories = await adapter.getCategories(ctx);
      log.info("categories fetched", { sourceId, categories: categories.length });
    },
    { connection: workerConnection(), concurrency: 3 },
  );
}

export function startCrawlDetailWorker(): Worker<CrawlDetailJobPayload> {
  return new Worker<CrawlDetailJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_DETAIL,
    async (job: Job<CrawlDetailJobPayload>) => {
      const { sourceId, crawlJobId, item } = job.data;
      const source = await prisma.crawlSource.findFirst({
        where: { id: sourceId, deletedAt: null },
      });
      if (!source) return;

      const adapter = await resolveStructuredAdapter(source.adapterType);
      const ctx = createWorkerContext(source.adapterType, crawlJobId);
      const listItem = parseListItem(item);
      const detail = await adapter.getDetail(ctx, listItem);
      if (!detail) return;

      await enqueueCrawlJob(CRAWL_QUEUE_NAMES.NORMALIZE, detail.externalId, {
        sourceId,
        crawlJobId,
        detail: detail as unknown as Record<string, unknown>,
      });

      if (detail.logoUrl) {
        await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_IMAGE, detail.externalId, {
          sourceId,
          crawlJobId,
          logoUrl: detail.logoUrl,
          toolPayload: detail as unknown as Record<string, unknown>,
        });
      }
    },
    { connection: workerConnection(), concurrency: 5 },
  );
}

export function startCrawlImageWorker(): Worker<CrawlImageJobPayload> {
  return new Worker<CrawlImageJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_IMAGE,
    async (job: Job<CrawlImageJobPayload>) => {
      log.debug("crawl-image placeholder", { logoUrl: job.data.logoUrl });
    },
    { connection: workerConnection(), concurrency: 3 },
  );
}

export function startNormalizeWorker(): Worker<NormalizeJobPayload> {
  return new Worker<NormalizeJobPayload>(
    CRAWL_QUEUE_NAMES.NORMALIZE,
    async (job: Job<NormalizeJobPayload>) => {
      const { sourceId, crawlJobId, detail } = job.data;
      const source = await prisma.crawlSource.findFirst({
        where: { id: sourceId, deletedAt: null },
      });
      if (!source) return;

      const adapter = await resolveStructuredAdapter(source.adapterType);
      const parsed = parseDetail(detail);
      const stats = await ingestDetails([parsed], adapter);

      const crawlJobRecord = await prisma.crawlJob.findUnique({ where: { id: crawlJobId } });
      const metadata = (crawlJobRecord?.metadata ?? {}) as Record<string, unknown>;
      const expected = Number(metadata.expectedDetails ?? 0);
      const completed = Number(metadata.completedDetails ?? 0) + 1;

      await prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          itemsFound: { increment: 1 },
          itemsCreated: { increment: stats.created },
          itemsUpdated: { increment: stats.updated },
          metadata: {
            ...metadata,
            completedDetails: completed,
          },
        },
      });

      if (expected > 0 && completed >= expected) {
        await markJobSucceeded(crawlJobId, sourceId, {});
      }
    },
    { connection: workerConnection(), concurrency: 5 },
  );
}

export function startAllWorkers(): Worker[] {
  return [
    startCrawlToolWorker(),
    startCrawlCategoryWorker(),
    startCrawlDetailWorker(),
    startCrawlImageWorker(),
    startNormalizeWorker(),
  ];
}
