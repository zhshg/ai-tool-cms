import type { ComparePageSpec } from "../types";
import { buildMetadata, type BuiltMetadata } from "../metadata";
import { buildCollectionPageJsonLd, buildItemListJsonLd } from "../schema";
import { getSiteConfig } from "../site-config";
import { joinUrl } from "../utils";
import { buildComparePagePath } from "../internal-links";

export function buildComparePageMetadata(spec: ComparePageSpec, locale = "en"): BuiltMetadata {
  const config = getSiteConfig();
  const path = buildComparePagePath(spec, locale);
  return buildMetadata(
    {
      title: spec.title,
      description: `Compare ${spec.title}. Features, pricing, and which tool is right for you.`,
      path,
      ogType: "article",
    },
    config,
  );
}

export function buildComparePageJsonLd(spec: ComparePageSpec, locale = "en") {
  const config = getSiteConfig();
  const url = joinUrl(config.siteUrl, buildComparePagePath(spec, locale));

  if (spec.kind === "top_list") {
    return buildItemListJsonLd({
      name: spec.title,
      url,
      items: (spec.toolSlugs ?? []).map((slug, index) => ({
        name: slug,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${slug}`),
        position: index + 1,
      })),
    });
  }

  return buildCollectionPageJsonLd({
    name: spec.title,
    url,
    description: `${spec.title} comparison for AI tools directory`,
    items: (spec.toolSlugs ?? []).map((slug) => ({
      name: slug,
      url: joinUrl(config.siteUrl, `/${locale}/tools/${slug}`),
    })),
  });
}

export function buildCategoryLandingMetadata(
  category: { slug: string; name: string; metaDescription?: string | null },
  locale = "en",
): BuiltMetadata {
  return buildMetadata({
    title: `Best ${category.name} AI Tools`,
    description:
      category.metaDescription ??
      `Discover top ${category.name} AI tools, reviews, and comparisons.`,
    path: `/${locale}/category/${category.slug}`,
  });
}

export function buildTagLandingMetadata(
  tag: { slug: string; name: string },
  locale = "en",
): BuiltMetadata {
  return buildMetadata({
    title: `${tag.name} AI Tools`,
    description: `AI tools tagged ${tag.name} — reviews, pricing, and alternatives.`,
    path: `/${locale}/tag/${tag.slug}`,
  });
}
