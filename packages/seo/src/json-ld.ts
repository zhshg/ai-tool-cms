import type { BreadcrumbItem, SoftwareApplicationInput } from "./types";
import { joinUrl, resolveAbsoluteUrl } from "./utils";

export type JsonLd = Record<string, unknown>;

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  baseUrl: string,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: joinUrl(baseUrl, item.path),
    })),
  };
}

export function buildSoftwareApplicationJsonLd(
  input: SoftwareApplicationInput,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.applicationCategory
      ? { applicationCategory: input.applicationCategory }
      : {}),
    ...(input.operatingSystem ? { operatingSystem: input.operatingSystem } : {}),
    ...(input.image ? { image: resolveAbsoluteUrl(input.image, input.url) } : {}),
    ...(input.offers
      ? {
          offers: {
            "@type": "Offer",
            price: input.offers.price,
            priceCurrency: input.offers.priceCurrency,
          },
        }
      : {}),
  };
}

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data);
}
