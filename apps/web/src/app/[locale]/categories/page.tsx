import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getCategoriesPageData } from "@/lib/catalog";
import { buildBreadcrumbJsonLd, buildItemListJsonLd, getSiteConfig, joinUrl } from "@ai-tool-cms/seo";
import { serializeJsonLd } from "@/lib/seo";

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
      ? "按分类浏览 AI 工具目录，快速进入写作、代码、设计、营销等常见工作流。"
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

  const { categories, featuredTools } = await getCategoriesPageData(locale);
  const config = getSiteConfig();
  const path = `/${locale}/categories`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: locale === "zh" ? "AI 工具分类" : "AI Tool Categories",
      url,
      items: categories.map((category, index) => ({
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {locale === "zh" ? "Categories" : "Categories"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {locale === "zh" ? "按分类浏览 AI 工具目录" : "Browse the directory by category"}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {locale === "zh"
                ? "从工作流切入查找工具。先进入最相关的分类，再继续查看工具详情、搜索结果和对比页面。"
                : "Start from the workflow you care about, then move into the most relevant category, tool detail pages, search results, and comparisons."}
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium text-foreground">
              {locale === "zh" ? "推荐起点" : "Recommended starting points"}
            </div>
            <div className="mt-4 space-y-3">
              {featuredTools.slice(0, 3).map((tool) => (
                <Link
                  key={tool.id}
                  href={`/${locale}/tools/${tool.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3 text-sm transition hover:border-primary/40"
                >
                  <div>
                    <div className="font-medium text-foreground">{tool.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {tool.category?.name ?? (locale === "zh" ? "精选工具" : "Featured tool")}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.slug} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {category.description ??
                      (locale === "zh"
                        ? `浏览 ${category.name} 相关工具、详情页与内部链接。`
                        : `Browse ${category.name} tools, detail pages, and related internal links.`)}
                  </p>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  {category.toolCount}
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/${locale}/category/${category.slug}`}>
                    {locale === "zh" ? "进入分类" : "Open category"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/${locale}/tools?category=${category.slug}`}>
                    {locale === "zh" ? "查看工具" : "View tools"}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
