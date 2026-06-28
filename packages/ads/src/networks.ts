import type { AdNetworkCode } from "./types";

export const AD_NETWORKS: Record<AdNetworkCode, { label: string; requiresScript: boolean }> = {
  ADSENSE: { label: "Google AdSense", requiresScript: true },
  AD_MANAGER: { label: "Google Ad Manager", requiresScript: true },
  CARBON: { label: "Carbon Ads", requiresScript: true },
  CUSTOM: { label: "Custom Banner", requiresScript: false },
  NATIVE: { label: "Native Ad", requiresScript: false },
};

export function renderAdHtml(
  network: AdNetworkCode,
  config: Record<string, unknown>,
): { html?: string; script?: string } {
  switch (network) {
    case "ADSENSE":
      return {
        script: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        html: `<ins class="adsbygoogle" style="display:block" data-ad-client="${String(config.clientId ?? "")}" data-ad-slot="${String(config.slotId ?? "")}"></ins>`,
      };
    case "AD_MANAGER":
      return {
        script: String(config.scriptUrl ?? ""),
        html: String(config.html ?? ""),
      };
    case "CARBON":
      return {
        script: "https://cdn.carbonads.com/carbon.js?serve=" + String(config.serve ?? ""),
        html: `<div id="carbonads"></div>`,
      };
    case "NATIVE":
      return {
        html: String(config.html ?? ""),
      };
    case "CUSTOM":
    default:
      return {
        html: String(config.html ?? config.bannerHtml ?? ""),
      };
  }
}
