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
    description: `${spec.title} comparison for AI tool buyers and evaluators.`,
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
  const normalizedName = normalizeCategoryLabel(category.name);
  const titleLabel = buildCategoryToolsLabel(normalizedName);

  return buildMetadata({
    title: `Best ${titleLabel}`,
    description:
      category.metaDescription ??
      `Discover top ${titleLabel.toLowerCase()}, reviews, pricing, and comparisons.`,
    path: `/${locale}/category/${category.slug}`,
  });
}

export function buildTagLandingMetadata(
  tag: { slug: string; name: string },
  locale = "en",
): BuiltMetadata {
  return buildMetadata({
    title: `${tag.name} AI Tools`,
    description: `Explore AI tools tagged ${tag.name} with reviews, pricing, and alternatives.`,
    path: `/${locale}/tag/${tag.slug}`,
  });
}

function normalizeCategoryLabel(categoryName: string): string {
  if (categoryName.endsWith(" AI")) {
    return categoryName.slice(0, -3);
  }
  return categoryName;
}

function buildCategoryToolsLabel(categoryName: string): string {
  return /^AI\b/u.test(categoryName) ? `${categoryName} Tools` : `${categoryName} AI Tools`;
}
