import type { Metadata } from "next";

/** Default site SEO config (App Router equivalent of next-seo DefaultSeo). */
export const siteSeo = {
  siteName: "AI Tool CMS",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultTitle: "AI Tool CMS",
  description: "AI Tool CMS — public web application scaffold.",
  locale: "en_US",
} as const;

export function createRootMetadata(locale = "en"): Metadata {
  const isZh = locale === "zh";

  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title: {
      default: siteSeo.defaultTitle,
      template: `%s | ${siteSeo.siteName}`,
    },
    description: isZh
      ? "AI Tool CMS — 公共 Web 应用脚手架。"
      : siteSeo.description,
    openGraph: {
      type: "website",
      locale: isZh ? "zh_CN" : siteSeo.locale,
      siteName: siteSeo.siteName,
      title: siteSeo.defaultTitle,
      description: siteSeo.description,
      url: siteSeo.siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: siteSeo.defaultTitle,
      description: siteSeo.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
