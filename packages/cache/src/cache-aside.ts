import { createHash } from "node:crypto";
import { getRedisClient } from "./redis";

export type CacheOptions = {
  ttlSeconds?: number;
  prefix?: string;
};

const DEFAULT_TTL = 60;

export function cacheKey(parts: string[], prefix = "atcms"): string {
  const raw = parts.join(":");
  if (raw.length <= 200) return `${prefix}:${raw}`;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return `${prefix}:${hash}`;
}

/** Cache-aside: read-through with JSON serialization */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.del(key);
}

export async function withCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
  const cached = await cacheGet<T>(fullKey);
  if (cached !== null) return cached;
  const value = await loader();
  await cacheSet(fullKey, value, options.ttlSeconds ?? DEFAULT_TTL);
  return value;
}
