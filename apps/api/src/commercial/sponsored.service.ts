import { Injectable } from "@nestjs/common";
import { getActiveSponsoredPlacements, refreshSponsoredStatuses } from "@ai-tool-cms/ads";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class SponsoredService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    await refreshSponsoredStatuses(this.prisma.client);
    return this.prisma.client.sponsoredPlacement.findMany({
      where: activeOnly,
      include: { tool: { select: { id: true, slug: true, name: true } } },
      orderBy: [{ weight: "desc" }, { startAt: "desc" }],
    });
  }

  async create(input: {
    toolId: string;
    type: string;
    weight?: number;
    startAt?: string;
    endAt?: string;
    regions?: string[];
    devices?: string[];
  }) {
    return this.prisma.client.sponsoredPlacement.create({
      data: {
        toolId: input.toolId,
        type: input.type as never,
        weight: input.weight ?? 100,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        regions: input.regions ?? [],
        devices: input.devices ?? [],
        status: input.startAt && new Date(input.startAt) > new Date() ? "SCHEDULED" : "ACTIVE",
      },
    });
  }

  async getActive(region?: string, device?: string) {
    await refreshSponsoredStatuses(this.prisma.client);
    return getActiveSponsoredPlacements(this.prisma.client, { region, device });
  }
}
