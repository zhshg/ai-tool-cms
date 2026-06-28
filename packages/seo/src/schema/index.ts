import type {
  BreadcrumbItem,
  CollectionPageInput,
  FaqPageInput,
  ItemListInput,
  SoftwareApplicationInput,
} from "../types";
import { joinUrl, resolveAbsoluteUrl } from "../utils";

export type JsonLd = Record<string, unknown>;

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data);
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], baseUrl: string): JsonLd {
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

export function buildSoftwareApplicationJsonLd(input: SoftwareApplicationInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    applicationCategory: input.applicationCategory ?? "BusinessApplication",
    operatingSystem: input.operatingSystem ?? "Web",
    ...(input.image ? { image: resolveAbsoluteUrl(input.image, input.url) } : {}),
    ...(input.offers
      ? {
          offers: {
            "@type": "Offer",
            ...(input.offers.price ? { price: input.offers.price } : {}),
            priceCurrency: input.offers.priceCurrency ?? "USD",
            ...(input.offers.description ? { description: input.offers.description } : {}),
          },
        }
      : {}),
    ...(input.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.aggregateRating.ratingValue,
            ratingCount: input.aggregateRating.ratingCount,
            bestRating: input.aggregateRating.bestRating ?? 5,
            worstRating: input.aggregateRating.worstRating ?? 1,
          },
        }
      : {}),
  };
}

export function buildFaqPageJsonLd(input: FaqPageInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: input.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildCollectionPageJsonLd(input: CollectionPageInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    hasPart: input.items.map((item) => ({
      "@type": "CreativeWork",
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export function buildItemListJsonLd(input: ItemListInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: item.position ?? index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

/** Build full JSON-LD graph for a tool detail page. */
export function buildToolPageJsonLd(input: {
  baseUrl: string;
  locale: string;
  tool: SoftwareApplicationInput & { slug: string };
  breadcrumbs: BreadcrumbItem[];
  faqs?: Array<{ question: string; answer: string }>;
}): JsonLd[] {
  const graph: JsonLd[] = [
    buildSoftwareApplicationJsonLd(input.tool),
    buildBreadcrumbJsonLd(input.breadcrumbs, input.baseUrl),
  ];
  if (input.faqs?.length) {
    graph.push(
      buildFaqPageJsonLd({
        url: joinUrl(input.baseUrl, `/${input.locale}/tools/${input.tool.slug}`),
        faqs: input.faqs,
      }),
    );
  }
  return graph;
}
