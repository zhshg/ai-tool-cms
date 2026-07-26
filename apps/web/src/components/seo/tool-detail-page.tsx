import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  Monitor,
  Sparkles,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import { serializeJsonLd } from "@/lib/seo";
import type { ToolPageData } from "@/lib/tool-page";

type ToolDetailPageProps = {
  data: ToolPageData;
  locale: string;
};

export async function ToolDetailPage({ data, locale }: ToolDetailPageProps) {
  const t = await getTranslations("toolDetail");
  const primaryCategory =
    data.categories.find((category) => category.isPrimary) ?? data.categories[0] ?? null;
  const overviewBlocks = buildOverviewBlocks(data);
  const highlights = buildHighlights(data);
  const featureItems = dedupeStrings(data.features.length ? data.features : data.useCases).slice(
    0,
    6,
  );
  const keyFacts = [
    {
      icon: <Zap className="size-4" />,
      label: t("pricing"),
      value: formatPricing(data.pricingModel, locale),
    },
    {
      icon: <Sparkles className="size-4" />,
      label: t("category"),
      value: primaryCategory?.name ?? t("aiTool"),
    },
    {
      icon: <Monitor className="size-4" />,
      label: t("platforms"),
      value: data.platforms.join(", ") || "Web",
    },
    {
      icon: <Globe className="size-4" />,
      label: t("languages"),
      value: data.languages.join(", ") || "EN, CN",
    },
  ];
  const relatedTools = dedupeCards([
    ...data.alternatives,
    ...data.similarTools,
    ...data.moreLikeThis,
    ...data.trendingTools,
  ]).slice(0, 6);
  const screenshots = data.screenshots.slice(0, 4);
  const reviews = data.reviews.slice(0, 3);
  const averageReview = data.reviews.length ? averageRating(data.reviews) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data.jsonLd) }}
      />
      <main className="flex-1">
        {/* ═══ 顶部导航条 ═══ */}
        <nav className="border-b border-slate-200/60 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3 text-sm">
            <Link
              href={`/${locale}`}
              className="text-slate-400 transition-colors hover:text-emerald-600"
            >
              {t("breadcrumbHome")}
            </Link>
            <ChevronRight className="size-3.5 text-slate-300" />
            <Link
              href={`/${locale}/tools`}
              className="text-slate-400 transition-colors hover:text-emerald-600"
            >
              {t("breadcrumbTools")}
            </Link>
            {primaryCategory ? (
              <>
                <ChevronRight className="size-3.5 text-slate-300" />
                <Link
                  href={`/${locale}/category/${primaryCategory.slug}`}
                  className="text-slate-400 transition-colors hover:text-emerald-600"
                >
                  {primaryCategory.name}
                </Link>
              </>
            ) : null}
            <ChevronRight className="size-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">{data.name}</span>
          </div>
        </nav>

        {/* ═══ Hero 区域 - 居中编辑风 ═══ */}
        <section className="relative overflow-hidden bg-gradient-detail">
          <div className="relative mx-auto max-w-5xl px-6 pb-9 pt-8 lg:pt-10">
            <div className="flex flex-col items-center text-center">
              {/* Logo 大号 */}
              <ToolLogo
                name={data.name}
                logoUrl={data.logoUrl}
                fallbackLogoUrl={data.collectedLogoUrl}
                categoryIconUrl={primaryCategory?.iconUrl ?? null}
                size="lg"
              />

              {/* 标签行 */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {primaryCategory ? (
                  <Pill href={`/${locale}/category/${primaryCategory.slug}`}>
                    {primaryCategory.name}
                  </Pill>
                ) : null}
                <Pill accent>{formatPricing(data.pricingModel, locale)}</Pill>
                {averageReview ? (
                  <Pill>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {averageReview}
                  </Pill>
                ) : null}
              </div>

              {/* 标题 */}
              <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl">
                {data.name}
              </h1>

              {/* 描述 */}
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
                {data.summary ?? data.aiSummary}
              </p>

              {/* 操作按钮 */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="shadow-sm shadow-emerald-500/20">
                  <a href={data.website} target="_blank" rel="noopener noreferrer">
                    {t("visitWebsite")}
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={`/${locale}/tools`}>
                    <ArrowLeft className="size-4" />
                    {t("backToTools")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 横向信息条 - 关键数据 ═══ */}
        <section className="border-b border-slate-200/60 bg-white">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
              {keyFacts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-3 py-5 px-4 sm:px-6">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                    {fact.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {fact.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {fact.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 主内容 - 单栏居中 ═══ */}
        <section className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
          <div className="space-y-14">
            {/* Tags & Platforms & Languages 信息条 */}
            {data.tags.length || data.platforms.length || data.languages.length ? (
              <div className="grid gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-sm sm:grid-cols-3">
                {data.tags.length ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {t("tags")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {data.tags.slice(0, 6).map((tag) => (
                        <Link
                          key={tag.slug}
                          href={`/${locale}/tag/${tag.slug}`}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Tag className="size-3" />
                          {tag.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
                {data.platforms.length ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {t("platforms")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {data.platforms.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {data.languages.length ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                      {t("languages")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {data.languages.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Highlights 横条 */}
            {highlights.length ? (
              <div>
                <SectionEyebrow>{t("highlights")}</SectionEyebrow>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {highlights.map((item) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-soft-sm"
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="size-3.5" />
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Overview */}
            <div>
              <SectionEyebrow>{t("overview")}</SectionEyebrow>
              <div className="mt-4 space-y-4 text-base leading-[1.85] text-slate-600">
                {overviewBlocks.length ? (
                  overviewBlocks.map((block) => <p key={block}>{block}</p>)
                ) : (
                  <p>{data.aiSummary}</p>
                )}
              </div>
            </div>

            {/* Key Features */}
            {featureItems.length ? (
              <div>
                <SectionEyebrow>{t("keyFeatures")}</SectionEyebrow>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featureItems.map((item, index) => (
                    <article
                      key={item}
                      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-soft"
                    >
                      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{item}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Screenshots */}
            {screenshots.length ? (
              <div>
                <SectionEyebrow>{t("screenshots")}</SectionEyebrow>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {screenshots.map((screenshot) => (
                    <a
                      key={`${screenshot.variant}-${screenshot.imageUrl}`}
                      href={screenshot.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-soft-sm transition-all duration-200 hover:shadow-soft"
                    >
                      <Image
                        src={screenshot.imageUrl}
                        alt={`${data.name} screenshot`}
                        width={screenshot.width}
                        height={screenshot.height}
                        className="aspect-video w-full rounded-xl object-cover"
                        unoptimized
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {/* FAQ */}
            <div className="max-w-2xl">
              <SectionEyebrow>{t("faq")}</SectionEyebrow>
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">{t("commonQuestions")}</p>
                {data.faqs.length ? (
                  data.faqs.slice(0, 5).map((faq) => (
                    <details
                      key={faq.question}
                      className="group rounded-xl border border-slate-200/80 bg-white shadow-soft-sm"
                    >
                      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-slate-900 transition-colors hover:text-emerald-700">
                        {faq.question}
                        <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">
                        {faq.answer}
                      </div>
                    </details>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400">
                    {t("faqEmpty")}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing Plans */}
            {data.pricingPlans.length ? (
              <div>
                <SectionEyebrow>{t("pricingPlans")}</SectionEyebrow>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.pricingPlans.slice(0, 3).map((plan) => (
                    <div
                      key={plan.name}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-slate-900">{plan.name}</p>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {formatPlanPrice(plan.price, plan.billingPeriod, locale)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatPricing(plan.pricingModel, locale)}
                      </p>
                      {plan.description ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Use Cases */}
            {data.useCases.length ? (
              <div className="max-w-2xl">
                <SectionEyebrow>{t("useCases")}</SectionEyebrow>
                <ul className="mt-4 space-y-3">
                  {data.useCases.slice(0, 5).map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* User Reviews */}
            <div className="max-w-2xl">
              <SectionEyebrow>{t("userReviews")}</SectionEyebrow>
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">{t("whatUsersSay")}</p>
                {reviews.length ? (
                  reviews.map((review) => (
                    <article
                      key={`${review.authorName}-${review.createdAt}`}
                      className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-soft-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${i < Math.round(review.rating) ? "fill-current" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">{review.rating}/5</span>
                      </div>
                      {review.title ? (
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">
                          {review.title}
                        </h3>
                      ) : null}
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{review.content}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-400">
                    {t("noReviews")}
                  </p>
                )}
              </div>
            </div>

            {/* Related Tools - 横向滚动 */}
            {relatedTools.length ? (
              <div>
                <div className="flex items-end justify-between">
                  <SectionEyebrow>{t("alternativesTo", { name: data.name })}</SectionEyebrow>
                  <Link
                    href={`/${locale}/tools`}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {t("viewAll")}
                  </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/${locale}/tools/${tool.slug}`}
                      className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-soft"
                    >
                      <div className="flex items-start gap-3">
                        <ToolLogo
                          name={tool.name}
                          logoUrl={tool.logoUrl}
                          fallbackLogoUrl={tool.collectedLogoUrl}
                          categoryIconUrl={tool.categoryIconUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950 group-hover:text-emerald-700 transition-colors">
                            {tool.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {formatPricing(tool.pricingModel, locale)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                        {tool.summary ?? t("exploreRelated")}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ═══ 底部 CTA ═══ */}
        <section className="border-t border-slate-200/60 bg-gradient-emerald-soft">
          <div className="mx-auto max-w-5xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-emerald-600">
              {t("readyToTry", { name: data.name })}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t("visitOfficial")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
              {t("openOfficialDesc", { name: data.name })}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild size="lg" className="shadow-sm shadow-emerald-500/20">
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  {t("openOfficialSite")}
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/tools`}>{t("browseMore")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

/* ── 区块标题 ── */
function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">{children}</p>
  );
}

/* ── 标签 ── */
function Pill({
  href,
  accent,
  children,
}: {
  href?: string;
  accent?: boolean;
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition";
  const styles = accent
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
    : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700";
  const className = `${base} ${styles}`;
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

/* ── 辅助函数 ── */

function buildOverviewBlocks(data: ToolPageData): string[] {
  // 直接按双换行分割，保留段落结构（避免 normalizePlainText 压缩换行）
  const rawText = [data.description, data.longDescription].filter(Boolean).join("\n\n");
  if (!rawText) {
    return data.aiSummary ? [data.aiSummary] : [];
  }

  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // 过滤掉标题行（如 "About X"、"Key Features"）和列表项（如 "1. xxx"），
  // 只保留实质性的段落内容（长度 > 60 字符的完整句子）
  const substantive = paragraphs.filter((p) => {
    const stripped = p.replace(/^#+\s*/, "");
    // 排除列表项
    if (/^\d+\.\s/.test(stripped)) return false;
    // 排除短标题（少于 5 个词且无句号）
    const wordCount = stripped.split(/\s+/).length;
    if (wordCount < 8 && !/[.!?,;:]/.test(stripped)) return false;
    return true;
  });

  const blocks = dedupeStrings(substantive).slice(0, 4);

  // 当内容不足时，用 aiSummary 补充
  if (blocks.length < 2 && data.aiSummary && !blocks.includes(data.aiSummary)) {
    blocks.unshift(data.aiSummary);
  }

  return blocks.slice(0, 4);
}

function buildHighlights(data: ToolPageData): string[] {
  return dedupeStrings(
    [data.summary, ...data.features, ...data.useCases]
      .map((item) => item?.trim() ?? "")
      .filter(Boolean)
      .map((item) => item.replace(/[.!?]+$/, "")),
  ).slice(0, 4);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function dedupeCards<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    result.push(item);
  }
  return result;
}

function averageRating(reviews: ToolPageData["reviews"]) {
  const value = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return value.toFixed(1);
}

function formatPricing(pricing: string, locale?: string) {
  const isEN = !locale || locale === "en" || locale.startsWith("en");
  const labels: Record<string, string> = isEN
    ? {
        FREE: "Free",
        FREEMIUM: "Freemium",
        PAID: "Paid",
        CONTACT: "Contact sales",
      }
    : {
        FREE: "免费",
        FREEMIUM: "免费增值",
        PAID: "付费",
        CONTACT: "联系销售",
      };
  return labels[pricing] ?? pricing;
}

function formatPlanPrice(price: string | null, billingPeriod: string | null, locale?: string) {
  const isEN = !locale || locale === "en" || locale.startsWith("en");
  if (!price) return isEN ? "Custom" : "自定义";
  const suffix = billingPeriod ? ` / ${billingPeriod.toLowerCase()}` : "";
  return `$${price}${suffix}`;
}
