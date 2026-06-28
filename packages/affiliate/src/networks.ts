import type { AffiliateNetworkCode } from "./types";

export const AFFILIATE_NETWORKS: Record<
  AffiliateNetworkCode,
  { label: string; supportsAutoLink: boolean }
> = {
  AMAZON: { label: "Amazon Associates", supportsAutoLink: true },
  IMPACT: { label: "Impact", supportsAutoLink: true },
  PARTNERSTACK: { label: "PartnerStack", supportsAutoLink: true },
  CJ: { label: "CJ Affiliate", supportsAutoLink: true },
  SHAREASALE: { label: "ShareASale", supportsAutoLink: true },
  CUSTOM: { label: "Custom Link", supportsAutoLink: false },
};

export function buildAffiliateUrl(
  network: AffiliateNetworkCode,
  officialUrl: string,
  params: { tag?: string; campaign?: string; subId?: string } = {},
): string {
  if (network === "CUSTOM") {
    return officialUrl;
  }

  const url = new URL(officialUrl);
  if (params.campaign) {
    url.searchParams.set("utm_campaign", params.campaign);
  }
  if (params.subId) {
    url.searchParams.set("sub_id", params.subId);
  }

  switch (network) {
    case "AMAZON":
      if (params.tag) {
        url.searchParams.set("tag", params.tag);
      }
      break;
    case "IMPACT":
    case "PARTNERSTACK":
    case "CJ":
    case "SHAREASALE":
      if (params.tag) {
        url.searchParams.set("aff_id", params.tag);
      }
      break;
    default:
      break;
  }

  return url.toString();
}
