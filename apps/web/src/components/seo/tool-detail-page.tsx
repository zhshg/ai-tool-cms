import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ToolLogo } from "@/components/tool/tool-logo";
import { Button } from "@/components/ui/button";
import type { ToolPageData } from "@/lib/tool-page";
import { serializeJsonLd } from "@/lib/seo";

type ToolDetailPageProps = {
  data: ToolPageData;
  locale: string;
};

export function ToolDetailPage({ data, locale }: ToolDetailPageProps) {
  const primaryCategory =
    data.categories.find((category) => category.isPrimary) ?? data.categories[0];
  const featureItems = data.features.length ? data.features : data.useCases;
  const hasFeatures = featureItems.length > 0;
  const hasAlternatives = data.alternatives.length > 0;
  const hasSimilarTools = data.similarTools.length > 0;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(data.jsonLd) }}
      />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
            <div className="space-y-5">
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

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
                      <Link
                        href={`/${locale}/category/${primaryCategory.slug}`}
                        className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {primaryCategory.name}
                      </Link>
                    ) : null}
                    <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                      {formatPricing(data.pricingModel)}
                    </span>
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {data.name}
                  </h1>
                  {data.summary ? (
                    <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                      {data.summary}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="rounded-lg border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium">Official website</p>
              <p className="mt-2 break-all text-sm text-muted-foreground">{data.website}</p>
              <Button asChild className="mt-4 w-full">
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  Visit {data.name}
                  <ExternalLink />
                </a>
              </Button>
            </aside>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div className="space-y-10">
            <Section title="AI Summary">
              <p className="leading-7 text-muted-foreground">{data.aiSummary}</p>
            </Section>

            {data.longDescription ? (
              <Section title="Overview">
                <p className="whitespace-pre-wrap leading-7 text-muted-foreground">
                  {data.longDescription}
                </p>
              </Section>
            ) : null}

            {hasFeatures ? (
              <Section title="Features">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {featureItems.map((item) => (
                    <li key={item} className="rounded-lg border bg-card p-4 text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <Section title="Pricing">
              {data.pricingPlans.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.pricingPlans.map((plan) => (
                    <article key={plan.name} className="rounded-lg border bg-card p-5">
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

            <Section title="Screenshots">
              {data.screenshots.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.screenshots.map((screenshot) => (
                    <figure
                      key={`${screenshot.variant}-${screenshot.imageUrl}`}
                      className="rounded-lg border bg-card p-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshot.imageUrl}
                        alt={`${data.name} ${screenshot.variant.toLowerCase()} screenshot`}
                        className="aspect-video w-full rounded-md object-cover"
                        width={screenshot.width}
                        height={screenshot.height}
                      />
                      <figcaption className="mt-2 text-xs text-muted-foreground">
                        {screenshot.variant.toLowerCase()} capture
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No public screenshots are available yet." />
              )}
            </Section>

            {hasAlternatives ? (
              <Section title="Alternatives">
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.alternatives.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/${locale}/tools/${tool.slug}`}
                      className="flex gap-3 rounded-lg border bg-card p-4 transition hover:border-primary/40"
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
            ) : null}

            <Section title="FAQ">
              {data.faqs.length ? (
                <dl className="space-y-4">
                  {data.faqs.map((faq) => (
                    <div key={faq.question} className="rounded-lg border bg-card p-5">
                      <dt className="font-medium">{faq.question}</dt>
                      <dd className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <EmptyNote text="No FAQ entries are available yet." />
              )}
            </Section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <Panel title="Categories">
              {data.categories.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/${locale}/category/${category.slug}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No categories assigned." />
              )}
            </Panel>

            <Panel title="Tags">
              {data.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/${locale}/tag/${tag.slug}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyNote text="No tags assigned." />
              )}
            </Panel>

            {hasSimilarTools ? (
              <Panel title="Similar tools">
                <div className="space-y-3">
                  {data.similarTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/${locale}/tools/${tool.slug}`}
                      className="flex gap-3 rounded-lg border p-3 transition hover:border-primary/40"
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
                      </span>
                    </Link>
                  ))}
                </div>
              </Panel>
            ) : null}
          </aside>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${slugify(title)}-heading`}>
      <h2 id={`${slugify(title)}-heading`} className="text-xl font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{text}</div>
  );
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
    .join(" • ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
