import {
  ExternalLink,
  Search,
  SlidersHorizontal,
  Layers,
  Tag,
  Clock,
  TrendingUp,
  Grid3X3,
  Filter,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import { getToolsDirectory, type ToolsDirectoryTool } from "@/lib/catalog";
import { serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildMetadata,
  getSiteConfig,
  joinUrl,
} from "@ai-tool-cms/seo";

const PAGE_SIZE = 12;

// 获取定价筛选项，根据语言返回中英文标签
function getPricingOptions(isZh: boolean) {
  return [
    { value: "", label: isZh ? "全部定价" : "All pricing" },
    { value: "FREE", label: isZh ? "免费" : "Free" },
    { value: "FREEMIUM", label: isZh ? "免费增值" : "Freemium" },
    { value: "PAID", label: isZh ? "付费" : "Paid" },
    { value: "CONTACT", label: isZh ? "联系销售" : "Contact sales" },
  ];
}

// 获取排序选项，根据语言返回中英文标签
function getSortOptions(isZh: boolean) {
  return [
    { value: "latest", label: isZh ? "最新" : "Latest" },
    { value: "popular", label: isZh ? "热门" : "Popular" },
    { value: "name", label: isZh ? "名称" : "Name" },
  ];
}

export const dynamic = "force-dynamic";

type ToolsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    pricing?: string;
    sort?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const filters = await searchParams;
  const query = filters.q?.trim();
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  const isZh = locale.startsWith("zh");
  const title = query
    ? isZh
      ? `${query} AI 工具`
      : `${query} AI Tools`
    : isZh
      ? "AI 工具目录"
      : "AI Tools Directory";
  const description = query
    ? isZh
      ? `按分类、定价、摘要和官网链接查找 ${query} AI 工具。`
      : `Find ${query} AI tools with category filters, pricing models, summaries, and website links.`
    : isZh
      ? "按分类、定价、热门程度和上线时间浏览 AI 工具。"
      : "Browse AI tools by category, pricing, popularity, and launch date.";

  return buildMetadata(
    {
      title,
      description,
      path,
      ogType: "website",
    },
    config,
  ) as Metadata;
}

export default async function ToolsPage({ params, searchParams }: ToolsPageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const isZh = locale.startsWith("zh");
  const pricingOptions = getPricingOptions(isZh);
  const sortOptions = getSortOptions(isZh);

  const page = Math.max(1, Number(filters.page ?? 1) || 1);
  const result = await getToolsDirectory({
    locale,
    query: filters.q,
    category: filters.category,
    pricing: filters.pricing,
    sort: filters.sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const config = getSiteConfig();
  const path = `/${locale}/tools`;
  const url = joinUrl(config.siteUrl, path);
  const jsonLd = [
    buildItemListJsonLd({
      name: result.query
        ? isZh
          ? `${result.query} AI 工具`
          : `${result.query} AI Tools`
        : isZh
          ? "AI 工具目录"
          : "AI Tools Directory",
      url,
      items: result.tools.map((tool, index) => ({
        name: tool.name,
        url: joinUrl(config.siteUrl, `/${locale}/tools/${tool.slug}`),
        position: (result.page - 1) * PAGE_SIZE + index + 1,
      })),
    }),
    buildBreadcrumbJsonLd(
      [
        { name: isZh ? "首页" : "Home", path: `/${locale}` },
        { name: isZh ? "工具" : "Tools", path },
      ],
      config.siteUrl,
    ),
  ];

  /* 求出当前选中的分类名 */
  const activeCategory = result.categories.find((c) => c.slug === result.category);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="flex-1">
        {/* ═══ 顶部搜索栏 - 极简全宽 ═══ */}
        <section className="border-b border-slate-200/60 bg-gradient-tools">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {result.query
                    ? isZh
                      ? `“${result.query}”的搜索结果`
                      : `Results for "${result.query}"`
                    : isZh
                      ? "AI 工具目录"
                      : "AI Tools Directory"}
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  {isZh
                    ? `${activeCategory ? `${activeCategory.name} 分类下 ` : ""}${result.totalHits.toLocaleString("en-US")} 个工具`
                    : `${result.totalHits.toLocaleString("en-US")} tools${activeCategory ? ` in ${activeCategory.name}` : ""}`}
                  &nbsp;·{" "}
                  {isZh
                    ? `第 ${result.page}/${result.totalPages} 页`
                    : `Page ${result.page}/${result.totalPages}`}
                </p>
              </div>
              <form action={`/${locale}/tools`} className="flex w-full max-w-xl gap-2">
                <label className="relative flex-1">
                  <span className="sr-only">{isZh ? "搜索工具" : "Search tools"}</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="q"
                    defaultValue={result.query}
                    placeholder={isZh ? "搜索工具、分类…" : "Search tools, categories…"}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <Button type="submit" className="h-11 px-5 shadow-sm">
                  <Search className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* ═══ 主体：左侧筛选 + 右侧列表 ═══ */}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* ── 左侧筛选面板（sticky）── */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-4">
                {/* 统计卡片 */}
                <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-soft-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                      <Grid3X3 className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-950">
                        {result.totalHits.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isZh ? "个可用 AI 工具" : "AI tools available"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs text-slate-400">{isZh ? "分类" : "Categories"}</p>
                      <p className="mt-0.5 text-base font-semibold text-slate-900">
                        {result.categories.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3">
                      <p className="text-xs text-slate-400">{isZh ? "页码" : "Page"}</p>
                      <p className="mt-0.5 text-base font-semibold text-slate-900">
                        {result.page} / {result.totalPages}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 筛选面板 */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-soft-sm">
                  {/* 标题栏 */}
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <Filter className="size-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      {isZh ? "筛选" : "Filters"}
                    </span>
                    {(result.category || result.pricing || result.sort) && (
                      <Link
                        href={`/${locale}/tools`}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-emerald-600"
                      >
                        <RotateCcw className="size-3" />
                        {isZh ? "重置" : "Reset"}
                      </Link>
                    )}
                  </div>

                  <div className="space-y-5 p-5">
                    {/* 当前筛选状态 */}
                    {result.category || result.pricing || result.sort ? (
                      <div className="-mx-1 flex flex-wrap gap-1.5">
                        {result.category && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/60">
                            <Tag className="size-3" />
                            {activeCategory?.name}
                            <Link
                              href={buildFilterHref(locale, filters, "category", "")}
                              className="hover:text-emerald-900"
                            >
                              ×
                            </Link>
                          </span>
                        )}
                        {result.pricing && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200/60">
                            {formatPricing(result.pricing, isZh)}
                            <Link
                              href={buildFilterHref(locale, filters, "pricing", "")}
                              className="hover:text-blue-900"
                            >
                              ×
                            </Link>
                          </span>
                        )}
                        {result.sort && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/60">
                            {sortOptions.find((o) => o.value === result.sort)?.label}
                            <Link
                              href={buildFilterHref(locale, filters, "sort", "")}
                              className="hover:text-amber-900"
                            >
                              ×
                            </Link>
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* 分类 */}
                    <SidebarSection
                      icon={<Layers className="size-4" />}
                      title={isZh ? "分类" : "Category"}
                    >
                      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        <Link
                          href={buildFilterHref(locale, filters, "category", "")}
                          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition ${
                            !result.category
                              ? "bg-emerald-50 font-medium text-emerald-700 ring-1 ring-emerald-200/60"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span>{isZh ? "全部分类" : "All categories"}</span>
                          {!result.category && (
                            <span className="size-4 flex-shrink-0 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </Link>
                        {result.categories.map((category) => (
                          <Link
                            key={category.slug}
                            href={buildFilterHref(locale, filters, "category", category.slug)}
                            className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition ${
                              result.category === category.slug
                                ? "bg-emerald-50 font-medium text-emerald-700 ring-1 ring-emerald-200/60"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{category.name}</span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">{category.toolCount}</span>
                              {result.category === category.slug && (
                                <span className="size-4 flex-shrink-0 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center">
                                  ✓
                                </span>
                              )}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </SidebarSection>

                    {/* 定价 */}
                    <SidebarSection
                      icon={<Tag className="size-4" />}
                      title={isZh ? "定价" : "Pricing"}
                    >
                      <div className="space-y-1.5">
                        {pricingOptions.map((option) => (
                          <Link
                            key={option.value}
                            href={buildFilterHref(locale, filters, "pricing", option.value)}
                            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                              result.pricing === option.value
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`size-4 flex-shrink-0 rounded-full border-2 transition ${
                                result.pricing === option.value
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-slate-200"
                              }`}
                            >
                              {result.pricing === option.value && (
                                <span className="flex h-full w-full items-center justify-center text-[9px] text-white">
                                  ✓
                                </span>
                              )}
                            </span>
                            <span className={result.pricing === option.value ? "font-medium" : ""}>
                              {option.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </SidebarSection>

                    {/* 排序 */}
                    <SidebarSection
                      icon={<TrendingUp className="size-4" />}
                      title={isZh ? "排序" : "Sort by"}
                    >
                      <div className="space-y-1.5">
                        {sortOptions.map((option) => (
                          <Link
                            key={option.value}
                            href={buildFilterHref(locale, filters, "sort", option.value)}
                            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                              result.sort === option.value
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`size-4 flex-shrink-0 rounded-full border-2 transition ${
                                result.sort === option.value
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-slate-200"
                              }`}
                            >
                              {result.sort === option.value && (
                                <span className="flex h-full w-full items-center justify-center text-[9px] text-white">
                                  ✓
                                </span>
                              )}
                            </span>
                            <span className={result.sort === option.value ? "font-medium" : ""}>
                              {option.label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </SidebarSection>
                  </div>
                </div>

                {/* 快速提示 */}
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    <Clock className="mb-1.5 size-3.5" />
                    {isZh ? "小提示" : "Pro tip"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {isZh ? (
                      <>
                        在搜索框中使用<span className="font-medium text-emerald-600">关键词</span>
                        ，可按名称、描述或分类查找工具。
                      </>
                    ) : (
                      <>
                        Use <span className="font-medium text-emerald-600">keywords</span> in search
                        to find tools by name, description, or category.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </aside>

            {/* ── 右侧工具列表 ── */}
            <div className="min-w-0">
              {/* 移动端筛选按钮 */}
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/${locale}/tools`}>
                    <SlidersHorizontal className="size-4" />
                    {isZh ? "筛选" : "Filters"}
                  </Link>
                </Button>
                {activeCategory ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    {activeCategory.name}
                  </span>
                ) : null}
                <span className="ml-auto text-sm text-slate-500">
                  {result.tools.length} {isZh ? "个工具" : "tools"}
                </span>
              </div>

              {/* 工具列表 - 紧凑行视图 */}
              {result.tools.length ? (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft">
                  {result.tools.map((tool, index) => (
                    <ToolRow
                      key={tool.id}
                      locale={locale}
                      tool={tool}
                      rank={(result.page - 1) * PAGE_SIZE + index + 1}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState locale={locale} />
              )}

              {/* 分页 */}
              <Pagination
                locale={locale}
                page={result.page}
                totalPages={result.totalPages}
                filters={filters}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* ── 紧凑行卡片 ── */
function ToolRow({
  locale,
  tool,
  rank,
}: {
  locale: string;
  tool: ToolsDirectoryTool;
  rank: number;
}) {
  const isZh = locale.startsWith("zh");
  const category = tool.primaryCategory;

  return (
    <article className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 sm:gap-5 sm:px-6 sm:py-5">
      {/* 排名 */}
      <span className="hidden w-6 shrink-0 text-right text-xs font-semibold text-slate-300 sm:block">
        {String(rank).padStart(2, "0")}
      </span>

      {/* Logo */}
      <ToolLogo
        name={tool.name}
        logoUrl={tool.logoUrl}
        fallbackLogoUrl={tool.collectedLogoUrl}
        categoryIconUrl={category?.iconUrl ?? null}
        size="md"
      />

      {/* 主信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold text-slate-950">
            <Link
              href={`/${locale}/tools/${tool.slug}`}
              className="transition-colors hover:text-emerald-600"
            >
              {tool.name}
            </Link>
          </h2>
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {formatPricing(tool.pricingModel, isZh)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
          {tool.summary ?? (isZh ? "暂无描述。" : "No description available yet.")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {category ? (
            <Link
              href={`/${locale}/category/${category.slug}`}
              className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              {category.name}
            </Link>
          ) : null}
          {tool.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag.slug}
              href={`/${locale}/tag/${tag.slug}`}
              className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-slate-100"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>

      {/* 操作 */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Button asChild variant="outline" size="sm">
          <Link href={`/${locale}/tools/${tool.slug}`}>{isZh ? "详情" : "Details"}</Link>
        </Button>
        <Button asChild size="sm" className="shadow-sm">
          <a href={tool.website} target="_blank" rel="noreferrer">
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </article>
  );
}

/* ── 侧边栏分组 ── */
function SidebarSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </span>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Pagination({
  locale,
  page,
  totalPages,
  filters,
}: {
  locale: string;
  page: number;
  totalPages: number;
  filters: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  /* 生成页码列表 */
  const pages = generatePageNumbers(page, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5">
      {previous ? (
        <Link
          href={buildToolsPageHref(locale, filters, previous)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          ←
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-300">
          ←
        </span>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`dot-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildToolsPageHref(locale, filters, p as number)}
            className={`inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition ${
              page === p
                ? "bg-emerald-500 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {next ? (
        <Link
          href={buildToolsPageHref(locale, filters, next)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          →
        </Link>
      ) : (
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-300">
          →
        </span>
      )}
    </nav>
  );
}

function EmptyState({ locale }: { locale: string }) {
  const isZh = locale.startsWith("zh");
  return (
    <section className="rounded-2xl border border-dashed border-slate-200 bg-gradient-card p-12 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100">
        <Search className="size-6 text-slate-400" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {isZh ? "未找到工具" : "No tools found"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {isZh
          ? "尝试使用更宽泛的关键词、移除分类筛选或重置定价条件，以查看更多已发布的 AI 工具。"
          : "Try a broader keyword, remove a category filter, or reset pricing to see more published AI tools."}
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={`/${locale}/tools`}>{isZh ? "清除筛选" : "Clear filters"}</Link>
      </Button>
    </section>
  );
}

function buildToolsPageHref(
  locale: string,
  filters: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key !== "page" && value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/${locale}/tools?${params.toString()}`;
}

function buildFilterHref(
  locale: string,
  filters: Record<string, string | undefined>,
  key: string,
  value: string,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (k !== "page" && k !== key && v) params.set(k, v);
  }
  if (value) params.set(key, value);
  return `/${locale}/tools?${params.toString()}`;
}

function formatPricing(pricing: string, isZh: boolean) {
  const option = getPricingOptions(isZh).find((item) => item.value === pricing);
  return option?.label ?? pricing;
}

function generatePageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
