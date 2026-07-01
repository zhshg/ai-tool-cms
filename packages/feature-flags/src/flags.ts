import { createHash } from "node:crypto";
import type { FeatureFlag, PrismaClient } from "@ai-tool-cms/database";

export type FlagContext = {
  locale?: string;
  region?: string;
  segment?: string;
  userId?: string;
};

export async function isFeatureEnabled(
  prisma: PrismaClient,
  key: string,
  ctx: FlagContext = {},
): Promise<boolean> {
  const flag = await prisma.featureFlag.findFirst({
    where: { key, deletedAt: null },
  });
  if (!flag || !flag.enabled) return false;

  if (flag.locales.length && ctx.locale && !flag.locales.includes(ctx.locale)) {
    return false;
  }
  if (flag.regions.length && ctx.region && !flag.regions.includes(ctx.region)) {
    return false;
  }
  if (flag.segments.length && ctx.segment && !flag.segments.includes(ctx.segment)) {
    return false;
  }

  if (flag.rollout >= 100) return true;
  if (flag.rollout <= 0) return false;

  const bucket = hashBucket(key, ctx.userId ?? ctx.locale ?? "anonymous");
  return bucket < flag.rollout;
}

function hashBucket(key: string, subject: string): number {
  const hash = createHash("sha256").update(`${key}:${subject}`).digest();
  return (hash[0]! / 255) * 100;
}

export async function listFeatureFlags(prisma: PrismaClient): Promise<FeatureFlag[]> {
  return prisma.featureFlag.findMany({
    where: { deletedAt: null },
    orderBy: { key: "asc" },
  });
}

export async function upsertFeatureFlag(
  prisma: PrismaClient,
  input: {
    key: string;
    name: string;
    enabled?: boolean;
    rollout?: number;
    locales?: string[];
    regions?: string[];
    description?: string;
  },
): Promise<FeatureFlag> {
  return prisma.featureFlag.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      name: input.name,
      enabled: input.enabled ?? false,
      rollout: input.rollout ?? 100,
      locales: input.locales ?? [],
      regions: input.regions ?? [],
      description: input.description,
    },
    update: {
      name: input.name,
      enabled: input.enabled,
      rollout: input.rollout,
      locales: input.locales,
      regions: input.regions,
      description: input.description,
    },
  });
}
