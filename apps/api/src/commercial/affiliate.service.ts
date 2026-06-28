import { Injectable } from "@nestjs/common";
import {
  AFFILIATE_NETWORKS,
  buildAffiliateUrl,
  getAffiliateRedirectUrl,
  getAffiliateStats,
  getToolAffiliateOverview,
} from "@ai-tool-cms/affiliate";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  networks() {
    return AFFILIATE_NETWORKS;
  }

  async listPrograms() {
    return this.prisma.client.affiliateProgram.findMany({
      where: activeOnly,
      orderBy: { name: "asc" },
    });
  }

  async listLinks(toolId?: string) {
    return this.prisma.client.affiliateLink.findMany({
      where: { ...activeOnly, ...(toolId ? { toolId } : {}) },
      include: { program: true, tool: { select: { id: true, slug: true, name: true } } },
    });
  }

  async createLink(input: {
    toolId: string;
    programId?: string;
    network: string;
    officialUrl: string;
    affiliateUrl?: string;
    campaign?: string;
    tag?: string;
  }) {
    const affiliateUrl =
      input.affiliateUrl ??
      buildAffiliateUrl(input.network as never, input.officialUrl, {
        campaign: input.campaign,
        tag: input.tag,
      });

    return this.prisma.client.affiliateLink.create({
      data: {
        toolId: input.toolId,
        programId: input.programId,
        network: input.network as never,
        officialUrl: input.officialUrl,
        affiliateUrl,
      },
    });
  }

  async getToolOverview(toolId: string) {
    return getToolAffiliateOverview(this.prisma.client, toolId);
  }

  async getStats(linkId?: string, toolId?: string) {
    return getAffiliateStats(this.prisma.client, { linkId, toolId });
  }

  async redirect(
    linkId: string,
    context: { ipAddress?: string; userAgent?: string; referrer?: string },
  ) {
    return getAffiliateRedirectUrl(this.prisma.client, linkId, context);
  }
}
