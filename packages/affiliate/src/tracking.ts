import type { PrismaClient } from "@ai-tool-cms/database";
import type { AffiliateRedirectContext } from "./types";

export async function recordAffiliateClick(
  prisma: PrismaClient,
  linkId: string,
  context: AffiliateRedirectContext = {},
): Promise<void> {
  await prisma.affiliateClick.create({
    data: {
      linkId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      referrer: context.referrer,
      country: context.country,
    },
  });
}

export async function getAffiliateRedirectUrl(
  prisma: PrismaClient,
  linkId: string,
  context: AffiliateRedirectContext = {},
): Promise<string | null> {
  const link = await prisma.affiliateLink.findFirst({
    where: { id: linkId, status: "ACTIVE", deletedAt: null },
    select: { affiliateUrl: true },
  });

  if (!link) {
    return null;
  }

  await recordAffiliateClick(prisma, linkId, context);
  return link.affiliateUrl;
}
