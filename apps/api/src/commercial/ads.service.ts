import { Injectable } from "@nestjs/common";
import { AD_NETWORKS, listAdsByPosition, listActiveAdSlots } from "@ai-tool-cms/ads";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  networks() {
    return AD_NETWORKS;
  }

  async listSlots() {
    return listActiveAdSlots(this.prisma.client);
  }

  async listByPosition() {
    return listAdsByPosition(this.prisma.client);
  }

  async createSlot(input: {
    slug: string;
    name: string;
    network: string;
    position: string;
    sortOrder?: number;
    config?: Record<string, unknown>;
  }) {
    return this.prisma.client.adSlot.create({
      data: {
        slug: input.slug,
        name: input.name,
        network: input.network as never,
        position: input.position,
        sortOrder: input.sortOrder ?? 0,
        config: (input.config ?? {}) as never,
      },
    });
  }

  async updateSlot(id: string, input: { sortOrder?: number; config?: Record<string, unknown> }) {
    return this.prisma.client.adSlot.update({
      where: { id },
      data: {
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.config ? { config: input.config as never } : {}),
      },
    });
  }

  async listAllAdmin() {
    return this.prisma.client.adSlot.findMany({
      where: activeOnly,
      orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
    });
  }
}
