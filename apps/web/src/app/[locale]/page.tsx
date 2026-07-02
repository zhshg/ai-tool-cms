import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Flame,
  Layers3,
  Newspaper,
  Rocket,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getHomePageData, getHomePageSeoData, type HomePageTool } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import { buildMetadata, getSiteConfig } from "@ai-tool-cms/seo";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

const BLOG_POSTS = [
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
] as const;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";
  const config = getSiteConfig();

  return buildMetadata(
    {
      title: isZh ? "AI 工具目录首页" : "AI Tool Directory Home",
      description: isZh
        ? "发现热门 AI 工具、分类、最新收录与实用指南。"
        : "Discover trending AI tools, popular categories, new launches, and editorial guides from the directory.",
      path: `/${locale}`,
      hreflang: config.locales.map((loc) => ({ locale: loc, path: `/${loc}` })),
    },
    config,
  ) as Metadata;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ categories, featuredTools, trendingTools, latestTools, freeTools, stats }, { jsonLd }] =
    await Promise.all([getHomePageData(locale), getHomePageSeoData(locale)]);

  const copy =
    locale === "zh"
      ? {
          heroLabel: "AI 工具目录",
          heroTitle: "发现真正值得加入工作流的 AI 工具",
          heroText:
            "按分类、价格与使用场景快速筛选工具。首页聚合热门、最新、免费可试以及实用指南。",
          searchPlaceholder: "搜索工具名称、分类或使用场景",
          searchButton: "搜索工具",
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
          pricingFree: "Free",
          pricingFreemium: "Freemium",
          pricingPaid: "Paid",
          pricingContact: "Contact",
          featuredBadge: "精选",
          trendingBadge: "趋势",
          latestBadge: "最新",
          freeBadge: "免费试用",
        }
      : {
          heroTitle: "Find AI tools worth adding to your workflow",
          heroLabel: "AI Tool Directory",
          heroText:
            "Browse by category, pricing, and use case. The homepage now prioritizes discovery: trending, latest, free-to-try, and useful guides.",
          searchPlaceholder: "Search tools, categories, or use cases",
          searchButton: "Search tools",
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
        };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <main className="flex-1">
        <section className="border-b bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_28%)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:py-20">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles className="size-3.5" />
                {copy.heroLabel}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {copy.heroTitle}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {copy.heroText}
                </p>
              </div>

              <form
                action={`/${locale}/search`}
                className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] sm:flex-row"
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
                <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
                  {copy.searchButton}
                </Button>
              </form>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="lg" asChild>
                  <Link href={`/${locale}/tools`}>{copy.browseTools}</Link>
                </Button>
                <Button size="lg" asChild>
                  <Link href={`/${locale}#categories`}>{copy.browseCategories}</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard value={stats.toolCount} label={copy.statTools} icon={Layers3} />
              <StatCard value={stats.categoryCount} label={copy.statCategories} icon={Tags} />
              <StatCard value={stats.freeToTryCount} label={copy.statFree} icon={Rocket} />
            </div>
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-6xl px-6 py-14">
          <SectionHeading
            icon={Tags}
            eyebrow={copy.categoriesTitle}
            title={copy.categoriesTitle}
            description={copy.categoriesText}
            actionHref={`/${locale}/tools`}
            actionLabel={copy.latestCta}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/${locale}/category/${category.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{category.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {category.toolCount}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {category.description ?? category.name}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-950">
                  {copy.categoryCta}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y bg-slate-50/70">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <SectionHeading
              icon={Sparkles}
              eyebrow={copy.featuredBadge}
              title={copy.featuredTitle}
              description={copy.featuredText}
            />
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {featuredTools.map((tool) => (
                <ToolFeatureCard
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

        <section id="trending" className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                icon={Flame}
                eyebrow={copy.trendingBadge}
                title={copy.trendingTitle}
                description={copy.trendingText}
              />
              <div className="mt-8 space-y-4">
                {trendingTools.map((tool, index) => (
                  <ToolListCard
                    key={tool.id}
                    locale={locale}
                    tool={tool}
                    index={index + 1}
                    pricingLabels={copy}
                  />
                ))}
              </div>
            </div>

            <div id="latest">
              <SectionHeading
                icon={Rocket}
                eyebrow={copy.latestBadge}
                title={copy.latestTitle}
                description={copy.latestText}
              />
              <div className="mt-8 space-y-4">
                {latestTools.map((tool, index) => (
                  <ToolListCard
                    key={tool.id}
                    locale={locale}
                    tool={tool}
                    index={index + 1}
                    pricingLabels={copy}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(240,253,250,0.7)_100%)]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <SectionHeading
              icon={Rocket}
              eyebrow={copy.freeBadge}
              title={copy.freeTitle}
              description={copy.freeText}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {freeTools.map((tool) => (
                <ToolCompactCard key={tool.id} locale={locale} tool={tool} pricingLabels={copy} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <SectionHeading
            icon={Newspaper}
            eyebrow={copy.blogTitle}
            title={copy.blogTitle}
            description={copy.blogText}
            actionHref={`/${locale}/blog`}
            actionLabel={copy.readBlog}
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article key={post.slug} className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Guide
                </p>
                <h2 className="mt-3 text-xl font-semibold text-slate-950">{post.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                <Link
                  href={`/${locale}/blog`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-950"
                >
                  {copy.readBlog}
                  <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="newsletter" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="rounded-[28px] border border-slate-200 bg-slate-950 px-6 py-10 text-white sm:px-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                  Newsletter
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">{copy.newsletterTitle}</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">{copy.newsletterText}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/feed/rss">{copy.openRss}</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-slate-700 bg-transparent text-white hover:bg-slate-900"
                >
                  <Link href={`/${locale}/blog`}>{copy.readBlog}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <Icon className="size-4" />
          {eyebrow}
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-950"
        >
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)]">
      <Icon className="size-5 text-slate-500" />
      <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{label}</p>
    </div>
  );
}

function ToolFeatureCard({
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
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-34px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {badge}
          </span>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{tool.name}</h3>
            {tool.category ? (
              <Link
                href={`/${locale}/category/${tool.category.slug}`}
                className="mt-2 inline-flex text-sm text-slate-500 hover:text-slate-900"
              >
                {tool.category.name}
              </Link>
            ) : null}
          </div>
        </div>

        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
          {formatPricing(tool.pricingModel, pricingLabels)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">{tool.summary ?? tool.name}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/${locale}/tools/${tool.slug}`}>View details</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href={tool.website} target="_blank" rel="noopener noreferrer">
            Visit site
          </a>
        </Button>
      </div>
    </article>
  );
}

function ToolListCard({
  locale,
  tool,
  index,
  pricingLabels,
}: {
  locale: string;
  tool: HomePageTool;
  index: number;
  pricingLabels: Record<string, string>;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {String(index).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                <Link href={`/${locale}/tools/${tool.slug}`} className="hover:underline">
                  {tool.name}
                </Link>
              </h3>
              {tool.category ? (
                <Link
                  href={`/${locale}/category/${tool.category.slug}`}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  {tool.category.name}
                </Link>
              ) : null}
            </div>
            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
              {formatPricing(tool.pricingModel, pricingLabels)}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{tool.summary ?? tool.name}</p>
        </div>
      </div>
    </article>
  );
}

function ToolCompactCard({
  locale,
  tool,
  pricingLabels,
}: {
  locale: string;
  tool: HomePageTool;
  pricingLabels: Record<string, string>;
}) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            <Link href={`/${locale}/tools/${tool.slug}`} className="hover:underline">
              {tool.name}
            </Link>
          </h3>
          {tool.category ? (
            <Link
              href={`/${locale}/category/${tool.category.slug}`}
              className="mt-1 inline-flex text-sm text-slate-500 hover:text-slate-900"
            >
              {tool.category.name}
            </Link>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          {formatPricing(tool.pricingModel, pricingLabels)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{tool.summary ?? tool.name}</p>
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
