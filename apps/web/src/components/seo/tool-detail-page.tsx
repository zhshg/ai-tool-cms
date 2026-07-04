import { Check, ExternalLink, Minus, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import { serializeJsonLd } from "@/lib/seo";
import type { ToolPageData } from "@/lib/tool-page";

type ToolDetailPageProps = {
  data: ToolPageData;
  locale: string;
};

type TocItem = {
  id: string;
  label: string;
  visible: boolean;
};

export function ToolDetailPage({ data, locale }: ToolDetailPageProps) {
  const primaryCategory =
    data.categories.find((category) => category.isPrimary) ?? data.categories[0];
  const featureItems = data.features.length ? data.features : data.useCases;
  const hasAlternatives = data.alternatives.length > 0;
  const hasSimilarTools = data.similarTools.length > 0;
  const hasMoreLikeThis = data.moreLikeThis.length > 0;
  const hasTrendingTools = data.trendingTools.length > 0;
  const hasRelatedCategories = data.relatedCategories.length > 0;

  const toc: TocItem[] = [
    { id: "overview", label: "Overview", visible: Boolean(data.aiSummary || data.longDescription) },
    { id: "features", label: "Features", visible: featureItems.length > 0 },
    {
      id: "pros-cons",
      label: "Pros & Cons",
      visible: data.pros.length > 0 || data.cons.length > 0,
    },
    { id: "use-cases", label: "Use Cases", visible: data.useCases.length > 0 },
    { id: "pricing", label: "Pricing", visible: true },
    { id: "api", label: "API", visible: data.apiAccess.length > 0 },
    {
      id: "platforms",
      label: "Platforms",
      visible: data.platforms.length > 0 || data.languages.length > 0,
    },
    {
      id: "gallery",
      label: "Gallery",
      visible: data.screenshots.length > 0 || data.videos.length > 0,
    },
    { id: "faq", label: "FAQ", visible: data.faqs.length > 0 },
    { id: "similar", label: "Similar Tools", visible: hasSimilarTools },
    { id: "alternatives", label: "Alternatives", visible: hasAlternatives },
    { id: "more-like-this", label: "More Like This", visible: hasMoreLikeThis },
    { id: "trending", label: "Trending", visible: hasTrendingTools },
    { id: "related-categories", label: "Related Categories", visible: hasRelatedCategories },
    { id: "reviews", label: "Reviews", visible: data.reviews.length > 0 },
    { id: "structured-data", label: "Structured Data", visible: data.jsonLd.length > 0 },
  ].filter((item) => item.visible);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data.jsonLd) }}
      />
      <main className="flex-1 bg-background">
        <section className="border-b bg-gradient-to-br from-muted/50 via-background to-background">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
            <div className="space-y-6">
              <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link href={`/${locale}`} className="hover:text-foreground">
                  Home
                </Link>
                <span>/</span>
                <Link href={`/${locale}/tools`} className="hover:text-foreground">
                  Tools
                </Link>
                {primaryCategory ? (
                  <>
                    <span>/</span>
                    <Link
                      href={`/${locale}/category/${primaryCategory.slug}`}
                      className="hover:text-foreground"
                    >
                      {primaryCategory.name}
                    </Link>
                  </>
                ) : null}
              </nav>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <ToolLogo
                  name={data.name}
                  logoUrl={data.logoUrl}
                  fallbackLogoUrl={data.collectedLogoUrl}
                  categoryIconUrl={primaryCategory?.iconUrl ?? null}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryCategory ? (
                      <Badge href={`/${locale}/category/${primaryCategory.slug}`}>
                        {primaryCategory.name}
                      </Badge>
                    ) : null}
                    <Badge>{formatPricing(data.pricingModel)}</Badge>
                    {data.reviews.length ? (
                      <Badge>{averageRating(data.reviews)} rating</Badge>
                    ) : null}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                    {data.name}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                    {data.summary ?? data.aiSummary}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <a href={data.website} target="_blank" rel="noopener noreferrer">
                        Open Tool
                        <ExternalLink />
                      </a>
                    </Button>
                    {primaryCategory ? (
                      <Button asChild size="lg" variant="outline">
                        <Link href={`/${locale}/category/${primaryCategory.slug}`}>
                          Explore {primaryCategory.name}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold">Quick facts</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Fact label="Pricing" value={formatPricing(data.pricingModel)} />
                <Fact label="Platforms" value={data.platforms.join(", ") || "Web"} />
                <Fact label="Languages" value={data.languages.join(", ") || "Not specified"} />
                <Fact label="Category" value={primaryCategory?.name ?? "AI Tool"} />
              </dl>
              <Button asChild className="mt-5 w-full">
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  Visit official website
                </a>
              </Button>
            </aside>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:px-8">
          <aside className="hidden lg:block">
            <nav className="sticky top-20 rounded-2xl border bg-card p-4 text-sm shadow-sm">
              <p className="mb-3 font-semibold">On this page</p>
              <div className="space-y-1">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </nav>
          </aside>

          <div className="space-y-10">
            <Section id="overview" title="Overview">
              <div className="space-y-4 leading-7 text-muted-foreground">
                <p>{data.aiSummary}</p>
                {data.longDescription ? (
                  <p className="whitespace-pre-wrap">{data.longDescription}</p>
                ) : null}
              </div>
            </Section>

            {featureItems.length ? (
              <Section id="features" title="Features">
                <CardGrid items={featureItems} />
              </Section>
            ) : null}

            {data.pros.length || data.cons.length ? (
              <Section id="pros-cons" title="Pros & Cons">
                <div className="grid gap-4 md:grid-cols-2">
                  <ListCard title="Pros" items={data.pros} tone="positive" />
                  <ListCard title="Cons" items={data.cons} tone="critical" />
                </div>
              </Section>
            ) : null}

            {data.useCases.length ? (
              <Section id="use-cases" title="Use Cases">
                <CardGrid items={data.useCases} />
              </Section>
            ) : null}

            <Section id="pricing" title="Pricing">
              {data.pricingPlans.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.pricingPlans.map((plan) => (
                    <article key={plan.name} className="rounded-2xl border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{plan.name}</h3>
                        {plan.isFeatured ? (
                          <span className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-2xl font-semibold">
                        {formatPlanPrice(plan.price, plan.billingPeriod)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPricing(plan.pricingModel)}
                      </p>
                      {plan.description ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {plan.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyNote
                  text={`No detailed pricing plans are available. Listed model: ${formatPricing(data.pricingModel)}.`}
                />
              )}
            </Section>

            {data.apiAccess.length ? (
              <Section id="api" title="API">
                <CardGrid items={data.apiAccess} />
              </Section>
            ) : null}

            {data.platforms.length || data.languages.length ? (
              <Section id="platforms" title="Platforms & Languages">
                <div className="grid gap-4 md:grid-cols-2">
                  <PillPanel
                    title="Platforms"
                    items={data.platforms}
                    empty="No platform data available."
                  />
                  <PillPanel
                    title="Languages"
                    items={data.languages}
                    empty="No language data available."
                  />
                </div>
              </Section>
            ) : null}

            {data.screenshots.length || data.videos.length ? (
              <Section id="gallery" title="Gallery">
                {data.screenshots.length ? <ScreenshotGallery data={data} /> : null}
                {data.videos.length ? <VideoGallery videos={data.videos} /> : null}
              </Section>
            ) : null}

            {data.faqs.length ? (
              <Section id="faq" title="FAQ">
                <dl className="space-y-4">
                  {data.faqs.map((faq) => (
                    <div key={faq.question} className="rounded-2xl border bg-card p-5 shadow-sm">
                      <dt className="font-medium">{faq.question}</dt>
                      <dd className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            ) : null}

            {hasSimilarTools ? (
              <ToolGrid
                id="similar"
                title="Similar Tools"
                tools={data.similarTools}
                locale={locale}
              />
            ) : null}
            {hasAlternatives ? (
              <ToolGrid
                id="alternatives"
                title="Alternatives"
                tools={data.alternatives}
                locale={locale}
              />
            ) : null}
            {hasMoreLikeThis ? (
              <ToolGrid
                id="more-like-this"
                title="More Like This"
                tools={data.moreLikeThis}
                locale={locale}
              />
            ) : null}
            {hasTrendingTools ? (
              <ToolGrid
                id="trending"
                title="Trending"
                tools={data.trendingTools}
                locale={locale}
              />
            ) : null}
            {hasRelatedCategories ? (
              <RelatedCategories
                categories={data.relatedCategories}
                locale={locale}
              />
            ) : null}

            {data.reviews.length ? (
              <Section id="reviews" title="Reviews">
                <div className="space-y-4">
                  {data.reviews.map((review) => (
                    <article
                      key={`${review.authorName}-${review.createdAt}`}
                      className="rounded-2xl border bg-card p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <Star className="size-4 fill-current" />
                        {review.rating}/5
                      </div>
                      {review.title ? <h3 className="mt-2 font-semibold">{review.title}</h3> : null}
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {review.content}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {review.authorName ?? "Editorial review"}
                      </p>
                    </article>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section id="structured-data" title="Structured Data">
              <p className="text-sm leading-6 text-muted-foreground">
                This page includes SoftwareApplication, Breadcrumb, and FAQ structured data when
                available.
              </p>
            </Section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <Panel title="Categories">
              <Pills
                items={data.categories.map((category) => ({
                  label: category.name,
                  href: `/${locale}/category/${category.slug}`,
                }))}
              />
            </Panel>
            <Panel title="Tags">
              <Pills
                items={data.tags.map((tag) => ({
                  label: tag.name,
                  href: `/${locale}/tag/${tag.slug}`,
                }))}
              />
            </Panel>
            <Panel title="CTA">
              <p className="text-sm text-muted-foreground">Ready to evaluate {data.name}?</p>
              <Button asChild className="mt-4 w-full">
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  Open Tool
                </a>
              </Button>
            </Panel>
          </aside>
        </div>
      </main>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Badge({ href, children }: { href?: string; children: ReactNode }) {
  const className =
    "rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground";

  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function CardGrid({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="rounded-2xl border bg-card p-4 text-sm shadow-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "critical";
}) {
  const Icon = tone === "positive" ? Check : Minus;
  const iconClass = tone === "positive" ? "text-emerald-600" : "text-amber-600";

  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote text={`No ${title.toLowerCase()} listed yet.`} />
      )}
    </article>
  );
}

function PillPanel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </article>
  );
}

function ScreenshotGallery({ data }: { data: ToolPageData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.screenshots.map((screenshot) => (
        <figure
          key={`${screenshot.variant}-${screenshot.imageUrl}`}
          className="rounded-2xl border bg-card p-3 shadow-sm"
        >
          <Image
            src={screenshot.imageUrl}
            alt={`${data.name} ${screenshot.variant.toLowerCase()} screenshot`}
            className="aspect-video w-full rounded-xl object-cover"
            width={screenshot.width}
            height={screenshot.height}
            unoptimized
          />
          <figcaption className="mt-2 text-xs text-muted-foreground">
            {screenshot.variant.toLowerCase()} capture
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function VideoGallery({ videos }: { videos: ToolPageData["videos"] }) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {videos.map((video) => (
        <a
          key={video.url}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/40"
        >
          <p className="font-medium">{video.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">Watch demo video</p>
        </a>
      ))}
    </div>
  );
}

function RelatedCategories({
  categories,
  locale,
}: {
  categories: ToolPageData["relatedCategories"];
  locale: string;
}) {
  return (
    <Section id="related-categories" title="Related Categories">
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${locale}/category/${category.slug}`}
            className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/40"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{category.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {category.toolCount} tools · {formatAlternativeReason(category.reason)}
              </span>
            </span>
            {category.iconUrl ? (
              <Image
                src={category.iconUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-lg object-contain"
                unoptimized
              />
            ) : null}
          </Link>
        ))}
      </div>
    </Section>
  );
}
function ToolGrid({
  id,
  title,
  tools,
  locale,
}: {
  id: string;
  title: string;
  tools: Array<{
    slug: string;
    name: string;
    summary: string | null;
    logoUrl: string | null;
    collectedLogoUrl: string | null;
    categoryIconUrl: string | null;
    pricingModel: string;
    reason?: string | null;
  }>;
  locale: string;
}) {
  return (
    <Section id={id} title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/${locale}/tools/${tool.slug}`}
            className="flex gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/40"
          >
            <ToolLogo
              name={tool.name}
              logoUrl={tool.logoUrl}
              fallbackLogoUrl={tool.collectedLogoUrl}
              categoryIconUrl={tool.categoryIconUrl}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{tool.name}</span>
              <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                {tool.summary ?? formatPricing(tool.pricingModel)}
              </span>
              {tool.reason ? (
                <span className="mt-2 inline-flex rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  {formatAlternativeReason(tool.reason)}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Pills({ items }: { items: Array<{ label: string; href: string }> }) {
  return items.length ? (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </div>
  ) : (
    <EmptyNote text="No items available." />
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">{text}</div>
  );
}

function averageRating(reviews: ToolPageData["reviews"]) {
  const value = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return value.toFixed(1);
}

function formatPricing(pricing: string) {
  const labels: Record<string, string> = {
    FREE: "Free",
    FREEMIUM: "Freemium",
    PAID: "Paid",
    CONTACT: "Contact sales",
  };
  return labels[pricing] ?? pricing;
}

function formatPlanPrice(price: string | null, billingPeriod: string | null) {
  if (!price) return "Custom";
  const suffix = billingPeriod ? ` / ${billingPeriod.toLowerCase()}` : "";
  return `$${price}${suffix}`;
}

function formatAlternativeReason(reason: string) {
  return reason
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" / ");
}
