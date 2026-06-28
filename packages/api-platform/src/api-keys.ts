import { createHash, randomBytes } from "node:crypto";

export const API_KEY_PREFIX = "atcms_";
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;
export const DEFAULT_MONTHLY_QUOTA = 10_000;

export const API_SCOPES = ["search:read", "tools:read", "categories:read", "compare:read"] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export type GeneratedApiKey = {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
};

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${API_KEY_PREFIX}${secret}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes("*");
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  keyId: string,
  limitPerMinute = DEFAULT_RATE_LIMIT_PER_MINUTE,
): RateLimitResult {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(keyId);
  const windowMs = 60_000;

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(keyId, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limitPerMinute - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (bucket.count >= limitPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.resetAt),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - bucket.count,
    resetAt: new Date(bucket.resetAt),
  };
}
