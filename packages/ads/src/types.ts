export type AdNetworkCode = "ADSENSE" | "AD_MANAGER" | "CARBON" | "CUSTOM" | "NATIVE";

export type AdSlotRecord = {
  id: string;
  slug: string;
  name: string;
  network: AdNetworkCode;
  position: string;
  sortOrder: number;
  config: Record<string, unknown>;
};

export type AdRenderPayload = {
  slot: AdSlotRecord;
  html?: string;
  script?: string;
};
