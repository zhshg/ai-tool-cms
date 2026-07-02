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

type CategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: CategoriesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const config = getSiteConfig();
  const path = `/${locale}/categories`;
  const title = locale === "zh" ? "AI 工具分类" : "AI Tool Categories";
  const description =
    locale === "zh"
      ? "按分类浏览 AI 工具目录，快速进入写作、编程、设计、营销等常见工作流。"
      : "Browse the AI tool directory by category and jump into writing, coding, design, marketing, and more.";

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

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const data = await getCategoriesPageData(locale);
  const config = getSiteConfig();
  const path = `/${locale}/categories`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: locale === "zh" ? "AI 工具分类" : "AI Tool Categories",
      url,
      items: data.categories.map((category, index) => ({
        name: category.name,
        url: joinUrl(config.siteUrl, `/${locale}/category/${category.slug}`),
        position: index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: "Home", path: `/${locale}` },
        { name: "Categories", path },
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
