import type { PrismaClient } from "@ai-tool-cms/database";
import type { AffiliateStats } from "./types";

export async function getAffiliateStats(
  prisma: PrismaClient,
  options: { linkId?: string; toolId?: string; since?: Date } = {},
): Promise<AffiliateStats> {
  const linkFilter = options.linkId
    ? { id: options.linkId }
    : options.toolId
      ? { toolId: options.toolId, deletedAt: null }
      : { deletedAt: null };

  const links = await prisma.affiliateLink.findMany({
    where: linkFilter,
    select: { id: true },
  });
  const linkIds = links.map((l) => l.id);

  if (linkIds.length === 0) {
    return { clicks: 0, conversions: 0, revenue: 0, ctr: 0, epc: 0 };
  }

  const since = options.since ?? new Date(0);

  const [clicks, conversions, commissions] = await Promise.all([
    prisma.affiliateClick.count({
      where: { linkId: { in: linkIds }, createdAt: { gte: since } },
    }),
    prisma.affiliateConversion.count({
      where: { linkId: { in: linkIds }, createdAt: { gte: since } },
    }),
    prisma.affiliateCommission.aggregate({
      where: { linkId: { in: linkIds }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const revenue = Number(commissions._sum.amount ?? 0);
  const ctr = clicks > 0 ? conversions / clicks : 0;
  const epc = clicks > 0 ? revenue / clicks : 0;

  return { clicks, conversions, revenue, ctr, epc };
}

export async function getToolAffiliateOverview(prisma: PrismaClient, toolId: string) {
  const link = await prisma.affiliateLink.findFirst({
    where: { toolId, deletedAt: null, status: "ACTIVE" },
    include: { program: true },
  });

  if (!link) {
    return null;
  }

  const stats = await getAffiliateStats(prisma, { linkId: link.id });
  return {
    linkId: link.id,
    officialUrl: link.officialUrl,
    affiliateUrl: link.affiliateUrl,
    network: link.network,
    program: link.program?.name ?? null,
    stats,
  };
}
