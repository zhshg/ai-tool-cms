import type { RetryConfig } from "./types";
import { isRetryableStatus } from "./Response";

export type RetryContext = {
  attempt: number;
  maxAttempts: number;
};

export async function retry<T>(
  fn: (context: RetryContext) => Promise<T>,
  config: RetryConfig,
  shouldRetry: (error: unknown, context: RetryContext) => boolean = defaultShouldRetry,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const context: RetryContext = { attempt, maxAttempts: config.maxAttempts };
    try {
      return await fn(context);
    } catch (error) {
      lastError = error;
      if (attempt >= config.maxAttempts || !shouldRetry(error, context)) {
        throw error;
      }
      const delayMs = computeBackoffDelay(attempt, config);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

export function computeBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * config.baseDelayMs * 0.2);
  return Math.min(config.maxDelayMs, exponential + jitter);
}

export function defaultShouldRetry(error: unknown, context: RetryContext): boolean {
  if (context.attempt >= context.maxAttempts) {
    return false;
  }

  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: number }).status);
    if (!Number.isNaN(status)) {
      return isRetryableStatus(status);
    }
  }

  return true;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
