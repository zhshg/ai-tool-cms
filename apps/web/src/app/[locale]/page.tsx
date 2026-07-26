import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Flame, Newspaper, Rocket, Search, Sparkles, Zap } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import { getHomePageData, getHomePageSeoData, type HomePageTool } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import { buildMetadata, getSiteConfig } from "@ai-tool-cms/seo";

// 博客文章数据：根据语言返回对应的标题与摘要
function getBlogPosts(isZh: boolean) {
  if (isZh) {
    return [
      {
        slug: "v1-ga-launch",
        title: "AI 工具目录 v1.0.0 发布",
        excerpt: "公开目录如何以可上线的搜索、SEO 与部署能力完成发布。",
      },
      {
        slug: "open-ecosystem",
        title: "目录平台：API、MCP 与 SDK",
        excerpt: "目录如何向开发者暴露搜索、集成与结构化访问能力。",
      },
      {
        slug: "production-ready",
        title: "目录运营与生产就绪",
        excerpt: "稳定 AI 工具目录背后的监控、CI/CD、备份与发布经验。",
      },
    ];
  }
  return [
    {
      slug: "v1-ga-launch",
      title: "How to launch an AI tools directory",
      excerpt:
        "Production launch notes, deployment learnings, and what belongs on a public AI tools homepage.",
    },
    {
      slug: "open-ecosystem",
      title: "Build an open AI tools ecosystem",
      excerpt:
        "How to extend an AI tools directory with structured APIs, search, and ingestion workflows.",
    },
    {
      slug: "production-ready",
      title: "What production-ready really means",
      excerpt:
        "Search, health checks, Docker hardening, and release acceptance lessons from shipping the stack.",
    },
  ];
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale.startsWith("zh");
  const config = getSiteConfig();

  return buildMetadata(
    {
      title: isZh ? "ToolsDdar 首页" : "ToolsDdar Home",
      description: isZh
        ? "发现热门 AI 工具、分类、最新收录与实用指南。"
        : "Discover trending AI tools, popular categories, new launches, and editorial guides from the directory.",
      path: `/${locale}`,
      hreflang: config.locales.map((loc) => ({ locale: loc, path: `/${loc}` })),
    },
    config,
  ) as Metadata;
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ categories, featuredTools, trendingTools, latestTools, freeTools, stats }, { jsonLd }] =
    await Promise.all([getHomePageData(locale), getHomePageSeoData(locale)]);

  const isZh = locale.startsWith("zh");
  const blogPosts = getBlogPosts(isZh);

  const copy = isZh
    ? {
        heroLabel: "ToolsDdar",
        heroTitle: "发现真正值得加入工作流的 AI 工具",
        heroText: "按分类、价格与使用场景快速筛选工具。首页聚合热门、最新、免费可试以及实用指南。",
        searchPlaceholder: "搜索工具名称、分类或使用场景",
        searchButton: "搜索",
        browseTools: "浏览全部工具",
        browseCategories: "查看分类",
        statTools: "已收录工具",
        statCategories: "热门分类",
        statFree: "可免费试用",
        categoriesTitle: "热门分类",
        categoriesText: "从高频工作流切入，先找到最适合你的工具类型。",
        featuredTitle: "精选工具",
        featuredText: "优先展示当前目录中最值得先看的工具卡片。",
        trendingTitle: "趋势工具",
        trendingText: "更适合想快速追踪近期关注度的访问者。",
        latestTitle: "最新收录",
        latestText: "查看最近进入目录的新工具与更新。",
        freeTitle: "免费 AI 工具",
        freeText: "先从零门槛或低门槛工具开始试用。",
        blogTitle: "博客与指南",
        blogText: "用发布复盘、生态观察和部署经验帮助用户做选择。",
        newsletterTitle: "每周追踪新工具、对比与实战指南",
        newsletterText: "通过 RSS 和博客持续跟进目录更新，而不是回到产品营销页。",
        openRss: "打开 RSS",
        readBlog: "阅读博客",
        categoryCta: "查看工具",
        latestCta: "查看全部工具",
        pricingFree: "免费",
        pricingFreemium: "免费增值",
        pricingPaid: "付费",
        pricingContact: "联系销售",
        featuredBadge: "精选",
        trendingBadge: "趋势",
        latestBadge: "最新",
        freeBadge: "免费试用",
        categoryToolsCount: "个工具",
        newsletterLabel: "订阅",
        viewDetails: "查看详情",
        visitSite: "访问网站",
      }
    : {
        heroTitle: "Find AI tools worth adding to your workflow",
        heroLabel: "ToolsDdar",
        heroText:
          "Browse by category, pricing, and use case. The homepage now prioritizes discovery: trending, latest, free-to-try, and useful guides.",
        searchPlaceholder: "Search tools, categories, or use cases",
        searchButton: "Search",
        browseTools: "Browse all tools",
        browseCategories: "View categories",
        statTools: "Published tools",
        statCategories: "Popular categories",
        statFree: "Free to try",
        categoriesTitle: "Popular categories",
        categoriesText: "Start from the job to be done and narrow into the right tool type.",
        featuredTitle: "Featured tools",
        featuredText: "A fast shortlist of the most useful tools to inspect first.",
        trendingTitle: "Trending tools",
        trendingText: "For visitors who want to track what is currently drawing attention.",
        latestTitle: "Latest tools",
        latestText: "New arrivals and recently published entries from the directory.",
        freeTitle: "Free AI tools",
        freeText: "Start with tools you can try without a big commitment.",
        blogTitle: "Blog and guides",
        blogText:
          "Release notes, ecosystem analysis, and deployment lessons that help users choose better.",
        newsletterTitle: "Track new tools, comparisons, and workflow guides every week",
        newsletterText:
          "Use RSS and the blog to follow fresh directory updates instead of landing on platform marketing copy.",
        openRss: "Open RSS",
        readBlog: "Read blog",
        categoryCta: "Explore tools",
        latestCta: "View all tools",
        pricingFree: "Free",
        pricingFreemium: "Freemium",
        pricingPaid: "Paid",
        pricingContact: "Contact",
        featuredBadge: "Featured",
        trendingBadge: "Trending",
        latestBadge: "Latest",
        freeBadge: "Free to try",
        categoryToolsCount: "tools",
        newsletterLabel: "Newsletter",
        viewDetails: "View details",
        visitSite: "Visit site",
      };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <main className="flex-1">
        {/* ═══ Hero - 居中大字 + 搜索栏 ═══ */}
        <section className="relative overflow-hidden border-b border-slate-200/50">
          <div className="absolute inset-0 bg-gradient-home" />
          <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-24 text-center lg:pt-32 lg:pb-28">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-500/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              <Sparkles className="size-3.5" />
              {copy.heroLabel}
            </div>

            <h1 className="mx-auto mt-8 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem]">
              {copy.heroTitle}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-500">
              {copy.heroText}
            </p>

            {/* 搜索栏 */}
            <form
              action={`/${locale}/search`}
              className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_24px_80px_-24px_rgba(16,185,129,0.18)] sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <Search className="size-5 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  placeholder={copy.searchPlaceholder}
                  className="w-full min-w-0 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 rounded-xl px-8">
                {copy.searchButton}
              </Button>
            </form>

            {/* 统计数字 - 水平排列居中 */}
            <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
              <StatPulse value={stats.toolCount.toLocaleString()} label={copy.statTools} />
              <div className="h-8 w-px bg-slate-200" />
              <StatPulse value={stats.categoryCount.toLocaleString()} label={copy.statCategories} />
              <div className="h-8 w-px bg-slate-200" />
              <StatPulse value={stats.freeToTryCount.toLocaleString()} label={copy.statFree} />
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href={`/${locale}/tools`}>{copy.browseTools}</Link>
              </Button>
              <Button asChild>
                <Link href={`/${locale}#categories`}>{copy.browseCategories}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ═══ 分类 - 水平滚动条 ═══ */}
        <section id="categories" className="border-b border-slate-200/50 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:py-16">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {copy.categoriesTitle}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {copy.categoriesTitle}
                </h2>
              </div>
              <Link
                href={`/${locale}/tools`}
                className="hidden items-center gap-1.5 text-sm font-medium text-emerald-600 sm:inline-flex"
              >
                {copy.latestCta}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="no-scrollbar -mx-6 flex gap-3 overflow-x-auto px-6 pb-8 sm:mx-auto sm:max-w-7xl">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/category/${category.slug}`}
                className="group flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-600 transition-colors group-hover:bg-emerald-100">
                  {category.toolCount}
                </span>
                <div>
                  <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                    {category.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {category.toolCount} {copy.categoryToolsCount}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══ 精选工具 - 全宽深色区块 ═══ */}
        <section className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="flex items-end justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  <Sparkles className="size-3.5" />
                  {copy.featuredBadge}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  {copy.featuredTitle}
                </h2>
                <p className="mt-2 max-w-lg text-sm text-slate-400">{copy.featuredText}</p>
              </div>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {featuredTools.map((tool) => (
                <DarkToolCard
                  key={tool.id}
                  locale={locale}
                  tool={tool}
                  badge={copy.featuredBadge}
                  pricingLabels={copy}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 趋势 + 最新 - 交错双栏 ═══ */}
        <section id="trending" className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {/* 趋势 */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50">
                    <Flame className="size-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                      {copy.trendingBadge}
                    </p>
                    <h2 className="text-xl font-bold tracking-tight text-slate-950">
                      {copy.trendingTitle}
                    </h2>
                  </div>
                </div>
                <p className="mt-2 pl-[52px] text-sm text-slate-500">{copy.trendingText}</p>
                <div className="mt-8 space-y-3">
                  {trendingTools.map((tool, index) => (
                    <HorizontalToolCard
                      key={tool.id}
                      locale={locale}
                      tool={tool}
                      rank={index + 1}
                      pricingLabels={copy}
                      accent="amber"
                    />
                  ))}
                </div>
              </div>

              {/* 最新 */}
              <div id="latest">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50">
                    <Rocket className="size-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                      {copy.latestBadge}
                    </p>
                    <h2 className="text-xl font-bold tracking-tight text-slate-950">
                      {copy.latestTitle}
                    </h2>
                  </div>
                </div>
                <p className="mt-2 pl-[52px] text-sm text-slate-500">{copy.latestText}</p>
                <div className="mt-8 space-y-3">
                  {latestTools.map((tool, index) => (
                    <HorizontalToolCard
                      key={tool.id}
                      locale={locale}
                      tool={tool}
                      rank={index + 1}
                      pricingLabels={copy}
                      accent="blue"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 免费工具 - 全宽浅绿区块 ═══ */}
        <section className="border-y border-emerald-100/60 bg-emerald-50/30">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100">
                  <Zap className="size-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    {copy.freeBadge}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    {copy.freeTitle}
                  </h2>
                </div>
              </div>
              <p className="hidden max-w-xs text-sm text-slate-500 lg:block">{copy.freeText}</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {freeTools.map((tool) => (
                <FreeToolCard key={tool.id} locale={locale} tool={tool} pricingLabels={copy} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 博客 - 紧凑三列 ═══ */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  <Newspaper className="mr-1.5 inline size-3.5" />
                  {copy.blogTitle}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {copy.blogTitle}
                </h2>
              </div>
              <Link
                href={`/${locale}/blog`}
                className="hidden items-center gap-1.5 text-sm font-medium text-emerald-600 sm:inline-flex"
              >
                {copy.readBlog}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {blogPosts.map((post, index) => (
                <article
                  key={post.slug}
                  className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:border-emerald-200 hover:shadow-lg"
                >
                  <span className="text-5xl font-black text-slate-100 transition-colors group-hover:text-emerald-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-3 text-lg font-bold leading-snug text-slate-950 group-hover:text-emerald-700 transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/${locale}/blog`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
                  >
                    {copy.readBlog}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Newsletter - 绿色渐变横幅 ═══ */}
        <section id="newsletter" className="bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-16 lg:pb-20">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-8 py-14 text-white sm:px-14 lg:px-20">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:36px_36px]" />
              <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/5 blur-3xl" />
              <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                    {copy.newsletterLabel}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {copy.newsletterTitle}
                  </h2>
                  <p className="max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                    {copy.newsletterText}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    asChild
                    className="bg-white text-emerald-700 shadow-lg hover:bg-white/90 hover:text-emerald-800"
                  >
                    <Link href="/feed/rss">{copy.openRss}</Link>
                  </Button>
                  <Button
                    size="lg"
                    asChild
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <Link href={`/${locale}/blog`}>{copy.readBlog}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

/* ───── 统计数字 - 大数字+小标签 ───── */
function StatPulse({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  );
}

/* ───── 深色卡片 - 精选工具 ───── */
function DarkToolCard({
  locale,
  tool,
  badge,
  pricingLabels,
}: {
  locale: string;
  tool: HomePageTool;
  badge: string;
  pricingLabels: Record<string, string>;
}) {
  return (
    <article className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-7 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ToolLogo
            name={tool.name}
            logoUrl={tool.logoUrl}
            fallbackLogoUrl={tool.collectedLogoUrl}
            categoryIconUrl={tool.category?.iconUrl ?? null}
            size="lg"
          />
          <div className="space-y-2.5">
            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
              {badge}
            </span>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-white">{tool.name}</h3>
              {tool.category ? (
                <Link
                  href={`/${locale}/category/${tool.category.slug}`}
                  className="mt-1.5 inline-flex text-sm text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  {tool.category.name}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
          {formatPricing(tool.pricingModel, pricingLabels)}
        </span>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-400 line-clamp-3">
        {tool.summary ?? tool.name}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          asChild
          className="bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/30"
        >
          <Link href={`/${locale}/tools/${tool.slug}`}>{pricingLabels.viewDetails}</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <a href={tool.website} target="_blank" rel="noopener noreferrer">
            {pricingLabels.visitSite}
          </a>
        </Button>
      </div>
    </article>
  );
}

/* ───── 水平工具行 - 趋势/最新 ───── */
function HorizontalToolCard({
  locale,
  tool,
  rank,
  pricingLabels,
  accent,
}: {
  locale: string;
  tool: HomePageTool;
  rank: number;
  pricingLabels: Record<string, string>;
  accent: "amber" | "blue";
}) {
  const rankBg = accent === "amber" ? "bg-amber-500" : "bg-blue-500";
  return (
    <article className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200 hover:bg-white hover:shadow-md">
      <div className="relative shrink-0">
        <ToolLogo
          name={tool.name}
          logoUrl={tool.logoUrl}
          fallbackLogoUrl={tool.collectedLogoUrl}
          categoryIconUrl={tool.category?.iconUrl ?? null}
          size="md"
        />
        <div
          className={`absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full ${rankBg} text-[10px] font-bold text-white shadow-sm`}
        >
          {String(rank).padStart(2, "0")}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-950">
              <Link
                href={`/${locale}/tools/${tool.slug}`}
                className="hover:text-emerald-600 transition-colors"
              >
                {tool.name}
              </Link>
            </h3>
            {tool.category ? (
              <Link
                href={`/${locale}/category/${tool.category.slug}`}
                className="mt-0.5 inline-flex text-xs text-slate-500 hover:text-emerald-600 transition-colors"
              >
                {tool.category.name}
              </Link>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {formatPricing(tool.pricingModel, pricingLabels)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-5 text-slate-500 line-clamp-2">
          {tool.summary ?? tool.name}
        </p>
      </div>
    </article>
  );
}

/* ───── 免费工具卡片 ───── */
function FreeToolCard({
  locale,
  tool,
  pricingLabels,
}: {
  locale: string;
  tool: HomePageTool;
  pricingLabels: Record<string, string>;
}) {
  return (
    <article className="group rounded-2xl border border-emerald-200/60 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ToolLogo
            name={tool.name}
            logoUrl={tool.logoUrl}
            fallbackLogoUrl={tool.collectedLogoUrl}
            categoryIconUrl={tool.category?.iconUrl ?? null}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-950">
              <Link
                href={`/${locale}/tools/${tool.slug}`}
                className="hover:text-emerald-600 transition-colors"
              >
                {tool.name}
              </Link>
            </h3>
            {tool.category ? (
              <Link
                href={`/${locale}/category/${tool.category.slug}`}
                className="mt-0.5 inline-flex text-xs text-slate-500 hover:text-emerald-600 transition-colors"
              >
                {tool.category.name}
              </Link>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {formatPricing(tool.pricingModel, pricingLabels)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500 line-clamp-2">
        {tool.summary ?? tool.name}
      </p>
    </article>
  );
}

function formatPricing(
  pricingModel: HomePageTool["pricingModel"],
  pricingLabels: Record<string, string>,
) {
  switch (pricingModel) {
    case "FREE":
      return pricingLabels.pricingFree;
    case "FREEMIUM":
      return pricingLabels.pricingFreemium;
    case "PAID":
      return pricingLabels.pricingPaid;
    case "CONTACT":
      return pricingLabels.pricingContact;
    default:
      return pricingModel;
  }
}
