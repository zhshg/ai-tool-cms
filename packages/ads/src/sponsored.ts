import type { PrismaClient, SponsoredPlacementType } from "@ai-tool-cms/database";

export type SponsoredSlot = {
  toolId: string;
  slug: string;
  name: string;
  type: SponsoredPlacementType;
  weight: number;
  isSponsored: true;
};

export async function getActiveSponsoredPlacements(
  prisma: PrismaClient,
  options: {
    type?: SponsoredPlacementType;
    region?: string;
    device?: string;
    limit?: number;
  } = {},
): Promise<SponsoredSlot[]> {
  const now = new Date();
  const placements = await prisma.sponsoredPlacement.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(options.type ? { type: options.type } : {}),
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
    },
    include: {
      tool: { select: { id: true, slug: true, name: true, status: true, deletedAt: true } },
    },
    orderBy: [{ weight: "desc" }, { updatedAt: "desc" }],
    take: options.limit ?? 20,
  });

  return placements
    .filter((p) => p.tool.status === "PUBLISHED" && !p.tool.deletedAt)
    .filter((p) => {
      if (options.region && p.regions.length > 0 && !p.regions.includes(options.region)) {
        return false;
      }
      if (options.device && p.devices.length > 0 && !p.devices.includes(options.device)) {
        return false;
      }
      return true;
    })
    .map((p) => ({
      toolId: p.tool.id,
      slug: p.tool.slug,
      name: p.tool.name,
      type: p.type,
      weight: p.weight,
      isSponsored: true as const,
    }));
}

export async function refreshSponsoredStatuses(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const [activated, expired] = await Promise.all([
    prisma.sponsoredPlacement.updateMany({
      where: {
        status: "SCHEDULED",
        deletedAt: null,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      data: { status: "ACTIVE" },
    }),
    prisma.sponsoredPlacement.updateMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        endAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    }),
  ]);

  return activated.count + expired.count;
}
