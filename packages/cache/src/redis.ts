import { createLogger } from "@ai-tool-cms/logger";

const log = createLogger({ service: "cache" });

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: string, ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  ping(): Promise<string>;
};

let client: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient | null> {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const mod = await import("ioredis");
    const RedisCtor = mod.default as unknown as new (url: string, opts?: object) => RedisClient;
    client = new RedisCtor(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    await client.ping();
    log.info("Redis cache connected");
    return client;
  } catch (error) {
    log.warn("Redis unavailable — cache disabled", { error });
    return null;
  }
}

export async function redisPing(): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
