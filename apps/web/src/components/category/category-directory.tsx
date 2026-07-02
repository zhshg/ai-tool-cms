import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  FolderOpen,
  Layers3,
  Star,
} from "lucide-react";
import Link from "next/link";

import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import type {
  CategoryDetailTool,
  CategoryLandingData,
  CategoriesPageCategory,
  CategoriesPageData,
  CategorySidebarLink,
} from "@/lib/catalog";

type CategoryIndexProps = {
  locale: string;
  data: CategoriesPageData;
};

type CategoryDetailProps = {
  locale: string;
  data: CategoryLandingData;
};

export function CategoryIndexExperience({ locale, data }: CategoryIndexProps) {
  const labels = getLabels(locale);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 border-b border-slate-200 pb-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            {labels.directoryBadge}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              {labels.categoriesLabel}
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {labels.indexTitle}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {labels.indexDescription}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={labels.totalCategories} value={String(data.stats.categoryCount)} />
            <StatCard label={labels.totalTools} value={String(data.stats.toolCount)} />
            <StatCard label={labels.featuredCategories} value={String(data.stats.featuredCount)} />
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Star className="size-4 text-amber-500" />
            {labels.quickStart}
          </div>
          <div className="mt-4 space-y-3">
            {data.featuredTools.slice(0, 4).map((tool) => (
              <Link
                key={tool.id}
                href={`/${locale}/tools/${tool.slug}`}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{tool.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {tool.category?.name ?? labels.featuredTool}
                  </div>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {labels.exploreCategories}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{labels.exploreCategoriesText}</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.categories.map((category) => (
            <CategoryIndexCard key={category.slug} category={category} locale={locale} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function CategoryLandingExperience({ locale, data }: CategoryDetailProps) {
  const labels = getLabels(locale);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href={`/${locale}`} className="transition hover:text-slate-900">
              {labels.home}
            </Link>
            <span>/</span>
            <Link href={`/${locale}/categories`} className="transition hover:text-slate-900">
              {labels.categoriesLabel}
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">{data.category.name}</span>
          </nav>

          <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <FolderOpen className="size-3.5" />
                {labels.categoryLanding}
              </span>
              {data.category.isFeatured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <BadgeCheck className="size-3.5" />
                  {labels.featured}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CategoryAvatar name={data.category.name} iconUrl={data.category.iconUrl} />
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                      {data.category.title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-base leading-8 text-slate-600">
                      {data.category.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
                <HeroMetric
                  label={labels.toolCount}
                  value={String(data.category.toolCount)}
                  icon={<Layers3 className="size-4 text-sky-600" />}
                />
                <HeroMetric
                  label={labels.updated}
                  value={data.category.updatedLabel}
                  icon={<Clock3 className="size-4 text-emerald-600" />}
                />
              </div>
            </div>
          </section>

          <InternalLinkStrip
            locale={locale}
            labels={labels}
            currentCategorySlug={data.category.slug}
            relatedCategories={data.relatedCategories}
            popularCategories={data.popularCategories}
            collections={data.popularCollections}
          />

          <section className="space-y-4">
            <SectionHeading title={labels.featuredTools} description={labels.featuredToolsText} />
            <div className="grid gap-4 md:grid-cols-2">
              {data.featuredTools.map((tool) => (
                <ToolDirectoryCard key={tool.id} locale={locale} tool={tool} featured />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading title={labels.allTools} description={labels.allToolsText} />
            <div className="grid gap-4 md:grid-cols-2">
              {data.allTools.map((tool) => (
                <ToolDirectoryCard key={tool.id} locale={locale} tool={tool} />
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <SectionHeading title={labels.trendingTools} description={labels.trendingToolsText} />
              <div className="grid gap-4">
                {data.trendingTools.map((tool) => (
                  <ToolDirectoryCard key={tool.id} locale={locale} tool={tool} compact />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeading
                title={labels.relatedCategories}
                description={labels.relatedCategoriesText}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {data.relatedCategories.map((category) => (
                  <RelatedCategoryCard key={category.slug} locale={locale} category={category} />
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeading title={labels.faq} description={labels.faqText} />
            <div className="space-y-3">
              {data.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <SidebarGroup
            title={labels.topCategories}
            items={data.sidebar.topCategories}
            locale={locale}
          />
          <SidebarGroup
            title={labels.newestTools}
            items={data.sidebar.newestTools}
            locale={locale}
          />
          <SidebarGroup
            title={labels.popularCollections}
            items={data.sidebar.popularCollections}
            locale={locale}
          />
          <SidebarGroup title={labels.blogGuides} items={data.sidebar.blogGuides} locale={locale} />
        </aside>
      </div>
    </main>
  );
}

function CategoryIndexCard({
  category,
  locale,
}: {
  category: CategoriesPageCategory;
  locale: string;
}) {
  const labels = getLabels(locale);

  return (
    <article className="group flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CategoryAvatar name={category.name} iconUrl={category.iconUrl} size="sm" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{category.name}</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              {labels.toolCount}: {category.toolCount}
            </p>
          </div>
        </div>

        {category.isFeatured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            <BadgeCheck className="size-3.5" />
            {labels.featured}
          </span>
        ) : null}
      </div>

      <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">{category.shortDescription}</p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{category.ctaHint}</span>
        <Button asChild className="rounded-full px-4">
          <Link href={`/${locale}/category/${category.slug}`}>
            {labels.openCategory}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function RelatedCategoryCard({
  locale,
  category,
}: {
  locale: string;
  category: CategoriesPageCategory;
}) {
  const labels = getLabels(locale);

  return (
    <Link
      href={`/${locale}/category/${category.slug}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <CategoryAvatar name={category.name} iconUrl={category.iconUrl} size="xs" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">{category.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {category.toolCount} {labels.toolsWord}
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
        {category.shortDescription}
      </p>
    </Link>
  );
}

function ToolDirectoryCard({
  locale,
  tool,
  featured = false,
  compact = false,
}: {
  locale: string;
  tool: CategoryDetailTool;
  featured?: boolean;
  compact?: boolean;
}) {
  const labels = getLabels(locale);

  return (
    <article
      className={[
        "flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md",
        featured ? "bg-gradient-to-br from-white via-white to-amber-50/50" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <ToolLogo
          name={tool.name}
          logoUrl={tool.logoUrl}
          categoryIconUrl={tool.categoryIconUrl}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/tools/${tool.slug}`}
              className="text-lg font-semibold leading-6 text-slate-950 transition hover:text-slate-700"
            >
              {tool.name}
            </Link>
            {featured ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {labels.featured}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
            {tool.summary ?? labels.noSummary}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
          {tool.pricingLabel}
        </span>
        {tool.ratingLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            {tool.ratingLabel}
          </span>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tool.categories.map((category) => (
            <Link
              key={`${tool.id}-${category.slug}`}
              href={`/${locale}/category/${category.slug}`}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild className="rounded-full px-4">
          <Link href={`/${locale}/tools/${tool.slug}`}>
            {labels.openTool}
            <ExternalLink />
          </Link>
        </Button>
        {!compact ? (
          <Button asChild variant="outline" className="rounded-full px-4">
            <a href={tool.website} target="_blank" rel="noopener noreferrer">
              {labels.visitSite}
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function InternalLinkStrip({
  locale,
  labels,
  currentCategorySlug,
  relatedCategories,
  popularCategories,
  collections,
}: {
  locale: string;
  labels: ReturnType<typeof getLabels>;
  currentCategorySlug: string;
  relatedCategories: CategoriesPageCategory[];
  popularCategories: CategoriesPageCategory[];
  collections: CategorySidebarLink[];
}) {
  const visiblePopular = popularCategories.filter(
    (category) => category.slug !== currentCategorySlug,
  );

  return (
    <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-full bg-white">
          <Link href={`/${locale}/categories`}>{labels.backToCategories}</Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <LinkCluster
          title={labels.relatedCategories}
          locale={locale}
          items={relatedCategories.map((item) => ({
            href: `/${locale}/category/${item.slug}`,
            label: item.name,
            meta: `${item.toolCount} ${labels.toolsWord}`,
          }))}
        />
        <LinkCluster
          title={labels.popularCategories}
          locale={locale}
          items={visiblePopular.slice(0, 6).map((item) => ({
            href: `/${locale}/category/${item.slug}`,
            label: item.name,
            meta: `${item.toolCount} ${labels.toolsWord}`,
          }))}
        />
        <LinkCluster
          title={labels.popularCollections}
          locale={locale}
          items={collections.map((item) => ({
            href: item.href,
            label: item.label,
            meta: item.description,
          }))}
        />
      </div>
    </section>
  );
}

function SidebarGroup({
  title,
  items,
  locale,
}: {
  title: string;
  items: CategorySidebarLink[];
  locale: string;
}) {
  void locale;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <Link
            key={`${title}-${item.href}`}
            href={item.href}
            className="block rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
            {item.description ? (
              <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function LinkCluster({
  title,
  items,
}: {
  title: string;
  locale: string;
  items: Array<{ href: string; label: string; meta?: string | null }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={`${title}-${item.href}`}
            href={item.href}
            className="block rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-100"
          >
            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
            {item.meta ? <div className="mt-1 text-xs text-slate-500">{item.meta}</div> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function CategoryAvatar({
  name,
  iconUrl,
  size = "md",
}: {
  name: string;
  iconUrl?: string | null;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClass =
    size === "xs" ? "size-10 text-sm" : size === "sm" ? "size-12 text-base" : "size-16 text-lg";

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-white font-semibold text-slate-700",
        sizeClass,
      ].join(" ")}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt={`${name} icon`} className="size-full object-cover" />
      ) : (
        <span>{name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function getLabels(locale: string) {
  if (locale === "zh") {
    return {
      home: "首页",
      categoriesLabel: "分类",
      directoryBadge: "AI 工具目录",
      indexTitle: "按分类浏览 AI 工具目录",
      indexDescription:
        "从工作流切入，快速进入最相关的 AI 工具分类、详情页、集合页和内容导航，像专业目录站一样完成发现与比较。",
      totalCategories: "分类数",
      totalTools: "工具数",
      featuredCategories: "精选分类",
      quickStart: "快速开始",
      featuredTool: "精选工具",
      exploreCategories: "探索分类",
      exploreCategoriesText: "每个分类都作为目录入口，帮助用户继续浏览工具、集合页和相关内容。",
      toolCount: "工具数量",
      openCategory: "进入分类",
      categoryLanding: "分类落地页",
      featured: "精选",
      updated: "最近更新",
      toolsWord: "工具",
      featuredTools: "精选工具",
      featuredToolsText: "优先查看这个分类中更值得先评估的工具。",
      allTools: "全部工具",
      allToolsText: "浏览该分类下的完整公开工具列表，继续进入详情页或官网。",
      trendingTools: "趋势工具",
      trendingToolsText: "结合站内流量和最近发布情况，快速发现更受关注的选项。",
      relatedCategories: "相关分类",
      relatedCategoriesText: "这些分类与当前主题接近，适合继续横向探索。",
      faq: "常见问题",
      faqText: "保留现有 JSON-LD FAQ，同时把分类页补成更完整的落地体验。",
      openTool: "打开工具",
      visitSite: "访问官网",
      noSummary: "该工具暂未提供简介。",
      backToCategories: "返回分类页",
      popularCategories: "热门分类",
      popularCollections: "热门集合",
      topCategories: "顶部分类",
      newestTools: "最新工具",
      blogGuides: "博客指南",
      ctaHint: "查看工具与内部链接",
    };
  }

  return {
    home: "Home",
    categoriesLabel: "Categories",
    directoryBadge: "AI Tool Directory",
    indexTitle: "Browse the AI tool directory by category",
    indexDescription:
      "Start from the workflow, jump into the most relevant AI tool category, then continue into tool details, collections, and editorial guidance like a professional directory.",
    totalCategories: "Categories",
    totalTools: "Tools",
    featuredCategories: "Featured",
    quickStart: "Quick start",
    featuredTool: "Featured tool",
    exploreCategories: "Explore categories",
    exploreCategoriesText:
      "Each category works as a directory hub for tool discovery, collection pages, and related internal links.",
    toolCount: "Tool count",
    openCategory: "Open category",
    categoryLanding: "Category landing",
    featured: "Featured",
    updated: "Updated",
    toolsWord: "tools",
    featuredTools: "Featured tools",
    featuredToolsText: "Start with the strongest options in this category before diving deeper.",
    allTools: "All tools",
    allToolsText:
      "Browse the full published tool list for this category and continue into detail pages or official sites.",
    trendingTools: "Trending tools",
    trendingToolsText:
      "Quickly spot options drawing attention through on-site popularity and fresh publication signals.",
    relatedCategories: "Related categories",
    relatedCategoriesText: "Keep exploring adjacent categories that match similar workflows.",
    faq: "FAQ",
    faqText:
      "Existing JSON-LD FAQ stays intact while the page grows into a stronger landing experience.",
    openTool: "Open Tool",
    visitSite: "Visit Site",
    noSummary: "No short summary is available yet.",
    backToCategories: "Back to Categories",
    popularCategories: "Popular Categories",
    popularCollections: "Popular Collections",
    topCategories: "Top Categories",
    newestTools: "Newest Tools",
    blogGuides: "Blog Guides",
    ctaHint: "Explore tools and internal links",
  };
}
