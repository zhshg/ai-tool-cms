import type { RateLimitConfig } from "./types";

export type RateLimiter = {
  acquire(): Promise<void>;
  getConfig(): RateLimitConfig;
};

/** Simple delay-based rate limiter (politeness / robots compliance). */
export class DelayRateLimiter implements RateLimiter {
  private lastRequestAt = 0;
  private readonly window: number[] = [];

  constructor(private readonly config: RateLimitConfig) {}

  getConfig(): RateLimitConfig {
    return this.config;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    if (this.config.maxRequestsPerMinute) {
      const windowStart = now - 60_000;
      while (this.window.length > 0 && this.window[0]! < windowStart) {
        this.window.shift();
      }
      if (this.window.length >= this.config.maxRequestsPerMinute) {
        const waitMs = this.window[0]! + 60_000 - now;
        await sleep(waitMs);
      }
      this.window.push(Date.now());
    }

    const elapsed = now - this.lastRequestAt;
    const waitMs = Math.max(0, this.config.minDelayMs - elapsed);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    this.lastRequestAt = Date.now();
  }
}

export function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  return new DelayRateLimiter({
    minDelayMs: config?.minDelayMs ?? 1_000,
    maxRequestsPerMinute: config?.maxRequestsPerMinute,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
