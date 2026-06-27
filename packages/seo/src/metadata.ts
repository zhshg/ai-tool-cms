import type { Metadata } from "next";
import { getSiteConfig } from "./site-config";
import type { SeoPageInput } from "./types";
import { joinUrl, resolveAbsoluteUrl } from "./utils";

function toOpenGraphLocale(locale: string): string {
  return locale.replace("-", "_");
}

function buildTitle(title: string | undefined, siteName: string): string {
  if (!title) {
    return siteName;
  }

  if (title === siteName || title.endsWith(` | ${siteName}`)) {
    return title;
  }

  return `${title} | ${siteName}`;
}

export function buildMetadata(
  input: SeoPageInput = {},
  config = getSiteConfig(),
): Metadata {
  const path = input.path ?? "/";
  const canonicalUrl = input.canonical ?? joinUrl(config.siteUrl, path);
  const title = buildTitle(input.title, config.siteName);
  const description = input.description ?? (config.siteDescription || undefined);
  const ogImage = input.ogImage ?? config.ogImage;
  const resolvedOgImage = ogImage ? resolveAbsoluteUrl(ogImage, config.siteUrl) : undefined;
  const twitterCard = input.twitterCard ?? (resolvedOgImage ? "summary_large_image" : "summary");
  const shouldNoIndex = input.noIndex ?? config.robotsNoIndex;

  return {
    metadataBase: new URL(config.siteUrl),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: shouldNoIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
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
