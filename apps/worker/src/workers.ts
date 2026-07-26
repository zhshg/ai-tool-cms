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
import {
  registerFrameworkAdapters,
  registerProductionSiteAdapters,
} from "@ai-tool-cms/crawler-core";
import { getEnv } from "@ai-tool-cms/config";
import {
  createWorkerContext,
  appendJobStep,
  ingestDetailReturningToolId,
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
  parseDetail,
  parseListItem,
  resolveStructuredAdapter,
} from "./crawl-runtime";
import { enqueueAiJob, type AiQueueName } from "@ai-tool-cms/queue";
import { startAiPipeline, type EnqueueFn } from "@ai-tool-cms/ai";
import { persistCrawlCategories } from "@ai-tool-cms/growth";
import { startToolPublishWorkflow } from "@ai-tool-cms/workflow";

const log = createLogger({ service: "crawl-worker" });
const workerConnection = () => createRedisConnection() as never;
const CRAWL_STAGE_TIMEOUT_MS = 120_000;

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = CRAWL_STAGE_TIMEOUT_MS,
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

registerFrameworkAdapters();
if (getEnv().CRAWLER_ENABLE_PRODUCTION_ADAPTERS) {
  registerProductionSiteAdapters();
  log.info("Production site adapters enabled");
}

const enqueueAiPipelineJob: EnqueueFn = (queueName, jobName, payload) =>
  enqueueAiJob(queueName as AiQueueName, jobName, payload);

export function startCrawlToolWorker(): Worker<CrawlToolJobPayload> {
  return new Worker<CrawlToolJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_TOOL,
    async (job: Job<CrawlToolJobPayload>) => {
      const { sourceId, crawlJobId } = job.data;
      log.info("crawl-tool job started", { sourceId, crawlJobId });

      await markJobRunning(crawlJobId);

      try {
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
        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "running",
          sourceId,
          adapterType: source.adapterType,
        });
        const { items } = await withTimeout(
          adapter.getTools(ctx),
          `crawl-tool:${source.adapterType}:getTools`,
        );

        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "success",
          count: items.length,
        });

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
      } catch (error) {
        const message = error instanceof Error ? error.message : "crawl-tool failed";
        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "failed",
          message,
        });
        await markJobFailed(crawlJobId, message);
        throw error;
      }
    },
    { connection: workerConnection(), concurrency: 2 },
  );
}

export function startCrawlCategoryWorker(): Worker<CrawlCategoryJobPayload> {
  return new Worker<CrawlCategoryJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_CATEGORY,
    async (job: Job<CrawlCategoryJobPayload>) => {
      const { sourceId, crawlJobId } = job.data;
      try {
        const source = await prisma.crawlSource.findFirst({
          where: { id: sourceId, deletedAt: null },
        });
        if (!source) {
          await markJobFailed(crawlJobId, "Source not found");
          return;
        }

        const adapter = await resolveStructuredAdapter(source.adapterType);
        const ctx = createWorkerContext(source.adapterType, crawlJobId);
        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "running",
          sourceId,
          adapterType: source.adapterType,
        });
        const categories = await withTimeout(
          adapter.getCategories(ctx),
          `crawl-category:${source.adapterType}:getCategories`,
        );
        await persistCrawlCategories(prisma, categories);
        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "success",
          count: categories.length,
          message: "categories persisted",
        });
        log.info("categories fetched and persisted", { sourceId, categories: categories.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : "crawl-category failed";
        await appendJobStep(crawlJobId, {
          phase: "LIST",
          status: "failed",
          message,
        });
        await markJobFailed(crawlJobId, message);
        throw error;
      }
    },
    { connection: workerConnection(), concurrency: 3 },
  );
}

export function startCrawlDetailWorker(): Worker<CrawlDetailJobPayload> {
  return new Worker<CrawlDetailJobPayload>(
    CRAWL_QUEUE_NAMES.CRAWL_DETAIL,
    async (job: Job<CrawlDetailJobPayload>) => {
      const { sourceId, crawlJobId, item } = job.data;
      try {
        const source = await prisma.crawlSource.findFirst({
          where: { id: sourceId, deletedAt: null },
        });
        if (!source) {
          await markJobFailed(crawlJobId, "Source not found");
          return;
        }

        const crawlJobRecord = await prisma.crawlJob.findUnique({ where: { id: crawlJobId } });
        const metadata = (crawlJobRecord?.metadata ?? {}) as Record<string, unknown>;
        const completed = Number(metadata.completedDetails ?? 0);

        const adapter = await resolveStructuredAdapter(source.adapterType);
        const ctx = createWorkerContext(source.adapterType, crawlJobId);
        const listItem = parseListItem(item);
        await appendJobStep(crawlJobId, {
          phase: "DETAIL",
          status: "running",
          externalId: listItem.externalId,
          name: listItem.name,
          website: listItem.website,
        });
        const detail = await withTimeout(
          adapter.getDetail(ctx, listItem),
          `crawl-detail:${source.adapterType}:getDetail`,
        );

        if (detail) {
          await appendJobStep(crawlJobId, {
            phase: "DETAIL",
            status: "success",
            externalId: detail.externalId,
            name: detail.name,
            website: detail.website || detail.url,
          });
          const enrichedDetail = {
            ...detail,
            categoryExternalIds: detail.categoryExternalIds ?? listItem.categoryExternalIds,
          };

          await enqueueCrawlJob(CRAWL_QUEUE_NAMES.NORMALIZE, detail.externalId, {
            sourceId,
            crawlJobId,
            detail: enrichedDetail as unknown as Record<string, unknown>,
          });

          if (detail.logoUrl) {
            await enqueueCrawlJob(CRAWL_QUEUE_NAMES.CRAWL_IMAGE, detail.externalId, {
              sourceId,
              crawlJobId,
              logoUrl: detail.logoUrl,
              toolPayload: detail as unknown as Record<string, unknown>,
            });
          }
        }

        const nextCompleted = completed + 1;

        await prisma.crawlJob.update({
          where: { id: crawlJobId },
          data: {
            metadata: {
              ...metadata,
              completedDetails: nextCompleted,
            },
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "crawl-detail failed";
        await appendJobStep(crawlJobId, {
          phase: "DETAIL",
          status: "failed",
          message,
        });
        await markJobFailed(crawlJobId, message);
        throw error;
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
      try {
        const source = await prisma.crawlSource.findFirst({
          where: { id: sourceId, deletedAt: null },
        });
        if (!source) {
          await markJobFailed(crawlJobId, "Source not found");
          return;
        }

        const adapter = await resolveStructuredAdapter(source.adapterType);
        const parsed = parseDetail(detail);
        await appendJobStep(crawlJobId, {
          phase: "NORMALIZE",
          status: "running",
          externalId: parsed.externalId,
          name: parsed.name,
          website: parsed.website,
        });
        const ingested = await ingestDetailReturningToolId(parsed, adapter);
        const stats = ingested
          ? { created: ingested.created ? 1 : 0, updated: ingested.created ? 0 : 1 }
          : { created: 0, updated: 0 };

        if (ingested?.toolId) {
          const workflowRunId = await startToolPublishWorkflow(
            prisma,
            ingested.toolId,
            "crawl-normalize",
          );
          await startAiPipeline(ingested.toolId, enqueueAiPipelineJob);
          log.info("AI pipeline enqueued after normalize", {
            toolId: ingested.toolId,
            crawlJobId,
            workflowRunId,
          });
        }

        await appendJobStep(crawlJobId, {
          phase: "NORMALIZE",
          status: "success",
          externalId: parsed.externalId,
          toolId: ingested?.toolId ?? null,
          created: Boolean(ingested?.created),
        });

        const crawlJobRecord = await prisma.crawlJob.findUnique({ where: { id: crawlJobId } });
        const metadata = (crawlJobRecord?.metadata ?? {}) as Record<string, unknown>;
        const completed = Number(metadata.completedDetails ?? 0);

        await prisma.crawlJob.update({
          where: { id: crawlJobId },
          data: {
            itemsFound: { increment: 1 },
            itemsCreated: { increment: stats.created },
            itemsUpdated: { increment: stats.updated },
            metadata: {
              ...metadata,
              completedDetails: completed + 1,
            },
          },
        });

        if (completed + 1 >= Number(metadata.expectedDetails ?? 0)) {
          await markJobSucceeded(crawlJobId, sourceId, {
            itemsFound: Number(metadata.expectedDetails ?? 0),
            itemsCreated: Number(metadata.createdDetails ?? 0),
            itemsUpdated: Number(metadata.updatedDetails ?? 0),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "normalize failed";
        await appendJobStep(crawlJobId, {
          phase: "NORMALIZE",
          status: "failed",
          message,
        });
        await markJobFailed(crawlJobId, message);
        throw error;
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
