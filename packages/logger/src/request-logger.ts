import { createLogger } from "./create-logger";
import type { Logger, LoggerOptions } from "./types";
import { LoggerKind } from "./types";

export interface RequestLogContext {
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
}

export function createRequestLogger(
  context: RequestLogContext,
  options: LoggerOptions = { service: "api" },
): Logger {
  return createLogger(options).child({
    kind: LoggerKind.Request,
    ...context,
  });
}

export function logRequestStart(logger: Logger, context: RequestLogContext): void {
  logger.info("HTTP request started", {
    event: "request.start",
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId,
  });
}

export function logRequestComplete(
  logger: Logger,
  context: RequestLogContext & { statusCode: number; durationMs: number },
): void {
  logger.info("HTTP request completed", {
    event: "request.complete",
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    statusCode: context.statusCode,
    durationMs: context.durationMs,
    userId: context.userId,
  });
}

export function logRequestError(
  logger: Logger,
  context: RequestLogContext,
  error: unknown,
): void {
  logger.error("HTTP request failed", {
    event: "request.error",
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
