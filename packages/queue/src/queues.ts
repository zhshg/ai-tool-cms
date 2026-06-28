import { Queue, type JobsOptions, type QueueOptions } from "bullmq";
import { createRedisConnection } from "./connection";
import {
  AI_QUEUE_NAMES,
  CRAWL_QUEUE_NAMES,
  GROWTH_QUEUE_NAMES,
  PLATFORM_QUEUE_NAMES,
  SEARCH_QUEUE_NAMES,
  type AiQueueName,
  type AiQueuePayloadMap,
  type CrawlQueueName,
  type CrawlQueuePayloadMap,
  type GrowthQueueName,
  type GrowthQueuePayloadMap,
  type PlatformQueueName,
  type PlatformQueuePayloadMap,
  type SearchQueueName,
  type SearchQueuePayloadMap,
} from "./types";

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

const crawlQueueCache = new Map<CrawlQueueName, Queue>();
const aiQueueCache = new Map<AiQueueName, Queue>();
const growthQueueCache = new Map<GrowthQueueName, Queue>();
const searchQueueCache = new Map<SearchQueueName, Queue>();
const platformQueueCache = new Map<PlatformQueueName, Queue>();

export function getCrawlQueue<T extends CrawlQueueName>(name: T): Queue<CrawlQueuePayloadMap[T]> {
  const existing = crawlQueueCache.get(name);
  if (existing) {
    return existing as Queue<CrawlQueuePayloadMap[T]>;
  }

  const queue = new Queue<CrawlQueuePayloadMap[T]>(name, createQueueOptions());
  crawlQueueCache.set(name, queue as Queue);
  return queue;
}

export function getAiQueue<T extends AiQueueName>(name: T): Queue<AiQueuePayloadMap[T]> {
  const existing = aiQueueCache.get(name);
  if (existing) {
    return existing as Queue<AiQueuePayloadMap[T]>;
  }

  const queue = new Queue<AiQueuePayloadMap[T]>(name, createQueueOptions());
  aiQueueCache.set(name, queue as Queue);
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

export async function enqueueAiJob<T extends AiQueueName>(
  queueName: T,
  jobName: string,
  payload: AiQueuePayloadMap[T],
  options?: JobsOptions,
): Promise<string> {
  const job = await getAiQueue(queueName).add(jobName as never, payload as never, options);
  return job.id ?? jobName;
}

export function getGrowthQueue<T extends GrowthQueueName>(
  name: T,
): Queue<GrowthQueuePayloadMap[T]> {
  const existing = growthQueueCache.get(name);
  if (existing) {
    return existing as Queue<GrowthQueuePayloadMap[T]>;
  }

  const queue = new Queue<GrowthQueuePayloadMap[T]>(name, createQueueOptions());
  growthQueueCache.set(name, queue as Queue);
  return queue;
}

export function getAllGrowthQueues(): Queue[] {
  return Object.values(GROWTH_QUEUE_NAMES).map((name) => getGrowthQueue(name));
}

export async function enqueueGrowthJob<T extends GrowthQueueName>(
  queueName: T,
  jobName: string,
  payload: GrowthQueuePayloadMap[T],
  options?: JobsOptions,
): Promise<string> {
  const job = await getGrowthQueue(queueName).add(jobName as never, payload as never, options);
  return job.id ?? jobName;
}

export async function getGrowthQueueStats(queueName: GrowthQueueName) {
  const queue = getGrowthQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}

export async function getAllGrowthQueueStats() {
  const entries = await Promise.all(
    Object.values(GROWTH_QUEUE_NAMES).map(
      async (name) => [name, await getGrowthQueueStats(name)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export function getSearchQueue<T extends SearchQueueName>(
  name: T,
): Queue<SearchQueuePayloadMap[T]> {
  const existing = searchQueueCache.get(name);
  if (existing) {
    return existing as Queue<SearchQueuePayloadMap[T]>;
  }

  const queue = new Queue<SearchQueuePayloadMap[T]>(name, createQueueOptions());
  searchQueueCache.set(name, queue as Queue);
  return queue;
}

export function getAllSearchQueues(): Queue[] {
  return Object.values(SEARCH_QUEUE_NAMES).map((name) => getSearchQueue(name));
}

export async function enqueueSearchJob<T extends SearchQueueName>(
  queueName: T,
  jobName: string,
  payload: SearchQueuePayloadMap[T],
  options?: JobsOptions,
): Promise<string> {
  const job = await getSearchQueue(queueName).add(jobName as never, payload as never, options);
  return job.id ?? jobName;
}

export async function getSearchQueueStats(queueName: SearchQueueName) {
  const queue = getSearchQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}

export async function getAllSearchQueueStats() {
  const entries = await Promise.all(
    Object.values(SEARCH_QUEUE_NAMES).map(
      async (name) => [name, await getSearchQueueStats(name)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export function getPlatformQueue<T extends PlatformQueueName>(
  name: T,
): Queue<PlatformQueuePayloadMap[T]> {
  const existing = platformQueueCache.get(name);
  if (existing) {
    return existing as Queue<PlatformQueuePayloadMap[T]>;
  }

  const queue = new Queue<PlatformQueuePayloadMap[T]>(name, createQueueOptions());
  platformQueueCache.set(name, queue as Queue);
  return queue;
}

export function getAllPlatformQueues(): Queue[] {
  return Object.values(PLATFORM_QUEUE_NAMES).map((name) => getPlatformQueue(name));
}

export async function enqueuePlatformJob<T extends PlatformQueueName>(
  queueName: T,
  jobName: string,
  payload: PlatformQueuePayloadMap[T],
  options?: JobsOptions,
): Promise<string> {
  const job = await getPlatformQueue(queueName).add(jobName as never, payload as never, options);
  return job.id ?? jobName;
}

export async function getPlatformQueueStats(queueName: PlatformQueueName) {
  const queue = getPlatformQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}

export async function getAllPlatformQueueStats() {
  const entries = await Promise.all(
    Object.values(PLATFORM_QUEUE_NAMES).map(
      async (name) => [name, await getPlatformQueueStats(name)] as const,
    ),
  );
  return Object.fromEntries(entries);
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

export function getAllAiQueues(): Queue[] {
  return Object.values(AI_QUEUE_NAMES).map((name) => getAiQueue(name));
}

export async function getAllAiQueueStats() {
  const entries = await Promise.all(
    Object.values(AI_QUEUE_NAMES).map(async (name) => [name, await getAiQueueStats(name)] as const),
  );
  return Object.fromEntries(entries);
}

export async function getAiQueueStats(queueName: AiQueueName) {
  const queue = getAiQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + delayed };
}

export async function closeAllQueues(): Promise<void> {
  const all = [
    ...crawlQueueCache.values(),
    ...aiQueueCache.values(),
    ...growthQueueCache.values(),
    ...searchQueueCache.values(),
    ...platformQueueCache.values(),
  ];
  await Promise.all(all.map((queue) => queue.close()));
  crawlQueueCache.clear();
  aiQueueCache.clear();
  growthQueueCache.clear();
  searchQueueCache.clear();
  platformQueueCache.clear();
}
