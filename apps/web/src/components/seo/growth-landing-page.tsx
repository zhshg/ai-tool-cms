import Link from "next/link";

import type { SeoGrowthLandingData } from "@/lib/seo-growth";
import { serializeJsonLd } from "@/lib/seo";

type SeoGrowthPageProps = {
  locale: string;
} & SeoGrowthLandingData;

export function SeoGrowthPage({
  locale,
  title,
  description,
  path,
  facets,
  relatedTools,
  trendingTools,
  faqs,
  jsonLd,
}: SeoGrowthPageProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={`/${locale}`} className="hover:text-foreground hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {title}
            </li>
          </ol>
        </nav>

        <header className="max-w-3xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            SEO Growth Directory
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{description}</p>
        </header>

        {facets.length ? (
          <section aria-labelledby="growth-facets-heading" className="space-y-4">
            <h2 id="growth-facets-heading" className="text-xl font-semibold">
              Explore Discovery Paths
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {facets.map((facet) => (
                <Link
                  key={`${facet.href}-${facet.label}`}
                  href={facet.href}
                  className="rounded-xl border bg-card p-4 transition hover:border-foreground/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-card-foreground">{facet.label}</h3>
                    {typeof facet.count === "number" ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {facet.count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{facet.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedTools.length ? (
          <section aria-labelledby="related-tools-heading" className="space-y-4">
            <h2 id="related-tools-heading" className="text-xl font-semibold">
              Featured Tools
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedTools.map((tool) => (
                <li key={tool.slug} className="rounded-xl border bg-card p-4">
                  <Link href={`/${locale}/tools/${tool.slug}`} className="font-medium hover:underline">
                    {tool.name}
                  </Link>
                  {tool.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{tool.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {trendingTools.length ? (
          <section aria-labelledby="trending-tools-heading" className="space-y-4">
            <h2 id="trending-tools-heading" className="text-xl font-semibold">
              Recently Updated AI Tools
            </h2>
            <ul className="flex flex-wrap gap-2">
              {trendingTools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/${locale}/tools/${tool.slug}`}
                    className="inline-flex rounded-full border px-3 py-1 text-sm hover:bg-muted"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {faqs.length ? (
          <section aria-labelledby="faq-heading" className="space-y-4">
            <h2 id="faq-heading" className="text-xl font-semibold">
              FAQ
            </h2>
            <dl className="grid gap-4 md:grid-cols-3">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-xl border bg-card p-4">
                  <dt className="font-medium">{faq.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <footer className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          Canonical path: <span className="font-mono">{path}</span>
        </footer>
      </main>
    </>
  );
}
