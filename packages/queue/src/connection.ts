import IORedis from "ioredis";
import { getEnv } from "@ai-tool-cms/config";

export function resolveQueueRedisUrl(): string {
  const env = getEnv();
  return env.QUEUE_URL ?? env.REDIS_URL ?? "redis://localhost:6379";
}

export function createRedisConnection(): IORedis {
  return new IORedis(resolveQueueRedisUrl(), {
    maxRetriesPerRequest: null,
  });
}
