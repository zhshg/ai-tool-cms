import type { SeoPageInput } from "../types";
import { getSiteConfig, type SiteConfig } from "../site-config";
import { joinUrl, resolveAbsoluteUrl } from "../utils";

/** Next.js Metadata-compatible shape (plain object - no next import). */
export type BuiltMetadata = {
  metadataBase: URL;
  title: string;
  description?: string;
  keywords?: string[];
  alternates: {
    canonical: string;
    languages?: Record<string, string>;
  };
  robots: { index: boolean; follow: boolean } | string;
  openGraph: {
    type: string;
    locale: string;
    url: string;
    siteName: string;
    title: string;
    description?: string;
    images?: Array<{ url: string }>;
  };
  twitter: {
    card: string;
    title: string;
    description?: string;
    site?: string;
    creator?: string;
    images?: string[];
  };
};

function toOpenGraphLocale(locale: string): string {
  return locale.replace("-", "_");
}

function sanitizePublicBranding(value: string | undefined, siteName: string): string | undefined {
  if (!value) return value;
  return value
    .replace(/AI Tool CMS/g, siteName)
    .replace(/AI Tool CMS Admin/g, "AI Tool CMS Admin")
    .replace(/\s+[��-]\s+AI Tool Directory\s*\|\s*AI Tool Directory$/u, ` | ${siteName}`)
    .replace(/\s+[��-]\s+AI Tool Directory$/u, ` | ${siteName}`)
    .trim();
}

function buildTitle(title: string | undefined, siteName: string): string {
  const normalizedTitle = sanitizePublicBranding(title, siteName);
  if (!normalizedTitle) return siteName;
  if (normalizedTitle === siteName || normalizedTitle.endsWith(` | ${siteName}`)) {
    return normalizedTitle;
  }
  return `${normalizedTitle} | ${siteName}`;
}

/**
 * Unified metadata builder - pages must use this instead of hand-rolling SEO tags.
 */
export function buildMetadata(
  input: SeoPageInput = {},
  config: SiteConfig = getSiteConfig(),
): BuiltMetadata {
  const path = input.path ?? "/";
  const canonicalUrl = input.canonical ?? joinUrl(config.siteUrl, path);
  const title = buildTitle(input.title, config.siteName);
  const description = sanitizePublicBranding(
    input.description ?? config.siteDescription ?? undefined,
    config.siteName,
  );
  const ogImage = input.ogImage ?? config.ogImage;
  const resolvedOgImage = ogImage ? resolveAbsoluteUrl(ogImage, config.siteUrl) : undefined;
  const twitterCard = input.twitterCard ?? (resolvedOgImage ? "summary_large_image" : "summary");
  const shouldNoIndex = input.noIndex ?? config.robotsNoIndex;

  const hreflangLanguages = input.hreflang?.length
    ? Object.fromEntries(
        input.hreflang.map((alt) => [alt.locale, joinUrl(config.siteUrl, alt.path)]),
      )
    : undefined;

  return {
    metadataBase: new URL(config.siteUrl),
    title,
    description,
    keywords: input.keywords,
    alternates: {
      canonical: canonicalUrl,
      ...(hreflangLanguages ? { languages: hreflangLanguages } : {}),
    },
    robots:
      input.robots ??
      (shouldNoIndex ? { index: false, follow: false } : { index: true, follow: true }),
    openGraph: {
      type: input.ogType ?? "website",
      locale: toOpenGraphLocale(config.defaultLocale),
      url: canonicalUrl,
      siteName: config.siteName,
      title,
      description,
      ...(resolvedOgImage ? { images: [{ url: resolvedOgImage }] } : {}),
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      ...(config.twitterHandle
        ? { site: config.twitterHandle, creator: config.twitterHandle }
        : {}),
      ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
    },
  };
}

export function buildToolMetadata(
  tool: {
    name: string;
    slug: string;
    summary?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    logoUrl?: string | null;
  },
  locale = "en",
  config: SiteConfig = getSiteConfig(),
): BuiltMetadata {
  return buildMetadata(
    {
      title: tool.metaTitle ?? `${tool.name} Review, Pricing, Features & Alternatives`,
      description: tool.metaDescription ?? tool.summary ?? undefined,
      path: `/${locale}/tools/${tool.slug}`,
      ogImage: tool.logoUrl ?? undefined,
      ogType: "article",
    },
    config,
  );
}
