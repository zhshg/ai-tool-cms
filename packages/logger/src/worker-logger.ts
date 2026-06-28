import { createLogger } from "./create-logger";
import type { Logger, LoggerOptions } from "./types";
import { LoggerKind } from "./types";

export interface WorkerLogContext {
  jobId: string;
  queueName: string;
  attempt?: number;
  workerName?: string;
}

export function createWorkerLogger(
  context: WorkerLogContext,
  options: LoggerOptions = { service: "worker" },
): Logger {
  return createLogger(options).child({
    kind: LoggerKind.Worker,
    ...context,
  });
}

export function logJobStart(
  logger: Logger,
  context: WorkerLogContext,
  payloadSummary?: Record<string, unknown>,
): void {
  logger.info("Background job started", {
    event: "job.start",
    jobId: context.jobId,
    queueName: context.queueName,
    attempt: context.attempt,
    workerName: context.workerName,
    payload: payloadSummary,
  });
}

export function logJobComplete(
  logger: Logger,
  context: WorkerLogContext,
  durationMs: number,
): void {
  logger.info("Background job completed", {
    event: "job.complete",
    jobId: context.jobId,
    queueName: context.queueName,
    attempt: context.attempt,
    workerName: context.workerName,
    durationMs,
  });
}

export function logJobFailed(
  logger: Logger,
  context: WorkerLogContext,
  error: unknown,
  durationMs?: number,
): void {
  logger.error("Background job failed", {
    event: "job.failed",
    jobId: context.jobId,
    queueName: context.queueName,
    attempt: context.attempt,
    workerName: context.workerName,
    durationMs,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
