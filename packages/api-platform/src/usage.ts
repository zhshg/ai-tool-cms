import type { PrismaClient } from "@ai-tool-cms/database";
import { hashApiKey, hasScope, type ApiScope } from "./api-keys";

export type ValidatedApiKey = {
  id: string;
  userId: string;
  scopes: string[];
  name: string;
};

export async function validateApiKey(
  prisma: PrismaClient,
  rawKey: string,
  requiredScope?: ApiScope,
): Promise<ValidatedApiKey | null> {
  if (!rawKey.startsWith("atcms_")) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const record = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      keyPrefix,
      status: "ACTIVE",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!record) {
    return null;
  }

  if (requiredScope && !hasScope(record.scopes, requiredScope)) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: record.id,
    userId: record.userId,
    scopes: record.scopes,
    name: record.name,
  };
}

export async function logApiKeyUsage(
  prisma: PrismaClient,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number,
): Promise<void> {
  await prisma.apiKeyUsageLog.create({
    data: { apiKeyId, endpoint, method, statusCode, durationMs },
  });
}

export async function getApiKeyUsageStats(prisma: PrismaClient, apiKeyId: string, since?: Date) {
  const sinceDate = since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, byEndpoint] = await Promise.all([
    prisma.apiKeyUsageLog.count({
      where: { apiKeyId, createdAt: { gte: sinceDate } },
    }),
    prisma.apiKeyUsageLog.groupBy({
      by: ["endpoint"],
      where: { apiKeyId, createdAt: { gte: sinceDate } },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: "desc" } },
      take: 10,
    }),
  ]);

  return {
    total,
    topEndpoints: byEndpoint.map((row) => ({
      endpoint: row.endpoint,
      count: row._count.endpoint,
    })),
  };
}
