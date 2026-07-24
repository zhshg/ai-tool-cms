import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { getRedisClient } from "@ai-tool-cms/cache";

const TTL_BUFFER_MS = 1000;

type ThrottlerRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const redis = await getRedisClient();
    if (!redis) {
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    const counterKey = this.buildCounterKey(throttlerName, key);
    const blockKey = this.buildBlockKey(throttlerName, key);
    const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
    const blockSeconds = Math.max(1, Math.ceil(blockDuration / 1000));
    const client = redis as any;

    const blockedTtl = await client.pttl(blockKey);
    if (blockedTtl > 0) {
      const totalHits = Number(await client.get(counterKey)) || limit + 1;
      return {
        totalHits,
        timeToExpire: Math.max(0, ttl),
        isBlocked: true,
        timeToBlockExpire: blockedTtl,
      };
    }

    const totalHits = await client.incr(counterKey);
    if (totalHits === 1) {
      await client.expire(counterKey, ttlSeconds);
    }

    const timeToExpire = await client.pttl(counterKey);
    if (totalHits > limit) {
      await client.setnx(blockKey, "1");
      await client.expire(blockKey, blockSeconds);
      const timeToBlockExpire = await client.pttl(blockKey);
      return {
        totalHits,
        timeToExpire: timeToExpire > 0 ? timeToExpire : ttl + TTL_BUFFER_MS,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttl + TTL_BUFFER_MS,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private buildCounterKey(throttlerName: string, key: string) {
    return `throttle:${throttlerName}:count:${key}`;
  }

  private buildBlockKey(throttlerName: string, key: string) {
    return `throttle:${throttlerName}:block:${key}`;
  }
}
