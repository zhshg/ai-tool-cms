import type { SupportedLocale } from "./locales";
import { SUPPORTED_LOCALES } from "./locales";

export type HreflangAlternate = {
  locale: string;
  path: string;
};

/** Build hreflang alternates for a path across all locales (Commit 074). */
export function buildHreflangAlternates(
  basePath: string,
  locales: readonly string[] = SUPPORTED_LOCALES,
): HreflangAlternate[] {
  const normalized = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return locales.map((locale) => ({
    locale,
    path: `/${locale}${normalized === "/" ? "" : normalized}`,
  }));
}

export function buildHreflangMap(
  siteUrl: string,
  basePath: string,
  locales: readonly string[] = SUPPORTED_LOCALES,
): Record<string, string> {
  const alternates = buildHreflangAlternates(basePath, locales);
  const map: Record<string, string> = {};
  for (const alt of alternates) {
    map[alt.locale] = `${siteUrl.replace(/\/$/, "")}${alt.path}`;
  }
  map["x-default"] = map["en"] ?? `${siteUrl}/en${basePath}`;
  return map;
}

export type RegionalSeoInput = {
  region: string;
  locale: SupportedLocale;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  aiSummary?: string;
};

export function mergeRegionalSeo(
  base: { title?: string; description?: string; keywords?: string[] },
  regional?: RegionalSeoInput | null,
) {
  if (!regional) return base;
  return {
    title: regional.metaTitle ?? base.title,
    description: regional.metaDescription ?? base.description,
    keywords: regional.keywords?.length ? regional.keywords : base.keywords,
    aiSummary: regional.aiSummary,
  };
}
