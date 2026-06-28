export type AffiliateNetworkCode =
  "AMAZON" | "IMPACT" | "PARTNERSTACK" | "CJ" | "SHAREASALE" | "CUSTOM";

export type AffiliateLinkRecord = {
  id: string;
  toolId: string;
  officialUrl: string;
  affiliateUrl: string;
  network: AffiliateNetworkCode;
  status: string;
};

export type AffiliateStats = {
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  epc: number;
};

export type AffiliateRedirectContext = {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
};
