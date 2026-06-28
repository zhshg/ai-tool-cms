import { Injectable } from "@nestjs/common";
import {
  API_SCOPES,
  generateApiKey,
  generateWebhookSecret,
  getApiKeyUsageStats,
  getGrowthCenterMetrics,
  getRevenueOverview,
  aggregateRevenueSnapshot,
} from "@ai-tool-cms/api-platform";
import { PrismaService } from "../prisma/prisma.service";
import { activeOnly } from "../common/prisma.util";

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  scopes() {
    return API_SCOPES;
  }

  async listApiKeys(userId: string) {
    return this.prisma.client.apiKey.findMany({
      where: { userId, ...activeOnly },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async createApiKey(userId: string, name: string, scopes: string[]) {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const record = await this.prisma.client.apiKey.create({
      data: { userId, name, keyPrefix, keyHash, scopes },
    });
    return { ...record, rawKey };
  }

  async revokeApiKey(userId: string, keyId: string) {
    return this.prisma.client.apiKey.updateMany({
      where: { id: keyId, userId, deletedAt: null },
      data: { status: "REVOKED" },
    });
  }

  async getApiKeyUsage(keyId: string) {
    return getApiKeyUsageStats(this.prisma.client, keyId);
  }

  async listWebhooks(userId: string) {
    return this.prisma.client.webhook.findMany({
      where: { userId, ...activeOnly },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createWebhook(userId: string, input: { name: string; url: string; events: string[] }) {
    return this.prisma.client.webhook.create({
      data: {
        userId,
        name: input.name,
        url: input.url,
        events: input.events as never[],
        secret: generateWebhookSecret(),
      },
      select: { id: true, name: true, url: true, events: true, secret: true },
    });
  }

  async listEmailTemplates() {
    return this.prisma.client.emailTemplate.findMany({
      where: activeOnly,
      orderBy: { type: "asc" },
    });
  }

  async createEmailTemplate(input: {
    slug: string;
    name: string;
    type: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
  }) {
    return this.prisma.client.emailTemplate.create({
      data: {
        slug: input.slug,
        name: input.name,
        type: input.type as never,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText,
      },
    });
  }
}

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    await aggregateRevenueSnapshot(this.prisma.client, "AFFILIATE", "weekly");
    await aggregateRevenueSnapshot(this.prisma.client, "AFFILIATE", "monthly");
    return getRevenueOverview(this.prisma.client);
  }
}

@Injectable()
export class GrowthCenterService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return getGrowthCenterMetrics(this.prisma.client);
  }
}

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const partner = await this.prisma.client.partnerAccount.findFirst({
      where: { userId, deletedAt: null, status: "ACTIVE" },
    });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [clicks, conversions, commissions, apiUsage] = await Promise.all([
      this.prisma.client.affiliateClick.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.affiliateConversion.count({ where: { createdAt: { gte: since } } }),
      this.prisma.client.affiliateCommission.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      this.prisma.client.apiKeyUsageLog.count({
        where: {
          createdAt: { gte: since },
          apiKey: { userId },
        },
      }),
    ]);

    return {
      partner,
      clicks,
      conversions,
      revenue: Number(commissions._sum.amount ?? 0),
      apiCalls: apiUsage,
      topPages: [],
    };
  }
}
