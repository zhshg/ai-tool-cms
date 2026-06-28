import type { CrawlCursor, CrawlRunResult } from "./types";

export type CrawlQueueJob = {
  id: string;
  sourceId: string;
  cursor?: CrawlCursor;
  enqueuedAt: string;
  metadata?: Record<string, unknown>;
};

export type CrawlQueue = {
  enqueue(job: Omit<CrawlQueueJob, "enqueuedAt">): Promise<CrawlQueueJob>;
  dequeue(): Promise<CrawlQueueJob | null>;
  ack(jobId: string, result: CrawlRunResult): Promise<void>;
  fail(jobId: string, error: unknown): Promise<void>;
  size(): Promise<number>;
};

/** In-memory FIFO queue for tests and single-process workers. */
export class MemoryCrawlQueue implements CrawlQueue {
  private readonly pending: CrawlQueueJob[] = [];
  private readonly completed = new Map<string, CrawlRunResult>();
  private readonly failed = new Map<string, unknown>();

  async enqueue(job: Omit<CrawlQueueJob, "enqueuedAt">): Promise<CrawlQueueJob> {
    const record: CrawlQueueJob = { ...job, enqueuedAt: new Date().toISOString() };
    this.pending.push(record);
    return record;
  }

  async dequeue(): Promise<CrawlQueueJob | null> {
    return this.pending.shift() ?? null;
  }

  async ack(jobId: string, result: CrawlRunResult): Promise<void> {
    this.completed.set(jobId, result);
  }

  async fail(jobId: string, error: unknown): Promise<void> {
    this.failed.set(jobId, error);
  }

  async size(): Promise<number> {
    return this.pending.length;
  }

  getCompleted(jobId: string): CrawlRunResult | undefined {
    return this.completed.get(jobId);
  }

  getFailure(jobId: string): unknown {
    return this.failed.get(jobId);
  }
}
