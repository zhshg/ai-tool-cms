import { Injectable } from "@nestjs/common";
import { aggregateRevenueSnapshot, getRevenueOverview } from "@ai-tool-cms/api-platform";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MonetizationService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await Promise.all([
      aggregateRevenueSnapshot(this.prisma.client, "AFFILIATE", "weekly"),
      aggregateRevenueSnapshot(this.prisma.client, "AFFILIATE", "monthly"),
    ]);

    const [
      programs,
      affiliateLinks,
      activeAffiliateLinks,
      affiliateClicks,
      affiliateConversions,
      affiliateRevenue,
      sponsoredTools,
      featuredTools,
      activeSponsored,
      bannerAds,
      activeBannerAds,
      pricingPlans,
      partnerAccounts,
      activePartnerAccounts,
      newsletterSubscribers,
      confirmedNewsletterSubscribers,
      newsletterCampaigns,
      scheduledNewsletterCampaigns,
      partnerLinks,
      activePartnerLinks,
      revenue,
      topAffiliateLinks,
      sponsoredPlacements,
      adSlots,
      recentPricingPlans,
    ] = await Promise.all([
      this.prisma.client.affiliateProgram.count({ where: { deletedAt: null } }),
      this.prisma.client.affiliateLink.count({ where: { deletedAt: null } }),
      this.prisma.client.affiliateLink.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.prisma.client.affiliateClick.count({ where: { createdAt: { gte: since30d } } }),
      this.prisma.client.affiliateConversion.count({ where: { createdAt: { gte: since30d } } }),
      this.prisma.client.affiliateCommission.aggregate({
        where: { createdAt: { gte: since30d } },
        _sum: { amount: true },
      }),
      this.prisma.client.sponsoredPlacement.count({
        where: { deletedAt: null, type: "SPONSORED" },
      }),
      this.prisma.client.sponsoredPlacement.count({
        where: { deletedAt: null, type: "FEATURED" },
      }),
      this.prisma.client.sponsoredPlacement.count({
        where: { deletedAt: null, status: "ACTIVE" },
      }),
      this.prisma.client.adSlot.count({ where: { deletedAt: null } }),
      this.prisma.client.adSlot.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.prisma.client.pricingPlan.count({ where: { deletedAt: null } }),
      this.prisma.client.partnerAccount.count({ where: { deletedAt: null } }),
      this.prisma.client.partnerAccount.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.prisma.client.newsletterSubscriber.count({ where: { deletedAt: null } }),
      this.prisma.client.newsletterSubscriber.count({
        where: { deletedAt: null, status: "CONFIRMED" },
      }),
      this.prisma.client.newsletterCampaign.count({ where: { deletedAt: null } }),
      this.prisma.client.newsletterCampaign.count({
        where: { deletedAt: null, status: "SCHEDULED" },
      }),
      this.prisma.client.affiliateLink.count({
        where: { deletedAt: null, program: { status: "ACTIVE", deletedAt: null } },
      }),
      this.prisma.client.affiliateLink.count({
        where: { deletedAt: null, status: "ACTIVE", program: { status: "ACTIVE", deletedAt: null } },
      }),
      getRevenueOverview(this.prisma.client),
      this.prisma.client.affiliateLink.findMany({
        where: { deletedAt: null },
        include: {
          tool: { select: { id: true, name: true, slug: true } },
          clicks: { where: { createdAt: { gte: since30d } }, select: { id: true } },
          conversions: { where: { createdAt: { gte: since30d } }, select: { id: true } },
          commissions: { where: { createdAt: { gte: since30d } }, select: { amount: true } },
        },
        take: 20,
      }),
      this.prisma.client.sponsoredPlacement.findMany({
        where: { deletedAt: null },
        include: { tool: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ status: "asc" }, { weight: "desc" }],
        take: 8,
      }),
      this.prisma.client.adSlot.findMany({
        where: { deletedAt: null },
        orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
        take: 8,
      }),
      this.prisma.client.pricingPlan.findMany({
        where: { deletedAt: null },
        include: { tool: { select: { id: true, name: true, slug: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const rankedAffiliateLinks = topAffiliateLinks
      .map((link) => ({
        id: link.id,
        tool: link.tool,
        network: link.network,
        status: link.status,
        clicks: link.clicks.length,
        conversions: link.conversions.length,
        revenue: link.commissions.reduce((sum, row) => sum + Number(row.amount), 0),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      period: "last_30_days",
      metrics: {
        affiliatePrograms: programs,
        affiliateLinks,
        activeAffiliateLinks,
        featuredTools,
        sponsoredTools,
        activeSponsored,
        bannerAds,
        activeBannerAds,
        pricingPlans,
        coupons: 0,
        referrals: partnerAccounts,
        activeReferrals: activePartnerAccounts,
        newsletterSubscribers,
        confirmedNewsletterSubscribers,
        newsletterCampaigns,
        scheduledNewsletterCampaigns,
        partnerLinks,
        activePartnerLinks,
        clicks: affiliateClicks,
        conversions: affiliateConversions,
        invoices: 0,
        revenue: Number(affiliateRevenue._sum.amount ?? 0),
      },
      revenue,
      topAffiliateLinks: rankedAffiliateLinks,
      sponsoredPlacements: sponsoredPlacements.map((placement) => ({
        id: placement.id,
        type: placement.type,
        status: placement.status,
        weight: placement.weight,
        startAt: placement.startAt,
        endAt: placement.endAt,
        tool: placement.tool,
      })),
      adSlots: adSlots.map((slot) => ({
        id: slot.id,
        slug: slot.slug,
        name: slot.name,
        network: slot.network,
        position: slot.position,
        status: slot.status,
      })),
      pricingPlans: recentPricingPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        amount: Number(plan.amount ?? 0),
        billingPeriod: plan.billingPeriod,
        currency: plan.currency,
        tool: plan.tool,
      })),
      unsupported: {
        coupons: "No dedicated coupon model exists yet.",
        invoices: "No billing invoice model exists yet.",
        partnerLinks: "Partner links currently reuse affiliate links connected to active programs.",
      },
    };
  }
}
