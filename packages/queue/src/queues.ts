import { Queue, type JobsOptions, type QueueOptions } from "bullmq";
import { createRedisConnection } from "./connection";
import { CRAWL_QUEUE_NAMES, type CrawlQueueName, type CrawlQueuePayloadMap } from "./types";

function createQueueOptions(): QueueOptions {
  return {
    connection: createRedisConnection() as QueueOptions["connection"],
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
    },
  };
}

const queueCache = new Map<CrawlQueueName, Queue>();

export function getCrawlQueue<T extends CrawlQueueName>(name: T): Queue<CrawlQueuePayloadMap[T]> {
  const existing = queueCache.get(name);
  if (existing) {
    return existing as Queue<CrawlQueuePayloadMap[T]>;
  }

  const queue = new Queue<CrawlQueuePayloadMap[T]>(name, createQueueOptions());
  queueCache.set(name, queue as Queue);
  return queue;
}

export function getAllCrawlQueues(): Queue[] {
  return Object.values(CRAWL_QUEUE_NAMES).map((name) => getCrawlQueue(name));
}

export async function enqueueCrawlJob<T extends CrawlQueueName>(
  queueName: T,
  jobName: string,
  payload: CrawlQueuePayloadMap[T],
  options?: JobsOptions,
): Promise<string> {
  const job = await getCrawlQueue(queueName).add(jobName as never, payload as never, options);
  return job.id ?? jobName;
}

export async function getQueueStats(queueName: CrawlQueueName) {
  const queue = getCrawlQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}

export async function getAllQueueStats() {
  const entries = await Promise.all(
    Object.values(CRAWL_QUEUE_NAMES).map(
      async (name) => [name, await getQueueStats(name)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queueCache.values()].map((queue) => queue.close()));
  queueCache.clear();
}
