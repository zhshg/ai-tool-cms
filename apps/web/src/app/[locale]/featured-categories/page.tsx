import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { CategoryIndexExperience } from "@/components/category/category-directory";
import { getCategoriesPageData } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

type FeaturedCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: FeaturedCategoriesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale.startsWith("zh");
  const config = getSiteConfig();
  const path = `/${locale}/featured-categories`;
  const title = isZh ? "精选 AI 工具类别" : "Featured AI Tool Categories";
  const description = isZh
    ? "浏览 ToolsDar 精选的高需求 AI 工具类别，快速进入核心工作流。"
    : "Explore the most important AI tool categories on ToolsDar, selected for high-demand workflows.";

  return {
    title,
    description,
    alternates: { canonical: joinUrl(config.siteUrl, path) },
    openGraph: {
      title,
      description,
      url: joinUrl(config.siteUrl, path),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function FeaturedCategoriesPage({ params }: FeaturedCategoriesPageProps) {
  const { locale } = await params;
  const isZh = locale.startsWith("zh");
  setRequestLocale(locale);

  const data = await getCategoriesPageData(locale, "featured");
  const config = getSiteConfig();
  const path = `/${locale}/featured-categories`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: isZh ? "精选 AI 工具类别" : "Featured AI Tool Categories",
      url,
      items: data.categories.map((category, index) => ({
        name: category.name,
        url: joinUrl(config.siteUrl, `/${locale}/category/${category.slug}`),
        position: index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: isZh ? "首页" : "Home", path: `/${locale}` },
        { name: isZh ? "精选类别" : "Featured Categories", path },
      ],
      config.siteUrl,
    ),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <CategoryIndexExperience locale={locale} data={data} />
    </>
  );
}
